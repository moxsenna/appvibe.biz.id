import assert from 'node:assert/strict';
import { test } from 'node:test';

import { onRequest } from '../functions/api/webhooks/paycore.js';
import { hmacSha256Hex } from '../functions/lib/paycore-sign.js';

function makeKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  const writes = [];
  return {
    writes,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value, options) {
      writes.push({ key, value, options });
      store.set(key, value);
    },
  };
}

async function signWebhook(secret, timestamp, rawBody) {
  return `sha256=${await hmacSha256Hex(secret, `${timestamp}.${rawBody}`)}`;
}

async function silenceConsole(methods, fn) {
  const originals = new Map(methods.map((method) => [method, console[method]]));
  for (const method of methods) {
    console[method] = () => {};
  }
  try {
    return await fn();
  } finally {
    for (const [method, original] of originals) {
      console[method] = original;
    }
  }
}

async function makeWebhookContext({ payload, env, fetchImpl }) {
  const secret = env.PAYCORE_WEBHOOK_SECRET;
  const rawBody = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = await signWebhook(secret, timestamp, rawBody);
  const waitUntilPromises = [];

  const request = new Request('https://appvibe.biz.id/api/webhooks/paycore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PayCore-Event-Timestamp': timestamp,
      'X-PayCore-Event-Signature': signature,
    },
    body: rawBody,
  });

  return {
    context: {
      request,
      env,
      waitUntil(promise) {
        waitUntilPromises.push(promise);
      },
    },
    waitUntilPromises,
    installFetch() {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchImpl;
      return () => {
        globalThis.fetch = originalFetch;
      };
    },
  };
}

test('paycore webhook schedules fulfillment forwarding with waitUntil', async () => {
  const checkoutEvents = makeKv({
    'order:order_123': JSON.stringify({
      paycore_order_id: 'order_123',
      payment_status: 'pending',
      fulfillment_status: 'pending',
    }),
  });
  const forwarded = [];
  const payload = {
    event_id: 'evt_123',
    event_type: 'payment.succeeded',
    data: {
      order_id: 'order_123',
      external_order_id: 'vault-test',
      product_key: 'pack_advertiser',
      amount: 97000,
      paid_at: '2026-06-27T00:00:00.000Z',
      fulfillment_data: {
        pack_id: 'advertiser',
        email: 'Buyer@Example.com',
        name: 'Bima Putra',
      },
    },
  };

  const { context, waitUntilPromises, installFetch } = await makeWebhookContext({
    payload,
    env: {
      PAYCORE_WEBHOOK_SECRET: 'webhook_secret',
      FULFILLMENT_WEBHOOK_URL: 'https://sheet.example.test/exec',
      CHECKOUT_EVENTS: checkoutEvents,
    },
    async fetchImpl(url, init = {}) {
      forwarded.push({ url: String(url), init });
      return Response.json({ ok: true });
    },
  });

  const restoreFetch = installFetch();
  try {
    const response = await silenceConsole(['log'], () => onRequest(context));
    assert.equal(response.status, 200);

    assert.equal(waitUntilPromises.length, 1);
    await Promise.all(waitUntilPromises);

    assert.equal(forwarded.length, 1);
    const forwardedBody = JSON.parse(forwarded[0].init.body);
    assert.equal(forwardedBody.order_id, 'order_123');
    assert.equal(forwardedBody.order_status, 'paid');
    assert.ok(checkoutEvents.writes.some((write) => write.key === 'fulfillment_notified:order_123'));
    assert.ok(checkoutEvents.writes.some((write) => write.key === 'fulfilled:buyer@example.com'));
  } finally {
    restoreFetch();
  }
});

test('paycore webhook does not mark event processed when fulfillment write fails', async () => {
  const writes = [];
  const checkoutEvents = {
    async get(key) {
      if (key === 'order:order_123') {
        return JSON.stringify({
          paycore_order_id: 'order_123',
          payment_status: 'pending',
          fulfillment_status: 'pending',
        });
      }
      return null;
    },
    async put(key, value, options) {
      writes.push({ key, value, options });
      if (key === 'order:order_123') {
        throw new Error('kv_write_failed');
      }
    },
  };
  const payload = {
    event_id: 'evt_fails_midway',
    event_type: 'payment.succeeded',
    data: {
      order_id: 'order_123',
      external_order_id: 'vault-test',
      product_key: 'pack_advertiser',
      amount: 97000,
      fulfillment_data: {
        pack_id: 'advertiser',
        email: 'buyer@example.com',
        name: 'Bima Putra',
      },
    },
  };

  const { context, installFetch } = await makeWebhookContext({
    payload,
    env: {
      PAYCORE_WEBHOOK_SECRET: 'webhook_secret',
      CHECKOUT_EVENTS: checkoutEvents,
    },
    async fetchImpl() {
      throw new Error('fetch should not be called');
    },
  });

  const restoreFetch = installFetch();
  try {
    const response = await silenceConsole(['error'], () => onRequest(context));
    assert.equal(response.status, 500);
    assert.ok(!writes.some((write) => write.key === 'evt:evt_fails_midway'));
  } finally {
    restoreFetch();
  }
});

test('paycore webhook rejects success events when checkout storage is unavailable', async () => {
  const payload = {
    event_id: 'evt_no_storage',
    event_type: 'payment.succeeded',
    data: {
      order_id: 'order_123',
      external_order_id: 'vault-test',
      product_key: 'pack_advertiser',
      amount: 97000,
      fulfillment_data: {
        pack_id: 'advertiser',
        email: 'buyer@example.com',
        name: 'Bima Putra',
      },
    },
  };

  const { context, installFetch } = await makeWebhookContext({
    payload,
    env: {
      PAYCORE_WEBHOOK_SECRET: 'webhook_secret',
    },
    async fetchImpl() {
      throw new Error('fetch should not be called');
    },
  });

  const restoreFetch = installFetch();
  try {
    const response = await onRequest(context);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.error, 'storage_unavailable');
  } finally {
    restoreFetch();
  }
});
