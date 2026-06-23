/**
 * Cloudflare Pages Function — Lead capture API
 * POST /api/lead
 *
 * Environment variables (set in Cloudflare dashboard):
 * - LEAD_WEBHOOK_URL: endpoint to forward the lead (Google Sheets, Telegram, etc.)
 * - TURNSTILE_SECRET_KEY: Cloudflare Turnstile secret key
 * - TIKTOK_ACCESS_TOKEN: TikTok Events API access token
 * - TIKTOK_PIXEL_CODE: TikTok Pixel ID (default: D8TCSU3C77UDQUH9CQQ0)
 */

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str.toLowerCase().trim());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sendTikTokLeadEvent(env, meta, name, niche, request) {
  if (!env.TIKTOK_ACCESS_TOKEN) return;

  const pixelCode = env.TIKTOK_PIXEL_CODE || 'D8TCSU3C77UDQUH9CQQ0';

  const body = {
    pixel_code: pixelCode,
    event: 'Lead',
    event_id: meta.event_id,
    timestamp: new Date().toISOString(),
    context: {
      user: {},
      ip: request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
      user_agent: request.headers.get('user-agent') || '',
      page: { url: meta.landing_url || '' },
    },
    properties: {
      name,
      niche,
      source: meta.utm_source || 'direct',
      medium: meta.utm_medium || '',
      campaign: meta.utm_campaign || '',
    },
  };

  try {
    const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': env.TIKTOK_ACCESS_TOKEN,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error('TikTok Events API error:', response.status, JSON.stringify(result));
    }
  } catch (err) {
    console.error('TikTok Events API call failed:', err);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
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
    const { name, email, niche, turnstileToken, ...meta } = body;

    // Validation
    if (!name || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Nama minimal 2 karakter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email tidak valid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (!niche || niche.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Niche tidak valid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Turnstile verification (server-side)
    if (env.TURNSTILE_SECRET_KEY && turnstileToken) {
      const turnstileRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
          }),
        }
      );
      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) {
        return new Response(JSON.stringify({ error: 'Verifikasi keamanan gagal' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Forward lead to webhook (if configured)
    if (env.LEAD_WEBHOOK_URL) {
      try {
        await fetch(env.LEAD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            niche: niche.trim(),
            ...meta,
            captured_at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        // Log but don't fail — the lead is already validated
        console.error('Webhook forwarding failed:', err);
      }
    }

    // TikTok Events API — fire Lead event server-side (non-blocking)
    if (env.TIKTOK_ACCESS_TOKEN) {
      const pixelCode = env.TIKTOK_PIXEL_CODE || 'D8TCSU3C77UDQUH9CQQ0';
      const emailHash = await sha256(email);

      const tiktokBody = {
        pixel_code: pixelCode,
        event: 'Lead',
        event_id: meta.event_id,
        timestamp: new Date().toISOString(),
        context: {
          user: { email: emailHash },
          ip: request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
          user_agent: request.headers.get('user-agent') || '',
          page: { url: meta.landing_url || '' },
        },
        properties: {
          name,
          niche,
          source: meta.utm_source || 'direct',
          medium: meta.utm_medium || '',
          campaign: meta.utm_campaign || '',
        },
      };

      try {
        const tiktokRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Access-Token': env.TIKTOK_ACCESS_TOKEN,
          },
          body: JSON.stringify(tiktokBody),
        });
        if (!tiktokRes.ok) {
          const errBody = await tiktokRes.text();
          console.error('TikTok Events API error:', tiktokRes.status, errBody);
        }
      } catch (err) {
        console.error('TikTok Events API call failed:', err);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
