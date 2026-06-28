import { getAppLaunchUrl } from './access-resources.js';
import { ALL_CATALOG_IDS, APP_CATALOG, packsForApp } from './catalog.js';

/**
 * Validate and normalize a launch URL.
 *
 * In production (default), only https: URLs are accepted.
 * When allowLocalhost is true (development only), http://localhost and
 * http://127.0.0.1 are also accepted for local testing.
 *
 * @param {string} rawUrl
 * @param {boolean} [allowLocalhost=false]  allow http://localhost (dev only)
 * @returns {string|null}  normalized URL or null if invalid
 */
export function normalizeLaunchUrl(rawUrl, allowLocalhost = false) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol === 'https:') return value;
  if (allowLocalhost && parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    return value;
  }

  return null;
}

export async function getStoredAppLaunchUrl(db, appId, { allowLocalhost = false } = {}) {
  if (!db || !APP_CATALOG[appId]) return null;
  const row = await db
    .prepare('SELECT launch_url FROM app_links WHERE app_id = ? LIMIT 1')
    .bind(appId)
    .first();

  const normalized = normalizeLaunchUrl(row?.launch_url, allowLocalhost);
  return normalized || null;
}

export async function listAppLinkSettings(db, rawResourceConfig) {
  const storedRows = db
    ? (await db.prepare('SELECT app_id, launch_url, updated_at FROM app_links ORDER BY app_id').all()).results || []
    : [];
  const storedById = new Map(storedRows.map((row) => [row.app_id, row]));

  return ALL_CATALOG_IDS.map((appId) => {
    const meta = APP_CATALOG[appId];
    const stored = storedById.get(appId);
    const storedUrl = normalizeLaunchUrl(stored?.launch_url, true); // admin: allow localhost
    const fallbackUrl = getAppLaunchUrl(appId, rawResourceConfig);
    const launchUrl = storedUrl || fallbackUrl || '';
    const source = storedUrl ? 'd1' : (fallbackUrl ? 'env' : 'none');

    return {
      app_id: appId,
      name: meta.name,
      label: meta.label,
      function: meta.function,
      packs: packsForApp(appId),
      launch_url: launchUrl,
      source,
      configured: !!launchUrl,
      updated_at: storedUrl ? stored.updated_at : null,
    };
  });
}

export async function saveAppLaunchUrl(db, appId, rawUrl, rawResourceConfig) {
  if (!APP_CATALOG[appId]) {
    return { ok: false, status: 422, error: 'invalid_app', message: 'Aplikasi tidak dikenal.' };
  }
  if (!db) {
    return { ok: false, status: 503, error: 'storage_unavailable', message: 'D1 database tidak tersedia.' };
  }

  const normalizedUrl = normalizeLaunchUrl(rawUrl, true); // admin: allow localhost
  if (normalizedUrl === null) {
    return { ok: false, status: 422, error: 'invalid_url', message: 'URL harus memakai https://.' };
  }

  await db.prepare('DELETE FROM app_links WHERE app_id = ?').bind(appId).run();
  if (normalizedUrl) {
    await db
      .prepare('INSERT INTO app_links (app_id, launch_url, updated_at) VALUES (?, ?, ?)')
      .bind(appId, normalizedUrl, new Date().toISOString())
      .run();
  }

  const apps = await listAppLinkSettings(db, rawResourceConfig);
  return { ok: true, app: apps.find((app) => app.app_id === appId) };
}
