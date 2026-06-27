import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  computeUnlockedAppIds,
  isFullVault,
  summarizeAccess,
} from '../functions/lib/entitlements.js';
import { ALL_APP_IDS, entitlementForPack, PACKS } from '../functions/lib/packs.js';

const active = (resource_type, resource_id) => ({ resource_type, resource_id, status: 'active' });
const revoked = (resource_type, resource_id) => ({ resource_type, resource_id, status: 'revoked' });

test('vault_full entitlement unlocks every app', () => {
  const apps = computeUnlockedAppIds([active('vault', 'vault_full')]);
  assert.equal(apps.length, ALL_APP_IDS.length);
  assert.deepEqual(apps, ALL_APP_IDS);
});

test('single bundle unlocks only that bundle apps', () => {
  const apps = computeUnlockedAppIds([active('bundle', 'advertiser')]);
  assert.deepEqual(apps, PACKS.advertiser.appIds);
});

test('two bundles produce a union of their apps in canonical order', () => {
  const apps = computeUnlockedAppIds([active('bundle', 'advertiser'), active('bundle', 'commerce')]);
  const expected = ['adsprint', 'rupa', 'adegan', 'bukti', 'mula', 'katalog', 'pikat'];
  assert.deepEqual(apps, expected);
});

test('revoked entitlements are ignored', () => {
  const apps = computeUnlockedAppIds([
    active('bundle', 'advertiser'),
    revoked('bundle', 'commerce'),
  ]);
  assert.deepEqual(apps, PACKS.advertiser.appIds);
});

test('vault_full plus a bundle still unlocks everything', () => {
  const apps = computeUnlockedAppIds([active('bundle', 'advertiser'), active('vault', 'vault_full')]);
  assert.deepEqual(apps, ALL_APP_IDS);
});

test('empty entitlements unlock nothing', () => {
  assert.deepEqual(computeUnlockedAppIds([]), []);
});

test('isFullVault true only for active vault_full', () => {
  assert.equal(isFullVault([active('vault', 'vault_full')]), true);
  assert.equal(isFullVault([revoked('vault', 'vault_full')]), false);
  assert.equal(isFullVault([active('bundle', 'advertiser')]), false);
  assert.equal(isFullVault([]), false);
});

test('summarizeAccess returns full vault flag, bundle ids and app ids', () => {
  const summary = summarizeAccess([active('bundle', 'advertiser'), active('bundle', 'creator')]);
  assert.equal(summary.hasFullVault, false);
  assert.deepEqual(summary.bundleIds, ['advertiser', 'creator']);
  assert.deepEqual(summary.appIds, ['adsprint', 'rupa', 'adegan', 'bukti', 'mula', 'pikat', 'ritme', 'mimik', 'suara']);
});

test('summarizeAccess for vault full reports full vault', () => {
  const summary = summarizeAccess([active('vault', 'vault_full')]);
  assert.equal(summary.hasFullVault, true);
  assert.deepEqual(summary.bundleIds, []);
  assert.equal(summary.appIds.length, ALL_APP_IDS.length);
});

test('entitlementForPack maps each pack to its resource', () => {
  assert.deepEqual(entitlementForPack('advertiser'), { resource_type: 'bundle', resource_id: 'advertiser' });
  assert.deepEqual(entitlementForPack('vault_full'), { resource_type: 'vault', resource_id: 'vault_full' });
  assert.equal(entitlementForPack('unknown'), null);
});
