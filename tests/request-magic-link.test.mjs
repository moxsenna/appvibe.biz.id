import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest } from '../functions/api/auth/request-magic-link.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';
import { createMemberAccessRepo } from '../functions/lib/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');

const GENERIC_MSG = 'Jika nomor terdaftar, tautan akses telah dikirim melalui WhatsApp.';

async function makeEnv({ fonnteOk = true, fonnteStatus = 200 } = {}) {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  return {
    APPVIBE_DB: d1,
    FONNTE_TOKEN: 'fonnte_tok',
    APP_BASE_URL: 'https://appvibe.biz.id',
    AUTH_TOKEN_PEPPER: 'pepper_abc',
    // Inject a test fetch — the endpoint passes this to sendMagicLinkWhatsApp.
    _fetchImpl: async () => Response.json({ status: fonnteOk }, { status: fonnteStatus }),
  };
}

function makeRequest(body) {
  return new Request('https://appvibe.biz.id/api/auth/request-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://appvibe.biz.id' },
    body: JSON.stringify(body),
  });
}

async function seedPaidMember(env) {
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const member = await repo.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });
  await repo.createOrder({
    id: crypto.randomUUID(), member_id: member.id,
    paycore_order_id: 'o1', external_order_id: 'e1',
    pack_id: 'advertiser', product_key: 'pack_advertiser',
    purchase_type: 'initial_bundle', amount: 97000, currency: 'IDR',
  });
  await repo.fulfillOrder({ paycore_order_id: 'o1' });
  return member;
}

test('unregistered number still gets the generic response', async () => {
  const env = await makeEnv();
  const res = await onRequest({ request: makeRequest({ phone: '081234567890' }), env, waitUntil() {} });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.message, GENERIC_MSG);
});

test('invalid number gets the generic response (no leak)', async () => {
  const env = await makeEnv();
  const res = await onRequest({ request: makeRequest({ phone: '0215550199' }), env, waitUntil() {} });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.message, GENERIC_MSG);
});

test('member without active entitlement is NOT sent a magic link (but response is generic)', async () => {
  const env = await makeEnv();
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  await repo.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: '+6281234567890' });

  let fonnteCalled = false;
  env._fetchImpl = async () => { fonnteCalled = true; return Response.json({ status: true }); };

  const res = await onRequest({ request: makeRequest({ phone: '081234567890' }), env, waitUntil() {} });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.message, GENERIC_MSG);
  assert.equal(fonnteCalled, false);
});

test('member with active entitlement receives a magic link via Fonnte', async () => {
  let fonnteCalls = 0;
  const env = await makeEnv();
  env._fetchImpl = async () => { fonnteCalls++; return Response.json({ status: true }); };

  const member = await seedPaidMember(env);
  const repo = createMemberAccessRepo(env.APPVIBE_DB);

  const res = await onRequest({ request: makeRequest({ phone: '081234567890' }), env, waitUntil() {} });
  assert.equal(res.status, 200);
  assert.equal(fonnteCalls, 1);

  // A magic link was persisted (hashed, not raw).
  const links = await repo.listMagicLinksByMember(member.id);
  assert.equal(links.length, 1);
  assert.equal(links[0].used_at, null);
  assert.equal(links[0].purpose, 'login');

  // Audit log recorded.
  const logs = await repo.listAuditLogs(member.id);
  assert.ok(logs.some((l) => l.event_type === 'magic_link_sent'));
});

test('when Fonnte fails, the magic link is invalidated and response is generic', async () => {
  const env = await makeEnv({ fonnteOk: false });
  const member = await seedPaidMember(env);
  const repo = createMemberAccessRepo(env.APPVIBE_DB);

  const res = await onRequest({ request: makeRequest({ phone: '081234567890' }), env, waitUntil() {} });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.message, GENERIC_MSG);

  // The link created should be marked used (invalidated) so it can't be consumed.
  const links = await repo.listMagicLinksByMember(member.id);
  assert.equal(links.length, 1);
  assert.notEqual(links[0].used_at, null);

  // Audit recorded the failure.
  const logs = await repo.listAuditLogs(member.id);
  assert.ok(logs.some((l) => l.event_type === 'magic_link_failed'));
});

test('rate limit blocks a second request within 60 seconds (response still generic)', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env);
  const repo = createMemberAccessRepo(env.APPVIBE_DB);

  let sendCount = 0;
  env._fetchImpl = async () => { sendCount++; return Response.json({ status: true }); };

  const req = makeRequest({ phone: '081234567890' });
  const ctx = { request: req, env, waitUntil() {} };
  const res1 = await onRequest(ctx);
  assert.equal(res1.status, 200);
  assert.equal(sendCount, 1);

  // Second request immediately — should be rate-limited, generic response.
  const res2 = await onRequest(ctx);
  assert.equal(res2.status, 200);
  assert.equal(sendCount, 1); // Fonnte not called a second time
});

test('POST only — rejects GET', async () => {
  const env = await makeEnv();
  const req = new Request('https://appvibe.biz.id/api/auth/request-magic-link', {
    method: 'GET',
    headers: { Origin: 'https://appvibe.biz.id' },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 405);
});

test('generic response when FONNTE_TOKEN is not configured', async () => {
  const env = await makeEnv();
  env.FONNTE_TOKEN = '';
  await seedPaidMember(env);

  const res = await onRequest({ request: makeRequest({ phone: '081234567890' }), env, waitUntil() {} });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.message, GENERIC_MSG);
});
