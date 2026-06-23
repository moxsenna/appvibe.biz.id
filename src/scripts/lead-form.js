import { getUtmParams, getSessionMeta } from './tracking.js';

export function initLeadForm() {
  const form = document.getElementById("leadForm");
  const message = document.getElementById("modalMessage");
  const honeypot = document.getElementById("honeypot");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Firebase tracking: form start
    if (typeof window.trackEvent === 'function') {
      window.trackEvent('LeadForm_Start');
    }

    // Honeypot check
    if (honeypot && honeypot.value.trim() !== '') {
      // Bot detected, silently reject
      showSuccess(message);
      return;
    }

    const formData = new FormData(form);
    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim();
    const niche = formData.get('niche')?.trim();

    if (!name || !email || !niche) return;

    // Collect UTM + session data
    const utm = getUtmParams();
    const session = getSessionMeta();

    // Generate event_id for TikTok Events API dedup
    const eventId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;

    // Fire TikTok Lead event with event_id for client→server dedup
    if (window.ttq) {
      try { ttq.track('Lead', { email, niche, name, event_id: eventId }); } catch(e) {}
    }

    const payload = {
      event_id: eventId,
      name,
      email,
      niche,
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_content: utm.content,
      utm_term: utm.term,
      referrer: session.referrer || document.referrer,
      landing_url: session.landing_url || window.location.href,
      timestamp: new Date().toISOString(),
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    };

    // Fire tracking event
    if (typeof window.trackEvent === 'function') {
      window.trackEvent('Lead', { ...payload, email: undefined });
    }

    // Submit to Cloudflare Pages Function
    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Lead submission failed:', response.status);
      }
    } catch (err) {
      // Silent fail — form still shows success to user
      console.error('Lead submission error:', err);
    }

    showSuccess(message);
    form.reset();
  });
}

function showSuccess(el) {
  if (!el) return;
  el.classList.add("show");
}
