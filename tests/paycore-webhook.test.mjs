import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest } from '../functions/api/webhooks/paycore.js';
import { hmacSha256Hex } from '../functions/lib/paycore-sign.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';
import { createMemberAccessRepo } from '../functions/lib/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');

async function makeD1() {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  return d1;
}

async function signWebhook(secret, timestamp, rawBody) {
  return `sha256=${await hmacSha256Hex(secret, `${timestamp}.${rawBody}`)}`;
}

async function makeWebhookContext({ payload, env }) {
  const secret = env.PAYCORE_WEBHOOK_SECRET;
  const rawBody = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = await signWebhook(secret, timestamp, rawBody);
  const request = new Request('https://appvibe.biz.id/api/webhooks/paycore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PayCore-Event-Timestamp': timestamp,
      'X-PayCore-Event-Signature': signature,
    },
    body: rawBody,
  });
  return { context: { request, env, waitUntil() {} } };
}

async function seedPaidOrder(repo, { paycore_order_id = 'order_1', pack_id = 'advertiser', phone = '+6281234567890' } = {}) {
  const member = await repo.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: phone });
  await repo.createOrder({
    id: crypto.randomUUID(),
    member_id: member.id,
    paycore_order_id,
    external_order_id: 'ext_' + paycore_order_id,
    pack_id,
    product_key: pack_id === 'vault_full' ? 'vault_full_license' : `pack_${pack_id}`,
    purchase_type: pack_id === 'vault_full' ? 'full_vault' : 'initial_bundle',
    amount: pack_id === 'vault_full' ? 147000 : 97000,
    currency: 'IDR',
  });
  return member;
}

test('webhook rejects invalid signature', async () => {
  const d1 = await makeD1();
  const request = new Request('https://appvibe.biz.id/api/webhooks/paycore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PayCore-Event-Timestamp': new Date().toISOString(),
      'X-PayCore-Event-Signature': 'sha256=deadbeef',
    },
    body: JSON.stringify({ event_id: 'e1', event_type: 'payment.succeeded', data: { order_id: 'o1' } }),
  });
  const res = await onRequest({ request, env: { PAYCORE_WEBHOOK_SECRET: 's', APPVIBE_DB: d1 }, waitUntil() {} });
  assert.equal(res.status, 401);
});

test('webhook fulfills order, grants entitlement, activates member', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  const member = await seedPaidOrder(repo, { paycore_order_id: 'order_1', pack_id: 'advertiser' });

  const payload = {
    event_id: 'evt_1',
    event_type: 'payment.succeeded',
    data: {
      order_id: 'order_1',
      external_order_id: 'ext_order_1',
      product_key: 'pack_advertiser',
      amount: 97000,
      paid_at: '2026-06-28T00:00:00.000Z',
    },
  };

  const { context } = await makeWebhookContext({
    payload,
    env: { PAYCORE_WEBHOOK_SECRET: 'webhook_secret', APPVIBE_DB: d1 },
  });

  const res = await onRequest(context);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.fulfillment_status, 'delivered');

  const order = await repo.getOrderByPaycoreId('order_1');
  assert.equal(order.payment_status, 'paid');
  assert.equal(order.fulfillment_status, 'delivered');

  const updated = await repo.getMemberById(member.id);
  assert.equal(updated.status, 'active');
  assert.equal(updated.entitlement_version, 1);

  const ents = await repo.getActiveEntitlements(member.id);
  assert.equal(ents.length, 1);
  assert.equal(ents[0].resource_id, 'advertiser');
});

test('duplicate payment.succeeded with same event_id does not double-grant', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  const member = await seedPaidOrder(repo, { paycore_order_id: 'order_1', pack_id: 'advertiser' });

  const payload = {
    event_id: 'evt_dup',
    event_type: 'payment.succeeded',
    data: { order_id: 'order_1', external_order_id: 'ext_order_1', product_key: 'pack_advertiser', amount: 97000 },
  };
  const env = { PAYCORE_WEBHOOK_SECRET: 'webhook_secret', APPVIBE_DB: d1 };

  const { context: ctx1 } = await makeWebhookContext({ payload, env });
  const res1 = await onRequest(ctx1);
  assert.equal(res1.status, 200);

  const { context: ctx2 } = await makeWebhookContext({ payload, env });
  const res2 = await onRequest(ctx2);
  assert.equal(res2.status, 200);
  const body2 = await res2.json();
  assert.equal(body2.duplicate, true);

  const ents = await repo.getActiveEntitlements(member.id);
  assert.equal(ents.length, 1);
  const updated = await repo.getMemberById(member.id);
  assert.equal(updated.entitlement_version, 1);
});

test('webhook grants vault entitlement for vault_full pack', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  const member = await seedPaidOrder(repo, { paycore_order_id: 'order_v', pack_id: 'vault_full' });

  const payload = {
    event_id: 'evt_v',
    event_type: 'payment.succeeded',
    data: { order_id: 'order_v', external_order_id: 'ext_order_v', product_key: 'vault_full_license', amount: 147000 },
  };
  const { context } = await makeWebhookContext({
    payload,
    env: { PAYCORE_WEBHOOK_SECRET: 'webhook_secret', APPVIBE_DB: d1 },
  });

  const res = await onRequest(context);
  assert.equal(res.status, 200);

  const ents = await repo.getActiveEntitlements(member.id);
  assert.equal(ents.length, 1);
  assert.equal(ents[0].resource_type, 'vault');
  assert.equal(ents[0].resource_id, 'vault_full');
});

test('webhook rejects event without APPVIBE_DB', async () => {
  const payload = {
    event_id: 'evt_nodb',
    event_type: 'payment.succeeded',
    data: { order_id: 'order_1', product_key: 'pack_advertiser', amount: 97000 },
  };
  const { context } = await makeWebhookContext({
    payload,
    env: { PAYCORE_WEBHOOK_SECRET: 'webhook_secret' },
  });
  const res = await onRequest(context);
  assert.equal(res.status, 503);
});

test('webhook ignores non-success events', async () => {
  const d1 = await makeD1();
  await seedPaidOrder(createMemberAccessRepo(d1), { paycore_order_id: 'order_1' });

  const payload = {
    event_id: 'evt_other',
    event_type: 'payment.pending',
    data: { order_id: 'order_1' },
  };
  const { context } = await makeWebhookContext({
    payload,
    env: { PAYCORE_WEBHOOK_SECRET: 'webhook_secret', APPVIBE_DB: d1 },
  });
  const res = await onRequest(context);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ignored, true);
});
