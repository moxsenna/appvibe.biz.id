import { PACKS, VALID_PACK_IDS } from '../../lib/packs.js';
import { normalizePhone, InvalidPhoneError } from '../../lib/phone.js';
import { createMemberAccessRepo } from '../../lib/db.js';
import { hashIdentifier } from '../../lib/auth-crypto.js';
import { checkRateLimit } from '../../lib/rate-limit.js';
import { clientIp, verifyTurnstile } from '../../lib/turnstile.js';
import { postEventToFlow } from '../../lib/avf-client.js';
import {
  createPaycoreOrderForPack,
  corsHeaders,
  json,
  pickMeta,
  postJsonFollowingGoogleRedirect,
  scheduleBackground,
} from '../../lib/checkout-order.js';

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
  
  // Tracking Meta for CAPI
  const fbp = pickMeta(body, 'fbp');
  const fbc = pickMeta(body, 'fbc');
  const ipAddress = clientIp(request);
  const userAgent = request.headers.get('User-Agent') || '';
  const trackingMeta = JSON.stringify({ fbp, fbc, client_ip: ipAddress, user_agent: userAgent });

  if (!packId || !VALID_PACK_IDS.includes(packId)) {
    return json(
      { error: 'invalid_pack', message: 'Paket tidak valid. Silakan pilih paket yang tersedia.' },
      422,
      cors,
    );
  }

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
      remoteip: ipAddress,
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
      const ipKey = await hashIdentifier(`checkout_ip:${ipAddress}`, env.AUTH_TOKEN_PEPPER);

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

    const member = await repo.findOrCreateMember({ name, email, phone_e164: phoneE164 });

    const created = await createPaycoreOrderForPack({
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
      trackingMeta,
      fulfillmentMeta: {
        lp_variant: lpVariant,
        lp_plan: lpPlan,
        lp_pack: lpPack,
      },
      leadMeta: {
        lp_variant: lpVariant,
        lp_plan: lpPlan,
        lp_pack: lpPack,
      },
    });

    if (!created.ok) {
      const data = await created.response.json();
      return json(data, created.response.status, cors);
    }

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
          fbp,
          fbc,
          captured_at: now,
          order_id: created.paycoreJson.order_id || '',
          order_status: created.paycoreJson.payment_status || 'pending',
        }),
        '[Checkout] order forwarding failed:',
      );
    }

    // Forward as AppVibe Flow event (form.submitted → autoresponder)
    if (env.AVF_EVENT_URL) {
      await scheduleBackground(
        context,
        postEventToFlow(env, {
          type: 'form.submitted',
          contact: {
            name,
            email,
            phone: phoneE164,
            whatsapp_opt_in: true,
          },
          data: {
            product_name: String(pack.description || pack.product_key || packId),
            pack_id: packId,
            amount: pack.amount,
            checkout_url: created.paycoreJson.checkout_url || '',
          },
        }),
        '[AVF] form.submitted event failed:',
      );
    }

    return json(
      {
        checkout_url: created.paycoreJson.checkout_url,
        order_id: created.paycoreJson.order_id,
        external_order_id: created.paycoreJson.external_order_id,
        payment_status: created.paycoreJson.payment_status || 'pending',
        amount: created.amount,
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
