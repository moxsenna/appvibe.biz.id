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

  // Pack CTAs — delegate to single orchestration point
  document.querySelectorAll("[data-pack]").forEach(btn => {
    btn.addEventListener("click", () => {
      const packId = btn.dataset.pack;
      if (!packId || !vaultPacks[packId]) return;
      if (typeof window.setSelectedPack === 'function') {
        window.setSelectedPack(packId, 'app_launcher');
      }
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
  }
}

