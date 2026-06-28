import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest } from '../functions/api/member/launch.js';
import { onRequest as consumeOnRequest } from '../functions/api/auth/consume-magic-link.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';
import { createMemberAccessRepo } from '../functions/lib/db.js';
import { generateToken, hashToken } from '../functions/lib/auth-crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');
const APP_LINKS_MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0002_app_links.sql'), 'utf8');
const PEPPER = 'pepper_abc';

const RESOURCE_CONFIG = JSON.stringify({
  apps: {
    adsprint: 'https://ads.example.com',
    pikat: 'https://pikat.example.com',
    rupa: 'https://rupa.example.com',
    mula: 'https://mula.example.com',
    arah: 'https://arah.example.com',
    cetak: 'https://cetak.example.com',
    adegan: 'https://adegan.example.com',
    suara: 'https://suara.example.com',
    bukti: 'https://bukti.example.com',
    mimik: 'https://mimik.example.com',
    ritme: 'https://ritme.example.com',
    tayang: 'https://tayang.example.com',
    katalog: 'https://katalog.example.com',
  },
  resources: {
    advertiser: { marketing_kit: 'https://mk-adv.example.com', guide: 'https://guide-adv.example.com' },
    commerce: { marketing_kit: 'https://mk-com.example.com' },
    creator: {},
    brand_launch: {},
  },
});

async function makeEnv(overrides = {}) {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  await applyMigration(d1, APP_LINKS_MIGRATION_SQL);
  return {
    APPVIBE_DB: d1,
    FONNTE_TOKEN: 'fonnte_tok',
    APP_BASE_URL: 'https://appvibe.biz.id',
    AUTH_TOKEN_PEPPER: PEPPER,
    ACCESS_RESOURCE_URLS_JSON: RESOURCE_CONFIG,
    _fetchImpl: async () => Response.json({ status: true }),
    ...overrides,
  };
}

async function seedPaidMember(env, { pack_id = 'advertiser', phone = '+6281234567890', name = 'Bima' } = {}) {
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const member = await repo.findOrCreateMember({ name, email: 'bima@example.com', phone_e164: phone });
  await repo.createOrder({
    id: crypto.randomUUID(), member_id: member.id,
    paycore_order_id: 'o1', external_order_id: 'e1',
    pack_id, product_key: pack_id === 'vault_full' ? 'vault_full_license' : `pack_${pack_id}`,
    purchase_type: pack_id === 'vault_full' ? 'full_vault' : 'initial_bundle',
    amount: pack_id === 'vault_full' ? 147000 : 97000, currency: 'IDR',
  });
  await repo.fulfillOrder({ paycore_order_id: 'o1' });
  return member;
}

async function getAuthCookie(env, member) {
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken, PEPPER);
  await createMemberAccessRepo(env.APPVIBE_DB).createSession({
    id: crypto.randomUUID(), member_id: member.id, token_hash: tokenHash,
    expires_at: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
  });
  return rawToken;
}

// ── Tests ──

test('launch: redirects to app URL for authorized app', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=adsprint', {
    method: 'GET',
    headers: { Cookie: `av_session=${cookie}` },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://ads.example.com');
  assert.match(res.headers.get('Cache-Control') || '', /no-store/);
  assert.equal(res.headers.get('Referrer-Policy'), 'no-referrer');
});

test('launch: uses admin D1 URL when ENVIRONMENT=development', async () => {
  const env = await makeEnv({ ENVIRONMENT: 'development' });
  await env.APPVIBE_DB
    .prepare('INSERT INTO app_links (app_id, launch_url, updated_at) VALUES (?, ?, ?)')
    .bind('adsprint', 'https://admin-link.example.com', new Date().toISOString())
    .run();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=adsprint', {
    method: 'GET',
    headers: { Cookie: `av_session=${cookie}` },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://admin-link.example.com');
});

test('production: D1 HTTPS URL wins over Secret fallback', async () => {
  const env = await makeEnv(); // production (no ENVIRONMENT set)
  await env.APPVIBE_DB
    .prepare('INSERT INTO app_links (app_id, launch_url, updated_at) VALUES (?, ?, ?)')
    .bind('adsprint', 'https://admin-link.example.com', new Date().toISOString())
    .run();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=adsprint', {
    method: 'GET',
    headers: { Cookie: `av_session=${cookie}` },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 302);
  // D1 is primary in production — HTTPS URL wins over Secret.
  assert.equal(res.headers.get('Location'), 'https://admin-link.example.com');
});

test('production: D1 localhost rejected, falls through to Secret', async () => {
  const env = await makeEnv(); // production (no ENVIRONMENT set)
  await env.APPVIBE_DB
    .prepare('INSERT INTO app_links (app_id, launch_url, updated_at) VALUES (?, ?, ?)')
    .bind('adsprint', 'http://localhost:3001', new Date().toISOString())
    .run();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=adsprint', {
    method: 'GET',
    headers: { Cookie: `av_session=${cookie}` },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  // Localhost rejected in production → falls through to Secret → 302
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://ads.example.com');
});

test('production: D1 localhost + Secret empty → branded 503', async () => {
  const env = await makeEnv({ ACCESS_RESOURCE_URLS_JSON: '{"apps":{},"resources":{}}' }); // no Secret
  await env.APPVIBE_DB
    .prepare('INSERT INTO app_links (app_id, launch_url, updated_at) VALUES (?, ?, ?)')
    .bind('adsprint', 'http://localhost:3001', new Date().toISOString())
    .run();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=adsprint', {
    method: 'GET',
    headers: { Cookie: `av_session=${cookie}`, Accept: 'text/html' },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 503);
  const ct = res.headers.get('Content-Type') || '';
  assert.ok(ct.includes('text/html'), `Expected text/html, got ${ct}`);
  const body = await res.text();
  assert.ok(body.includes('AppVibe Vault'));
});

test('launch: rejects app not in buyer entitlement', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' }); // adsprint, rupa, adegan, bukti, mula
  const cookie = await getAuthCookie(env, member);

  // pikat is NOT in advertiser pack
  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=pikat', {
    method: 'GET',
    headers: { Cookie: `av_session=${cookie}` },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 403);
});

test('launch: full vault unlocks all apps', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'vault_full' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=katalog', {
    method: 'GET',
    headers: { Cookie: `av_session=${cookie}` },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://katalog.example.com');
});

test('launch: rejects unauthenticated request', async () => {
  const env = await makeEnv();
  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=adsprint');
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 401);
});

test('launch: rejects missing app_id', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env);
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/launch', {
    method: 'GET',
    headers: { Cookie: `av_session=${cookie}` },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 400);
});

test('launch: returns 503 when app URL not configured', async () => {
  const env = await makeEnv({ ACCESS_RESOURCE_URLS_JSON: '{"apps":{},"resources":{}}' });
  const member = await seedPaidMember(env);
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=adsprint', {
    method: 'GET',
    headers: { Cookie: `av_session=${cookie}` },
  });
  const res = await onRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.ok(data.message.includes('belum'));
});
