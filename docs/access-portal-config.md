# AppVibe Vault — Access Portal Configuration

## Overview

The `/access/` portal is a premium buyer-facing dashboard where authenticated buyers can:

1. Browse and launch their 13 white-label apps
2. Access marketing kits and guides per bundle
3. Read the rebrand license
4. View purchase history

App launch URLs and resource URLs are **never** in the frontend source. They are resolved server-side from the `ACCESS_RESOURCE_URLS_JSON` environment variable.

---

## Environment Variables

### `ACCESS_RESOURCE_URLS_JSON` (required for app launch)

A JSON string containing URLs for apps and bundle resources. **Store as a Cloudflare Secret** (not a plain environment variable) so the URLs are encrypted and cannot be viewed after saving.

Set via: `wrangler pages secret put ACCESS_RESOURCE_URLS_JSON`

Or in Cloudflare Dashboard → Pages → Settings → Environment variables → **Encrypt**.

**Structure:**

```json
{
  "apps": {
    "adsprint": "https://your-adsprint-app.com",
    "pikat": "https://your-pikat-app.com",
    "rupa": "https://your-rupa-app.com",
    "mula": "https://your-mula-app.com",
    "arah": "https://your-arah-app.com",
    "cetak": "https://your-cetak-app.com",
    "adegan": "https://your-adegan-app.com",
    "suara": "https://your-suara-app.com",
    "bukti": "https://your-bukti-app.com",
    "mimik": "https://your-mimik-app.com",
    "ritme": "https://your-ritme-app.com",
    "tayang": "https://your-tayang-app.com",
    "katalog": "https://your-katalog-app.com"
  },
  "resources": {
    "advertiser": {
      "marketing_kit": "https://drive.google.com/your-advertiser-kit",
      "guide": "https://docs.google.com/your-advertiser-guide"
    },
    "commerce": {
      "marketing_kit": "https://drive.google.com/your-commerce-kit",
      "guide": ""
    },
    "creator": {
      "marketing_kit": "",
      "guide": ""
    },
    "brand_launch": {
      "marketing_kit": "",
      "guide": ""
    }
  }
}
```

**Rules:**
- Empty strings (`""`) mean "not configured yet." The portal will show "belum tersedia" for those resources.
- Only `https://` URLs are accepted. Anything else is treated as unconfigured.
- App IDs must match the canonical IDs in `functions/lib/packs.js`.
- Resource bundle IDs: `advertiser`, `commerce`, `creator`, `brand_launch`.

### Other required variables (already configured)

| Variable | Purpose |
|----------|---------|
| `APPVIBE_DB` | D1 binding for member/order/entitlement data |
| `AUTH_TOKEN_PEPPER` | HMAC pepper for session + magic link tokens |
| `FONNTE_TOKEN` | Fonnte WhatsApp API token |
| `APP_BASE_URL` | `https://appvibe.biz.id` |

---

## Endpoints

### `GET /api/member/me`

Returns authenticated member data. Now includes:
- `apps[]` — app catalog metadata (name, function, output, rebrand, packs)
- `bundles[]` — bundle info with `resources.marketing_kit` and `resources.guide` as booleans
- `resources` — availability map per bundle (booleans, no URLs)

### `GET /api/member/launch?app_id={id}`

Validates session + entitlement → 302 redirect to app URL.

- Full vault: all 13 apps allowed.
- Bundle: only apps in that bundle.
- 403 if app not in entitlement.
- 503 if app URL not configured.

**Security headers:** `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.

### `GET /api/member/resource?bundle_id={id}&type={marketing_kit|guide}`

Validates session + entitlement → 302 redirect to resource URL.

- Full vault: all bundles' resources accessible.
- Bundle: only that bundle's resources.
- 503 if resource URL not configured.

---

## Deployment Checklist

1. Set `ACCESS_RESOURCE_URLS_JSON` in Cloudflare Pages environment.
2. Leave URLs empty (`""`) for resources that aren't ready yet.
3. The portal degrades gracefully — empty URLs show "belum tersedia" instead of broken buttons.
4. No redeployment needed when updating URLs — just update the env var and wait for the next request.

---

## Security Notes

- App URLs are never in frontend HTML, JS, or JSON responses.
- The `/api/member/launch` endpoint returns a 302 redirect, not a JSON payload with URLs.
- Session + entitlement are validated on every launch/resource request.
- `Referrer-Policy: no-referrer` prevents URL leakage to third parties.
- **Production:** `ACCESS_RESOURCE_URLS_JSON` (Cloudflare Secret) is the sole source for app URLs. The D1 `app_links` table is ignored in production.
- **Development:** When `ENVIRONMENT=development`, the D1 `app_links` table is checked first and allows `http://localhost` / `http://127.0.0.1` URLs. This is intended for local testing only — the guard is explicit (`env.ENVIRONMENT === 'development'`) and cannot be triggered in production.
- If you need to override an app URL temporarily in production, update the Secret. Do not insert rows into `app_links` expecting them to take effect in production.
