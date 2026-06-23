/**
 * Matches D:/Coding/payment gateway/src/lib/crypto.ts — buildAppRequestSignature
 */
export async function sha256Hex(data) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signPayCoreRequest({ appSecret, timestamp, method, path, rawBody }) {
  const bodyHash = await sha256Hex(rawBody);
  const message = `${timestamp}.${method.toUpperCase()}.${path}.${bodyHash}`;
  return hmacSha256Hex(appSecret, message);
}