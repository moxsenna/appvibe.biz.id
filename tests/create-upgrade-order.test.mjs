import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest } from '../functions/api/checkout/create-upgrade-order.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';
import { createMemberAccessRepo } from '../functions/lib/db.js';
import { hashToken } from '../functions/lib/auth-crypto.js';
import { getFullVaultUpgradeOffer, isEligibleForFullVaultUpgrade } from '../functions/lib/upgrades.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');

async function makeD1() {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  return d1;
}

async function seedMemberSession(repo, { name = 'Bima', email = 'bima@example.com', phone = '+6281234567890', pepper = 'pepper_abc' } = {}) {
  const member = await repo.findOrCreateMember({ name, email, phone_e164: phone });
  const rawToken = 'tok_' + crypto.randomUUID();
  const tokenHash = await hashToken(rawToken, pepper);
  await repo.createSession({
    id: crypto.randomUUID(),
    member_id: member.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });
  return { member, rawToken };
}

async function grantBundleEntitlement(d1, memberId, bundleId = 'brand_launch') {
  const ts = new Date().toISOString();
  await d1.prepare(
    `INSERT INTO entitlements (id, member_id, resource_type, resource_id, status, source_order_id, granted_at, created_at, updated_at)
     VALUES (?, ?, 'bundle', ?, 'active', NULL, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), memberId, bundleId, ts, ts, ts).run();
}

async function createPaidBundleOrder(repo, memberId, packId = 'brand_launch') {
  const order = await repo.createOrder({
    id: crypto.randomUUID(),
    member_id: memberId,
    paycore_order_id: 'pc_' + crypto.randomUUID(),
    external_order_id: 'ext_' + crypto.randomUUID(),
    pack_id: packId,
    product_key: packId === 'brand_launch' ? 'pack_branding' : `pack_${packId}`,
    purchase_type: 'initial_bundle',
    amount: 97000,
    currency: 'IDR',
  });
  await repo.updateOrderPaymentStatus({ paycore_order_id: order.paycore_order_id, payment_status: 'paid' });
  await d1UpdateFulfillment(repo, order.paycore_order_id);
  return order;
}

async function d1UpdateFulfillment(repo, paycoreOrderId) {
  const order = await repo.getOrderByPaycoreId(paycoreOrderId);
  const ts = new Date().toISOString();
  await repo.getMemberById(order.member_id); // no-op, ensure member exists
  await repo.updateOrderPaymentStatus({ paycore_order_id: paycoreOrderId, payment_status: 'paid' });
  const db = repo.getOrderByPaycoreId ? null : null;
  // direct fake d1 update via repo DB access not exposed; use SQL through known fake d1 in tests instead outside helper.
}

function makeContext({ cookie = '', body = {}, env = {}, fetchImpl }) {
  const request = new Request('https://appvibe.biz.id/api/checkout/create-upgrade-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://appvibe.biz.id',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
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

test('upgrade helper rejects when no access summary', () => {
  const result = isEligibleForFullVaultUpgrade({ accessSummary: null, orders: [] });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'missing_access_summary');
});

test('upgrade helper returns eligible for bundle owner with paid delivered order', () => {
  const offer = getFullVaultUpgradeOffer({
    accessSummary: { hasFullVault: false, bundleIds: ['brand_launch'], appIds: ['arah'] },
    orders: [{ pack_id: 'brand_launch', payment_status: 'paid', fulfillment_status: 'delivered' }],
  });
  assert.equal(offer.eligible, true);
  assert.equal(offer.upgradeAmount, 50000);
  assert.equal(offer.purchaseType, 'upgrade');
});

test('create-upgrade-order rejects unauthenticated request', async () => {
  const d1 = await makeD1();
  const { context, installFetch } = makeContext({
    env: { APPVIBE_DB: d1, AUTH_TOKEN_PEPPER: 'pepper_abc', PAYCORE_KEY_ID: 'k', PAYCORE_APP_SECRET: 's' },
    async fetchImpl() { throw new Error('should not call paycore'); },
  });
  const restore = installFetch();
  try {
    const res = await onRequest(context);
    assert.equal(res.status, 401);
  } finally { restore(); }
});

test('create-upgrade-order rejects user with no bundle access', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  const { rawToken } = await seedMemberSession(repo);
  const { context, installFetch } = makeContext({
    cookie: `av_session=${rawToken}`,
    env: { APPVIBE_DB: d1, AUTH_TOKEN_PEPPER: 'pepper_abc', PAYCORE_KEY_ID: 'k', PAYCORE_APP_SECRET: 's' },
    async fetchImpl() { throw new Error('should not call paycore'); },
  });
  const restore = installFetch();
  try {
    const res = await onRequest(context);
    assert.equal(res.status, 403);
  } finally { restore(); }
});

test('create-upgrade-order rejects already full vault member', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  const { member, rawToken } = await seedMemberSession(repo);
  const ts = new Date().toISOString();
  await d1.prepare(
    `INSERT INTO entitlements (id, member_id, resource_type, resource_id, status, source_order_id, granted_at, created_at, updated_at)
     VALUES (?, ?, 'vault', 'vault_full', 'active', NULL, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), member.id, ts, ts, ts).run();

  const { context, installFetch } = makeContext({
    cookie: `av_session=${rawToken}`,
    env: { APPVIBE_DB: d1, AUTH_TOKEN_PEPPER: 'pepper_abc', PAYCORE_KEY_ID: 'k', PAYCORE_APP_SECRET: 's' },
    async fetchImpl() { throw new Error('should not call paycore'); },
  });
  const restore = installFetch();
  try {
    const res = await onRequest(context);
    assert.equal(res.status, 409);
  } finally { restore(); }
});

test('create-upgrade-order rejects bundle member without qualifying order history', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  const { member, rawToken } = await seedMemberSession(repo);
  await grantBundleEntitlement(d1, member.id, 'brand_launch');

  const { context, installFetch } = makeContext({
    cookie: `av_session=${rawToken}`,
    env: { APPVIBE_DB: d1, AUTH_TOKEN_PEPPER: 'pepper_abc', PAYCORE_KEY_ID: 'k', PAYCORE_APP_SECRET: 's' },
    async fetchImpl() { throw new Error('should not call paycore'); },
  });
  const restore = installFetch();
  try {
    const res = await onRequest(context);
    assert.equal(res.status, 422);
  } finally { restore(); }
});

test('create-upgrade-order creates upgrade order for eligible member', async () => {
  const d1 = await makeD1();
  const repo = createMemberAccessRepo(d1);
  const { member, rawToken } = await seedMemberSession(repo);
  await grantBundleEntitlement(d1, member.id, 'brand_launch');
  const order = await repo.createOrder({
    id: crypto.randomUUID(),
    member_id: member.id,
    paycore_order_id: 'paid_bundle_1',
    external_order_id: 'ext_paid_bundle_1',
    pack_id: 'brand_launch',
    product_key: 'pack_branding',
    purchase_type: 'initial_bundle',
    amount: 97000,
    currency: 'IDR',
  });
  await d1.prepare("UPDATE orders SET payment_status='paid', fulfillment_status='delivered' WHERE paycore_order_id = ?")
    .bind(order.paycore_order_id).run();

  const paycoreCalls = [];
  const { context, installFetch } = makeContext({
    cookie: `av_session=${rawToken}`,
    body: { source: 'brand_studio_locked_card', app_id: 'katalog' },
    env: { APPVIBE_DB: d1, AUTH_TOKEN_PEPPER: 'pepper_abc', PAYCORE_KEY_ID: 'k', PAYCORE_APP_SECRET: 's' },
    async fetchImpl(url, init) {
      if (String(url).includes('/v1/orders')) {
        paycoreCalls.push(JSON.parse(init.body));
        return Response.json({
          checkout_url: 'https://pay/checkout/upgrade_1',
          order_id: 'upgrade_1',
          external_order_id: 'vault-upgrade-test',
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
    assert.equal(data.amount, 50000);
    assert.equal(data.purchase_type, 'upgrade');

    const created = await repo.getOrderByPaycoreId('upgrade_1');
    assert.ok(created);
    assert.equal(created.pack_id, 'vault_full');
    assert.equal(created.amount, 50000);
    assert.equal(created.purchase_type, 'upgrade');

    assert.equal(paycoreCalls.length, 1);
    assert.equal(paycoreCalls[0].product_key, 'vault_full_license');
    assert.equal(paycoreCalls[0].amount, 50000);
    assert.equal(paycoreCalls[0].fulfillment_data.offer_type, 'upgrade_full_vault');
    assert.equal(paycoreCalls[0].fulfillment_data.app_id, 'katalog');
  } finally { restore(); }
});
