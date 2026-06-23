import { hmacSha256Hex } from './paycore-sign.js';

function parseSignature(header) {
  if (!header) return null;
  const t = header.trim();
  return t.startsWith('sha256=') ? t.slice(7) : t;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function verifyPayCoreEvent({
  webhookSecret,
  timestampHeader,
  rawBody,
  signatureHeader,
  maxSkewMs = 5 * 60_000,
}) {
  const t = Date.parse(timestampHeader);
  if (Number.isNaN(t)) return false;
  if (Math.abs(Date.now() - t) > maxSkewMs) return false;
  const message = `${timestampHeader}.${rawBody}`;
  const expected = await hmacSha256Hex(webhookSecret, message);
  const provided = parseSignature(signatureHeader);
  return provided !== null && timingSafeEqual(provided, expected);
}