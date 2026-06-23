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

  // Init vault state — selectedPack MUST start as null
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

  // --- Legacy trackEvent compat ---
  window.trackEvent = (eventName, params = {}) => {
    window.trackVaultEvent(eventName, params);
  };

  // --- Standard conversion helpers (DIRECT to Meta/GA4 — not through dataLayer) ---
  const standardConversions = {
    /** ViewContent — fired when user selects/sees a pack */
    viewContent: (packMeta = {}) => {
      if (window.fbq) {
        try {
          fbq('track', 'ViewContent', {
            content_name: packMeta.pack_id || 'unknown',
            content_category: 'vault_pack',
            value: packMeta.amount || 0,
            currency: 'IDR',
          });
        } catch (e) {}
      }
      if (window.gtag) {
        try {
          gtag('event', 'view_item', {
            currency: 'IDR',
            value: packMeta.amount || 0,
            items: [{ item_id: packMeta.pack_id, item_name: packMeta.pack_label, category: 'vault_pack' }],
          });
        } catch (e) {}
      }
    },

    /** InitiateCheckout — fired when user clicks "Lanjut ke pembayaran" */
    checkout: (packId, amount) => {
      if (window.fbq) {
        try {
          fbq('track', 'InitiateCheckout', {
            content_name: packId || 'unknown',
            content_category: 'vault_pack',
            value: amount || 0,
            currency: 'IDR',
          });
        } catch (e) {}
      }
      if (window.gtag) {
        try {
          gtag('event', 'begin_checkout', {
            currency: 'IDR',
            value: amount || 0,
            items: [{ item_id: packId, category: 'vault_pack' }],
          });
        } catch (e) {}
      }
    },

    /** Lead — fired on lead form submit (kept for compatibility) */
    lead: (leadMeta = {}) => {
      if (window.fbq) {
        try { fbq('track', 'Lead'); } catch (e) {}
      }
      if (window.gtag) {
        try {
          gtag('event', 'generate_lead', {
            selected_pack: leadMeta.selected_pack || null,
            selected_app: leadMeta.selected_app || null,
            model_penggunaan: leadMeta.model_penggunaan || null,
          });
        } catch (e) {}
      }
    },

    /** Purchase — fired when payment succeeds (via checkout flow) */
    purchase: (purchaseMeta = {}) => {
      if (window.fbq) {
        try {
          fbq('track', 'Purchase', {
            content_name: purchaseMeta.pack_id || 'unknown',
            content_category: 'vault_pack',
            value: purchaseMeta.amount || 0,
            currency: 'IDR',
            order_id: purchaseMeta.order_id || '',
          });
        } catch (e) {}
      }
      if (window.gtag) {
        try {
          gtag('event', 'purchase', {
            currency: 'IDR',
            value: purchaseMeta.amount || 0,
            transaction_id: purchaseMeta.order_id || '',
            items: [{ item_id: purchaseMeta.pack_id, category: 'vault_pack' }],
          });
        } catch (e) {}
      }
    },
  };

  // Expose as both function (legacy compat) and object (checkout events)
  window.fireStandardConversions = Object.assign(
    function legacy(leadMeta) {
      standardConversions.lead(leadMeta || {});
    },
    standardConversions,
  );

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
