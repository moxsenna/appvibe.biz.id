import './styles/index.css';
import { initAppLauncher } from './scripts/app-launcher.js';
import { initFirstProduct } from './scripts/first-product.js';
import { initMobileNav } from './scripts/mobile-nav.js';
import { initTracking } from './scripts/tracking.js';
import { initPricing } from './scripts/pricing.js';
import { initShowcase3D } from './scripts/showcase-3d.js';

document.addEventListener('DOMContentLoaded', () => {
  initTracking();
  initAppLauncher();
  initFirstProduct();
  initMobileNav();
  initPricing();
  initShowcase3D();

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

  // CTA tracking — delegated click listener for conversion events
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cta], [data-scroll-to]');
    if (!btn) return;
    const placement = btn.dataset.placement || btn.dataset.ctaPlacement || 'unknown';
    const ctaLabel = btn.dataset.ctaLabel || btn.textContent.trim()?.slice(0, 60) || '';
    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent('vault_cta_click', { placement, cta_label: ctaLabel });
    }
  });
});
