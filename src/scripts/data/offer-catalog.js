/**
 * offer-catalog.js — Single frontend source of truth for plans + packs.
 *
 * PLANS describe buyable offers (single-pack, full-vault).
 * vaultPacks describe individual products with app lists, prices, metadata.
 * Both are consumed by pricing.js, checkout.js, and any other frontend module.
 */
import { vaultPacks, PACK_ORDER, PACK_PRICES, PACK_PRODUCT_KEYS } from './vault-packs.js';

export const PLANS = {
  'single-pack': {
    id: 'single-pack',
    name: 'Pilih 1 Niche Pack',
    price: 97000,
    priceLabel: 'Rp97.000',
    packIds: ['advertiser', 'commerce', 'creator', 'brand_launch'],
  },
  'full-vault': {
    id: 'full-vault',
    name: 'Full AppVibe Vault',
    price: 147000,
    priceLabel: 'Rp147.000',
    packIds: null, // all packs
    product_key: 'vault_full_license',
    appIds: vaultPacks.vault_full.appIds,
  },
};

export const VALID_PLAN_IDS = Object.keys(PLANS);
export const VALID_PACK_IDS = ['advertiser', 'commerce', 'creator', 'brand_launch'];

/**
 * Resolve a human-readable pack name for a given pack ID.
 */
export function getPackLabel(packId) {
  const pack = vaultPacks[packId];
  return pack ? pack.label : null;
}

/**
 * Resolve app IDs for a given pack ID (single pack) or plan ID (full-vault).
 */
export function getAppIdsForOffer(planId, packId) {
  if (planId === 'full-vault') return vaultPacks.vault_full.appIds;
  if (packId && vaultPacks[packId]) return vaultPacks[packId].appIds;
  return [];
}

/**
 * Validate plan + pack combination against the catalog.
 * Returns { valid, plan, pack, error }.
 */
export function validateOffer(planId, packId) {
  const plan = PLANS[planId];

  if (!plan) {
    return { valid: false, error: 'Plan tidak dikenali.' };
  }

  if (planId === 'full-vault') {
    if (packId) {
      return { valid: false, error: 'Full Vault tidak memerlukan pack.' };
    }
    return { valid: true, plan, pack: null };
  }

  if (!packId || !VALID_PACK_IDS.includes(packId)) {
    return { valid: false, error: 'Pilih 1 Niche Pack yang tersedia.' };
  }

  const pack = vaultPacks[packId];
  return { valid: true, plan, pack };
}

export { vaultPacks, PACK_ORDER, PACK_PRICES, PACK_PRODUCT_KEYS };
