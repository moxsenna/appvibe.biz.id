/**
 * Shared session validation for member access endpoints.
 *
 * Extracts the av_session cookie, verifies it against D1, and returns
 * the authenticated member + entitlements. Used by /api/member/me,
 * /api/member/launch, and any future member-scoped endpoint.
 */
import { hashToken } from './auth-crypto.js';
import { createMemberAccessRepo } from './db.js';

/**
 * Parse the av_session cookie from a Request.
 * @param {Request} request
 * @returns {string|null}
 */
export function parseSessionCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)av_session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Validate the session and return member + entitlements, or an error.
 *
 * @param {object} opts
 * @param {Request} opts.request
 * @param {D1Database} opts.db
 * @param {string} opts.pepper  AUTH_TOKEN_PEPPER
 * @returns {Promise<{ok:true, member:object, entitlements:object[], repo:object}|{ok:false, error:string, message:string, status:number}>}
 */
export async function resolveSession({ request, db, pepper }) {
  if (!db || !pepper) {
    return { ok: false, error: 'server_misconfigured', message: 'Server belum dikonfigurasi.', status: 500 };
  }

  const rawToken = parseSessionCookie(request);
  if (!rawToken) {
    return { ok: false, error: 'unauthenticated', message: 'Silakan masuk terlebih dahulu.', status: 401 };
  }

  const repo = createMemberAccessRepo(db);
  const tokenHash = await hashToken(rawToken, pepper);
  const session = await repo.getSessionByHash(tokenHash);

  if (!session || session.revoked_at) {
    return { ok: false, error: 'session_invalid', message: 'Sesi tidak valid.', status: 401 };
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'session_expired', message: 'Sesi sudah kedaluwarsa.', status: 401 };
  }

  // Touch last_seen_at (best-effort).
  repo.touchSession(session.id, new Date().toISOString()).catch(() => {});

  const member = await repo.getMemberById(session.member_id);
  if (!member) {
    return { ok: false, error: 'member_not_found', message: 'Member tidak ditemukan.', status: 404 };
  }

  const entitlements = await repo.getActiveEntitlements(member.id);
  return { ok: true, member, entitlements, repo, session };
}
