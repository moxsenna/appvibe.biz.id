import './styles/index.css';
import { initAppLauncher } from './scripts/app-launcher.js';
import { initFirstProduct } from './scripts/first-product.js';
import { initMobileNav } from './scripts/mobile-nav.js';
import { initTracking } from './scripts/tracking.js';
import { initPricing } from './scripts/pricing.js';
import { initShowcase3D } from './scripts/showcase-3d.js';
import { setActivePack } from './scripts/pack-state.js';

document.addEventListener('DOMContentLoaded', () => {
  // Force scroll to top on page load (prevent browser scroll restoration)
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
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

  // Pack card CTA — set active pack + scroll to first-product section
  // (previously redirected to checkout, causing surprise for cold-traffic users)
  document.querySelectorAll('[data-sel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const packId = btn.dataset.pack;
      if (!packId) return;
      setActivePack(packId, 'niche_section');
      const target = document.getElementById('first-product');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
