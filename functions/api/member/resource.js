/**
 * GET /api/member/resource?bundle_id={id}&type={marketing_kit|guide}
 *
 * Validates the buyer's session and entitlement, then 302-redirects to
 * the bundle resource URL (marketing kit or guide) from
 * ACCESS_RESOURCE_URLS_JSON.
 *
 * - Full vault buyers can access resources for all bundles.
 * - Bundle buyers can only access resources for their active bundles.
 * - Returns 503 if the resource URL is not configured.
 */
import { resolveSession } from '../../lib/session.js';
import { getBundleResources } from '../../lib/access-resources.js';
import { isFullVault } from '../../lib/entitlements.js';

const VALID_TYPES = ['marketing_kit', 'guide'];

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const bundleId = url.searchParams.get('bundle_id');
  const resourceType = url.searchParams.get('type');

  if (!bundleId || !resourceType || !VALID_TYPES.includes(resourceType)) {
    return new Response(JSON.stringify({
      error: 'missing_params',
      message: 'Parameter bundle_id dan type (marketing_kit|guide) diperlukan.',
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER,
  });
  if (!session.ok) {
    return new Response(JSON.stringify({ error: session.error, message: session.message }), {
      status: session.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Full vault buyers can access any bundle's resources.
  const fullVault = isFullVault(session.entitlements);
  if (!fullVault) {
    const activeBundleIds = session.entitlements
      .filter((e) => e.status === 'active' && e.resource_type === 'bundle')
      .map((e) => e.resource_id);
    if (!activeBundleIds.includes(bundleId)) {
      return new Response(JSON.stringify({
        error: 'forbidden',
        message: 'Anda tidak memiliki akses ke bundle ini.',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const resources = getBundleResources(bundleId, env.ACCESS_RESOURCE_URLS_JSON);
  const targetUrl = resources[resourceType];

  if (!targetUrl) {
    const typeLabel = resourceType === 'marketing_kit' ? 'Marketing kit' : 'Panduan mulai';
    return new Response(JSON.stringify({
      error: 'resource_not_configured',
      message: `${typeLabel} untuk bundle ini belum tersedia. Hubungi support.`,
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: targetUrl,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
