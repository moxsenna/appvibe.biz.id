/**
 * main.js — Checkout page entry point.
 * Bundled by Vite as its own entry (separate from the landing page).
 */
import '../styles/checkout.css';
import '../scripts/data/vault-packs.js';
import { initTracking } from '../scripts/tracking.js';
import { initCheckout } from './checkout.js';

document.addEventListener('DOMContentLoaded', () => {
  initTracking();
  initCheckout();
});
