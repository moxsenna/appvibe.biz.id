import { PACKS } from '../../lib/packs.js';
import { createMemberAccessRepo } from '../../lib/db.js';

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * GET /api/admin/orders
 * Requires ?token=ADMIN_TOKEN or Authorization: Bearer ADMIN_TOKEN
 *
 * Lists all orders from D1. Returns paginated results sorted by creation
 * date (newest first). Reads from APPVIBE_DB (D1).
 */
export async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request);

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);

  const adminToken = env.ADMIN_TOKEN;
  if (!adminToken) {
    return json({ error: 'admin_not_configured', message: 'Admin panel belum dikonfigurasi.' }, 503, cors);
  }

  // Auth check
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token') || '';
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (queryToken !== adminToken && bearerToken !== adminToken) {
    return json({ error: 'unauthorized', message: 'Token admin tidak valid.' }, 401, cors);
  }

  if (!env.APPVIBE_DB) {
    return json({ error: 'storage_unavailable', message: 'D1 database tidak tersedia.' }, 503, cors);
  }

  try {
    const repo = createMemberAccessRepo(env.APPVIBE_DB);

    // Read all orders via D1. We query orders joined with members for
    // buyer info. Since D1 doesn't have a paginated list-all on the repo,
    // we use a raw query.
    const { results: orderRows } = await env.APPVIBE_DB
      .prepare(
        `SELECT o.*, m.name AS member_name, m.email_normalized, m.phone_e164
         FROM orders o
         JOIN members m ON m.id = o.member_id
         ORDER BY o.created_at DESC`
      )
      .all();

    const orders = (orderRows || []).map((row) => {
      const pack = PACKS[row.pack_id];
      return {
        order_id: row.paycore_order_id || '',
        external_order_id: row.external_order_id || '',
        pack_id: row.pack_id,
        pack_name: pack?.description || row.product_key || row.pack_id,
        amount: row.amount,
        currency: row.currency,
        buyer_name: row.member_name || '',
        buyer_email: row.email_normalized || '',
        payment_status: row.payment_status || 'unknown',
        fulfillment_status: row.fulfillment_status || 'unknown',
        created_at: row.created_at,
        updated_at: row.updated_at,
        fulfilled_at: row.fulfilled_at,
        paid_at: row.paid_at,
      };
    });

    return json({ total: orders.length, orders }, 200, cors);
  } catch (err) {
    console.error('[Admin] list orders error:', err);
    return json({ error: 'list_failed', message: 'Gagal mengambil daftar order.' }, 500, cors);
  }
}
