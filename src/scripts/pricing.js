import { PLANS, PACK_ORDER, vaultPacks, validateOffer, getAppIdsForOffer } from './data/offer-catalog.js';

/**
 * PRICING STATE
 * Defaults to advertiser pack so single-pack CTA is clickable immediately.
 * User can change pack or choose Full Vault.
 */
let selectedPlanId = 'single-pack';
let selectedPackId = 'advertiser';

export function getSelectedOffer() {
  return {
    plan: selectedPlanId ? PLANS[selectedPlanId] : null,
    pack: selectedPackId ? vaultPacks[selectedPackId] : null,
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

function renderPackChoice(packButtons, singleCta, helper) {
  packButtons.forEach((button) => {
    const isSelected = button.dataset.packId === selectedPackId;
    button.setAttribute('aria-checked', String(isSelected));
  });

  const hasSelectedPack = Boolean(selectedPackId);
  singleCta.disabled = !hasSelectedPack;
  if (hasSelectedPack) {
    const pack = vaultPacks[selectedPackId];
    singleCta.textContent = `Pilih ${pack.label} →`;
    helper.textContent = `${pack.appIds.map(id => vaultPacks[id]?.label || id).join(' · ')} siap Anda rebrand.`;
  } else {
    singleCta.textContent = 'Pilih 1 Niche Pack →';
    helper.textContent = 'Pilih pack dulu untuk melanjutkan.';
  }
}

function redirectToCheckout(planId, packId) {
  const params = new URLSearchParams();
  params.set('plan', planId);
  if (packId) params.set('pack', packId);

  // Persist UTM from session if available
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  utmKeys.forEach((key) => {
    const val = sessionStorage.getItem(key);
    if (val) params.set(key, val);
  });

  // Session entry_point
  const entryPoint = sessionStorage.getItem('entry_point') || 'pricing_section';
  params.set('ref', entryPoint);

  window.location.href = `/checkout/?${params.toString()}`;
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
        pack_name: offer.pack.label,
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
      pack_name: offer.pack.label,
      value: offer.plan.price,
      currency: 'IDR',
    });

    redirectToCheckout(offer.plan.id, offer.pack.id);
  });

  fullCta.addEventListener('click', () => {
    const offer = setSelectedOffer('full-vault');

    trackPricingEvent('vault_checkout_intent', {
      plan_id: offer.plan.id,
      plan_name: offer.plan.name,
      value: offer.plan.price,
      currency: 'IDR',
    });

    redirectToCheckout(offer.plan.id);
  });
}
