import './styles/index.css';
import { initAppLauncher } from './scripts/app-launcher.js';
import { initMobileNav } from './scripts/mobile-nav.js';
import { initModal } from './scripts/modal.js';
import { initTracking } from './scripts/tracking.js';
import { initLeadForm } from './scripts/lead-form.js';

document.addEventListener('DOMContentLoaded', () => {
  initTracking();
  initAppLauncher();
  initMobileNav();
  initModal();
  initLeadForm();
});
