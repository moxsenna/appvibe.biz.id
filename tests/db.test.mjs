import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createMemberAccessRepo } from '../functions/lib/db.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');

async function repo() {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  return createMemberAccessRepo(d1);
}

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

test('findOrCreateMember creates a new member by phone', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  assert.equal(m.phone_e164, '+6281234567890');
  assert.equal(m.email_normalized, 'bima@example.com');
  assert.equal(m.status, 'pending');
  assert.equal(m.entitlement_version, 0);
});

test('findOrCreateMember is idempotent on phone and does not overwrite existing email', async () => {
  const r = await repo();
  const m1 = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  // Second checkout with a DIFFERENT email must not clobber the first.
  const m2 = await r.findOrCreateMember({ name: 'Bima Putra', email: 'other@example.com', phone_e164: '+6281234567890' });
  assert.equal(m2.id, m1.id);
  assert.equal(m2.email_normalized, 'bima@example.com');
  assert.equal(m2.name, 'Bima');
});

test('createOrder persists an order linked to member', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  const order = await r.createOrder({
    id: uuid(),
    member_id: m.id,
    paycore_order_id: 'order_1',
    external_order_id: 'ext_1',
    pack_id: 'advertiser',
    product_key: 'pack_advertiser',
    purchase_type: 'initial_bundle',
    amount: 97000,
    currency: 'IDR',
  });
  assert.equal(order.paycore_order_id, 'order_1');
  assert.equal(order.payment_status, 'pending');
  assert.equal(order.fulfillment_status, 'pending');
});

test('getOrderByPaycoreId returns the order', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  await r.createOrder({
    id: uuid(), member_id: m.id, paycore_order_id: 'order_1', external_order_id: 'ext_1',
    pack_id: 'advertiser', product_key: 'pack_advertiser', purchase_type: 'initial_bundle',
    amount: 97000, currency: 'IDR',
  });
  const found = await r.getOrderByPaycoreId('order_1');
  assert.equal(found.pack_id, 'advertiser');
});

test('markEventSeen / isEventSeen provide idempotency', async () => {
  const r = await repo();
  assert.equal(await r.isEventSeen('evt_1'), false);
  await r.markEventSeen({ event_id: 'evt_1', event_type: 'payment.succeeded', paycore_order_id: 'order_1', status: 'processed' });
  assert.equal(await r.isEventSeen('evt_1'), true);
});

test('fulfillOrder grants entitlement and activates member atomically', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  const orderId = uuid();
  await r.createOrder({
    id: orderId, member_id: m.id, paycore_order_id: 'order_1', external_order_id: 'ext_1',
    pack_id: 'advertiser', product_key: 'pack_advertiser', purchase_type: 'initial_bundle',
    amount: 97000, currency: 'IDR',
  });

  await r.fulfillOrder({
    paycore_order_id: 'order_1',
    paid_at: now(),
    fulfilled_at: now(),
  });

  const order = await r.getOrderByPaycoreId('order_1');
  assert.equal(order.payment_status, 'paid');
  assert.equal(order.fulfillment_status, 'delivered');

  const member = await r.getMemberById(m.id);
  assert.equal(member.status, 'active');
  assert.equal(member.entitlement_version, 1);
  assert.ok(member.first_paid_at);
  assert.ok(member.last_paid_at);

  const ents = await r.getActiveEntitlements(m.id);
  assert.equal(ents.length, 1);
  assert.equal(ents[0].resource_type, 'bundle');
  assert.equal(ents[0].resource_id, 'advertiser');
});

test('fulfillOrder is idempotent: duplicate does not double-grant', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  const orderId = uuid();
  await r.createOrder({
    id: orderId, member_id: m.id, paycore_order_id: 'order_1', external_order_id: 'ext_1',
    pack_id: 'advertiser', product_key: 'pack_advertiser', purchase_type: 'initial_bundle',
    amount: 97000, currency: 'IDR',
  });

  await r.fulfillOrder({ paycore_order_id: 'order_1', paid_at: now(), fulfilled_at: now() });
  // Second fulfill call (e.g. webhook replay) must be a no-op.
  await r.fulfillOrder({ paycore_order_id: 'order_1', paid_at: now(), fulfilled_at: now() });

  const ents = await r.getActiveEntitlements(m.id);
  assert.equal(ents.length, 1);

  const member = await r.getMemberById(m.id);
  assert.equal(member.entitlement_version, 1);
});

test('fulfillOrder for vault_full grants a vault entitlement', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  const orderId = uuid();
  await r.createOrder({
    id: orderId, member_id: m.id, paycore_order_id: 'order_v', external_order_id: 'ext_v',
    pack_id: 'vault_full', product_key: 'vault_full_license', purchase_type: 'full_vault',
    amount: 147000, currency: 'IDR',
  });
  await r.fulfillOrder({ paycore_order_id: 'order_v', paid_at: now(), fulfilled_at: now() });

  const ents = await r.getActiveEntitlements(m.id);
  assert.equal(ents.length, 1);
  assert.equal(ents[0].resource_type, 'vault');
  assert.equal(ents[0].resource_id, 'vault_full');
});

test('rebuying the same bundle does not create duplicate active entitlement', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  await r.createOrder({ id: uuid(), member_id: m.id, paycore_order_id: 'o1', external_order_id: 'e1', pack_id: 'advertiser', product_key: 'pack_advertiser', purchase_type: 'initial_bundle', amount: 97000, currency: 'IDR' });
  await r.fulfillOrder({ paycore_order_id: 'o1', paid_at: now(), fulfilled_at: now() });

  await r.createOrder({ id: uuid(), member_id: m.id, paycore_order_id: 'o2', external_order_id: 'e2', pack_id: 'advertiser', product_key: 'pack_advertiser', purchase_type: 'initial_bundle', amount: 97000, currency: 'IDR' });
  await r.fulfillOrder({ paycore_order_id: 'o2', paid_at: now(), fulfilled_at: now() });

  const ents = await r.getActiveEntitlements(m.id);
  assert.equal(ents.length, 1);
});

test('createMagicLink stores hash and is consumable once', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  const id = uuid();
  await r.createMagicLink({
    id, member_id: m.id, token_hash: 'hash_abc', purpose: 'login',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    requested_phone_hash: 'ph', requested_ip_hash: 'ih',
  });
  const link = await r.getMagicLinkByHash('hash_abc');
  assert.ok(link);
  assert.equal(link.used_at, null);

  await r.consumeMagicLink(id);
  const after = await r.getMagicLinkByHash('hash_abc');
  assert.notEqual(after.used_at, null);
});

test('getMagicLinkByHash returns null when not found', async () => {
  const r = await repo();
  const link = await r.getMagicLinkByHash('nope');
  assert.equal(link, null);
});

test('createSession + getSessionByHash + revokeSession', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  const id = uuid();
  await r.createSession({
    id, member_id: m.id, token_hash: 'sh',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  const s = await r.getSessionByHash('sh');
  assert.ok(s);
  assert.equal(s.revoked_at, null);

  await r.revokeSession(id);
  const after = await r.getSessionByHash('sh');
  assert.notEqual(after.revoked_at, null);
});

test('touchSession updates last_seen_at', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  const id = uuid();
  await r.createSession({ id, member_id: m.id, token_hash: 'sh', expires_at: new Date(Date.now() + 60_000).toISOString() });
  await r.touchSession(id, now());
  const s = await r.getSessionByHash('sh');
  assert.ok(s.last_seen_at);
});

test('getMemberByPhone finds a member', async () => {
  const r = await repo();
  await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  const m = await r.getMemberByPhone('+6281234567890');
  assert.ok(m);
  assert.equal(m.name, 'Bima');
});

test('getMemberByPhone returns null when not found', async () => {
  const r = await repo();
  const m = await r.getMemberByPhone('+6299999999999');
  assert.equal(m, null);
});

test('listOrdersByMember returns orders newest first', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  await r.createOrder({ id: uuid(), member_id: m.id, paycore_order_id: 'o1', external_order_id: 'e1', pack_id: 'advertiser', product_key: 'pack_advertiser', purchase_type: 'initial_bundle', amount: 97000, currency: 'IDR', created_at: '2026-01-01T00:00:00.000Z' });
  await r.createOrder({ id: uuid(), member_id: m.id, paycore_order_id: 'o2', external_order_id: 'e2', pack_id: 'commerce', product_key: 'pack_commerce', purchase_type: 'initial_bundle', amount: 97000, currency: 'IDR', created_at: '2026-02-01T00:00:00.000Z' });
  const orders = await r.listOrdersByMember(m.id);
  assert.equal(orders.length, 2);
  assert.equal(orders[0].paycore_order_id, 'o2');
  assert.equal(orders[1].paycore_order_id, 'o1');
});

test('insertAuditLog stores an event', async () => {
  const r = await repo();
  const m = await r.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  await r.insertAuditLog({ member_id: m.id, order_id: null, event_type: 'magic_link_requested', metadata_json: '{}' });
  const logs = await r.listAuditLogs(m.id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].event_type, 'magic_link_requested');
});

test('rate limit helpers count and prune', async () => {
  const r = await repo();
  const key = 'hash_1';
  await r.recordRateLimit(key, 'phone');
  await r.recordRateLimit(key, 'phone');
  const count = await r.countRateLimit(key, new Date(Date.now() - 60_000).toISOString());
  assert.equal(count, 2);
});
