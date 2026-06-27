import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkRateLimit } from '../functions/lib/rate-limit.js';

const T0 = new Date('2026-06-28T12:00:00Z').getTime();
const iso = (ms) => new Date(ms).toISOString();

/**
 * Fake repo whose recordRateLimit stamps the current time (controlled by
 * `nowMs`) as an ISO string, mirroring the real repo. countRateLimit
 * compares ISO strings lexicographically — correct for same-format ISO 8601.
 */
function makeRepo() {
  const records = [];
  let clock = T0;
  return {
    records,
    setClock(ms) { clock = ms; },
    async recordRateLimit(key, kind) { records.push({ key, kind, ts: iso(clock) }); },
    async countRateLimit(key, sinceIso) {
      return records.filter((r) => r.key === key && r.ts >= sinceIso).length;
    },
  };
}

test('allows first request per phone', async () => {
  const repo = makeRepo();
  const result = await checkRateLimit(repo, { kind: 'phone', key: 'hash_a', nowMs: T0 });
  assert.equal(result.allowed, true);
  assert.equal(repo.records.length, 1);
});

test('blocks a second phone request within 60 seconds', async () => {
  const repo = makeRepo();
  repo.setClock(T0);
  await repo.recordRateLimit('hash_a', 'phone'); // prior request at T0

  const result = await checkRateLimit(repo, { kind: 'phone', key: 'hash_a', nowMs: T0 + 30_000 });
  assert.equal(result.allowed, false);
  // No new record when blocked.
  assert.equal(repo.records.length, 1);
});

test('allows a second phone request after 60 seconds', async () => {
  const repo = makeRepo();
  repo.setClock(T0);
  await repo.recordRateLimit('hash_a', 'phone');

  const result = await checkRateLimit(repo, { kind: 'phone', key: 'hash_a', nowMs: T0 + 61_000 });
  assert.equal(result.allowed, true);
  assert.equal(repo.records.length, 2);
});

test('blocks more than 3 phone requests per 15 minutes', async () => {
  const repo = makeRepo();
  // Three prior requests, each >60s apart so the short window doesn't block,
  // but all within the 15-minute long window.
  for (let i = 0; i < 3; i++) {
    repo.setClock(T0 + i * 70_000);
    await repo.recordRateLimit('hash_a', 'phone');
  }

  const result = await checkRateLimit(repo, { kind: 'phone', key: 'hash_a', nowMs: T0 + 3 * 70_000 });
  assert.equal(result.allowed, false);
});

test('ip bucket blocks the 11th request within 15 minutes', async () => {
  const repo = makeRepo();
  repo.setClock(T0);
  for (let i = 0; i < 10; i++) {
    await repo.recordRateLimit('ip_hash_1', 'ip');
  }

  const blocked = await checkRateLimit(repo, { kind: 'ip', key: 'ip_hash_1', nowMs: T0 });
  assert.equal(blocked.allowed, false);
  assert.equal(repo.records.length, 10);
});

test('ip bucket allows the 10th then blocks the 11th', async () => {
  const repo = makeRepo();
  repo.setClock(T0);
  for (let i = 0; i < 9; i++) {
    await repo.recordRateLimit('ip_hash_2', 'ip');
  }

  const ok = await checkRateLimit(repo, { kind: 'ip', key: 'ip_hash_2', nowMs: T0 });
  assert.equal(ok.allowed, true);
  assert.equal(repo.records.length, 10);

  const blocked = await checkRateLimit(repo, { kind: 'ip', key: 'ip_hash_2', nowMs: T0 });
  assert.equal(blocked.allowed, false);
  assert.equal(repo.records.length, 10); // not recorded when blocked
});

test('checkout phone bucket blocks the second attempt within 60 seconds', async () => {
  const repo = makeRepo();
  repo.setClock(T0);
  await repo.recordRateLimit('checkout_phone_hash', 'checkout_phone');

  const result = await checkRateLimit(repo, { kind: 'checkout_phone', key: 'checkout_phone_hash', nowMs: T0 + 30_000 });
  assert.equal(result.allowed, false);
});

test('checkout ip bucket allows 20 requests per 15 minutes then blocks', async () => {
  const repo = makeRepo();
  repo.setClock(T0);
  for (let i = 0; i < 20; i++) {
    await repo.recordRateLimit('checkout_ip_hash', 'checkout_ip');
  }

  const result = await checkRateLimit(repo, { kind: 'checkout_ip', key: 'checkout_ip_hash', nowMs: T0 });
  assert.equal(result.allowed, false);
});
