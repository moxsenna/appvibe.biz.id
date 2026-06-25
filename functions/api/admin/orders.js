import { PACKS } from '../../lib/packs.js';

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
 * Lists all orders from CHECKOUT_EVENTS KV.
 * Returns paginated results sorted by creation date (newest first).
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

  if (!env.CHECKOUT_EVENTS) {
    return json({ error: 'storage_unavailable', message: 'KV CHECKOUT_EVENTS tidak tersedia.' }, 503, cors);
  }

  try {
    // List all order keys
    const orderKeys = [];
    let cursor;
    do {
      const listResult = await env.CHECKOUT_EVENTS.list({
        prefix: 'order:',
        cursor,
        limit: 1000,
      });
      orderKeys.push(...listResult.keys);
      cursor = listResult.cursor;
    } while (cursor);

    // Fetch all order records in parallel (batched)
    const batchSize = 50;
    const orders = [];
    for (let i = 0; i < orderKeys.length; i += batchSize) {
      const batch = orderKeys.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((k) => env.CHECKOUT_EVENTS.get(k.name))
      );
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          try {
            const order = JSON.parse(r.value);
            const pack = PACKS[order.pack_id];
            orders.push({
              order_id: order.paycore_order_id || '',
              external_order_id: order.external_order_id || '',
              pack_id: order.pack_id,
              pack_name: pack?.description || order.product_key || order.pack_id,
              amount: order.amount,
              currency: order.currency,
              buyer_name: order.customer_name || '',
              buyer_email: order.customer_email || '',
              payment_status: order.payment_status || 'unknown',
              fulfillment_status: order.fulfillment_status || 'unknown',
              checkout_url: order.checkout_url || '',
              created_at: order.created_at,
              updated_at: order.updated_at,
              fulfilled_at: order.fulfilled_at,
            });
          } catch {}
        }
      });
    }

    // Sort newest first
    orders.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return json({
      total: orders.length,
      orders,
    }, 200, cors);
  } catch (err) {
    console.error('[Admin] list orders error:', err);
    return json({ error: 'list_failed', message: 'Gagal mengambil daftar order.' }, 500, cors);
  }
}
