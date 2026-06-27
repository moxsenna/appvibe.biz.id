/**
 * Server-side resolver for app launch URLs and bundle resource URLs.
 *
 * URLs are read from the ACCESS_RESOURCE_URLS_JSON environment variable,
 * never from frontend code. This module parses the JSON config and provides
 * lookup helpers used by /api/member/launch and /api/member/me.
 *
 * Expected JSON structure:
 * {
 *   "apps": { "adsprint": "https://...", ... },
 *   "resources": {
 *     "advertiser": { "marketing_kit": "https://...", "guide": "https://..." },
 *     ...
 *   }
 * }
 */

/**
 * Parse ACCESS_RESOURCE_URLS_JSON safely. Returns an empty structure on
 * any parse error so the portal degrades gracefully.
 * @param {string} raw
 * @returns {{apps:Record<string,string>, resources:Record<string,{marketing_kit?:string,guide?:string}>}}
 */
export function parseResourceConfig(raw) {
  if (!raw) return { apps: {}, resources: {} };
  try {
    const parsed = JSON.parse(raw);
    return {
      apps: (parsed?.apps && typeof parsed.apps === 'object') ? parsed.apps : {},
      resources: (parsed?.resources && typeof parsed.resources === 'object') ? parsed.resources : {},
    };
  } catch {
    return { apps: {}, resources: {} };
  }
}

/**
 * Get the launch URL for a specific app. Returns null if not configured.
 * @param {string} appId
 * @param {string} rawJson  ACCESS_RESOURCE_URLS_JSON
 * @returns {string|null}
 */
export function getAppLaunchUrl(appId, rawJson) {
  const cfg = parseResourceConfig(rawJson);
  const url = cfg.apps[appId];
  return (url && typeof url === 'string' && url.startsWith('http')) ? url : null;
}

/**
 * Get resource URLs for a specific bundle (marketing_kit, guide).
 * Returns { marketing_kit: string|null, guide: string|null }.
 * @param {string} bundleId  e.g. "advertiser"
 * @param {string} rawJson
 * @returns {{marketing_kit:string|null, guide:string|null}}
 */
export function getBundleResources(bundleId, rawJson) {
  const cfg = parseResourceConfig(rawJson);
  const res = cfg.resources[bundleId] || {};
  return {
    marketing_kit: (res.marketing_kit && res.marketing_kit.startsWith('http')) ? res.marketing_kit : null,
    guide: (res.guide && res.guide.startsWith('http')) ? res.guide : null,
  };
}

/**
 * For the /api/member/me response: which resources are available (URL
 * configured) without leaking the actual URLs. Returns a map of
 * availability booleans.
 *
 * @param {string[]} bundleIds  active bundle IDs
 * @param {boolean} hasFullVault
 * @param {string} rawJson
 * @returns {{apps: Record<string,boolean>, resources: Record<string,{marketing_kit:boolean,guide:boolean}>}}
 */
export function getResourceAvailability(bundleIds, hasFullVault, rawJson) {
  const cfg = parseResourceConfig(rawJson);
  const apps = {};
  for (const [id, url] of Object.entries(cfg.apps)) {
    apps[id] = !!(url && typeof url === 'string' && url.startsWith('http'));
  }
  const resources = {};
  const relevantBundles = hasFullVault
    ? ['advertiser', 'commerce', 'creator', 'brand_launch']
    : bundleIds;
  for (const bid of relevantBundles) {
    const r = cfg.resources[bid] || {};
    resources[bid] = {
      marketing_kit: !!(r.marketing_kit && r.marketing_kit.startsWith('http')),
      guide: !!(r.guide && r.guide.startsWith('http')),
    };
  }
  return { apps, resources };
}
