import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  generateToken,
  hashToken,
  verifyToken,
  hashIdentifier,
  maskEmail,
  maskPhone,
  timingSafeEqual,
  SESSION_MAX_AGE_SECONDS,
  MAGIC_LINK_MAX_AGE_SECONDS,
} from '../functions/lib/auth-crypto.js';

test('generateToken returns a url-safe string of sufficient length', () => {
  const t = generateToken();
  assert.equal(typeof t, 'string');
  assert.ok(t.length >= 43, `token too short: ${t.length}`);
  // url-safe base64 alphabet only
  assert.match(t, /^[A-Za-z0-9_-]+$/);
});

test('generateToken produces unique tokens', () => {
  const seen = new Set();
  for (let i = 0; i < 1000; i++) seen.add(generateToken());
  assert.equal(seen.size, 1000);
});

test('hashToken is deterministic for same pepper', async () => {
  const pepper = 'pepper_abc';
  const t = 'secret-token';
  const h1 = await hashToken(t, pepper);
  const h2 = await hashToken(t, pepper);
  assert.equal(h1, h2);
  assert.notEqual(h1, t);
  assert.ok(h1.length > 0);
});

test('hashToken changes when pepper changes', async () => {
  const t = 'secret-token';
  const h1 = await hashToken(t, 'pepper_one');
  const h2 = await hashToken(t, 'pepper_two');
  assert.notEqual(h1, h2);
});

test('verifyToken accepts correct token and rejects wrong', async () => {
  const pepper = 'pepper_abc';
  const t = 'secret-token';
  const h = await hashToken(t, pepper);
  assert.equal(await verifyToken(t, h, pepper), true);
  assert.equal(await verifyToken('wrong', h, pepper), false);
  assert.equal(await verifyToken(t, 'not-a-hash', pepper), false);
});

test('hashIdentifier is stable and opaque', async () => {
  const pepper = 'pepper_abc';
  const h1 = await hashIdentifier('081234567890', pepper);
  const h2 = await hashIdentifier('081234567890', pepper);
  assert.equal(h1, h2);
  assert.ok(h1.length > 0);
  assert.notEqual(h1, '081234567890');
});

test('maskEmail hides the local part', () => {
  assert.equal(maskEmail('bima@example.com'), 'b***@example.com');
  assert.equal(maskEmail('a@x.co'), '***@x.co');
  assert.equal(maskEmail(''), '');
  assert.equal(maskEmail(null), '');
});

test('maskPhone hides middle digits', () => {
  assert.equal(maskPhone('+6281234567890'), '+628***67890');
  assert.equal(maskPhone(''), '');
  assert.equal(maskPhone(null), '');
});

test('timingSafeEqual returns true only for equal strings', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
  assert.equal(timingSafeEqual('', ''), true);
});

test('session and magic-link max ages are distinct and correct', () => {
  assert.equal(SESSION_MAX_AGE_SECONDS, 30 * 24 * 60 * 60);
  assert.equal(MAGIC_LINK_MAX_AGE_SECONDS, 15 * 60);
  assert.ok(MAGIC_LINK_MAX_AGE_SECONDS < SESSION_MAX_AGE_SECONDS);
});
