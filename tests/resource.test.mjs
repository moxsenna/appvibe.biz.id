import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest as launchOnRequest } from '../functions/api/member/launch.js';
import { onRequest as resourceOnRequest } from '../functions/api/member/resource.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';
import { createMemberAccessRepo } from '../functions/lib/db.js';
import { getAppLaunchUrl, getBundleResources, parseResourceConfig } from '../functions/lib/access-resources.js';
import { generateToken, hashToken } from '../functions/lib/auth-crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');
const PEPPER = 'pepper_abc';

const RESOURCE_CONFIG = JSON.stringify({
  apps: {
    adsprint: 'https://ads.example.com',
    pikat: 'https://pikat.example.com',
    rupa: 'https://rupa.example.com',
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

async function seedPaidMember(env, { pack_id = 'advertiser', phone = '+6281234567890' } = {}) {
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const member = await repo.findOrCreateMember({ name: 'Bima', email: 'bima@example.com', phone_e164: phone });
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

// ── URL Validator Tests ──

test('strict https: accepts valid https URL', () => {
  assert.equal(getAppLaunchUrl('adsprint', RESOURCE_CONFIG), 'https://ads.example.com');
});

test('strict https: rejects http:// URL', () => {
  const cfg = JSON.stringify({ apps: { test: 'http://insecure.example.com' }, resources: {} });
  assert.equal(getAppLaunchUrl('test', cfg), null);
});

test('strict https: rejects malformed string', () => {
  const cfg = JSON.stringify({ apps: { test: 'httpswhatever' }, resources: {} });
  assert.equal(getAppLaunchUrl('test', cfg), null);
});

test('strict https: rejects empty string', () => {
  const cfg = JSON.stringify({ apps: { test: '' }, resources: {} });
  assert.equal(getAppLaunchUrl('test', cfg), null);
});

test('strict https: rejects ftp:// URL', () => {
  const cfg = JSON.stringify({ apps: { test: 'ftp://files.example.com' }, resources: {} });
  assert.equal(getAppLaunchUrl('test', cfg), null);
});

test('strict https: rejects javascript: pseudo-protocol', () => {
  const cfg = JSON.stringify({ apps: { test: 'javascript:alert(1)' }, resources: {} });
  assert.equal(getAppLaunchUrl('test', cfg), null);
});

test('getBundleResources rejects http:// marketing_kit', () => {
  const cfg = JSON.stringify({ apps: {}, resources: { advertiser: { marketing_kit: 'http://not-secure.com' } } });
  const res = getBundleResources('advertiser', cfg);
  assert.equal(res.marketing_kit, null);
});

test('getBundleResources accepts valid https guide', () => {
  const res = getBundleResources('advertiser', RESOURCE_CONFIG);
  assert.equal(res.guide, 'https://guide-adv.example.com');
});

// ── /resource Endpoint Tests ──

test('resource: buyer 1 bundle can access own bundle marketing_kit', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=advertiser&type=marketing_kit', {
    headers: { Cookie: `av_session=${cookie}`, Accept: 'application/json' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://mk-adv.example.com');
});

test('resource: buyer 1 bundle CANNOT access another bundle', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=commerce&type=marketing_kit', {
    headers: { Cookie: `av_session=${cookie}`, Accept: 'application/json' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 403);
});

test('resource: full vault can access any canonical bundle', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'vault_full' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=commerce&type=marketing_kit', {
    headers: { Cookie: `av_session=${cookie}`, Accept: 'application/json' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://mk-com.example.com');
});

test('resource: rejects non-canonical bundle ID', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'vault_full' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=evil_bundle&type=marketing_kit', {
    headers: { Cookie: `av_session=${cookie}`, Accept: 'application/json' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 400);
});

test('resource: rejects invalid type', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env);
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=advertiser&type=hack', {
    headers: { Cookie: `av_session=${cookie}`, Accept: 'application/json' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 400);
});

test('resource: returns 503 when URL not configured', async () => {
  const env = await makeEnv();
  const member = await seedPaidMember(env, { pack_id: 'creator' });
  const cookie = await getAuthCookie(env, member);

  // creator has no marketing_kit configured
  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=creator&type=marketing_kit', {
    headers: { Cookie: `av_session=${cookie}`, Accept: 'application/json' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 503);
});

test('resource: rejects unauthenticated request', async () => {
  const env = await makeEnv();
  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=advertiser&type=marketing_kit', {
    headers: { Accept: 'application/json' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 401);
});

test('resource: rejects http:// URL in config (treated as unconfigured)', async () => {
  const env = await makeEnv({
    ACCESS_RESOURCE_URLS_JSON: JSON.stringify({
      apps: {},
      resources: { advertiser: { marketing_kit: 'http://insecure.com' } },
    }),
  });
  const member = await seedPaidMember(env, { pack_id: 'advertiser' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=advertiser&type=marketing_kit', {
    headers: { Cookie: `av_session=${cookie}`, Accept: 'application/json' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 503);
});

test('resource: returns HTML error page for browser requests', async () => {
  const env = await makeEnv();
  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=advertiser&type=marketing_kit', {
    headers: { Accept: 'text/html' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 401);
  const ct = res.headers.get('Content-Type') || '';
  assert.ok(ct.includes('text/html'), `Expected text/html, got ${ct}`);
  const body = await res.text();
  assert.ok(body.includes('AppVibe Vault'));
  assert.ok(body.includes('Kembali'));
});

test('launch: returns HTML error page for browser requests', async () => {
  const env = await makeEnv();
  const req = new Request('https://appvibe.biz.id/api/member/launch?app_id=adsprint', {
    headers: { Accept: 'text/html' },
  });
  const res = await launchOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 401);
  const ct = res.headers.get('Content-Type') || '';
  assert.ok(ct.includes('text/html'), `Expected text/html, got ${ct}`);
  const body = await res.text();
  assert.ok(body.includes('AppVibe Vault'));
});

test('resource: full vault cannot access non-existent bundle ID even if in config', async () => {
  const env = await makeEnv({
    ACCESS_RESOURCE_URLS_JSON: JSON.stringify({
      apps: {},
      resources: { attacker_bundle: { marketing_kit: 'https://evil.example.com' } },
    }),
  });
  const member = await seedPaidMember(env, { pack_id: 'vault_full' });
  const cookie = await getAuthCookie(env, member);

  const req = new Request('https://appvibe.biz.id/api/member/resource?bundle_id=attacker_bundle&type=marketing_kit', {
    headers: { Cookie: `av_session=${cookie}`, Accept: 'application/json' },
  });
  const res = await resourceOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 400);
});
