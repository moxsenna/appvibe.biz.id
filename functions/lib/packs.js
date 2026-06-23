/**
 * Canonical product/pack definitions for appvibe.web.id checkout.
 * Single source of truth — mirrors src/scripts/data/vault-packs.js.
 * Both frontend and backend MUST use the same product_keys and amounts.
 */
export const PACKS = {
  advertiser: {
    product_key: 'pack_advertiser',
    description: 'White-Label Vault — Advertiser App Pack',
    amount: 99000,
    currency: 'IDR',
  },
  commerce: {
    product_key: 'pack_commerce',
    description: 'White-Label Vault — Commerce & Marketplace Pack',
    amount: 99000,
    currency: 'IDR',
  },
  creator: {
    product_key: 'pack_creator',
    description: 'White-Label Vault — Creator & Affiliate Pack',
    amount: 99000,
    currency: 'IDR',
  },
  brand_launch: {
    product_key: 'pack_branding',
    description: 'White-Label Vault — Brand & Launch Pack',
    amount: 99000,
    currency: 'IDR',
  },
  vault_full: {
    product_key: 'vault_full_license',
    description: 'White-Label AI App Vault — Full License (13 apps)',
    amount: 199000,
    currency: 'IDR',
  },
};

export const VALID_PACK_IDS = Object.keys(PACKS);
export const DEFAULT_PACK_ID = 'vault_full';
