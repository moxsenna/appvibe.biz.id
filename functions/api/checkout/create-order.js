import { signPayCoreRequest } from '../../lib/paycore-sign.js';

const PACKS = {
  advertiser: {
    product_key: 'pack_advertiser',
    description: 'White-Label Vault — Advertiser App Pack',
    amount: 99000,
  },
  commerce: {
    product_key: 'pack_commerce',
    description: 'White-Label Vault — Commerce & Marketplace Pack',
    amount: 99000,
  },
  creator: {
    product_key: 'pack_creator',
    description: 'White-Label Vault — Creator & Affiliate Pack',
    amount: 99000,
  },
  branding: {
    product_key: 'pack_branding',
    description: 'White-Label Vault — Brand & Launch Pack',
    amount: 99000,
  },
  vault_full: {
    product_key: 'vault_full_license',
    description: 'White-Label AI App Vault — Full License (13 apps)',
    amount: 199000,
  },
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin === 'https://appvibe.web.id';
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://appvibe.web.id',
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
  const returnUrl = env.PAYCORE_RETURN_URL || 'https://appvibe.web.id/payment/return';

  if (!keyId || !appSecret) {
    return json(
      {
        error: 'payments_not_configured',
        message: 'Set PAYCORE_KEY_ID and PAYCORE_APP_SECRET in Cloudflare Pages (sama dengan PayCore Worker VAULT_*).',
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
  const packId = String(body.pack_id || 'vault_full').trim();

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'validation', message: 'Nama dan email valid wajib diisi.' }, 422, cors);
  }

  const pack = PACKS[packId] || PACKS.vault_full;
  const externalOrderId = `vault-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const idempotencyKey = crypto.randomUUID();

  const orderBody = {
    external_order_id: externalOrderId,
    merchant_profile_id: 'appvibe_default',
    product_key: pack.product_key,
    description: pack.description,
    amount: pack.amount,
    currency: 'IDR',
    customer: {
      name,
      email,
      phone: phone || '081234567890',
    },
    return_url: returnUrl,
    fulfillment_data: {
      pack_id: packId,
      email,
      source: 'appvibe.web.id_checkout',
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
    return json(
      {
        error: 'paycore_error',
        status: paycoreRes.status,
        paycore: paycoreJson,
      },
      paycoreRes.status >= 500 ? 502 : 400,
      cors,
    );
  }

  if (!paycoreJson.checkout_url) {
    return json(
      { error: 'no_checkout_url', paycore: paycoreJson },
      502,
      cors,
    );
  }

  return json(
    {
      checkout_url: paycoreJson.checkout_url,
      order_id: paycoreJson.order_id,
      external_order_id: paycoreJson.external_order_id,
      payment_status: paycoreJson.payment_status,
      amount: pack.amount,
    },
    201,
    cors,
  );
}