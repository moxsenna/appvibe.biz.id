/**
 * GET /api/member/marketing-kit?app_id=&format=html|plain&download=1
 */
import { resolveSession } from '../../lib/session.js';
import { computeUnlockedAppIds } from '../../lib/entitlements.js';
import { ALL_APP_IDS } from '../../lib/packs.js';
import { errorResponse } from '../../lib/error-page.js';
import { getKitHtml, getKitTitle, extractPlainText } from '../../lib/marketing-kits.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') {
    return errorResponse(request, { status: 405, error: 'method_not_allowed', message: 'Metode tidak diizinkan.' });
  }

  const url = new URL(request.url);
  const appId = url.searchParams.get('app_id');
  if (!appId || !ALL_APP_IDS.includes(appId)) {
    return errorResponse(request, { status: 400, error: 'invalid_app_id', message: 'Parameter app_id tidak valid.' });
  }

  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER,
  });
  if (!session.ok) {
    return errorResponse(request, { status: session.status, error: session.error, message: session.message });
  }

  const unlocked = computeUnlockedAppIds(session.entitlements);
  if (!unlocked.includes(appId)) {
    return errorResponse(request, { status: 403, error: 'forbidden', message: 'Anda tidak memiliki akses ke aplikasi ini.' });
  }

  const html = getKitHtml(appId);
  if (!html) {
    return errorResponse(request, { status: 503, error: 'kit_not_available', message: 'Template belum tersedia.' });
  }

  const download = url.searchParams.get('download');
  if (download === '1' || download === 'true') {
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${appId}-landing-template.html"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const format = url.searchParams.get('format') || 'html';
  const title = getKitTitle(html);
  if (format === 'plain') {
    return json({ app_id: appId, title, plain_text: extractPlainText(html) });
  }
  return json({ app_id: appId, title, html });
}