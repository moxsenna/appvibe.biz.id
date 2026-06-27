import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest } from '../functions/api/checkout/create-order.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';
import { createMemberAccessRepo } from '../functions/lib/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');

async function makeD1() {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  return d1;
}

function makeContext({ method = 'POST', body, env = {}, fetchImpl }) {
  const request = new Request('https://appvibe.biz.id/api/checkout/create-order', {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json', Origin: 'https://appvibe.biz.id' } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    context: { request, env, waitUntil() {} },
    installFetch() {
      const original = globalThis.fetch;
      globalThis.fetch = fetchImpl;
      return () => { globalThis.fetch = original; };
    },
  };
}

test('create-order requires a valid whatsapp number', async () => {
  const d1 = await makeD1();
  const { context, installFetch } = makeContext({
    body: { name: 'Bima', email: 'bima@example.com', phone: '0215550199', pack_id: 'advertiser' },
    env: { APPVIBE_DB: d1, PAYCORE_KEY_ID: 'k', PAYCORE_APP_SECRET: 's' },
    async fetchImpl() { throw new Error('should not call paycore'); },
  });
  const restore = installFetch();
  try {
    const res = await onRequest(context);
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.error, 'validation');
  } finally { restore(); }
});

test('create-order creates a member and persists order to D1', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  const paycoreCalls = [];

  const { context, installFetch } = makeContext({
    body: { name: 'Bima Putra', email: 'Buyer@Example.com', phone: '081234567890', pack_id: 'advertiser' },
    env: { APPVIBE_DB: d1, PAYCORE_KEY_ID: 'k', PAYCORE_APP_SECRET: 's' },
    async fetchImpl(url, init) {
      if (String(url).includes('/v1/orders')) {
        paycoreCalls.push({ url: String(url), init });
        return Response.json({
          checkout_url: 'https://pay/checkout/order_1',
          order_id: 'order_1',
          external_order_id: 'vault-test',
          payment_status: 'pending',
        }, { status: 201 });
      }
      return Response.json({ ok: true });
    },
  });

  const restore = installFetch();
  try {
    const res = await onRequest(context);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.order_id, 'order_1');

    // Member created with canonical phone.
    const member = await repo.getMemberByPhone('+6281234567890');
    assert.ok(member);
    assert.equal(member.email_normalized, 'buyer@example.com');

    // Order persisted to D1 and linked to member.
    const order = await repo.getOrderByPaycoreId('order_1');
    assert.ok(order);
    assert.equal(order.member_id, member.id);
    assert.equal(order.pack_id, 'advertiser');
    assert.equal(order.payment_status, 'pending');
  } finally { restore(); }
});

test('create-order does not overwrite existing member email on a new checkout', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  // Pre-existing member with a known email.
  const existing = await repo.findOrCreateMember({ name: 'Bima', email: 'first@example.com', phone_e164: '+6281234567890' });

  const { context, installFetch } = makeContext({
    body: { name: 'Bima Putra', email: 'second@example.com', phone: '081234567890', pack_id: 'commerce' },
    env: { APPVIBE_DB: d1, PAYCORE_KEY_ID: 'k', PAYCORE_APP_SECRET: 's' },
    async fetchImpl(url) {
      if (String(url).includes('/v1/orders')) {
        return Response.json({ checkout_url: 'https://pay/c', order_id: 'order_2', payment_status: 'pending' }, { status: 201 });
      }
      return Response.json({ ok: true });
    },
  });
  const restore = installFetch();
  try {
    const res = await onRequest(context);
    assert.equal(res.status, 201);
    const member = await repo.getMemberByPhone('+6281234567890');
    assert.equal(member.id, existing.id);
    // Original email preserved — not clobbered by the new checkout input.
    assert.equal(member.email_normalized, 'first@example.com');
  } finally { restore(); }
});
