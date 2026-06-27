import { normalizePhone, InvalidPhoneError } from '../../lib/phone.js';
import { generateToken, hashToken, hashIdentifier, MAGIC_LINK_MAX_AGE_SECONDS } from '../../lib/auth-crypto.js';
import { createMemberAccessRepo } from '../../lib/db.js';
import { sendMagicLinkWhatsApp } from '../../lib/fonnte.js';
import { checkRateLimit } from '../../lib/rate-limit.js';
import { computeUnlockedAppIds } from '../../lib/entitlements.js';

const APP_ORIGIN = 'https://appvibe.biz.id';
const GENERIC_MSG = 'Jika nomor terdaftar, tautan akses telah dikirim melalui WhatsApp.';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin === APP_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed ? origin : APP_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '0.0.0.0';
}

/**
 * POST /api/auth/request-magic-link
 *
 * Input: { phone: "081234567890" }
 *
 * Always returns the same generic message regardless of outcome. Never
 * leaks whether the phone is registered or has active entitlements.
 *
 * Flow:
 * 1. Normalize phone.
 * 2. Check rate limits (phone + IP, hashed).
 * 3. Find member by canonical phone.
 * 4. Verify active entitlement exists.
 * 5. Generate token, store hash in magic_links (15 min expiry).
 * 6. Send link via Fonnte to the DB-stored phone (NOT the user input).
 * 7. If send fails, invalidate the link.
 * 8. Audit log every step.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request);

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);

  if (!env.APPVIBE_DB) {
    return json({ message: GENERIC_MSG }, 200, cors);
  }

  const fonnteToken = env.FONNTE_TOKEN;
  const baseUrl = env.APP_BASE_URL || 'https://appvibe.biz.id';
  const pepper = env.AUTH_TOKEN_PEPPER;

  if (!fonnteToken || !pepper) {
    // Config incomplete — still return generic so it doesn't reveal setup state.
    return json({ message: GENERIC_MSG }, 200, cors);
  }

  let body;
  try { body = await request.json(); } catch { return json({ message: GENERIC_MSG }, 200, cors); }

  const phoneInput = String(body?.phone || '').trim();

  // Normalize phone. If invalid, still return generic (don't leak validation errors).
  let phoneE164;
  try {
    phoneE164 = normalizePhone(phoneInput);
  } catch {
    return json({ message: GENERIC_MSG }, 200, cors);
  }

  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const nowMs = Date.now();

  // Rate-limit check (hash the identity for storage).
  const phoneKey = await hashIdentifier(phoneE164, pepper);
  const ipKey = await hashIdentifier(clientIp(request), pepper);

  const phoneLimit = await checkRateLimit(repo, { kind: 'phone', key: phoneKey, nowMs });
  if (!phoneLimit.allowed) {
    return json({ message: GENERIC_MSG }, 200, cors);
  }

  const ipLimit = await checkRateLimit(repo, { kind: 'ip', key: ipKey, nowMs });
  if (!ipLimit.allowed) {
    return json({ message: GENERIC_MSG }, 200, cors);
  }

  // Find member by canonical phone.
  const member = await repo.getMemberByPhone(phoneE164);
  if (!member) {
    return json({ message: GENERIC_MSG }, 200, cors);
  }

  // Only members with active entitlements can request magic links.
  const entitlements = await repo.getActiveEntitlements(member.id);
  if (!entitlements || entitlements.length === 0) {
    await repo.insertAuditLog({
      member_id: member.id,
      event_type: 'magic_link_failed',
      metadata_json: JSON.stringify({ reason: 'no_active_entitlement' }),
    });
    return json({ message: GENERIC_MSG }, 200, cors);
  }

  // Generate a strong token and store only its hash.
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken, pepper);
  const linkId = crypto.randomUUID();
  const expiresAt = new Date(nowMs + MAGIC_LINK_MAX_AGE_SECONDS * 1000).toISOString();

  const phoneHash = await hashIdentifier(phoneE164, pepper);
  const ipHashVal = await hashIdentifier(clientIp(request), pepper);

  await repo.createMagicLink({
    id: linkId,
    member_id: member.id,
    token_hash: tokenHash,
    purpose: 'login',
    expires_at: expiresAt,
    requested_phone_hash: phoneHash,
    requested_ip_hash: ipHashVal,
  });

  await repo.insertAuditLog({
    member_id: member.id,
    event_type: 'magic_link_requested',
    metadata_json: JSON.stringify({ link_id: linkId }),
  });

  // Build the verify URL. The token is sent only via WhatsApp — never in the
  // API response or logs.
  const magicLinkUrl = `${baseUrl.replace(/\/+$/, '')}/access/verify?token=${rawToken}`;

  // Send via Fonnte to the canonical phone stored in the DB.
  const sent = await sendMagicLinkWhatsApp({
    token: fonnteToken,
    to: member.phone_e164,
    magicLinkUrl,
    fetchImpl: env._fetchImpl || fetch,
  });

  if (!sent) {
    // Invalidate the link so it cannot be consumed.
    await repo.invalidateMagicLink(linkId);
    await repo.insertAuditLog({
      member_id: member.id,
      event_type: 'magic_link_failed',
      metadata_json: JSON.stringify({ reason: 'fonnte_send_failed', link_id: linkId }),
    });
    return json({ message: GENERIC_MSG }, 200, cors);
  }

  await repo.insertAuditLog({
    member_id: member.id,
    event_type: 'magic_link_sent',
    metadata_json: JSON.stringify({ link_id: linkId }),
  });

  return json({ message: GENERIC_MSG }, 200, cors);
}
