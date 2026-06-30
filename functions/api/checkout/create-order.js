import { signPayCoreRequest } from '../../lib/paycore-sign.js';
import { PACKS, VALID_PACK_IDS, purchaseTypeForPack } from '../../lib/packs.js';
import { normalizePhone, InvalidPhoneError } from '../../lib/phone.js';
import { createMemberAccessRepo } from '../../lib/db.js';
import { hashIdentifier } from '../../lib/auth-crypto.js';
import { checkRateLimit } from '../../lib/rate-limit.js';
import { clientIp, verifyTurnstile } from '../../lib/turnstile.js';

const APP_ORIGIN = 'https://appvibe.biz.id';

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
    origin === APP_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed ? origin : APP_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function pickMeta(body, key) {
  return typeof body?.[key] === 'string' ? body[key].trim() : '';
}

async function postJsonFollowingGoogleRedirect(url, payload) {
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
  const returnUrl = env.PAYCORE_RETURN_URL || 'https://appvibe.biz.id/checkout/';

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

  if (!env.APPVIBE_DB) {
    return json(
      { error: 'storage_unavailable', message: 'Database belum dikonfigurasi.' },
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
  const phoneInput = String(body.phone || '').trim();
  const packId = String(body.pack_id || '').trim();
  const turnstileToken = String(body.turnstile_token || '').trim();
  const lpVariant = pickMeta(body, 'lp_variant');
  const lpPlan = pickMeta(body, 'lp_plan');
  const lpPack = pickMeta(body, 'lp_pack');

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

  // WhatsApp number is mandatory and must be a valid Indonesian mobile.
  let phoneE164;
  try {
    phoneE164 = normalizePhone(phoneInput);
  } catch (err) {
    if (err instanceof InvalidPhoneError) {
      return json(
        { error: 'validation', message: 'Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx.' },
        422,
        cors,
      );
    }
    throw err;
  }

  try {
    const turnstile = await verifyTurnstile({
      secret: env.TURNSTILE_SECRET_KEY,
      token: turnstileToken,
      remoteip: clientIp(request),
      fetchImpl: env._fetchImpl || fetch,
    });
    if (!turnstile.ok) {
      return json(
        { error: 'turnstile_failed', message: 'Verifikasi keamanan gagal. Silakan muat ulang halaman dan coba lagi.' },
        403,
        cors,
      );
    }

    const pack = PACKS[packId];
    const repo = createMemberAccessRepo(env.APPVIBE_DB);

    if (env.AUTH_TOKEN_PEPPER) {
      const nowMs = Date.now();
      const phoneKey = await hashIdentifier(`checkout_phone:${phoneE164}`, env.AUTH_TOKEN_PEPPER);
      const ipKey = await hashIdentifier(`checkout_ip:${clientIp(request)}`, env.AUTH_TOKEN_PEPPER);

      const phoneLimit = await checkRateLimit(repo, { kind: 'checkout_phone', key: phoneKey, nowMs });
      const ipLimit = phoneLimit.allowed
        ? await checkRateLimit(repo, { kind: 'checkout_ip', key: ipKey, nowMs })
        : { allowed: false };

      if (!phoneLimit.allowed || !ipLimit.allowed) {
        return json(
          { error: 'rate_limited', message: 'Terlalu banyak percobaan checkout. Silakan coba lagi beberapa saat lagi.' },
          429,
          cors,
        );
      }
    }

    // Create or find the member by canonical phone. Existing members keep
    // their original email — a new checkout never overwrites it.
    const member = await repo.findOrCreateMember({ name, email, phone_e164: phoneE164 });

    const externalOrderId = `vault-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const idempotencyKey = crypto.randomUUID();
    const orderId = crypto.randomUUID();

    const orderBody = {
      external_order_id: externalOrderId,
      product_key: pack.product_key,
      description: pack.description,
      amount: pack.amount,
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
        lp_variant: lpVariant,
        lp_plan: lpPlan,
        lp_pack: lpPack,
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

    // Persist the order to D1, linked to the member, BEFORE redirecting.
    await repo.createOrder({
      id: orderId,
      member_id: member.id,
      paycore_order_id: paycoreJson.order_id,
      external_order_id: externalOrderId,
      pack_id: packId,
      product_key: pack.product_key,
      purchase_type: purchaseTypeForPack(packId),
      amount: pack.amount,
      currency: pack.currency,
      lp_variant: lpVariant || undefined,
      lp_plan: lpPlan || undefined,
      lp_pack: lpPack || undefined,
    });

    if (env.LEAD_WEBHOOK_URL) {
      const now = new Date().toISOString();
      await scheduleBackground(
        context,
        postJsonFollowingGoogleRedirect(env.LEAD_WEBHOOK_URL, {
          name,
          email,
          whatsapp: phoneE164,
          niche: packId,
          model_penggunaan: 'purchase',
          selected_pack: packId,
          selected_app: '',
          form_open_source: 'checkout_form',
          utm_source: pickMeta(body, 'utm_source'),
          utm_medium: pickMeta(body, 'utm_medium'),
          utm_campaign: pickMeta(body, 'utm_campaign'),
          utm_content: pickMeta(body, 'utm_content'),
          utm_term: pickMeta(body, 'utm_term'),
          referrer: pickMeta(body, 'referrer'),
          landing_url: pickMeta(body, 'landing_url'),
          device_type: pickMeta(body, 'device_type'),
          lp_variant: lpVariant,
          lp_plan: lpPlan,
          lp_pack: lpPack,
          captured_at: now,
          order_id: paycoreJson.order_id || '',
          order_status: paycoreJson.payment_status || 'pending',
        }),
        '[Checkout] order forwarding failed:',
      );
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
