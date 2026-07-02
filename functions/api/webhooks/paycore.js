import { verifyPayCoreEvent } from '../../lib/paycore-verify.js';
import { PACKS } from '../../lib/packs.js';
import { createMemberAccessRepo } from '../../lib/db.js';

async function hashData(str) {
  if (!str) return undefined;
  const encoder = new TextEncoder();
  const data = encoder.encode(str.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendCapiPurchase({ env, eventId, order, member }) {
  const pixelId = env.META_PIXEL_ID;
  const token = env.META_CAPI_TOKEN;
  if (!pixelId || !token) return;

  try {
    let fbp, fbc, clientIp, userAgent;
    if (order.tracking_meta) {
      try {
        const tm = JSON.parse(order.tracking_meta);
        fbp = tm.fbp;
        fbc = tm.fbc;
        clientIp = tm.client_ip;
        userAgent = tm.user_agent;
      } catch (e) {}
    }

    const emailHash = await hashData(member?.email_normalized);
    const phoneHash = await hashData(member?.phone_e164?.replace(/[^0-9]/g, ''));

    const payload = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_id: eventId,
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: userAgent,
          fbp,
          fbc,
          em: emailHash ? [emailHash] : undefined,
          ph: phoneHash ? [phoneHash] : undefined,
        },
        custom_data: {
          value: order.amount,
          currency: order.currency || 'IDR',
          content_name: order.pack_id,
        }
      }]
    };

    await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('[CAPI] error:', err);
  }
}


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
 * D1 is the single source of truth. Requirements:
 * - Verify HMAC signature with timing-safe compare + timestamp skew check
 * - Idempotent: same event_id never processed twice (payment_events table)
 * - Duplicate-safe: same order_id never fulfilled twice
 * - Grants entitlement exactly once (unique active entitlement index)
 * - Records audit trail in D1
 * - Forwards fulfillment data to configured webhook (best-effort)
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

  // 1. Read raw body before any parsing.
  const rawBody = await request.text();
  const ts = request.headers.get('X-PayCore-Event-Timestamp');
  const sig = request.headers.get('X-PayCore-Event-Signature');

  // 2. Verify HMAC signature.
  const ok = await verifyPayCoreEvent({
    webhookSecret: secret,
    timestampHeader: ts || '',
    rawBody,
    signatureHeader: sig || '',
  });

  if (!ok) {
    return json({ error: 'invalid_signature' }, 401);
  }

  // 3. Parse payload.
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const eventId = payload.event_id;
  const eventType = payload.event_type;
  const orderId = payload.data?.order_id;

  if (!eventId || !orderId) {
    return json({ error: 'missing_event_fields' }, 400);
  }

  if (!env.APPVIBE_DB) {
    return json({ error: 'storage_unavailable', message: 'D1 database is required.' }, 503);
  }

  const repo = createMemberAccessRepo(env.APPVIBE_DB);

  // 4. Idempotency — if the event was already seen, acknowledge and stop.
  if (await repo.isEventSeen(eventId)) {
    return json({ ok: true, duplicate: true, event_id: eventId }, 200);
  }

  // 5. Only process payment.succeeded; record others as ignored.
  if (eventType !== 'payment.succeeded') {
    await repo.markEventSeen({
      event_id: eventId,
      event_type: eventType,
      paycore_order_id: orderId,
      status: 'ignored',
    });
    return json({ ok: true, event_id: eventId, ignored: true }, 200);
  }

  // 6. Resolve the order from the database by paycore_order_id.
  //    We never trust browser-supplied data.
  const order = await repo.getOrderByPaycoreId(orderId);
  if (!order) {
    return json({ error: 'order_not_found', message: 'Order tidak ditemukan untuk event ini.' }, 404);
  }

  // 7. Validate pack/product consistency against the server-created order.
  const pack = PACKS[order.pack_id];
  if (!pack) {
    return json({ error: 'invalid_product', message: `Product tidak dikenal: ${order.pack_id}` }, 422);
  }

  const payloadAmount = payload.data?.amount;
  if (typeof payloadAmount === 'number' && payloadAmount !== order.amount) {
    return json({ error: 'amount_mismatch', message: 'Jumlah pembayaran tidak sesuai order.' }, 422);
  }

  // 8. Already delivered? Record the event and stop (no double-grant).
  if (order.fulfillment_status === 'delivered') {
    await repo.markEventSeen({
      event_id: eventId,
      event_type: eventType,
      paycore_order_id: orderId,
      status: 'already_fulfilled',
    });
    return json({ ok: true, duplicate: true, event_id: eventId }, 200);
  }

  // 9. Atomically fulfill: mark paid + delivered, grant entitlement,
  //    activate member, bump entitlement_version, audit log.
  try {
    await repo.fulfillOrder({
      paycore_order_id: orderId,
      paid_at: payload.data?.paid_at,
      fulfilled_at: new Date().toISOString(),
    });

    await repo.markEventSeen({
      event_id: eventId,
      event_type: eventType,
      paycore_order_id: orderId,
      status: 'processed',
    });

    await repo.insertAuditLog({
      member_id: order.member_id,
      order_id: order.id,
      event_type: 'payment_succeeded',
      metadata_json: JSON.stringify({ event_id: eventId, amount: order.amount }),
    });

    // 10. Fire Meta Conversions API (Purchase)
    const member = await repo.getMemberById(order.member_id);
    await scheduleBackground(
      context,
      sendCapiPurchase({ env, eventId, order, member }),
      '[CAPI] Purchase failed:'
    );

    // 11. Forward fulfillment to configured webhook (best-effort, background).
    const fulfillmentWebhook = env.FULFILLMENT_WEBHOOK_URL || env.LEAD_WEBHOOK_URL;
    if (fulfillmentWebhook) {
      const fulfillmentTimestamp = new Date().toISOString();
      await scheduleBackground(
        context,
        (async () => {

          const body = JSON.stringify({
            name: member?.name || '',
            email: member?.email_normalized || '',
            whatsapp: member?.phone_e164 || '',
            niche: order.pack_id,
            model_penggunaan: 'purchase',
            selected_pack: order.pack_id,
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
        })(),
        '[Fulfillment] webhook forwarding failed:',
      );
    }

    // 12. Forward to AppVibe Flow autoresponder (best-effort, dynamic import)
    if (env.AVF_EVENT_URL) {
      await scheduleBackground(
        context,
        (async () => {
          try {
            const { postEventToFlow } = await import('../../lib/avf-client.js');
            await postEventToFlow(env, {
              type: 'payment.paid',
              contact: {
                name: member?.name || '',
                email: member?.email_normalized || '',
                phone: member?.phone_e164 || '',
              },
              data: {
                product_name: pack.description || pack.product_key || order.pack_id,
                pack_id: order.pack_id,
                amount: order.amount,
                order_id: orderId,
              },
            });
          } catch (e) {
            console.error('[AVF] payment.paid event failed:', e.message);
          }
        })(),
        '[AVF] payment.paid event failed:',
      );
    }

    return json(
      { ok: true, event_id: eventId, order_id: orderId, fulfillment_status: 'delivered' },
      200,
    );
  } catch (err) {
    console.error('[Fulfillment] error:', err);
    // Return 5xx so PayCore retries.
    return json({ error: 'fulfillment_failed', message: err.message }, 500);
  }
}
