import { PACKS } from './packs.js';

export const FULL_VAULT_UPGRADE_AMOUNT = PACKS.vault_full.amount - PACKS.advertiser.amount;
export const FULL_VAULT_UPGRADE_TARGET_PACK_ID = 'vault_full';
export const FULL_VAULT_UPGRADE_PURCHASE_TYPE = 'upgrade';

const QUALIFYING_BUNDLE_IDS = ['advertiser', 'commerce', 'creator', 'brand_launch'];

export function hasPaidDeliveredBundleOrder(orders = []) {
  return orders.some((order) =>
    QUALIFYING_BUNDLE_IDS.includes(order.pack_id)
    && order.payment_status === 'paid'
    && order.fulfillment_status === 'delivered');
}

export function isEligibleForFullVaultUpgrade({ accessSummary, orders }) {
  if (!accessSummary) {
    return { eligible: false, reason: 'missing_access_summary' };
  }
  if (accessSummary.hasFullVault) {
    return { eligible: false, reason: 'already_full_vault' };
  }
  if (!Array.isArray(accessSummary.bundleIds) || accessSummary.bundleIds.length === 0) {
    return { eligible: false, reason: 'no_active_bundle_access' };
  }
  if (!hasPaidDeliveredBundleOrder(orders)) {
    return { eligible: false, reason: 'no_qualifying_order_history' };
  }
  return { eligible: true, reason: 'eligible' };
}

export function getFullVaultUpgradeOffer({ accessSummary, orders }) {
  const eligibility = isEligibleForFullVaultUpgrade({ accessSummary, orders });
  if (!eligibility.eligible) {
    return {
      eligible: false,
      reason: eligibility.reason,
      targetPackId: FULL_VAULT_UPGRADE_TARGET_PACK_ID,
    };
  }

  return {
    eligible: true,
    reason: 'eligible',
    targetPackId: FULL_VAULT_UPGRADE_TARGET_PACK_ID,
    upgradeAmount: FULL_VAULT_UPGRADE_AMOUNT,
    fullAmount: PACKS.vault_full.amount,
    creditAmount: PACKS.vault_full.amount - FULL_VAULT_UPGRADE_AMOUNT,
    purchaseType: FULL_VAULT_UPGRADE_PURCHASE_TYPE,
  };
}
