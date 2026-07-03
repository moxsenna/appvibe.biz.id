import { vaultPacks } from './data/vault-packs.js';
import { vaultApps } from './data/vault-apps.js';
import { setActivePack, getActivePack } from './pack-state.js';

export function initFirstProduct() {
  const recommendationCard = document.getElementById('firstProductCard');
  const recommendationContent = document.getElementById('firstProductContent');
  if (!recommendationCard || !recommendationContent) return;

  // ===== RECOMMENDATION CARD =====
  function renderRecommendation(packId) {
    const pack = vaultPacks[packId];
    if (!pack) return;
    const primaryApp = vaultApps[pack.primaryAppId];
    const otherApps = pack.appIds.filter(id => id !== pack.primaryAppId).slice(0, 2).map(id => vaultApps[id]).filter(Boolean);

    recommendationContent.innerHTML = `
      <div class="fp-eyebrow">REKOMENDASI UNTUK ${pack.scope}</div>
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
        <button class="btn lime" data-scroll-to="aplikasi">Lihat aplikasi pembentuk pack ini &rarr;</button>
        <button class="btn ghost" data-open-form data-form-source="first_product" data-pack="${packId}">Saya tertarik dengan pack ini</button>
      </div>
    `;

    recommendationContent.querySelector('[data-scroll-to]')?.addEventListener('click', (e) => {
      document.getElementById('aplikasi')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    recommendationContent.querySelector('[data-open-form]')?.addEventListener('click', (e) => {
      if (typeof window.openModal === 'function') {
        window.openModal('first_product', packId, null);
      }
    });
  }

  // ===== LISTEN TO PACK STATE CHANGES =====
  window.addEventListener('appvibe:pack-change', (e) => {
    const { packId } = e.detail;

    // Update active pack card visual
    document.querySelectorAll('.pack').forEach(p => p.classList.remove('selected'));
    document.querySelectorAll(`.pack[data-pack="${packId}"]`).forEach(p => p.classList.add('selected'));

    // Re-render recommendation
    renderRecommendation(packId);

    // Fire tracking event
    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent('vault_pack_selected', {
        pack_id: packId,
        entry_point: e.detail.source || 'unknown',
      });
    }
  });

  // ===== INITIAL RENDER =====
  renderRecommendation(getActivePack());
}

