export function initTracking() {
  const params = new URLSearchParams(window.location.search);

  // Parse UTM parameters
  const utm = {
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    content: params.get('utm_content') || '',
    term: params.get('utm_term') || '',
  };

  // Store UTM in sessionStorage for form submission
  try {
    sessionStorage.setItem('utm_params', JSON.stringify(utm));
    sessionStorage.setItem('referrer', document.referrer || '');
    sessionStorage.setItem('landing_url', window.location.href);
  } catch (e) {
    // sessionStorage not available
  }

  // Expose trackEvent globally
  window.trackEvent = (eventName, params = {}) => {
    const payload = {
      event: eventName,
      page: 'white-label-ai-vault',
      ...utm,
      ...params,
      url: window.location.href,
      referrer: document.referrer,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      timestamp: new Date().toISOString(),
    };

    // Meta Pixel
    if (window.fbq) {
      try { fbq('trackCustom', eventName, payload); } catch(e) {}
    }

    // Google Tag Manager
    if (window.dataLayer) {
      try { dataLayer.push({ event: eventName, ...payload }); } catch(e) {}
    }

    // Google Analytics 4 via gtag
    if (window.gtag) {
      try { gtag('event', eventName, payload); } catch(e) {}
    }

    // TikTok Pixel
    if (window.ttq) {
      try { ttq.track(eventName, payload); } catch(e) {}
    }

    // Console.debug in dev
    if (import.meta.env.DEV) {
      console.debug('[Tracking]', eventName, payload);
    }
  };

  // Fire PageView
  window.trackEvent('PageView');
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
