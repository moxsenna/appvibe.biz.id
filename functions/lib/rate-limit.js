/**
 * Magic-link request rate limiting.
 *
 * Buckets:
 *   phone:          max 1 / 60s, max 3 / 15min
 *   ip:             max 10 / 15min
 *   checkout_phone: max 1 / 60s, max 4 / 15min
 *   checkout_ip:    max 20 / 15min
 *
 * Identities are passed in already-hashed (HMAC) so raw phone/IP is never
 * stored in the rate_limits table. The helper checks the windowed counts
 * and, only when allowed, records the attempt via the repo.
 */

const PHONE_SHORT_WINDOW_MS = 60_000;        // 1 per 60s
const PHONE_SHORT_MAX = 1;
const PHONE_LONG_WINDOW_MS = 15 * 60_000;    // 3 per 15min
const PHONE_LONG_MAX = 3;
const IP_WINDOW_MS = 15 * 60_000;            // 10 per 15min
const IP_MAX = 10;
const CHECKOUT_PHONE_SHORT_WINDOW_MS = 60_000;
const CHECKOUT_PHONE_SHORT_MAX = 1;
const CHECKOUT_PHONE_LONG_WINDOW_MS = 15 * 60_000;
const CHECKOUT_PHONE_LONG_MAX = 4;
const CHECKOUT_IP_WINDOW_MS = 15 * 60_000;
const CHECKOUT_IP_MAX = 20;

function iso(ms) {
  return new Date(ms).toISOString();
}

/**
 * @param {object} repo  member access repo
 * @param {object} opts
 * @param {'phone'|'ip'|'checkout_phone'|'checkout_ip'} opts.kind
 * @param {string} opts.key  hashed identifier
 * @param {number} [opts.nowMs] current time (tests)
 * @returns {Promise<{allowed:boolean}>}
 */
export async function checkRateLimit(repo, { kind, key, nowMs = Date.now() }) {
  if (kind === 'phone') {
    const shortSince = iso(nowMs - PHONE_SHORT_WINDOW_MS);
    const longSince = iso(nowMs - PHONE_LONG_WINDOW_MS);

    const shortCount = await repo.countRateLimit(key, shortSince);
    if (shortCount >= PHONE_SHORT_MAX) return { allowed: false };

    const longCount = await repo.countRateLimit(key, longSince);
    if (longCount >= PHONE_LONG_MAX) return { allowed: false };

    await repo.recordRateLimit(key, kind);
    return { allowed: true };
  }

  if (kind === 'checkout_phone') {
    const shortSince = iso(nowMs - CHECKOUT_PHONE_SHORT_WINDOW_MS);
    const longSince = iso(nowMs - CHECKOUT_PHONE_LONG_WINDOW_MS);

    const shortCount = await repo.countRateLimit(key, shortSince);
    if (shortCount >= CHECKOUT_PHONE_SHORT_MAX) return { allowed: false };

    const longCount = await repo.countRateLimit(key, longSince);
    if (longCount >= CHECKOUT_PHONE_LONG_MAX) return { allowed: false };

    await repo.recordRateLimit(key, kind);
    return { allowed: true };
  }

  if (kind === 'ip') {
    const since = iso(nowMs - IP_WINDOW_MS);
    const count = await repo.countRateLimit(key, since);
    if (count >= IP_MAX) return { allowed: false };

    await repo.recordRateLimit(key, kind);
    return { allowed: true };
  }

  if (kind === 'checkout_ip') {
    const since = iso(nowMs - CHECKOUT_IP_WINDOW_MS);
    const count = await repo.countRateLimit(key, since);
    if (count >= CHECKOUT_IP_MAX) return { allowed: false };

    await repo.recordRateLimit(key, kind);
    return { allowed: true };
  }

  return { allowed: false };
}
