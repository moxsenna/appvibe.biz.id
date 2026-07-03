import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest } from '../functions/api/member/marketing-kit.js';
import { onRequest as meOnRequest } from '../functions/api/member/me.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';
import { createMemberAccessRepo } from '../functions/lib/db.js';
import { generateToken, hashToken } from '../functions/lib/auth-crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');
const PEPPER = 'pepper_abc';

async function makeEnv(overrides = {}) {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  return { APPVIBE_DB: d1, AUTH_TOKEN_PEPPER: PEPPER, ACCESS_RESOURCE_URLS_JSON: '{}', ...overrides };
}

async function seedPaidMember(env, { pack_id = 'advertiser' } = {}) {
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const member = await repo.findOrCreateMember({ name: 'Bima', email: 'b@x.com', phone_e164: '+6281234567890' });
  await repo.createOrder({
    id: crypto.randomUUID(), member_id: member.id,
    paycore_order_id: 'o1', external_order_id: 'e1',
    pack_id, product_key: pack_id === 'vault_full' ? 'vault_full_license' : `pack_${pack_id}`,
    purchase_type: pack_id === 'vault_full' ? 'full_vault' : 'initial_bundle',
    amount: 97000, currency: 'IDR',
  });
  await repo.fulfillOrder({ paycore_order_id: 'o1' });
  return member;
}

async function cookieFor(env, member) {
  const raw = generateToken();
  await createMemberAccessRepo(env.APPVIBE_DB).createSession({
    id: crypto.randomUUID(), member_id: member.id,
    token_hash: await hashToken(raw, PEPPER),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });
  return `av_session=${raw}`;
}

test('401 without session', async () => {
  const env = await makeEnv();
  const req = new Request('https://appvibe.biz.id/api/member/marketing-kit?app_id=adsprint');
  const res = await onRequest({ request: req, env });
  assert.equal(res.status, 401);
});

test('403 when app not in entitlement', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'creator' });
  const req = new Request('https://appvibe.biz.id/api/member/marketing-kit?app_id=adsprint', {
    headers: { Cookie: await cookieFor(env, member) },
  });
  const res = await onRequest({ request: req, env });
  assert.equal(res.status, 403);
});

test('200 JSON html for entitled app', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const req = new Request('https://appvibe.biz.id/api/member/marketing-kit?app_id=adsprint&format=html', {
    headers: { Cookie: await cookieFor(env, member), Accept: 'application/json' },
  });
  const res = await onRequest({ request: req, env });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.app_id, 'adsprint');
  assert.ok(data.html.includes('<!doctype html>'));
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('download attachment', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'vault_full' });
  const req = new Request('https://appvibe.biz.id/api/member/marketing-kit?app_id=pikat&download=1', {
    headers: { Cookie: await cookieFor(env, member) },
  });
  const res = await onRequest({ request: req, env });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Disposition') || '', /attachment/);
  assert.match(res.headers.get('Content-Disposition') || '', /pikat-landing-template\.html/);
});

test('me includes marketing_kit_available on entitled apps only', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const req = new Request('https://appvibe.biz.id/api/member/me', {
    headers: { Cookie: await cookieFor(env, member) },
  });
  const res = await meOnRequest({ request: req, env });
  const data = await res.json();
  const ads = data.apps.find((a) => a.id === 'adsprint');
  assert.ok(ads, 'adsprint in entitled apps');
  assert.equal(ads.marketing_kit_available, true);
  assert.ok(!data.apps.some((a) => a.id === 'pikat'), 'pikat not entitled on advertiser pack');
});