/**
 * GET /api/member/launch?app_id={id}
 *
 * Validates the buyer's session and entitlement, then 302-redirects to
 * the app's external URL from ACCESS_RESOURCE_URLS_JSON.
 *
 * - Never returns app URLs in JSON payloads.
 * - Cache-Control: no-store, Referrer-Policy: no-referrer.
 * - Returns branded HTML error pages for browser navigation.
 * - Returns JSON errors for API callers (fetch).
 */
import { resolveSession } from '../../lib/session.js';
import { getAppLaunchUrl } from '../../lib/access-resources.js';
import { getStoredAppLaunchUrl } from '../../lib/app-links.js';
import { computeUnlockedAppIds } from '../../lib/entitlements.js';
import { errorResponse } from '../../lib/error-page.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return errorResponse(request, { status: 405, error: 'method_not_allowed', message: 'Metode tidak diizinkan.' });
  }

  const appId = new URL(request.url).searchParams.get('app_id');
  if (!appId) {
    return errorResponse(request, { status: 400, error: 'missing_app_id', message: 'Parameter app_id diperlukan.' });
  }

  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER,
  });
  if (!session.ok) {
    return errorResponse(request, { status: session.status, error: session.error, message: session.message });
  }

  const unlockedIds = computeUnlockedAppIds(session.entitlements);
  if (!unlockedIds.includes(appId)) {
    return errorResponse(request, {
      status: 403,
      error: 'forbidden',
      message: 'Anda tidak memiliki akses ke aplikasi ini.',
    });
  }

  // URL resolution strategy:
  //   Production: ACCESS_RESOURCE_URLS_JSON Secret is the sole source.
  //   Development: D1 app_links override is checked first (allows localhost),
  //                then Secret as fallback.
  const isDev = env.ENVIRONMENT === 'development';
  const url = isDev
    ? (await getStoredAppLaunchUrl(env.APPVIBE_DB, appId, { allowLocalhost: true })
       || getAppLaunchUrl(appId, env.ACCESS_RESOURCE_URLS_JSON))
    : getAppLaunchUrl(appId, env.ACCESS_RESOURCE_URLS_JSON);
  if (!url) {
    return errorResponse(request, {
      status: 503,
      error: 'app_not_configured',
      message: 'URL aplikasi belum dikonfigurasi. Hubungi support.',
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
