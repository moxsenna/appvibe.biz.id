export function initTracking() {
  const params = new URLSearchParams(window.location.search);

  const utm = {
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    content: params.get('utm_content') || '',
    term: params.get('utm_term') || '',
  };

  try {
    sessionStorage.setItem('utm_params', JSON.stringify(utm));
    sessionStorage.setItem('referrer', document.referrer || '');
    sessionStorage.setItem('landing_url', window.location.href);
  } catch (e) { /* ignore */ }

  // Init vault state
  if (!window.vaultState) {
    window.vaultState = { recommendedPack: 'advertiser', selectedPack: null, selectedApp: null, lastFormPlacement: null };
  }

  // --- Vault internal events (dataLayer ONLY — GTM forwards to GA4/Meta/TikTok) ---
  window.trackVaultEvent = (eventName, payload = {}) => {
    const base = {
      event: eventName,
      page_type: 'appvibe_vault',
      page: 'white-label-ai-vault',
      selected_pack: window.vaultState?.selectedPack || null,
      selected_app: window.vaultState?.selectedApp || null,
      ...utm,
      ...payload,
      url: window.location.href,
      referrer: document.referrer,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      timestamp: new Date().toISOString(),
    };

    if (window.dataLayer) {
      try { dataLayer.push(base); } catch (e) {}
    }

    if (import.meta.env.DEV) {
      console.debug('[VaultTrack]', eventName, base);
    }
  };

  // --- Legacy trackEvent compat (still used by form pre-fill etc) ---
  window.trackEvent = (eventName, params = {}) => {
    window.trackVaultEvent(eventName, params);
  };

  // --- Standard conversion helpers (direct — NOT through dataLayer) ---
  window.fireStandardConversions = (leadMeta = {}) => {
    // Meta Pixel — standard Lead event
    if (window.fbq) {
      try { fbq('track', 'Lead'); } catch (e) {}
    }
    // GA4 — standard generate_lead
    if (window.gtag) {
      try {
        gtag('event', 'generate_lead', {
          selected_pack: leadMeta.selected_pack || null,
          selected_app: leadMeta.selected_app || null,
          model_penggunaan: leadMeta.model_penggunaan || null,
        });
      } catch (e) {}
    }
  };

  // Fire PageView
  window.trackVaultEvent('page_view');
}

export function getUtmParams() {
  try {
    const stored = sessionStorage.getItem('utm_params');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

export function getSessionMeta() {
  try {
    return {
      referrer: sessionStorage.getItem('referrer') || '',
      landing_url: sessionStorage.getItem('landing_url') || '',
    };
  } catch (e) {
    return { referrer: '', landing_url: '' };
  }
}
