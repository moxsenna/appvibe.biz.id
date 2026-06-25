import { signPayCoreRequest } from '../../lib/paycore-sign.js';
import { PACKS, VALID_PACK_IDS, DEFAULT_PACK_ID } from '../../lib/packs.js';

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
    origin === 'https://appvibe.web.id' ||
    origin === 'https://appvibe.biz.id';
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
  const packId = String(body.pack_id || '').trim();

  // Validate pack
  if (!packId || !VALID_PACK_IDS.includes(packId)) {
    return json(
      { error: 'invalid_pack', message: 'Paket tidak valid. Silakan pilih paket yang tersedia.' },
      422,
      cors,
    );
  }

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

  try {
    const pack = PACKS[packId];
    const externalOrderId = `vault-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const idempotencyKey = crypto.randomUUID();

    const orderBody = {
      external_order_id: externalOrderId,
      merchant_profile_id: 'appvibe_default',
      product_key: pack.product_key,
      description: pack.description,
      amount: pack.amount,
      currency: pack.currency,
      customer: {
        name,
        email,
        phone: phone || '081234567890',
      },
      return_url: returnUrl,
      fulfillment_data: {
        pack_id: packId,
        product_key: pack.product_key,
        email,
        name,
        phone,
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

    // Persist order locally in KV for status tracking (best-effort)
    try {
      if (env.CHECKOUT_EVENTS) {
        const orderRecord = {
          external_order_id: externalOrderId,
          paycore_order_id: paycoreJson.order_id,
          pack_id: packId,
          product_key: pack.product_key,
          amount: pack.amount,
          currency: pack.currency,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          payment_status: paycoreJson.payment_status || 'pending',
          fulfillment_status: 'pending',
          checkout_url: paycoreJson.checkout_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await env.CHECKOUT_EVENTS.put(`order:${paycoreJson.order_id}`, JSON.stringify(orderRecord), {
          expirationTtl: 60 * 60 * 24 * 90,
        });
        await env.CHECKOUT_EVENTS.put(`ext:${externalOrderId}`, paycoreJson.order_id, {
          expirationTtl: 60 * 60 * 24 * 90,
        });
        await env.CHECKOUT_EVENTS.put(`buyer:${email}`, paycoreJson.order_id, {
          expirationTtl: 60 * 60 * 24 * 90,
        });
      }
    } catch (kvErr) {
      console.error('[Checkout] KV persist failed:', kvErr);
      // Non-fatal — order still created, status tracking degraded
    }

    return json(
      {
        checkout_url: paycoreJson.checkout_url,
        order_id: paycoreJson.order_id,
        external_order_id: paycoreJson.external_order_id,
        payment_status: paycoreJson.payment_status || 'pending',
        amount: pack.amount,
      },
      201,
      cors,
    );
  } catch (err) {
    console.error('[Checkout] create-order error:', err);
    return json(
      {
        error: 'create_order_failed',
        message: 'Gagal membuat order. Silakan coba lagi nanti.',
      },
      502,
      cors,
    );
  }
}
