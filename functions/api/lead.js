/**
 * Cloudflare Pages Function — Lead capture API
 * POST /api/lead
 *
 * Environment variables:
 * - LEAD_WEBHOOK_URL: endpoint to forward lead
 * - TURNSTILE_SECRET_KEY: Cloudflare Turnstile secret key
 */

const VALID_PACKS = ['advertiser', 'commerce', 'creator', 'brand_launch'];
const VALID_APPS = ['adsprint', 'pikat', 'rupa', 'mula', 'arah', 'cetak', 'adegan', 'suara', 'bukti', 'mimik', 'ritme', 'tayang', 'katalog'];
const DEDUPE_MAP = new Map(); // best-effort, per-isolate

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body = await request.json();
    const {
      name, email, whatsapp, niche, model_penggunaan,
      selected_pack, selected_app, event_id,
      form_open_source, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      referrer, landing_url, timestamp, device_type,
    } = body;

    // Validation
    if (!name || name.trim().length < 2) {
      return jsonError('Nama minimal 2 karakter', 400, corsHeaders);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError('Email tidak valid', 400, corsHeaders);
    }
    if (!niche || niche.trim().length < 2) {
      return jsonError('Niche tidak valid', 400, corsHeaders);
    }

    // Normalize WhatsApp
    const normalizedWa = whatsapp ? whatsapp.replace(/[^\d+]/g, '').replace(/^0/, '+62') : '';

    // Validate selected_pack against valid IDs
    const safePack = selected_pack && VALID_PACKS.includes(selected_pack) ? selected_pack : null;
    const safeApp = selected_app && VALID_APPS.includes(selected_app) ? selected_app : null;

    // Turnstile verification
    if (env.TURNSTILE_SECRET_KEY && body.turnstileToken) {
      const turnstileRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: env.TURNSTILE_SECRET_KEY,
            response: body.turnstileToken,
          }),
        }
      );
      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) {
        return jsonError('Verifikasi keamanan gagal', 403, corsHeaders);
      }
    }

    // Best-effort dedupe by event_id (only prevent within same isolate)
    if (event_id) {
      if (DEDUPE_MAP.has(event_id)) {
        return jsonError('Duplicate submission', 409, corsHeaders);
      }
      DEDUPE_MAP.set(event_id, Date.now());
      // Clean old entries (keep last 100)
      if (DEDUPE_MAP.size > 100) {
        const oldest = [...DEDUPE_MAP.entries()].sort((a, b) => a[1] - b[1])[0];
        if (oldest) DEDUPE_MAP.delete(oldest[0]);
      }
    }

    // Forward to webhook
    if (env.LEAD_WEBHOOK_URL) {
      try {
        await fetch(env.LEAD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            whatsapp: normalizedWa,
            niche: niche.trim(),
            model_penggunaan: model_penggunaan || '',
            selected_pack: safePack,
            selected_app: safeApp,
            form_open_source: form_open_source || '',
            utm_source: utm_source || '',
            utm_medium: utm_medium || '',
            utm_campaign: utm_campaign || '',
            utm_content: utm_content || '',
            utm_term: utm_term || '',
            referrer: referrer || '',
            landing_url: landing_url || '',
            device_type: device_type || '',
            captured_at: timestamp || new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error('Webhook forwarding failed:', err);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    return jsonError('Invalid request', 400, corsHeaders);
  }
}

function jsonError(message, status, corsHeaders) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
