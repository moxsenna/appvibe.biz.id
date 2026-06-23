import { verifyPayCoreEvent } from '../../lib/paycore-verify.js';

/**
 * POST /api/webhooks/paycore
 * Test fulfillment: log event. Production would activate license in DB.
 */
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secret = env.PAYCORE_WEBHOOK_SECRET;
  if (!secret) {
    return new Response('Webhook not configured', { status: 503 });
  }

  const rawBody = await request.text();
  const ts = request.headers.get('X-PayCore-Event-Timestamp');
  const sig = request.headers.get('X-PayCore-Event-Signature');

  const ok = await verifyPayCoreEvent({
    webhookSecret: secret,
    timestampHeader: ts || '',
    rawBody,
    signatureHeader: sig || '',
  });

  if (!ok) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (payload.event_type !== 'payment.succeeded') {
    return new Response('Ignored', { status: 200 });
  }

  const eventId = payload.event_id;
  const orderId = payload.data?.order_id;

  // MVP test: idempotency via KV if bound
  if (env.CHECKOUT_EVENTS) {
    const seen = await env.CHECKOUT_EVENTS.get(`evt:${eventId}`);
    if (seen) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await env.CHECKOUT_EVENTS.put(`evt:${eventId}`, new Date().toISOString(), {
      expirationTtl: 60 * 60 * 24 * 90,
    });
    if (orderId) {
      await env.CHECKOUT_EVENTS.put(
        `order:${orderId}`,
        JSON.stringify({ event_id: eventId, at: new Date().toISOString() }),
        { expirationTtl: 60 * 60 * 24 * 90 },
      );
    }
  }

  console.log('paycore_payment_succeeded', {
    event_id: eventId,
    order_id: orderId,
    amount: payload.data?.amount,
    fulfillment_data: payload.data?.fulfillment_data,
  });

  return new Response(JSON.stringify({ ok: true, order_id: orderId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}