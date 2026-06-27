import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest } from '../functions/api/checkout/status.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';
import { createMemberAccessRepo } from '../functions/lib/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');

async function makeD1() {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  return d1;
}

async function seedPendingOrder(repo) {
  const member = await repo.findOrCreateMember({
    name: 'Bima',
    email: 'bima@example.com',
    phone_e164: '+6281234567890',
  });
  await repo.createOrder({
    id: crypto.randomUUID(),
    member_id: member.id,
    paycore_order_id: 'order_paid_remote',
    external_order_id: 'ext_order_paid_remote',
    pack_id: 'commerce',
    product_key: 'pack_commerce',
    purchase_type: 'initial_bundle',
    amount: 97000,
    currency: 'IDR',
  });
}

test('status persists PayCore payment reconciliation to D1', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  await seedPendingOrder(repo);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), 'https://pay.appvibe.biz.id/v1/orders/order_paid_remote');
    return Response.json({
      order_id: 'order_paid_remote',
      payment_status: 'paid',
      fulfillment_status: 'failed',
    });
  };

  try {
    const request = new Request('https://appvibe.biz.id/api/checkout/status?order_id=order_paid_remote');
    const res = await onRequest({
      request,
      env: {
        APPVIBE_DB: d1,
        PAYCORE_BASE_URL: 'https://pay.appvibe.biz.id',
        PAYCORE_APP_ID: 'appvibe_vault',
        PAYCORE_KEY_ID: 'key_1',
        PAYCORE_APP_SECRET: 'secret_1',
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.payment_status, 'paid');
    assert.equal(body.fulfillment_status, 'pending');

    const persisted = await repo.getOrderByPaycoreId('order_paid_remote');
    assert.equal(persisted.payment_status, 'paid');
    assert.equal(persisted.fulfillment_status, 'pending');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
