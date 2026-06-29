export function initTracking() {
  const params = new URLSearchParams(window.location.search);

  const utm = {
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    content: params.get('utm_content') || '',
    term: params.get('utm_term') || '',
  };

  // A/B test variant tracking
  const lpVariant = params.get('variant') || '';
  const lpPlan = params.get('plan') || '';
  const lpPack = params.get('pack') || '';

  try {
    sessionStorage.setItem('utm_params', JSON.stringify(utm));
    Object.entries({
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_content: utm.content,
      utm_term: utm.term,
    }).forEach(([key, value]) => {
      if (value) sessionStorage.setItem(key, value);
    });
    // Persist A/B variant info across navigation
    if (lpVariant) sessionStorage.setItem('lp_variant', lpVariant);
    if (lpPlan) sessionStorage.setItem('lp_plan', lpPlan);
    if (lpPack) sessionStorage.setItem('lp_pack', lpPack);
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

export function getCheckoutAttribution() {
  const utm = getUtmParams();
  const sessionMeta = getSessionMeta();
  return {
    utm_source: utm.source || '',
    utm_medium: utm.medium || '',
    utm_campaign: utm.campaign || '',
    utm_content: utm.content || '',
    utm_term: utm.term || '',
    referrer: sessionMeta.referrer || '',
    landing_url: sessionMeta.landing_url || '',
    device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    lp_variant: sessionStorage.getItem('lp_variant') || '',
    lp_plan: sessionStorage.getItem('lp_plan') || '',
    lp_pack: sessionStorage.getItem('lp_pack') || '',
  };
}
