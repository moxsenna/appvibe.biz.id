/**
 * Cloudflare Pages Function — Lead capture API
 * POST /api/lead
 *
 * Environment variables:
 * - LEAD_WEBHOOK_URL: endpoint to forward lead (REQUIRED for production)
 * - TURNSTILE_SECRET_KEY: Cloudflare Turnstile secret key
 */

const VALID_PACKS = ['advertiser', 'commerce', 'creator', 'brand_launch'];
const VALID_APPS = ['adsprint', 'pikat', 'rupa', 'mula', 'arah', 'cetak', 'adegan', 'suara', 'bukti', 'mimik', 'ritme', 'tayang', 'katalog'];

const PACK_APPS = {
  advertiser: ['adsprint', 'rupa', 'adegan', 'bukti', 'mula'],
  commerce: ['katalog', 'rupa', 'bukti', 'pikat', 'adsprint'],
  creator: ['pikat', 'ritme', 'mimik', 'rupa', 'suara'],
  brand_launch: ['arah', 'mimik', 'mula', 'tayang', 'cetak'],
};

const DEDUPE_MAP = new Map();

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
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body = await request.json();
    const {
      name, email, whatsapp, niche, model_penggunaan,
      selected_pack, selected_app, event_id,
      turnstileToken,
      form_open_source, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      referrer, landing_url, timestamp, device_type,
    } = body;

    // --- Validation ---
    if (!name || name.trim().length < 2) {
      return jsonErr('Nama minimal 2 karakter', 400, corsHeaders);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonErr('Email tidak valid', 400, corsHeaders);
    }
    if (!niche || niche.trim().length < 2) {
      return jsonErr('Niche tidak valid', 400, corsHeaders);
    }

    const normalizedWa = whatsapp ? whatsapp.replace(/[^\d+]/g, '').replace(/^0/, '+62') : '';
    const safePack = selected_pack && VALID_PACKS.includes(selected_pack) ? selected_pack : null;
    const safeApp = selected_app && VALID_APPS.includes(selected_app) ? selected_app : null;

    // Pack-app compatibility: if both present, app must be in the pack
    if (safePack && safeApp) {
      if (!PACK_APPS[safePack]?.includes(safeApp)) {
        return jsonErr('Kombinasi pack dan aplikasi tidak cocok', 400, corsHeaders);
      }
    }

    // --- Turnstile verification (BLOCK 4: reject if secret configured but no valid token) ---
    if (env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return jsonErr('Verifikasi keamanan diperlukan', 403, corsHeaders);
      }
      const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken }),
      });
      const tsData = await tsRes.json();
      if (!tsData.success) {
        return jsonErr('Verifikasi keamanan gagal', 403, corsHeaders);
      }
    }

    // --- Dedupe (best-effort) ---
    if (event_id) {
      if (DEDUPE_MAP.has(event_id)) {
        return jsonErr('Duplicate submission', 409, corsHeaders);
      }
      DEDUPE_MAP.set(event_id, Date.now());
      if (DEDUPE_MAP.size > 100) {
        const oldest = [...DEDUPE_MAP.entries()].sort((a, b) => a[1] - b[1])[0];
        if (oldest) DEDUPE_MAP.delete(oldest[0]);
      }
    }

    // --- BLOCKER 5: webhook delivery must succeed ---
    if (!env.LEAD_WEBHOOK_URL) {
      console.error('LEAD_WEBHOOK_URL not configured');
      return jsonErr('Konfigurasi server belum lengkap', 503, corsHeaders);
    }

    let webhookOk = false;
    try {
      const body = JSON.stringify({
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
      });

      let whRes = await fetch(env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'manual',
        body,
      });

      // Google Apps Script web apps return 302 → re-POST to the redirect target
      if ([301, 302, 307, 308].includes(whRes.status)) {
        const location = whRes.headers.get('location');
        if (location) {
          whRes = await fetch(location, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          });
        }
      }
      webhookOk = whRes.ok;
    } catch (err) {
      console.error('Webhook delivery error:', err);
    }

    if (!webhookOk) {
      return jsonErr('Gagal mengirim data. Silakan coba lagi.', 502, corsHeaders);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    return jsonErr('Invalid request', 400, corsHeaders);
  }
}

function jsonErr(message, status, corsHeaders) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
