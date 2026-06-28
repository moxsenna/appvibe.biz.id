/**
 * GET /api/member/resource?bundle_id={id}&type={marketing_kit|guide}
 *
 * Validates the buyer's session and entitlement, then 302-redirects to
 * the bundle resource URL (marketing kit or guide) from
 * ACCESS_RESOURCE_URLS_JSON.
 *
 * - Full vault buyers can access resources for all four canonical bundles.
 * - Bundle buyers can only access resources for their active bundles.
 * - Returns branded HTML error pages for browser navigation.
 * - Returns JSON errors for API callers (fetch).
 */
import { resolveSession } from '../../lib/session.js';
import { getBundleResources } from '../../lib/access-resources.js';
import { isFullVault } from '../../lib/entitlements.js';
import { errorResponse } from '../../lib/error-page.js';

const VALID_TYPES = ['marketing_kit', 'guide'];
const CANONICAL_BUNDLES = ['advertiser', 'commerce', 'creator', 'brand_launch'];

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return errorResponse(request, { status: 405, error: 'method_not_allowed', message: 'Metode tidak diizinkan.' });
  }

  const url = new URL(request.url);
  const bundleId = url.searchParams.get('bundle_id');
  const resourceType = url.searchParams.get('type');

  if (!bundleId || !resourceType || !VALID_TYPES.includes(resourceType)) {
    return errorResponse(request, {
      status: 400, error: 'missing_params',
      message: 'Parameter bundle_id dan type (marketing_kit|guide) diperlukan.',
    });
  }

  // Whitelist: only the four canonical bundles are valid targets.
  if (!CANONICAL_BUNDLES.includes(bundleId)) {
    return errorResponse(request, {
      status: 400, error: 'invalid_bundle',
      message: 'Bundle ID tidak valid.',
    });
  }

  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER,
  });
  if (!session.ok) {
    return errorResponse(request, { status: session.status, error: session.error, message: session.message });
  }

  // Full vault buyers can access any bundle's resources.
  const fullVault = isFullVault(session.entitlements);
  if (!fullVault) {
    const activeBundleIds = session.entitlements
      .filter((e) => e.status === 'active' && e.resource_type === 'bundle')
      .map((e) => e.resource_id);
    if (!activeBundleIds.includes(bundleId)) {
      return errorResponse(request, {
        status: 403, error: 'forbidden',
        message: 'Anda tidak memiliki akses ke bundle ini.',
      });
    }
  }

  const resources = getBundleResources(bundleId, env.ACCESS_RESOURCE_URLS_JSON);
  const targetUrl = resources[resourceType];

  if (!targetUrl) {
    const typeLabel = resourceType === 'marketing_kit' ? 'Marketing kit' : 'Panduan mulai';
    return errorResponse(request, {
      status: 503, error: 'resource_not_configured',
      message: `${typeLabel} untuk bundle ini belum tersedia. Hubungi support.`,
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
