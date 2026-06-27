import { verifyPayCoreEvent } from '../../lib/paycore-verify.js';
import { PACKS } from '../../lib/packs.js';

const ORDER_TTL_SECONDS = 60 * 60 * 24 * 90;
const FULFILLMENT_TTL_SECONDS = 60 * 60 * 24 * 365;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function scheduleBackground(context, promise, label) {
  const guarded = promise.catch((err) => {
    console.error(label, err);
  });

  if (typeof context.waitUntil === 'function') {
    context.waitUntil(guarded);
    return;
  }

  await guarded;
}

/**
 * POST /api/webhooks/paycore
 *
 * Receives payment.succeeded events from PayCore.
 * Requirements:
 * - Verify HMAC signature with timing-safe compare
 * - Reject replay attacks via timestamp skew check
 * - Idempotent: same event_id never processed twice
 * - Duplicate-safe: same order_id never fulfilled twice
 * - Grants entitlement/fulfillment exactly once
 * - Records audit trail in KV
 * - Forwards fulfillment data to configured webhook
 */
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secret = env.PAYCORE_WEBHOOK_SECRET;
  if (!secret) {
    return json({ error: 'webhook_not_configured' }, 503);
  }

  // 1. Read raw body before any parsing
  const rawBody = await request.text();
  const ts = request.headers.get('X-PayCore-Event-Timestamp');
  const sig = request.headers.get('X-PayCore-Event-Signature');

  // 2. Verify HMAC signature
  const ok = await verifyPayCoreEvent({
    webhookSecret: secret,
    timestampHeader: ts || '',
    rawBody,
    signatureHeader: sig || '',
  });

  if (!ok) {
    return json({ error: 'invalid_signature' }, 401);
  }

  // 3. Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const eventId = payload.event_id;
  const eventType = payload.event_type;
  const orderId = payload.data?.order_id;
  const externalOrderId = payload.data?.external_order_id || '';
  const productKey = payload.data?.product_key || '';
  const fulfillmentData = payload.data?.fulfillment_data || {};

  if (!eventId || !orderId) {
    return json({ error: 'missing_event_fields' }, 400);
  }

  if (eventType === 'payment.succeeded' && !env.CHECKOUT_EVENTS) {
    return json({ error: 'storage_unavailable', message: 'Checkout storage binding is required.' }, 503);
  }

  // 4. Idempotency — check if event already processed
  if (env.CHECKOUT_EVENTS) {
    const seen = await env.CHECKOUT_EVENTS.get(`evt:${eventId}`);
    if (seen) {
      return json({ ok: true, duplicate: true, event_id: eventId }, 200);
    }
  }

  // 5. Only process payment.succeeded
  if (eventType !== 'payment.succeeded') {
    // Acknowledge non-success events (they're logged by PayCore)
    if (env.CHECKOUT_EVENTS) {
      await env.CHECKOUT_EVENTS.put(
        `evt:${eventId}`,
        JSON.stringify({ event_type: eventType, order_id: orderId, status: 'ignored', at: new Date().toISOString() }),
        { expirationTtl: ORDER_TTL_SECONDS },
      );
    }
    return json({ ok: true, event_id: eventId, ignored: true }, 200);
  }

  const packId = fulfillmentData.pack_id || '';
  const buyerEmail = fulfillmentData.email || '';
  const buyerEmailKey = String(buyerEmail).trim().toLowerCase();
  const buyerName = fulfillmentData.name || '';
  const amount = payload.data?.amount || 0;

  // 6. Validate payload has required data
  if (!buyerEmail) {
    return json({ error: 'missing_fulfillment_data', message: 'Email buyer diperlukan.' }, 422);
  }

  if (!packId || !PACKS[packId]) {
    return json({ error: 'invalid_product', message: `Product key tidak dikenal: ${productKey}` }, 422);
  }

  // 7. Check that this order_id hasn't been fulfilled already
  let existingOrder = null;
  if (env.CHECKOUT_EVENTS) {
    const raw = await env.CHECKOUT_EVENTS.get(`order:${orderId}`);
    if (raw) {
      try {
        existingOrder = JSON.parse(raw);
      } catch {}
    }
  }

  // Check if already fulfilled
  if (existingOrder?.fulfillment_status === 'delivered') {
    // Already fulfilled — record event but don't duplicate
    if (env.CHECKOUT_EVENTS) {
      await env.CHECKOUT_EVENTS.put(
        `evt:${eventId}`,
        JSON.stringify({ event_type: eventType, order_id: orderId, status: 'already_fulfilled', at: new Date().toISOString() }),
        { expirationTtl: ORDER_TTL_SECONDS },
      );
    }
    return json({ ok: true, duplicate: true, event_id: eventId }, 200);
  }

  // 8. Execute fulfillment atomically with KV writes
  const fulfillmentTimestamp = new Date().toISOString();
  const fulfilled = {
    event_id: eventId,
    event_type: eventType,
    order_id: orderId,
    external_order_id: externalOrderId,
    product_key: productKey,
    pack_id: packId,
    amount,
    customer_email: buyerEmail,
    customer_name: buyerName,
    fulfilled_at: fulfillmentTimestamp,
    paid_at: payload.data?.paid_at || fulfillmentTimestamp,
  };

  try {
    if (env.CHECKOUT_EVENTS) {
      // Update order record to paid + delivered
      const orderRecord = existingOrder || {};
      const updatedOrder = {
        ...orderRecord,
        paycore_order_id: orderId,
        external_order_id: externalOrderId,
        pack_id: packId,
        product_key: productKey,
        amount,
        customer_email: buyerEmail,
        customer_name: buyerName,
        payment_status: 'paid',
        fulfillment_status: 'delivered',
        fulfilled_at: fulfillmentTimestamp,
        updated_at: fulfillmentTimestamp,
      };

      await env.CHECKOUT_EVENTS.put(
        `order:${orderId}`,
        JSON.stringify(updatedOrder),
        { expirationTtl: ORDER_TTL_SECONDS },
      );

      // Index by external_order_id if present
      if (externalOrderId) {
        await env.CHECKOUT_EVENTS.put(`ext:${externalOrderId}`, orderId, {
          expirationTtl: ORDER_TTL_SECONDS,
        });
      }

      // Track fulfilled buyers
      await env.CHECKOUT_EVENTS.put(
        `fulfilled:${buyerEmailKey}`,
        JSON.stringify({
          order_id: orderId,
          pack_id: packId,
          fulfilled_at: fulfillmentTimestamp,
        }),
        { expirationTtl: FULFILLMENT_TTL_SECONDS },
      );

      await env.CHECKOUT_EVENTS.put(`buyer:${buyerEmailKey}`, orderId, {
        expirationTtl: ORDER_TTL_SECONDS,
      });

      // Payment audit log
      const auditKey = `audit:${orderId}`;
      const existingAudit = await env.CHECKOUT_EVENTS.get(auditKey);
      const auditEntries = existingAudit ? JSON.parse(existingAudit) : [];
      auditEntries.push({
        event: 'payment.succeeded',
        event_id: eventId,
        at: fulfillmentTimestamp,
        amount,
      });
      await env.CHECKOUT_EVENTS.put(auditKey, JSON.stringify(auditEntries), {
        expirationTtl: FULFILLMENT_TTL_SECONDS,
      });

      // Mark the event processed only after fulfillment state has been written.
      await env.CHECKOUT_EVENTS.put(
        `evt:${eventId}`,
        JSON.stringify({ event_type: eventType, order_id: orderId, status: 'processed', at: fulfillmentTimestamp }),
        { expirationTtl: ORDER_TTL_SECONDS },
      );
    }

    // 9. Forward fulfillment to configured webhook (LEAD_WEBHOOK_URL or FULFILLMENT_URL)
    const fulfillmentWebhook = env.FULFILLMENT_WEBHOOK_URL || env.LEAD_WEBHOOK_URL;
    if (fulfillmentWebhook) {
      // Forward in the background and mark notification only after success.
      await scheduleBackground(
        context,
        (async () => {
          const body = JSON.stringify({
            name: buyerName,
            email: buyerEmail,
            whatsapp: fulfillmentData.phone || '',
            niche: packId,
            model_penggunaan: 'purchase',
            selected_pack: packId,
            selected_app: '',
            form_open_source: 'paycore_webhook',
            utm_source: '',
            utm_medium: '',
            utm_campaign: '',
            utm_content: '',
            utm_term: '',
            referrer: '',
            landing_url: '',
            device_type: '',
            captured_at: fulfillmentTimestamp,
            order_id: orderId,
            order_status: 'paid',
            fulfilled_at: fulfillmentTimestamp,
          });

          let fwdRes = await fetch(fulfillmentWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            redirect: 'manual',
            body,
          });

          // Google Apps Script may return a 302 redirect after POST.
          if (fwdRes.status === 302) {
            const location = fwdRes.headers.get('location');
            if (location) {
              fwdRes = await fetch(location, { redirect: 'follow' });
            }
          }

          if (!fwdRes.ok) {
            console.warn('[Fulfillment] webhook returned', fwdRes.status);
            return;
          }

          if (env.CHECKOUT_EVENTS) {
            await env.CHECKOUT_EVENTS.put(
              `fulfillment_notified:${orderId}`,
              fulfillmentTimestamp,
              { expirationTtl: ORDER_TTL_SECONDS },
            );
          }
        })(),
        '[Fulfillment] webhook forwarding failed:',
      );
    }

    console.log('[Fulfillment] payment_succeeded', JSON.stringify(fulfilled));

    return json(
      {
        ok: true,
        event_id: eventId,
        order_id: orderId,
        fulfillment_status: 'delivered',
      },
      200,
    );
  } catch (err) {
    console.error('[Fulfillment] error:', err);
    // Return 5xx so PayCore retries
    return json({ error: 'fulfillment_failed', message: err.message }, 500);
  }
}
