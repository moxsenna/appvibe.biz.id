const PLANS = {
  'single-pack': {
    id: 'single-pack',
    name: 'Pilih 1 Niche Pack',
    price: 97000,
    priceLabel: 'Rp97.000',
  },
  'full-vault': {
    id: 'full-vault',
    name: 'Full AppVibe Vault',
    price: 147000,
    priceLabel: 'Rp147.000',
  },
};

const PACKS = {
  advertiser: {
    id: 'advertiser',
    name: 'Advertiser & Agency',
    apps: ['ADSprint', 'RUPA', 'MULA'],
  },
  commerce: {
    id: 'commerce',
    name: 'Commerce & Affiliate',
    apps: ['PIKAT', 'CETAK', 'KATALOG'],
  },
  creator: {
    id: 'creator',
    name: 'Creator & Content',
    apps: ['ADEGAN', 'SUARA', 'MIMIK', 'RITME'],
  },
  branding: {
    id: 'branding',
    name: 'Brand & Website',
    apps: ['ARAH', 'BUKTI', 'TAYANG'],
  },
};

// Deliberately starts null. No pack or plan is auto-selected.
let selectedPlanId = null;
let selectedPackId = null;

export function getSelectedOffer() {
  return {
    plan: selectedPlanId ? PLANS[selectedPlanId] : null,
    pack: selectedPackId ? PACKS[selectedPackId] : null,
  };
}

function trackPricingEvent(eventName, properties) {
  if (typeof window.trackEvent === 'function') {
    window.trackEvent(eventName, properties);
    return;
  }

  window.dataLayer?.push({ event: eventName, ...properties });
}

function setSelectedOffer(planId, packId = null) {
  selectedPlanId = planId;
  selectedPackId = packId;

  const offer = getSelectedOffer();
  window.dispatchEvent(new CustomEvent('appvibe:offer-change', { detail: { offer } }));
  return offer;
}

function openSelectedOffer(offer) {
  window.dispatchEvent(new CustomEvent('appvibe:open-lead-modal', { detail: { offer } }));
}

function renderPackChoice(packButtons, singleCta, helper) {
  packButtons.forEach((button) => {
    const isSelected = button.dataset.packId === selectedPackId;
    button.setAttribute('aria-checked', String(isSelected));
  });

  const hasSelectedPack = Boolean(selectedPackId);
  singleCta.disabled = !hasSelectedPack;
  singleCta.textContent = hasSelectedPack
    ? `Pilih ${PACKS[selectedPackId].name} →`
    : 'Pilih 1 Niche Pack →';
  helper.textContent = hasSelectedPack
    ? `${PACKS[selectedPackId].apps.join(' · ')} siap Anda rebrand.`
    : 'Pilih pack dulu untuk melanjutkan.';
}

export function initPricing() {
  const packButtons = [...document.querySelectorAll('[data-pack-choice]')];
  const singleCta = document.querySelector('[data-pricing-cta="single-pack"]');
  const fullCta = document.querySelector('[data-pricing-cta="full-vault"]');
  const helper = document.querySelector('.price-card--single .price-helper');

  if (!packButtons.length || !singleCta || !fullCta || !helper) return;

  renderPackChoice(packButtons, singleCta, helper);

  packButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const packId = button.dataset.packId;
      const offer = setSelectedOffer('single-pack', packId);

      renderPackChoice(packButtons, singleCta, helper);
      trackPricingEvent('vault_pack_select', {
        plan_id: offer.plan.id,
        pack_id: offer.pack.id,
        pack_name: offer.pack.name,
        value: offer.plan.price,
        currency: 'IDR',
      });
    });
  });

  singleCta.addEventListener('click', () => {
    const offer = getSelectedOffer();
    if (!offer.plan || !offer.pack) return;

    trackPricingEvent('vault_checkout_intent', {
      plan_id: offer.plan.id,
      plan_name: offer.plan.name,
      pack_id: offer.pack.id,
      pack_name: offer.pack.name,
      value: offer.plan.price,
      currency: 'IDR',
    });
    openSelectedOffer(offer);
  });

  fullCta.addEventListener('click', () => {
    const offer = setSelectedOffer('full-vault');

    trackPricingEvent('vault_checkout_intent', {
      plan_id: offer.plan.id,
      plan_name: offer.plan.name,
      value: offer.plan.price,
      currency: 'IDR',
    });
    openSelectedOffer(offer);
  });
}
