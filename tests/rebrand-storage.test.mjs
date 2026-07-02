import assert from 'node:assert/strict';
import { test } from 'node:test';

// Mock localStorage for Node.js
const store = new Map();
const mockLocalStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => { store.set(key, val); },
  removeItem: (key) => { store.delete(key); },
  get length() { return store.size; },
  key: (i) => [...store.keys()][i] || null,
  clear: () => { store.clear(); },
};

// Inject before import
globalThis.localStorage = mockLocalStorage;

const {
  saveBrandFile,
  loadBrandFile,
  getBrandUpdatedAt,
  saveProject,
  loadProject,
  loadAllProjects,
  saveGeneratedPack,
  loadGeneratedPack,
  loadAllPacks,
  detectStalePacks,
  saveActiveStep,
  loadActiveStep,
  clearRebrandWorkspace,
  loadRebrandWorkspace,
  listStoredAppIds,
  getRebrandStorageKeys,
  getAppStorageKeys,
} = await import('../src/scripts/rebrand/storage.js');

function resetStore() {
  store.clear();
}

// ── Key structure tests ──

test('getRebrandStorageKeys returns global keys', () => {
  const keys = getRebrandStorageKeys('user1');
  assert.ok(keys.brandFile.includes('brand-file'));
  assert.ok(keys.brandFile.includes('user1'));
  assert.ok(keys.brandUpdatedAt.includes('brand-updated-at'));
  assert.ok(keys.activeStep.includes('active-step'));
});

test('getAppStorageKeys returns per-app keys', () => {
  const keys = getAppStorageKeys('user1', 'arah');
  assert.ok(keys.project.includes('project'));
  assert.ok(keys.project.includes('arah'));
  assert.ok(keys.project.includes('user1'));
  assert.ok(keys.generatedPack.includes('project-pack'));
  assert.ok(keys.generatedPack.includes('arah'));
});

// ── Brand File storage ──

test('save and load brand file', () => {
  resetStore();
  const brand = { brandName: 'Test', updatedAt: '2025-01-01T00:00:00Z' };
  const result = saveBrandFile('user1', brand);
  assert.equal(result.ok, true);
  const loaded = loadBrandFile('user1');
  assert.deepEqual(loaded, brand);
});

test('saveBrandFile stores brandUpdatedAt for stale detection', () => {
  resetStore();
  saveBrandFile('user1', { brandName: 'X', updatedAt: '2025-06-01T12:00:00Z' });
  const ts = getBrandUpdatedAt('user1');
  assert.equal(ts, '2025-06-01T12:00:00Z');
});

test('loadBrandFile returns null when empty', () => {
  resetStore();
  assert.equal(loadBrandFile('nobody'), null);
});

// ── Per-app project storage ──

test('save and load project per app', () => {
  resetStore();
  const project = { appId: 'arah', newAppName: 'My ARAH' };
  saveProject('user1', 'arah', project);
  const loaded = loadProject('user1', 'arah');
  assert.equal(loaded.appId, 'arah');
  assert.equal(loaded.newAppName, 'My ARAH');
});

test('loadAllProjects returns all stored projects', () => {
  resetStore();
  saveProject('user1', 'arah', { appId: 'arah' });
  saveProject('user1', 'mula', { appId: 'mula' });
  const all = loadAllProjects('user1');
  assert.equal(Object.keys(all).length, 2);
  assert.ok(all.arah);
  assert.ok(all.mula);
});

test('loadAllProjects ignores other member keys', () => {
  resetStore();
  saveProject('user1', 'arah', { appId: 'arah' });
  saveProject('user2', 'mula', { appId: 'mula' });
  const user1Projects = loadAllProjects('user1');
  assert.equal(Object.keys(user1Projects).length, 1);
  assert.ok(user1Projects.arah);
});

test('listStoredAppIds returns app IDs with projects', () => {
  resetStore();
  saveProject('user1', 'arah', { appId: 'arah' });
  saveProject('user1', 'mula', { appId: 'mula' });
  saveProject('user1', 'pikat', { appId: 'pikat' });
  const ids = listStoredAppIds('user1');
  assert.equal(ids.length, 3);
  assert.ok(ids.includes('arah'));
  assert.ok(ids.includes('mula'));
  assert.ok(ids.includes('pikat'));
});

// ── Per-app pack storage ──

test('save and load generated pack per app', () => {
  resetStore();
  const pack = { generatedAt: '2025-06-01T00:00:00Z', blocks: [] };
  saveGeneratedPack('user1', 'arah', pack);
  const loaded = loadGeneratedPack('user1', 'arah');
  assert.equal(loaded.generatedAt, '2025-06-01T00:00:00Z');
});

test('loadAllPacks returns all stored packs (projects must exist for discovery)', () => {
  resetStore();
  saveProject('user1', 'arah', { appId: 'arah' });
  saveProject('user1', 'mula', { appId: 'mula' });
  saveGeneratedPack('user1', 'arah', { generatedAt: '2025-01-01T00:00:00Z' });
  saveGeneratedPack('user1', 'mula', { generatedAt: '2025-02-01T00:00:00Z' });
  const packs = loadAllPacks('user1');
  assert.equal(Object.keys(packs).length, 2);
});

// ── Stale detection ──

test('detectStalePacks detects stale pack when brand updated after generation', () => {
  resetStore();
  saveBrandFile('user1', { brandName: 'X', updatedAt: '2025-06-01T12:00:00Z' });
  saveProject('user1', 'arah', { appId: 'arah' });
  saveGeneratedPack('user1', 'arah', { generatedAt: '2025-06-01T10:00:00Z' });
  const stale = detectStalePacks('user1');
  assert.ok(stale.arah, 'arah should be stale');
});

test('detectStalePacks does not flag pack when generated after brand update', () => {
  resetStore();
  saveBrandFile('user1', { brandName: 'X', updatedAt: '2025-06-01T10:00:00Z' });
  saveGeneratedPack('user1', 'arah', { generatedAt: '2025-06-01T12:00:00Z' });
  const stale = detectStalePacks('user1');
  assert.equal(stale.arah, undefined, 'arah should NOT be stale');
});

test('detectStalePacks returns empty when no packs exist', () => {
  resetStore();
  saveBrandFile('user1', { brandName: 'X', updatedAt: '2025-06-01T12:00:00Z' });
  const stale = detectStalePacks('user1');
  assert.equal(Object.keys(stale).length, 0);
});

test('detectStalePacks returns empty when no brand update timestamp', () => {
  resetStore();
  saveGeneratedPack('user1', 'arah', { generatedAt: '2025-06-01T10:00:00Z' });
  const stale = detectStalePacks('user1');
  assert.equal(Object.keys(stale).length, 0);
});

// ── Active step storage ──

test('save and load active step', () => {
  resetStore();
  saveActiveStep('user1', 'brand');
  assert.equal(loadActiveStep('user1'), 'brand');
});

// ── Clear workspace ──

test('clearRebrandWorkspace removes all keys', () => {
  resetStore();
  saveBrandFile('user1', { brandName: 'X', updatedAt: '2025-01-01T00:00:00Z' });
  saveProject('user1', 'arah', { appId: 'arah' });
  saveProject('user1', 'mula', { appId: 'mula' });
  saveGeneratedPack('user1', 'arah', { generatedAt: '2025-01-01T00:00:00Z' });
  saveActiveStep('user1', 'apps');

  const result = clearRebrandWorkspace('user1');
  assert.equal(result.ok, true);
  assert.equal(loadBrandFile('user1'), null);
  assert.equal(loadProject('user1', 'arah'), null);
  assert.equal(loadProject('user1', 'mula'), null);
  assert.equal(loadGeneratedPack('user1', 'arah'), null);
  assert.equal(loadActiveStep('user1'), null);
});

// ── Legacy v1 migration ──

test('loadRebrandWorkspace migrates v1 single-project to v2 per-app', () => {
  resetStore();
  // Simulate v1 data
  saveBrandFile('user1', { brandName: 'Test', updatedAt: '2025-01-01T00:00:00Z' });
  saveActiveStep('user1', 'project');

  // Write v1-style project directly
  const v1Key = 'appvibe:rebrand:project:user1';
  store.set(v1Key, JSON.stringify({ version: 2, payload: { appId: 'arah', newAppName: 'V1 App' } }));

  const v1PackKey = 'appvibe:rebrand:generated-pack:user1';
  store.set(v1PackKey, JSON.stringify({ version: 2, payload: { generatedAt: '2025-01-01T00:00:00Z', blocks: [] } }));

  const ws = loadRebrandWorkspace('user1');
  assert.ok(ws.brandFile);
  assert.ok(ws.projects.arah, 'arah project should be migrated');
  assert.equal(ws.projects.arah.newAppName, 'V1 App');

  // V1 keys should be cleaned up
  assert.equal(store.has(v1Key), false, 'v1 project key should be removed');
  assert.equal(store.has(v1PackKey), false, 'v1 pack key should be removed');

  // V2 keys should exist
  const loaded = loadProject('user1', 'arah');
  assert.ok(loaded, 'v2 project key should exist');
});
