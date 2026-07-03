/**
 * Canonical product/pack definitions for appvibe.biz.id checkout.
 * Single source of truth — mirrors src/scripts/data/vault-packs.js.
 * Both frontend and backend MUST use the same product_keys, amounts,
 * appIds and resource types. Do not duplicate this data elsewhere.
 *
 * appIds and resourceType are used by the entitlement engine to compute
 * which apps a member can access from their active entitlements.
 */
export const PACKS = {
  advertiser: {
    product_key: 'pack_advertiser',
    description: 'White-Label Vault — Advertiser App Pack',
    amount: 97000,
    currency: 'IDR',
    resourceType: 'bundle',
    appIds: ['adsprint', 'rupa', 'adegan', 'bukti', 'mula'],
  },
  commerce: {
    product_key: 'pack_commerce',
    description: 'White-Label Vault — Commerce & Marketplace Pack',
    amount: 97000,
    currency: 'IDR',
    resourceType: 'bundle',
    appIds: ['katalog', 'rupa', 'bukti', 'pikat', 'adsprint'],
  },
  creator: {
    product_key: 'pack_creator',
    description: 'White-Label Vault — Creator & Affiliate Pack',
    amount: 97000,
    currency: 'IDR',
    resourceType: 'bundle',
    appIds: ['pikat', 'ritme', 'mimik', 'rupa', 'suara'],
  },
  brand_launch: {
    product_key: 'pack_branding',
    description: 'White-Label Vault — Brand & Launch Pack',
    amount: 97000,
    currency: 'IDR',
    resourceType: 'bundle',
    appIds: ['arah', 'mimik', 'mula', 'tayang', 'cetak'],
  },
  vault_full: {
    product_key: 'vault_full_license',
    description: 'White-Label AI App Vault — Full License (13 apps)',
    amount: 1000,
    currency: 'IDR',
    resourceType: 'vault',
    appIds: ['adsprint', 'rupa', 'adegan', 'bukti', 'mula', 'katalog', 'pikat', 'ritme', 'mimik', 'suara', 'arah', 'tayang', 'cetak'],
  },
};

export const VALID_PACK_IDS = Object.keys(PACKS);
export const DEFAULT_PACK_ID = 'vault_full';

/** Stable canonical order of every app id in the vault. */
export const ALL_APP_IDS = PACKS.vault_full.appIds;

/**
 * Map a pack id to the entitlement resource it grants.
 * @returns {{resource_type:string,resource_id:string}|null}
 */
export function entitlementForPack(packId) {
  const pack = PACKS[packId];
  if (!pack) return null;
  return { resource_type: pack.resourceType, resource_id: packId };
}

/**
 * Derive the order purchase_type from a pack id.
 * Upgrade flow is not active yet but the schema supports it.
 * @returns {'initial_bundle'|'full_vault'|'upgrade'}
 */
export function purchaseTypeForPack(packId) {
  if (packId === 'vault_full') return 'full_vault';
  return 'initial_bundle';
}
