/**
 * pack-state.js — Single source of truth for the selected niche pack.
 *
 * Any module that needs to know / change the active pack imports from here.
 * Changes are broadcast via `appvibe:pack-change` CustomEvent on `window`,
 * so listeners (first-product, pricing, app-launcher) stay in sync.
 */

let activePack = 'advertiser'; // sensible default

/**
 * Set the active pack and broadcast to all listeners.
 * @param {string} packId — e.g. 'advertiser', 'commerce', 'creator', 'brand_launch'
 * @param {string} [source] — origin identifier for tracking (e.g. 'niche_section', 'pricing')
 */
export function setActivePack(packId, source = 'unknown') {
  if (!packId || activePack === packId) return;
  activePack = packId;
  window.dispatchEvent(
    new CustomEvent('appvibe:pack-change', {
      detail: { packId, source },
    }),
  );
}

/**
 * Get the current active pack id.
 * @returns {string}
 */
export function getActivePack() {
  return activePack;
}
