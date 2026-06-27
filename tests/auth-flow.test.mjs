import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest as consumeOnRequest } from '../functions/api/auth/consume-magic-link.js';
import { onRequest as logoutOnRequest } from '../functions/api/auth/logout.js';
import { onRequest as meOnRequest } from '../functions/api/member/me.js';
import { onRequest as requestMLOnRequest } from '../functions/api/auth/request-magic-link.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';
import { createMemberAccessRepo } from '../functions/lib/db.js';
import { generateToken, hashToken, MAGIC_LINK_MAX_AGE_SECONDS, SESSION_MAX_AGE_SECONDS } from '../functions/lib/auth-crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');

const PEPPER = 'pepper_abc';

async function makeEnv(overrides = {}) {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  return {
    APPVIBE_DB: d1,
    FONNTE_TOKEN: 'fonnte_tok',
    APP_BASE_URL: 'https://appvibe.biz.id',
    AUTH_TOKEN_PEPPER: PEPPER,
    _fetchImpl: async () => Response.json({ status: true }),
    ...overrides,
  };
}

async function seedActiveMember(env) {
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const member = await repo.findOrCreateMember({ name: 'Bima Putra', email: 'bima@example.com', phone_e164: '+6281234567890' });
  await repo.createOrder({
    id: crypto.randomUUID(), member_id: member.id,
    paycore_order_id: 'o1', external_order_id: 'e1',
    pack_id: 'advertiser', product_key: 'pack_advertiser',
    purchase_type: 'initial_bundle', amount: 97000, currency: 'IDR',
  });
  await repo.fulfillOrder({ paycore_order_id: 'o1' });
  return member;
}

async function seedActiveMemberWithFullVault(env) {
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const member = await repo.findOrCreateMember({ name: 'Full User', email: 'full@example.com', phone_e164: '+6281999999999' });
  await repo.createOrder({
    id: crypto.randomUUID(), member_id: member.id,
    paycore_order_id: 'o_v', external_order_id: 'e_v',
    pack_id: 'vault_full', product_key: 'vault_full_license',
    purchase_type: 'full_vault', amount: 147000, currency: 'IDR',
  });
  await repo.fulfillOrder({ paycore_order_id: 'o_v' });
  return member;
}

async function createValidMagicLink(env, member) {
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken, PEPPER);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_MAX_AGE_SECONDS * 1000).toISOString();
  await repo.createMagicLink({
    id, member_id: member.id, token_hash: tokenHash,
    purpose: 'login', expires_at: expiresAt,
    requested_phone_hash: 'ph', requested_ip_hash: 'ih',
  });
  return { rawToken, linkId: id };
}

// ────── consume-magic-link ──────

test('consume: valid token creates session and sets cookie', async () => {
  const env = await makeEnv();
  const member = await seedActiveMember(env);
  const { rawToken } = await createValidMagicLink(env, member);

  const req = new Request('https://appvibe.biz.id/api/auth/consume-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken }),
  });

  const res = await consumeOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 200);

  const setCookie = res.headers.get('Set-Cookie');
  assert.ok(setCookie, 'Set-Cookie header must be present');
  assert.match(setCookie, /av_session=[^;]+/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Path=\//);
  assert.match(setCookie, /Max-Age=2592000/);

  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.member_name, 'Bima Putra');

  // Audit log.
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const logs = await repo.listAuditLogs(member.id);
  assert.ok(logs.some((l) => l.event_type === 'login_succeeded'));
});

test('consume: expired token is rejected', async () => {
  const env = await makeEnv();
  const member = await seedActiveMember(env);
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken, PEPPER);
  await repo.createMagicLink({
    id: crypto.randomUUID(), member_id: member.id, token_hash: tokenHash,
    purpose: 'login', expires_at: new Date(Date.now() - 60_000).toISOString(),
    requested_phone_hash: 'ph', requested_ip_hash: 'ih',
  });

  const req = new Request('https://appvibe.biz.id/api/auth/consume-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken }),
  });

  const res = await consumeOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 401);
});

test('consume: already-used token is rejected', async () => {
  const env = await makeEnv();
  const member = await seedActiveMember(env);
  const { rawToken } = await createValidMagicLink(env, member);

  const req = () => new Request('https://appvibe.biz.id/api/auth/consume-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken }),
  });

  const res1 = await consumeOnRequest({ request: req(), env, waitUntil() {} });
  assert.equal(res1.status, 200);

  // Second attempt — token already consumed.
  const res2 = await consumeOnRequest({ request: req(), env, waitUntil() {} });
  assert.equal(res2.status, 401);
});

test('consume: wrong token is rejected', async () => {
  const env = await makeEnv();
  await seedActiveMember(env);
  await createValidMagicLink(env, await seedActiveMember(env));

  const req = new Request('https://appvibe.biz.id/api/auth/consume-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'definitely-wrong-token' }),
  });

  const res = await consumeOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 401);
});

// ────── member/me ──────

test('me: returns member data with valid session cookie', async () => {
  const env = await makeEnv();
  const member = await seedActiveMember(env);
  const { rawToken } = await createValidMagicLink(env, member);

  // Consume the magic link to get a session.
  const consumeReq = new Request('https://appvibe.biz.id/api/auth/consume-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken }),
  });
  const consumeRes = await consumeOnRequest({ request: consumeReq, env, waitUntil() {} });
  const setCookie = consumeRes.headers.get('Set-Cookie');
  const sessionMatch = setCookie.match(/av_session=([^;]+)/);
  assert.ok(sessionMatch);
  const sessionCookie = sessionMatch[1];

  // Now call /api/member/me with the session cookie.
  const meReq = new Request('https://appvibe.biz.id/api/member/me', {
    method: 'GET',
    headers: { Cookie: `av_session=${sessionCookie}` },
  });
  const meRes = await meOnRequest({ request: meReq, env, waitUntil() {} });
  assert.equal(meRes.status, 200);
  const data = await meRes.json();
  assert.equal(data.member_name, 'Bima Putra');
  assert.equal(data.has_full_vault, false);
  assert.deepEqual(data.bundle_ids, ['advertiser']);
  assert.ok(data.app_ids.length > 0);
  assert.ok(data.orders.length > 0);
  // Must NOT expose sensitive data.
  assert.equal(data.phone, undefined);
  assert.equal(data.email, undefined);
  assert.equal(data.token, undefined);
});

test('me: returns full vault access when vault_full entitlement active', async () => {
  const env = await makeEnv();
  const member = await seedActiveMemberWithFullVault(env);
  const { rawToken } = await createValidMagicLink(env, member);

  const consumeReq = new Request('https://appvibe.biz.id/api/auth/consume-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken }),
  });
  const consumeRes = await consumeOnRequest({ request: consumeReq, env, waitUntil() {} });
  const setCookie = consumeRes.headers.get('Set-Cookie');
  const sessionCookie = setCookie.match(/av_session=([^;]+)/)[1];

  const meReq = new Request('https://appvibe.biz.id/api/member/me', {
    method: 'GET',
    headers: { Cookie: `av_session=${sessionCookie}` },
  });
  const meRes = await meOnRequest({ request: meReq, env, waitUntil() {} });
  assert.equal(meRes.status, 200);
  const data = await meRes.json();
  assert.equal(data.has_full_vault, true);
  assert.equal(data.app_ids.length, 13);
});

test('me: rejects request without session cookie', async () => {
  const env = await makeEnv();
  const req = new Request('https://appvibe.biz.id/api/member/me', { method: 'GET' });
  const res = await meOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 401);
});

test('me: rejects expired session', async () => {
  const env = await makeEnv();
  const member = await seedActiveMember(env);
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  // Create an expired session directly.
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken, PEPPER);
  const sessId = crypto.randomUUID();
  await repo.createSession({
    id: sessId, member_id: member.id, token_hash: tokenHash,
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  });

  const req = new Request('https://appvibe.biz.id/api/member/me', {
    method: 'GET',
    headers: { Cookie: `av_session=${rawToken}` },
  });
  const res = await meOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 401);
});

test('me: rejects revoked session', async () => {
  const env = await makeEnv();
  const member = await seedActiveMember(env);
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken, PEPPER);
  const sessId = crypto.randomUUID();
  await repo.createSession({
    id: sessId, member_id: member.id, token_hash: tokenHash,
    expires_at: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
  });
  await repo.revokeSession(sessId);

  const req = new Request('https://appvibe.biz.id/api/member/me', {
    method: 'GET',
    headers: { Cookie: `av_session=${rawToken}` },
  });
  const res = await meOnRequest({ request: req, env, waitUntil() {} });
  assert.equal(res.status, 401);
});

// ────── logout ──────

test('logout: revokes session and clears cookie', async () => {
  const env = await makeEnv();
  const member = await seedActiveMember(env);
  const { rawToken } = await createValidMagicLink(env, member);

  // Consume to get a session.
  const consumeReq = new Request('https://appvibe.biz.id/api/auth/consume-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken }),
  });
  const consumeRes = await consumeOnRequest({ request: consumeReq, env, waitUntil() {} });
  const setCookie = consumeRes.headers.get('Set-Cookie');
  const sessionCookie = setCookie.match(/av_session=([^;]+)/)[1];

  // Logout.
  const logoutReq = new Request('https://appvibe.biz.id/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: `av_session=${sessionCookie}` },
  });
  const logoutRes = await logoutOnRequest({ request: logoutReq, env, waitUntil() {} });
  assert.equal(logoutRes.status, 200);

  // Cookie should be cleared (Max-Age=0).
  const clearCookie = logoutRes.headers.get('Set-Cookie');
  assert.ok(clearCookie);
  assert.match(clearCookie, /Max-Age=0/);

  // Subsequent me call with the same cookie should be rejected.
  const meReq = new Request('https://appvibe.biz.id/api/member/me', {
    method: 'GET',
    headers: { Cookie: `av_session=${sessionCookie}` },
  });
  const meRes = await meOnRequest({ request: meReq, env, waitUntil() {} });
  assert.equal(meRes.status, 401);

  // Audit log.
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const logs = await repo.listAuditLogs(member.id);
  assert.ok(logs.some((l) => l.event_type === 'logout'));
});
