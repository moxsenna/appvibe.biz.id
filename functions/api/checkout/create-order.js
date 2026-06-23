import { signPayCoreRequest } from '../../lib/paycore-sign.js';
import { PACKS, PLANS, VALID_PACK_IDS, VALID_PLAN_IDS } from '../../lib/packs.js';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.startsWith('https://appvibe.web.id') ||
    origin.startsWith('https://appvibe.biz.id');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://appvibe.biz.id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, cors);
  }

  const baseUrl = env.PAYCORE_BASE_URL || 'https://pay-staging.appvibe.biz.id';
  const appId = env.PAYCORE_APP_ID || 'appvibe_vault';
  const keyId = env.PAYCORE_KEY_ID;
  const appSecret = env.PAYCORE_APP_SECRET;
  const returnUrl = env.PAYCORE_RETURN_URL || 'https://appvibe.biz.id/payment/return';

  if (!keyId || !appSecret) {
    return json(
      {
        error: 'payments_not_configured',
        message:
          'Pembayaran belum siap. Pastikan PAYCORE_KEY_ID dan PAYCORE_APP_SECRET sudah diatur di environment Cloudflare Pages.',
      },
      503,
      cors,
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400, cors);
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const planId = String(body.plan_id || '').trim();
  const packId = String(body.pack_id || '').trim();
  const turnstileToken = String(body.turnstileToken || '').trim();

  // Validate customer info
  if (!name || name.length < 2) {
    return json(
      { error: 'validation', message: 'Nama lengkap wajib diisi (minimal 2 karakter).' },
      422,
      cors,
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(
      { error: 'validation', message: 'Email valid wajib diisi.' },
      422,
      cors,
    );
  }
  if (!phone || phone.length < 8) {
    return json(
      { error: 'validation', message: 'Nomor WhatsApp valid wajib diisi.' },
      422,
      cors,
    );
  }

  // Resolve product + price from plan_id or pack_id
  let productKey, amount, currency, fulfillmentPackId, description, externalPackId;

  if (planId === 'full-vault') {
    if (packId) {
      return json(
        { error: 'invalid_params', message: 'Full Vault tidak memerlukan pack.' },
        422,
        cors,
      );
    }
    const plan = PLANS['full-vault'];
    productKey = plan.product_key;
    amount = plan.amount;
    currency = plan.currency;
    fulfillmentPackId = plan.pack_id;
    externalPackId = 'full-vault';
    description = plan.name;
  } else if (planId === 'single-pack' || (!planId && packId && VALID_PACK_IDS.includes(packId))) {
    // Accept either explicit plan_id=single-pack or legacy pack_id-only
    const resolvedPackId = packId || 'advertiser'; // should not reach here without packId
    if (!VALID_PACK_IDS.includes(resolvedPackId)) {
      return json(
        { error: 'invalid_pack', message: 'Paket tidak valid. Silakan pilih paket yang tersedia.' },
        422,
        cors,
      );
    }
    const pack = PACKS[resolvedPackId];
    productKey = pack.product_key;
    amount = pack.amount;
    currency = pack.currency;
    fulfillmentPackId = resolvedPackId;
    externalPackId = resolvedPackId;
    description = pack.description;
  } else {
    return json(
      { error: 'invalid_plan', message: 'Pilih paket yang valid untuk melanjutkan.' },
      422,
      cors,
    );
  }

  const externalOrderId = `vault-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const idempotencyKey = crypto.randomUUID();

  const orderBody = {
    external_order_id: externalOrderId,
    merchant_profile_id: 'appvibe_default',
    product_key: productKey,
    description,
    amount,
    currency,
    customer: {
      name,
      email,
      phone: phone || '081234567890',
    },
    return_url: returnUrl,
    fulfillment_data: {
      pack_id: fulfillmentPackId,
      product_key: productKey,
      email,
      name,
      phone,
      source: 'appvibe.biz.id_checkout',
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

  // Call PayCore API
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
    return json(
      {
        error: 'paycore_error',
        status: paycoreRes.status,
        message: 'Gagal membuat order pembayaran. Silakan coba lagi.',
      },
      paycoreRes.status >= 500 ? 502 : 400,
      cors,
    );
  }

  if (!paycoreJson.checkout_url) {
    return json({ error: 'no_checkout_url', message: 'Tidak ada URL pembayaran dari PayCore.' }, 502, cors);
  }

  // Persist order locally in KV for status tracking
  if (env.CHECKOUT_EVENTS) {
    const orderRecord = {
      external_order_id: externalOrderId,
      paycore_order_id: paycoreJson.order_id,
      plan_id: planId || null,
      pack_id: fulfillmentPackId,
      product_key: productKey,
      amount,
      currency,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      payment_status: paycoreJson.payment_status || 'pending',
      fulfillment_status: 'pending',
      checkout_url: paycoreJson.checkout_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await env.CHECKOUT_EVENTS.put(
      `order:${paycoreJson.order_id}`,
      JSON.stringify(orderRecord),
      { expirationTtl: 60 * 60 * 24 * 90 }, // 90 days
    );

    await env.CHECKOUT_EVENTS.put(
      `ext:${externalOrderId}`,
      paycoreJson.order_id,
      { expirationTtl: 60 * 60 * 24 * 90 },
    );

    await env.CHECKOUT_EVENTS.put(
      `buyer:${email}`,
      paycoreJson.order_id,
      { expirationTtl: 60 * 60 * 24 * 90 },
    );
  }

  return json(
    {
      checkout_url: paycoreJson.checkout_url,
      order_id: paycoreJson.order_id,
      external_order_id: paycoreJson.external_order_id,
      payment_status: paycoreJson.payment_status || 'pending',
      amount,
    },
    201,
    cors,
  );
}
