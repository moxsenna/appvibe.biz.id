import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { onRequest } from '../functions/api/admin/app-links.js';
import { createFakeD1, applyMigration } from '../functions/lib/fake-d1.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');
const APP_LINKS_MIGRATION_SQL = readFileSync(join(__dirname, '..', 'migrations', '0002_app_links.sql'), 'utf8');

const RESOURCE_CONFIG = JSON.stringify({
  apps: {
    adsprint: 'https://fallback-ads.example.com',
  },
  resources: {},
});

async function makeEnv(overrides = {}) {
  const d1 = createFakeD1();
  await applyMigration(d1, MIGRATION_SQL);
  await applyMigration(d1, APP_LINKS_MIGRATION_SQL);
  return {
    APPVIBE_DB: d1,
    ADMIN_TOKEN: 'admin_secret',
    ACCESS_RESOURCE_URLS_JSON: RESOURCE_CONFIG,
    ...overrides,
  };
}

function adminRequest(path = '/api/admin/app-links', init = {}) {
  return new Request(`https://appvibe.biz.id${path}`, {
    ...init,
    headers: {
      Authorization: 'Bearer admin_secret',
      ...(init.headers || {}),
    },
  });
}

test('admin app links: rejects missing bearer token', async () => {
  const env = await makeEnv();
  const req = new Request('https://appvibe.biz.id/api/admin/app-links');

  const res = await onRequest({ request: req, env });

  assert.equal(res.status, 401);
});

test('admin app links: lists catalog with effective fallback URL source', async () => {
  const env = await makeEnv();

  const res = await onRequest({ request: adminRequest(), env });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.ok(data.apps.length >= 13);
  const adsprint = data.apps.find((app) => app.app_id === 'adsprint');
  assert.equal(adsprint.name, 'ADSprint');
  assert.equal(adsprint.launch_url, 'https://fallback-ads.example.com');
  assert.equal(adsprint.source, 'env');
  assert.equal(adsprint.configured, true);
});

test('admin app links: validates app id and URL before storing', async () => {
  const env = await makeEnv();

  const badApp = await onRequest({
    request: adminRequest('/api/admin/app-links', {
      method: 'PUT',
      body: JSON.stringify({ app_id: 'missing-app', launch_url: 'https://app.example.com' }),
    }),
    env,
  });
  assert.equal(badApp.status, 422);

  const badUrl = await onRequest({
    request: adminRequest('/api/admin/app-links', {
      method: 'PUT',
      body: JSON.stringify({ app_id: 'adsprint', launch_url: 'javascript:alert(1)' }),
    }),
    env,
  });
  assert.equal(badUrl.status, 422);
});

test('admin app links: stores, lists, and clears D1 launch URL', async () => {
  const env = await makeEnv();

  const saved = await onRequest({
    request: adminRequest('/api/admin/app-links', {
      method: 'PUT',
      body: JSON.stringify({ app_id: 'adsprint', launch_url: 'https://new-ads.example.com/path' }),
    }),
    env,
  });
  const savedData = await saved.json();

  assert.equal(saved.status, 200);
  assert.equal(savedData.app.launch_url, 'https://new-ads.example.com/path');
  assert.equal(savedData.app.source, 'd1');

  const listed = await onRequest({ request: adminRequest(), env });
  const listedData = await listed.json();
  assert.equal(listedData.apps.find((app) => app.app_id === 'adsprint').launch_url, 'https://new-ads.example.com/path');

  const cleared = await onRequest({
    request: adminRequest('/api/admin/app-links', {
      method: 'PUT',
      body: JSON.stringify({ app_id: 'adsprint', launch_url: '' }),
    }),
    env,
  });
  const clearedData = await cleared.json();
  assert.equal(cleared.status, 200);
  assert.equal(clearedData.app.launch_url, 'https://fallback-ads.example.com');
  assert.equal(clearedData.app.source, 'env');
});
