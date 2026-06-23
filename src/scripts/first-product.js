import { vaultPacks } from './data/vault-packs.js';
import { vaultApps } from './data/vault-apps.js';

export function initFirstProduct() {
  const recommendationCard = document.getElementById('firstProductCard');
  const recommendationContent = document.getElementById('firstProductContent');
  if (!recommendationCard || !recommendationContent) return;

  const state = window.vaultState || (window.vaultState = { recommendedPack: 'advertiser', selectedPack: null, selectedApp: null, lastFormPlacement: null });

  function renderRecommendation(packId) {
    const pack = vaultPacks[packId];
    if (!pack) return;
    const primaryApp = vaultApps[pack.primaryAppId];
    const otherApps = pack.appIds.filter(id => id !== pack.primaryAppId).slice(0, 2).map(id => vaultApps[id]).filter(Boolean);

    const isDefault = !state.selectedPack;
    const eyebrow = isDefault
      ? 'CONTOH REKOMENDASI &mdash; ' + pack.scope
      : 'REKOMENDASI UNTUK ' + pack.scope;

    recommendationContent.innerHTML = `
      <div class="fp-eyebrow">${eyebrow}</div>
      <h3 class="fp-title">Mulai dengan <em>${pack.primaryProductName}.</em></h3>
      <p class="fp-outcome">${pack.productOutcome}</p>
      <div class="fp-meta">
        <div class="fp-meta-item">
          <b>Pembeli akhir</b>
          <span>${pack.buyerTypes.join(', ')}</span>
        </div>
        <div class="fp-meta-item">
          <b>Model jualan</b>
          <span>${pack.launchModels.join(', ')}</span>
        </div>
      </div>
      <div class="fp-apps">
        <div class="fp-app-pill primary">
          <span class="fp-app-symbol">${primaryApp ? primaryApp.iconLabel : '?'}</span>
          <span>${pack.primaryProductName} <em>(unggulan)</em></span>
        </div>
        ${otherApps.map(a => `
          <div class="fp-app-pill">
            <span class="fp-app-symbol">${a.iconLabel}</span>
            <span>${a.exampleRebrandName}</span>
          </div>
        `).join('')}
      </div>
      <div class="fp-actions">
        <button class="btn lime" data-scroll-to="aplikasi" data-pack="${packId}">Lihat aplikasi pembentuk pack ini &rarr;</button>
        <button class="btn ghost" data-open-form data-form-source="first_product" data-pack="${packId}">Saya tertarik dengan pack ini</button>
      </div>
    `;

    // Re-bind events
    recommendationContent.querySelector('[data-scroll-to]')?.addEventListener('click', (e) => {
      const targetId = e.currentTarget.dataset.scrollTo;
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    recommendationContent.querySelector('[data-open-form]')?.addEventListener('click', (e) => {
      const packId = e.currentTarget.dataset.pack;
      state.selectedPack = packId;
      state.lastFormPlacement = 'first_product';
      if (typeof window.openModal === 'function') {
        window.openModal('first_product', packId, null);
      }
    });
  }

  // Initial render with default recommended pack
  renderRecommendation(state.recommendedPack);

  // Listen for pack selection events
  window.addEventListener('vault_pack_selected', (e) => {
    renderRecommendation(e.detail?.packId || state.selectedPack || state.recommendedPack);
  });

  // Re-render when state changes
  const originalSetPack = Object.getOwnPropertyDescriptor(window, 'setSelectedPack');
  if (!originalSetPack) {
    window.setSelectedPack = (packId) => {
      state.selectedPack = packId;
      renderRecommendation(packId);
    };
  }
}
