const APP_ORIGIN = 'https://appvibe.biz.id';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin === APP_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed ? origin : APP_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/**
 * GET /api/access
 *
 * DEPRECATED. The old email-based access lookup has been removed for
 * security: it exposed member/order data to anyone who knew an email
 * address. Member access is now gated behind WhatsApp magic-link auth
 * at /api/auth/* and /api/member/me.
 *
 * This endpoint always returns 410 Gone and never inspects the `email`
 * query parameter or touches member data.
 */
export async function onRequest(context) {
  const { request } = context;
  const cors = corsHeaders(request);

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  return json(
    {
      error: 'endpoint_disabled',
      message:
        'Akses berbasis email dinonaktifkan. Masuk melalui WhatsApp di halaman /access/.',
      login_url: '/access/',
    },
    410,
    cors,
  );
}
