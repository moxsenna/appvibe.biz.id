import './styles/index.css';
import { initAppLauncher } from './scripts/app-launcher.js';
import { initFirstProduct } from './scripts/first-product.js';
import { initMobileNav } from './scripts/mobile-nav.js';
import { initModal } from './scripts/modal.js';
import { initTracking } from './scripts/tracking.js';
import { initLeadForm } from './scripts/lead-form.js';
import { initPricing } from './scripts/pricing.js';

document.addEventListener('DOMContentLoaded', () => {
  initTracking();
  initAppLauncher();
  initFirstProduct();
  initMobileNav();
  initModal();
  initPricing();
  initLeadForm();

  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.scrollTo;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Pack card CTA — redirect to dedicated checkout page
  document.querySelectorAll('[data-sel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const packId = btn.dataset.pack;
      if (!packId) return;
      const params = new URLSearchParams({ plan: 'single-pack', pack: packId });

      // Persist UTM from session
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
      utmKeys.forEach((key) => {
        const val = sessionStorage.getItem(key);
        if (val) params.set(key, val);
      });

      const entryPoint = sessionStorage.getItem('entry_point') || 'pack_card';
      params.set('ref', entryPoint);

      window.location.href = `/checkout/?${params.toString()}`;
    });
  });
});
