/**
 * POST /api/auth/consume-magic-link
 *
 * Gate endpoint: the token is NEVER consumed automatically when the verify
 * page loads. The user must explicitly press "Lanjut masuk" which triggers
 * this POST. This prevents link scanners from burning the token.
 *
 * Input:  { token: "..." }
 * Output: Set-Cookie: av_session=<sessionToken>; ... + { ok, member_name }
 */
import { hashToken, verifyToken, generateToken, MAGIC_LINK_MAX_AGE_SECONDS, SESSION_MAX_AGE_SECONDS } from '../../lib/auth-crypto.js';
import { createMemberAccessRepo } from '../../lib/db.js';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  if (!env.APPVIBE_DB || !env.AUTH_TOKEN_PEPPER) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  const rawToken = String(body?.token || '').trim();
  if (!rawToken) return json({ error: 'missing_token' }, 400);

  const pepper = env.AUTH_TOKEN_PEPPER;
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const tokenHash = await hashToken(rawToken, pepper);

  // Look up the magic link by hash.
  const link = await repo.getMagicLinkByHash(tokenHash);
  if (!link) {
    return json({ error: 'invalid_token', message: 'Tautan tidak valid.' }, 401);
  }

  // Check if already consumed.
  if (link.used_at) {
    return json({ error: 'token_used', message: 'Tautan sudah digunakan.' }, 401);
  }

  // Check if expired.
  if (new Date(link.expires_at).getTime() < Date.now()) {
    return json({ error: 'token_expired', message: 'Tautan sudah kedaluwarsa.' }, 401);
  }

  // Consume the token (mark used_at). This is a single-use operation.
  await repo.consumeMagicLink(link.id);

  // Fetch the member.
  const member = await repo.getMemberById(link.member_id);
  if (!member) {
    return json({ error: 'member_not_found' }, 404);
  }

  // Create a session.
  const sessionToken = generateToken();
  const sessionHash = await hashToken(sessionToken, pepper);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await repo.createSession({
    id: sessionId,
    member_id: member.id,
    token_hash: sessionHash,
    expires_at: expiresAt,
  });

  // Audit log.
  await repo.insertAuditLog({
    member_id: member.id,
    event_type: 'login_succeeded',
    metadata_json: JSON.stringify({ magic_link_id: link.id }),
  });

  // Set the session cookie.
  const cookie = [
    `av_session=${sessionToken}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join('; ');

  return json(
    { ok: true, member_name: member.name },
    200,
    { 'Set-Cookie': cookie },
  );
}
