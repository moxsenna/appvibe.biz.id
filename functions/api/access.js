import { PACKS } from '../lib/packs.js';

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
 * GET /api/access?email=xxx
 *
 * Look up fulfilled/pending orders for a buyer by email.
 * Returns order details with pack info, payment status, and fulfillment status.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request);

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);

  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'invalid_email', message: 'Masukkan email yang valid.' }, 400, cors);
  }

  if (!env.CHECKOUT_EVENTS) {
    return json({ error: 'storage_unavailable', message: 'Penyimpanan tidak tersedia.' }, 503, cors);
  }

  try {
    // Look up fulfilled orders for this email
    const fulfilledRaw = await env.CHECKOUT_EVENTS.get(`fulfilled:${email}`);
    const buyerOrderId = await env.CHECKOUT_EVENTS.get(`buyer:${email}`);

    const orders = [];
    const seenOrderIds = new Set();

    // If fulfillment record exists, fetch order details
    if (fulfilledRaw) {
      try {
        const fulfilled = JSON.parse(fulfilledRaw);
        if (fulfilled.order_id && !seenOrderIds.has(fulfilled.order_id)) {
          seenOrderIds.add(fulfilled.order_id);
          const raw = await env.CHECKOUT_EVENTS.get(`order:${fulfilled.order_id}`);
          if (raw) {
            try {
              const order = JSON.parse(raw);
              const pack = PACKS[order.pack_id];
              orders.push({
                order_id: order.paycore_order_id || fulfilled.order_id,
                external_order_id: order.external_order_id,
                pack_id: order.pack_id,
                product_key: pack?.product_key || order.product_key,
                amount: order.amount,
                currency: order.currency,
                payment_status: order.payment_status || 'paid',
                fulfillment_status: order.fulfillment_status || 'delivered',
                fulfilled_at: order.fulfilled_at || fulfilled.fulfilled_at,
                created_at: order.created_at,
                buyer_name: order.customer_name,
                buyer_email: order.customer_email,
              });
            } catch {}
          }
        }
      } catch {}
    }

    // Also check buyer index for most recent order
    if (buyerOrderId && !seenOrderIds.has(buyerOrderId)) {
      const raw = await env.CHECKOUT_EVENTS.get(`order:${buyerOrderId}`);
      if (raw) {
        try {
          const order = JSON.parse(raw);
          const pack = PACKS[order.pack_id];
          orders.push({
            order_id: order.paycore_order_id || buyerOrderId,
            external_order_id: order.external_order_id,
            pack_id: order.pack_id,
            product_key: pack?.product_key || order.product_key,
            amount: order.amount,
            currency: order.currency,
            payment_status: order.payment_status || 'pending',
            fulfillment_status: order.fulfillment_status || 'pending',
            fulfilled_at: order.fulfilled_at,
            created_at: order.created_at,
            buyer_name: order.customer_name,
            buyer_email: order.customer_email,
          });
        } catch {}
      }
    }

    if (orders.length === 0) {
      return json({ orders: [], message: 'Belum ada pembelian ditemukan untuk email ini.' }, 200, cors);
    }

    return json({ orders }, 200, cors);
  } catch (err) {
    console.error('[Access] lookup error:', err);
    return json({ error: 'lookup_failed', message: 'Gagal mencari data.' }, 500, cors);
  }
}
