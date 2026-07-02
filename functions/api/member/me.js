/**
 * GET /api/member/me
 *
 * Returns the authenticated member's safe dashboard data based on the
 * av_session cookie. Never exposes raw phone, email, tokens, or audit logs.
 *
 * Now includes app catalog metadata and resource availability (without
 * leaking actual URLs).
 */
import { resolveSession } from '../../lib/session.js';
import { summarizeAccess } from '../../lib/entitlements.js';
import { PACKS } from '../../lib/packs.js';
import { APP_CATALOG, packsForApp } from '../../lib/catalog.js';
import { getResourceAvailability } from '../../lib/access-resources.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER,
  });
  if (!session.ok) {
    return json({ error: session.error, message: session.message }, session.status);
  }

  const access = summarizeAccess(session.entitlements);
  const orders = await session.repo.listOrdersByMember(session.member.id);

  // Build app details with catalog metadata.
  const apps = access.appIds.map((appId) => {
    const meta = APP_CATALOG[appId];
    return {
      id: appId,
      name: meta?.name || appId,
      label: meta?.label || appId.slice(0, 3).toUpperCase(),
      function: meta?.function || '',
      output: meta?.output || '',
      rebrand: meta?.rebrand || '',
      prompt: meta?.prompt || '',
      accent: meta?.accent || '#126BFF',
      packs: packsForApp(appId),
    };
  });

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

  // Resource availability (booleans only, no URLs leaked).
  const resources = getResourceAvailability(
    access.bundleIds,
    access.hasFullVault,
    env.ACCESS_RESOURCE_URLS_JSON,
  );

  // Build bundle display info.
  const bundles = (access.hasFullVault
    ? ['advertiser', 'commerce', 'creator', 'brand_launch']
    : access.bundleIds
  ).map((bid) => ({
    id: bid,
    name: PACKS[bid]?.description?.replace('White-Label Vault — ', '') || bid,
    resources: resources.resources[bid] || { marketing_kit: false, guide: false },
  }));

  const upgrade_offer = {
    eligible: !access.hasFullVault && access.bundleIds.length > 0,
    price: 50000,
    pack_id: 'vault_full',
  };

  return json({
    member_name: session.member.name,
    member_key: session.member.id,
    workspace_key: session.member.id,
    first_name: session.member.name.split(' ')[0],
    has_full_vault: access.hasFullVault,
    bundle_ids: access.bundleIds,
    app_ids: access.appIds,
    apps,
    bundles,
    resources: resources.resources,
    orders: orderSummary,
    upgrade_offer,
  });
}
