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

  // Pack card selection — delegate to single orchestration point
  document.querySelectorAll('[data-sel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const packId = btn.dataset.pack;
      if (!packId) return;
      if (typeof window.setSelectedPack === 'function') {
        window.setSelectedPack(packId, 'pack_card');
      }
    });
  });
});
