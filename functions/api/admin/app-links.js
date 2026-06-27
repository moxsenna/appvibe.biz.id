import { listAppLinkSettings, saveAppLaunchUrl } from '../../lib/app-links.js';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function authorize(request, env) {
  const adminToken = env.ADMIN_TOKEN;
  if (!adminToken) {
    return { ok: false, response: json({ error: 'admin_not_configured', message: 'Admin panel belum dikonfigurasi.' }, 503) };
  }

  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearerToken !== adminToken) {
    return { ok: false, response: json({ error: 'unauthorized', message: 'Token admin tidak valid.' }, 401) };
  }

  return { ok: true };
}

/**
 * GET /api/admin/app-links
 * PUT /api/admin/app-links
 *
 * Admin-only configuration for the member portal's "Buka aplikasi" buttons.
 * Requires Authorization: Bearer ADMIN_TOKEN.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request);

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (!['GET', 'PUT'].includes(request.method)) return json({ error: 'method_not_allowed' }, 405, cors);

  const auth = authorize(request, env);
  if (!auth.ok) {
    const body = await auth.response.json();
    return json(body, auth.response.status, cors);
  }

  if (!env.APPVIBE_DB) {
    return json({ error: 'storage_unavailable', message: 'D1 database tidak tersedia.' }, 503, cors);
  }

  try {
    if (request.method === 'GET') {
      const apps = await listAppLinkSettings(env.APPVIBE_DB, env.ACCESS_RESOURCE_URLS_JSON);
      return json({ total: apps.length, apps }, 200, cors);
    }

    const payload = await request.json().catch(() => ({}));
    const result = await saveAppLaunchUrl(
      env.APPVIBE_DB,
      payload.app_id,
      payload.launch_url,
      env.ACCESS_RESOURCE_URLS_JSON
    );

    if (!result.ok) {
      return json({ error: result.error, message: result.message }, result.status, cors);
    }

    return json({ app: result.app }, 200, cors);
  } catch (err) {
    console.error('[Admin] app links error:', err);
    return json({ error: 'app_links_failed', message: 'Gagal menyimpan pengaturan aplikasi.' }, 500, cors);
  }
}
