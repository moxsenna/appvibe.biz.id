/**
 * Token + identity crypto helpers for member access auth.
 *
 * Never store raw tokens. We persist only an HMAC-SHA256 hash keyed by
 * AUTH_TOKEN_PEPPER, so a database leak does not reveal usable tokens.
 * Raw tokens live only in memory, cookies, or WhatsApp messages.
 */
import { hmacSha256Hex } from './paycore-sign.js';

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const MAGIC_LINK_MAX_AGE_SECONDS = 15 * 60; // 15 minutes

/**
 * Generate a cryptographically random url-safe token (>= 256 bits).
 * Uses Web Crypto getRandomValues — available in Workers and Node 18+.
 * @returns {string}
 */
export function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

/** Encode bytes as url-safe base64 without padding. */
function base64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * HMAC-SHA256 a token with the app pepper. Deterministic, opaque.
 * @param {string} token
 * @param {string} pepper  AUTH_TOKEN_PEPPER
 * @returns {Promise<string>}
 */
export async function hashToken(token, pepper) {
  return hmacSha256Hex(pepper, token);
}

/**
 * Verify a raw token against a stored hash in constant time.
 * @param {string} token
 * @param {string} storedHash
 * @param {string} pepper
 * @returns {Promise<boolean>}
 */
export async function verifyToken(token, storedHash, pepper) {
  if (!storedHash || !token) return false;
  const candidate = await hashToken(token, pepper);
  return timingSafeEqual(candidate, storedHash);
}

/**
 * HMAC a phone or IP for rate-limit buckets / audit logging, so raw
 * identifiers are never persisted where a hash suffices.
 * @param {string} identifier
 * @param {string} pepper
 * @returns {Promise<string>}
 */
export async function hashIdentifier(identifier, pepper) {
  return hmacSha256Hex(pepper, String(identifier ?? ''));
}

/**
 * Constant-time string comparison.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  if (sa.length !== sb.length) return false;
  let out = 0;
  for (let i = 0; i < sa.length; i++) out |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return out === 0;
}

/** Mask an email for safe display: `b***@example.com`. */
export function maskEmail(email) {
  const s = String(email ?? '').trim();
  if (!s) return '';
  const [local, domain] = s.split('@');
  if (!domain) return '***';
  if (local.length <= 1) return `***@${domain}`;
  return `${local[0]}***@${domain}`;
}

/** Mask a phone for safe display: `+628***67890`. */
export function maskPhone(phone) {
  const s = String(phone ?? '').trim();
  if (s.length < 6) return '';
  const head = s.slice(0, 4);
  const tail = s.slice(-5);
  return `${head}***${tail}`;
}
