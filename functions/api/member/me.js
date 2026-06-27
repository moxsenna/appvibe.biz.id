/**
 * GET /api/member/me
 *
 * Returns the authenticated member's safe dashboard data based on the
 * av_session cookie. Never exposes raw phone, email, tokens, or audit logs.
 */
import { hashToken } from '../../lib/auth-crypto.js';
import { createMemberAccessRepo } from '../../lib/db.js';
import { summarizeAccess } from '../../lib/entitlements.js';
import { PACKS } from '../../lib/packs.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseSessionCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)av_session=([^;]+)/);
  return match ? match[1] : null;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  if (!env.APPVIBE_DB || !env.AUTH_TOKEN_PEPPER) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  const rawToken = parseSessionCookie(request);
  if (!rawToken) return json({ error: 'unauthenticated', message: 'Silakan masuk terlebih dahulu.' }, 401);

  const pepper = env.AUTH_TOKEN_PEPPER;
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const tokenHash = await hashToken(rawToken, pepper);

  const session = await repo.getSessionByHash(tokenHash);
  if (!session || session.revoked_at) {
    return json({ error: 'session_invalid' }, 401);
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    return json({ error: 'session_expired' }, 401);
  }

  // Touch last_seen_at (best-effort, non-blocking).
  repo.touchSession(session.id, new Date().toISOString()).catch(() => {});

  const member = await repo.getMemberById(session.member_id);
  if (!member) return json({ error: 'member_not_found' }, 404);

  const entitlements = await repo.getActiveEntitlements(member.id);
  const access = summarizeAccess(entitlements);
  const orders = await repo.listOrdersByMember(member.id);

  // Build app details with status from canonical pack data.
  const appsWithStatus = access.appIds.map((appId) => ({
    id: appId,
    unlocked: true,
  }));

  // Build order summary (safe subset only).
  const orderSummary = orders.map((o) => ({
    order_id: o.paycore_order_id,
    pack_id: o.pack_id,
    pack_name: PACKS[o.pack_id]?.description || o.pack_id,
    amount: o.amount,
    currency: o.currency,
    payment_status: o.payment_status,
    fulfillment_status: o.fulfillment_status,
    created_at: o.created_at,
    paid_at: o.paid_at,
  }));

  return json({
    member_name: member.name,
    has_full_vault: access.hasFullVault,
    bundle_ids: access.bundleIds,
    app_ids: access.appIds,
    orders: orderSummary,
  });
}
