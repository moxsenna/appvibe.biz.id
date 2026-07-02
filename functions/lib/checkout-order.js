import { signPayCoreRequest } from './paycore-sign.js';
import { purchaseTypeForPack } from './packs.js';

export const APP_ORIGIN = 'https://appvibe.biz.id';

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin === APP_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed ? origin : APP_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function pickMeta(body, key) {
  return typeof body?.[key] === 'string' ? body[key].trim() : '';
}

export async function postJsonFollowingGoogleRedirect(url, payload) {
  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    redirect: 'manual',
    body: JSON.stringify(payload),
  });

  if (response.status === 302) {
    const location = response.headers.get('location');
    if (location) {
      response = await fetch(location, { redirect: 'follow' });
    }
  }

  if (!response.ok) {
    console.warn('[Checkout] order forwarding returned', response.status);
  }
}

export async function scheduleBackground(context, promise, label) {
  const guarded = promise.catch((err) => {
    console.error(label, err);
  });

  if (typeof context.waitUntil === 'function') {
    context.waitUntil(guarded);
    return;
  }

  await guarded;
}

export async function createPaycoreOrderForPack({
  repo,
  member,
  name,
  email,
  phoneE164,
  packId,
  pack,
  baseUrl,
  appId,
  keyId,
  appSecret,
  returnUrl,
  amountOverride,
  purchaseTypeOverride,
  fulfillmentMeta = {},
  leadMeta = {},
  trackingMeta,
}) {
  const externalOrderId = `vault-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const idempotencyKey = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  const amount = typeof amountOverride === 'number' ? amountOverride : pack.amount;
  const purchaseType = purchaseTypeOverride || purchaseTypeForPack(packId);

  const orderBody = {
    external_order_id: externalOrderId,
    product_key: pack.product_key,
    description: pack.description,
    amount,
    currency: pack.currency,
    customer: {
      name,
      email,
      phone: phoneE164,
    },
    return_url: returnUrl,
    fulfillment_data: {
      pack_id: packId,
      product_key: pack.product_key,
      email,
      name,
      phone: phoneE164,
      source: 'appvibe.biz.id_checkout',
      ...fulfillmentMeta,
    },
  };

  const rawBody = JSON.stringify(orderBody);
  const timestamp = new Date().toISOString();
  const path = '/v1/orders';
  const signatureHex = await signPayCoreRequest({
    appSecret,
    timestamp,
    method: 'POST',
    path,
    rawBody,
  });

  const paycoreRes = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PayCore-App': appId,
      'X-PayCore-Key-Id': keyId,
      'X-PayCore-Timestamp': timestamp,
      'X-PayCore-Signature': `sha256=${signatureHex}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: rawBody,
  });

  const paycoreJson = await paycoreRes.json().catch(() => ({}));

  if (!paycoreRes.ok) {
    return {
      ok: false,
      response: json(
        {
          error: 'paycore_error',
          status: paycoreRes.status,
          message: 'Gagal membuat order pembayaran. Silakan coba lagi.',
        },
        paycoreRes.status >= 500 ? 502 : 400,
      ),
    };
  }

  if (!paycoreJson.checkout_url) {
    return {
      ok: false,
      response: json({ error: 'no_checkout_url', message: 'Tidak ada URL pembayaran dari PayCore.' }, 502),
    };
  }

  await repo.createOrder({
    id: orderId,
    member_id: member.id,
    paycore_order_id: paycoreJson.order_id,
    external_order_id: externalOrderId,
    pack_id: packId,
    product_key: pack.product_key,
    purchase_type: purchaseType,
    amount,
    currency: pack.currency,
    lp_variant: leadMeta.lp_variant || undefined,
    lp_plan: leadMeta.lp_plan || undefined,
    lp_pack: leadMeta.lp_pack || undefined,
    tracking_meta: trackingMeta,
  });

  return {
    ok: true,
    orderId,
    externalOrderId,
    paycoreJson,
    amount,
    purchaseType,
  };
}
