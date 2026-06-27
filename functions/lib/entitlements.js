/**
 * Entitlement computation engine.
 *
 * Entitlements (not orders, not KV) are the authoritative source of what
 * a member can access. This module is pure: given a list of entitlement
 * rows it computes which apps and bundles are unlocked, in a stable
 * canonical order defined by ALL_APP_IDS.
 */
import { ALL_APP_IDS, PACKS, VALID_PACK_IDS, entitlementForPack } from './packs.js';

/**
 * Normalize raw entitlement rows into active entitlements in pack order.
 * Only `status === 'active'` rows are considered.
 * @param {Array<{resource_type:string,resource_id:string,status:string}>} rows
 * @returns {Array<{resource_type:string,resource_id:string}>}
 */
function activeEntitlements(rows) {
  const set = new Set();
  for (const r of rows || []) {
    if (r?.status !== 'active') continue;
    set.add(`${r.resource_type}:${r.resource_id}`);
  }
  // Preserve canonical pack order so output is deterministic.
  return VALID_PACK_IDS.map((packId) => {
    const e = entitlementForPack(packId);
    return set.has(`${e.resource_type}:${e.resource_id}`) ? e : null;
  }).filter(Boolean);
}

/**
 * Compute the ordered, de-duplicated list of unlocked app ids.
 * If the member holds an active `vault_full` entitlement, every app is
 * unlocked. Otherwise the union of active bundles is computed in
 * canonical app order.
 * @param {Array} rows entitlement rows
 * @returns {string[]}
 */
export function computeUnlockedAppIds(rows) {
  if (isFullVault(rows)) return [...ALL_APP_IDS];

  const unlocked = new Set();
  for (const e of activeEntitlements(rows)) {
    const pack = PACKS[e.resource_id];
    if (pack?.appIds) {
      for (const id of pack.appIds) unlocked.add(id);
    }
  }

  // Return in canonical order.
  return ALL_APP_IDS.filter((id) => unlocked.has(id));
}

/**
 * True when the member holds an active `vault_full` entitlement.
 */
export function isFullVault(rows) {
  return (rows || []).some(
    (r) => r?.status === 'active' && r.resource_type === 'vault' && r.resource_id === 'vault_full',
  );
}

/**
 * Summarize access for the member dashboard.
 * @returns {{hasFullVault:boolean, bundleIds:string[], appIds:string[]}}
 */
export function summarizeAccess(rows) {
  const hasFullVault = isFullVault(rows);
  const bundleIds = activeEntitlements(rows)
    .filter((e) => e.resource_type === 'bundle')
    .map((e) => e.resource_id);
  return {
    hasFullVault,
    bundleIds,
    appIds: computeUnlockedAppIds(rows),
  };
}
