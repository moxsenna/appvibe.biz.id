/**
 * POST /api/auth/logout
 *
 * Reads the session cookie, revokes the session in D1, clears the cookie,
 * and records an audit log. Safe to call even with no active session.
 */
import { hashToken } from '../../lib/auth-crypto.js';
import { createMemberAccessRepo } from '../../lib/db.js';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function parseSessionCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)av_session=([^;]+)/);
  return match ? match[1] : null;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Always clear the cookie regardless of whether the session is valid.
  const clearCookie = 'av_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';

  if (!env.APPVIBE_DB || !env.AUTH_TOKEN_PEPPER) {
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie });
  }

  const rawToken = parseSessionCookie(request);
  if (!rawToken) {
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie });
  }

  const pepper = env.AUTH_TOKEN_PEPPER;
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const tokenHash = await hashToken(rawToken, pepper);
  const session = await repo.getSessionByHash(tokenHash);

  if (session && !session.revoked_at) {
    await repo.revokeSession(session.id);
    await repo.insertAuditLog({
      member_id: session.member_id,
      event_type: 'logout',
      metadata_json: JSON.stringify({ session_id: session.id }),
    });
  }

  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie });
}
