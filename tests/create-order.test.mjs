import assert from 'node:assert/strict';
import { test } from 'node:test';

import { onRequest } from '../functions/api/checkout/create-order.js';

function makeKv() {
  const writes = [];
  return {
    writes,
    async put(key, value, options) {
      writes.push({ key, value, options });
    },
  };
}

function makeContext({ method = 'POST', body, env = {}, fetchImpl }) {
  const waitUntilPromises = [];
  const request = new Request('https://appvibe.biz.id/api/checkout/create-order', {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json', Origin: 'https://appvibe.biz.id' } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
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

test('create-order uses checkout return URL and schedules pending order forwarding', async () => {
  const checkoutEvents = makeKv();
  const paycoreRequests = [];
  const sheetRequests = [];

  const { context, waitUntilPromises, installFetch } = makeContext({
    body: {
      name: 'Bima Putra',
      email: 'Buyer@Example.com',
      phone: '081234567890',
      pack_id: 'advertiser',
    },
    env: {
      PAYCORE_BASE_URL: 'https://pay-staging.appvibe.biz.id',
      PAYCORE_APP_ID: 'appvibe_vault',
      PAYCORE_KEY_ID: 'key_123',
      PAYCORE_APP_SECRET: 'secret_123',
      LEAD_WEBHOOK_URL: 'https://sheet.example.test/exec',
      CHECKOUT_EVENTS: checkoutEvents,
    },
    async fetchImpl(url, init = {}) {
      if (String(url).includes('/v1/orders')) {
        paycoreRequests.push({ url: String(url), init });
        return Response.json({
          checkout_url: 'https://pay-staging.appvibe.biz.id/checkout/order_123',
          order_id: 'order_123',
          external_order_id: 'vault-test',
          payment_status: 'pending',
        }, { status: 201 });
      }

      sheetRequests.push({ url: String(url), init });
      return Response.json({ ok: true });
    },
  });

  const restoreFetch = installFetch();
  try {
    const response = await onRequest(context);
    assert.equal(response.status, 201);

    assert.equal(paycoreRequests.length, 1);
    const paycoreBody = JSON.parse(paycoreRequests[0].init.body);
    assert.equal(paycoreBody.return_url, 'https://appvibe.biz.id/checkout/');
    assert.equal(paycoreBody.fulfillment_data.source, 'appvibe.biz.id_checkout');

    assert.equal(waitUntilPromises.length, 1);
    await Promise.all(waitUntilPromises);

    assert.equal(sheetRequests.length, 1);
    const sheetBody = JSON.parse(sheetRequests[0].init.body);
    assert.equal(sheetBody.name, 'Bima Putra');
    assert.equal(sheetBody.email, 'Buyer@Example.com');
    assert.equal(sheetBody.whatsapp, '081234567890');
    assert.equal(sheetBody.selected_pack, 'advertiser');
    assert.equal(sheetBody.order_id, 'order_123');
    assert.equal(sheetBody.order_status, 'pending');

    assert.ok(checkoutEvents.writes.some((write) => write.key === 'order:order_123'));
    assert.ok(checkoutEvents.writes.some((write) => write.key === 'buyer:buyer@example.com'));
  } finally {
    restoreFetch();
  }
});

test('create-order rejects non-POST without forwarding partial data', async () => {
  const sheetRequests = [];
  const { context, waitUntilPromises, installFetch } = makeContext({
    method: 'GET',
    env: { LEAD_WEBHOOK_URL: 'https://sheet.example.test/exec' },
    async fetchImpl(url, init = {}) {
      sheetRequests.push({ url: String(url), init });
      return Response.json({ ok: true });
    },
  });

  const restoreFetch = installFetch();
  try {
    const response = await onRequest(context);
    assert.equal(response.status, 405);
    assert.equal(sheetRequests.length, 0);
    assert.equal(waitUntilPromises.length, 0);
  } finally {
    restoreFetch();
  }
});
