import { vaultApps } from './data/vault-apps.js';
import { vaultPacks } from './data/vault-packs.js';

export function initAppLauncher() {
  const launcherButtons = document.querySelectorAll(".app-card");
  const detailLabel = document.getElementById("detailLabel");
  const detailTitle = document.getElementById("detailTitle");
  const detailText = document.getElementById("detailText");
  const detailList = document.getElementById("detailList");
  const detailFooter = document.getElementById("detailFooter");
  const detailCta = document.getElementById("detailCta");

  const state = window.vaultState || (window.vaultState = { recommendedPack: 'advertiser', selectedPack: null, selectedApp: null, lastFormPlacement: null });

  function track(name, params) {
    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent(name, params);
    }
  }

  function setActiveApp(appKey) {
    const item = vaultApps[appKey];
    if (!item) return;
    launcherButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.app === appKey));
    detailLabel.textContent = item.label;
    detailTitle.innerHTML = item.title;
    detailText.textContent = item.text;
    detailList.innerHTML = item.points.map(point => `<li>${point}</li>`).join("");
    detailFooter.textContent = item.footer;
    state.selectedApp = appKey;
    if (!state.selectedPack) {
      state.selectedPack = item.packs[0] || null;
    }
    const packContext = item.packs.join(',');
    track('vault_app_selected', { app_id: appKey, pack_context: packContext });
    // Scroll detail ke view (mobile)
    const detail = document.querySelector('.app-detail');
    if (detail && window.innerWidth <= 760) {
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  launcherButtons.forEach(button => {
    button.addEventListener("click", () => setActiveApp(button.dataset.app));
  });

  // Pack CTAs in detail panel
  document.querySelectorAll("[data-pack]").forEach(btn => {
    btn.addEventListener("click", () => {
      const packId = btn.dataset.pack;
      const pack = vaultPacks[packId];
      if (!pack) return;
      state.selectedPack = packId;
      detailLabel.textContent = "NICHE POSITIONING / " + pack.label.toUpperCase();
      detailTitle.innerHTML = `Start with <em>${pack.label}.</em>`;
      detailText.textContent = "Paket ini adalah titik masuk untuk membangun lini produk AI yang nyambung dengan market Anda.";
      detailList.innerHTML = pack.appIds.map(id => {
        const app = vaultApps[id];
        return app ? `<li>${app.exampleRebrandName} &mdash; ${app.tagline}</li>` : '';
      }).join("");
      detailFooter.textContent = "\u201cBukan tentang menjual lebih banyak aplikasi, tapi tentang meluncurkan produk yang tepat ke audiens yang tepat.\u201d";
      track('vault_pack_selected', { pack_id: packId, entry_point: 'app_launcher' });
    });
  });

  // Detail CTA "Saya ingin meluncurkan produk seperti ini"
  if (detailCta) {
    detailCta.addEventListener("click", () => {
      state.lastFormPlacement = 'app_launcher';
      if (typeof window.openModal === 'function') {
        window.openModal('app_launcher', state.selectedPack, state.selectedApp);
      }
    });
  } else {
    // Attach via data attribute if element is missing ID
    const detailCtaBtn = document.querySelector('[data-open-form-from-detail]');
    if (detailCtaBtn) {
      detailCtaBtn.addEventListener("click", () => {
        state.lastFormPlacement = 'app_launcher';
        if (typeof window.openModal === 'function') {
          window.openModal('app_launcher', state.selectedPack, state.selectedApp);
        }
      });
    }
  }

  // First active app
  const firstActive = document.querySelector(".app-card.active");
  if (firstActive) {
    setActiveApp(firstActive.dataset.app || "adsprint");
    state.selectedPack = null; // jangan pre-fill pack dari default app
  }
}

