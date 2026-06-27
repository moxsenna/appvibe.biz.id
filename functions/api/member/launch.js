/**
 * GET /api/member/launch?app_id={id}
 *
 * Validates the buyer's session and entitlement, then 302-redirects to
 * the app's external URL from admin D1 settings, then ACCESS_RESOURCE_URLS_JSON.
 *
 * - Never returns app URLs in JSON payloads.
 - Cache-Control: no-store, Referrer-Policy: no-referrer.
 * - Returns 403 if the app is not in the buyer's entitlement.
 * - Returns 503 if the app URL is not configured server-side.
 */
import { resolveSession } from '../../lib/session.js';
import { getAppLaunchUrl } from '../../lib/access-resources.js';
import { getStoredAppLaunchUrl } from '../../lib/app-links.js';
import { computeUnlockedAppIds } from '../../lib/entitlements.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const appId = new URL(request.url).searchParams.get('app_id');
  if (!appId) {
    return new Response(JSON.stringify({ error: 'missing_app_id', message: 'Parameter app_id diperlukan.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate session.
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

  // Check entitlement.
  const unlockedIds = computeUnlockedAppIds(session.entitlements);
  if (!unlockedIds.includes(appId)) {
    return new Response(JSON.stringify({
      error: 'forbidden',
      message: 'Anda tidak memiliki akses ke aplikasi ini.',
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Resolve URL from admin settings first, with env fallback for bootstrap.
  const url = await getStoredAppLaunchUrl(env.APPVIBE_DB, appId)
    || getAppLaunchUrl(appId, env.ACCESS_RESOURCE_URLS_JSON);
  if (!url) {
    return new Response(JSON.stringify({
      error: 'app_not_configured',
      message: 'URL aplikasi belum dikonfigurasi. Hubungi support.',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 302 redirect — URL is never in the response body.
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
