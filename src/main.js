import './styles/index.css';
import { initAppLauncher } from './scripts/app-launcher.js';
import { initFirstProduct } from './scripts/first-product.js';
import { initMobileNav } from './scripts/mobile-nav.js';
import { initModal } from './scripts/modal.js';
import { initTracking } from './scripts/tracking.js';
import { initLeadForm } from './scripts/lead-form.js';
import { initCheckoutUI } from './scripts/checkout-ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initTracking();
  initAppLauncher();
  initFirstProduct();
  initMobileNav();
  initModal();
  initLeadForm();
  initCheckoutUI();

  // Scroll-to handlers for hero CTAs
  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.scrollTo;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Open checkout with pre-selected pack from pack cards
  document.querySelectorAll('[data-sel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const packId = btn.dataset.pack;
      if (!packId) return;

      // Visual selection
      document.querySelectorAll('.pack').forEach(p => p.classList.remove('selected'));
      const packEl = btn.closest('.pack');
      if (packEl) packEl.classList.add('selected');

      // Update state
      if (window.vaultState) {
        window.vaultState.selectedPack = packId;
      }
      if (typeof window.setSelectedPack === 'function') {
        window.setSelectedPack(packId);
      }

      // Fire ViewContent analytics
      if (typeof window.fireStandardConversions?.viewContent === 'function') {
        const pack = window.vaultPacks?.[packId];
        window.fireStandardConversions.viewContent({
          pack_id: packId,
          pack_label: pack?.label || packId,
          amount: pack?.amount || 0,
        });
      }
      if (typeof window.trackVaultEvent === 'function') {
        window.trackVaultEvent('vault_pack_selected', { selected_pack: packId });
      }

      // Open checkout modal with this pack
      if (typeof window.openCheckoutForPack === 'function') {
        window.openCheckoutForPack(packId, 'pack_card');
      }
    });
  });

  // Add checkout open to first-product "Saya tertarik" buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-form]');
    if (!btn) return;
    const packId = btn.dataset.pack;
    const src = btn.dataset.formSource || 'first_product';
    if (packId && typeof window.openCheckoutForPack === 'function') {
      e.preventDefault();
      window.openCheckoutForPack(packId, src);
    }
  });
});
