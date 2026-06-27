import { PACKS } from '../../lib/packs.js';

const APP_ORIGIN = 'https://appvibe.biz.id';
const ORDER_TTL_SECONDS = 60 * 60 * 24 * 90;

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
 * GET /api/checkout/status?order_id=xxx
 *
 * Returns current payment status from local KV store.
 * This is the source of truth for the frontend — NOT the final fulfillment.
 * Final fulfillment only comes via webhook.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  if (request.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405, cors);
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id') || '';
  const email = url.searchParams.get('email') || '';

  if (!orderId && !email) {
    return json(
      { error: 'missing_param', message: 'Parameter order_id atau email diperlukan.' },
      400,
      cors,
    );
  }

  if (!env.CHECKOUT_EVENTS) {
    return json(
      { error: 'storage_unavailable', message: 'Penyimpanan order tidak tersedia.' },
      503,
      cors,
    );
  }

  let targetOrderId = orderId;

  // If email provided, look up most recent order
  if (!targetOrderId && email) {
    targetOrderId = (await env.CHECKOUT_EVENTS.get(`buyer:${email}`)) || '';
  }

  if (!targetOrderId) {
    return json(
      { error: 'order_not_found', message: 'Order tidak ditemukan.' },
      404,
      cors,
    );
  }

  const raw = await env.CHECKOUT_EVENTS.get(`order:${targetOrderId}`);
  if (!raw) {
    return json(
      { error: 'order_not_found', message: 'Order tidak ditemukan.' },
      404,
      cors,
    );
  }

  let order;
  try {
    order = JSON.parse(raw);
  } catch {
    return json({ error: 'corrupt_data' }, 500, cors);
  }

  // Try to reconcile with PayCore if payment is still pending
  if (order.payment_status === 'pending' || order.payment_status === 'created') {
    try {
      const baseUrl = env.PAYCORE_BASE_URL || 'https://pay-staging.appvibe.biz.id';
      const appId = env.PAYCORE_APP_ID || 'appvibe_vault';
      const keyId = env.PAYCORE_KEY_ID;
      const appSecret = env.PAYCORE_APP_SECRET;

      if (keyId && appSecret) {
        const { signPayCoreRequest } = await import('../../lib/paycore-sign.js');
        const ts = new Date().toISOString();
        const rawBody = '{}';
        const sig = await signPayCoreRequest({
          appSecret,
          timestamp: ts,
          method: 'GET',
          path: `/v1/orders/${targetOrderId}`,
          rawBody,
        });

        const paycoreRes = await fetch(
          `${baseUrl.replace(/\/+$/, '')}/v1/orders/${targetOrderId}`,
          {
            headers: {
              'X-PayCore-App': appId,
              'X-PayCore-Key-Id': keyId,
              'X-PayCore-Timestamp': ts,
              'X-PayCore-Signature': `sha256=${sig}`,
              'Content-Type': 'application/json',
            },
          },
        );

        if (paycoreRes.ok) {
          const paycoreData = await paycoreRes.json();
          const remoteStatus = paycoreData.payment_status;

          // Update local record if status changed
          if (remoteStatus && remoteStatus !== order.payment_status) {
            order.payment_status = remoteStatus;
            order.updated_at = new Date().toISOString();
            await env.CHECKOUT_EVENTS.put(
              `order:${targetOrderId}`,
              JSON.stringify(order),
              { expirationTtl: ORDER_TTL_SECONDS },
            );
          }
        }
      }
    } catch (err) {
      // Reconciliation failure is non-fatal — return local data
      console.error('Status reconciliation failed:', err);
    }
  }

  // Return safe subset to frontend (no secrets, no raw fulfillment_data)
  return json(
    {
      order_id: targetOrderId,
      external_order_id: order.external_order_id,
      payment_status: order.payment_status,
      fulfillment_status: order.fulfillment_status,
      amount: order.amount,
      currency: order.currency,
      pack_id: order.pack_id,
      created_at: order.created_at,
      updated_at: order.updated_at,
    },
    200,
    cors,
  );
}
