# Design: Per-App Marketing Kit on Access Portal

**Date:** 2026-07-04  
**Status:** Approved for implementation planning  
**Repo:** `appvibe.biz.id`  
**Source assets:** `D:\0Project\AppVibe\Marketing kit` (13 HTML reseller landing templates)

## Summary

Buyers with active app entitlements get **per-product** marketing kit access on `/access/`: preview, **download** the original `.html` file, and **copy** either full HTML or extracted plain text (two tabs). Kits are stored in-repo, bundled into server-side modules at build time, and served only through authenticated Pages Functions—never as public static files.

## Goals

- One landing template per vault app (`appId`), not per canonical bundle.
- Entitlement matches app launch: user must have `app_id` unlocked (or full vault).
- Hybrid delivery: files in repo; download and copy gated by session API.
- Replace bundle-level “Buka marketing kit” redirect UX with per-app templates.

## Non-goals (v1)

- In-browser WYSIWYG editor for templates.
- Hosting templates on R2 or external Drive URLs for kits.
- Changing pack definitions in `functions/lib/packs.js`.
- Auto-replacing `[NAMA BRAND]` with Rebrand Workspace data (future enhancement).

## Source file mapping

| Source filename | `appId` |
|-----------------|---------|
| `adsprint-reseller-landing-page.html` | `adsprint` |
| `adegan-reseller-landing-page.html` | `adegan` |
| `arah-reseller-landing-page.html` | `arah` |
| `bukti-reseller-landing-page.html` | `bukti` |
| `cetak-reseller-landing-page.html` | `cetak` |
| `katalog-reseller-landing-page.html` | `katalog` |
| `mimik-reseller-landing-page.html` | `mimik` |
| `mula-reseller-landing-page.html` | `mula` |
| `pikat-reseller-landing-page.html` | `pikat` |
| `ritme-reseller-landing-page.html` | `ritme` |
| `rupa-reseller-landing-page.html` | `rupa` |
| `suara-reseller-landing-page.html` | `suara` |
| `tayang-reseller-landing-page.html` | `tayang` |

Canonical app list: `ALL_APP_IDS` in `functions/lib/packs.js`.

## Architecture

```
marketing-kits/{appId}.html          (source in repo, not in dist/public)
        │
        ▼
scripts/bundle-marketing-kits.mjs    (prebuild)
        │
        ▼
functions/lib/marketing-kit-content.js   (generated; run `bundle:kits` in CI before deploy; commit generated file if CI has no prebuild step)
        │
        ▼
functions/lib/marketing-kits.js      (getKitHtml, hasKit, extractPlainText)
        │
        ├── GET /api/member/marketing-kit
        └── GET /api/member/me  (marketing_kit_available per app)
        │
        ▼
access/index.html  (section + modal UI)
```

## Access control

- Resolve session via `resolveSession` (same as `/api/member/launch`).
- Unlock check: `computeUnlockedAppIds(session.entitlements).includes(appId)`.
- Invalid `app_id` (not in `ALL_APP_IDS`): 400.
- Missing kit content for valid app: 503 `kit_not_available`.
- All successful responses: `Cache-Control: no-store`.

## API: `GET /api/member/marketing-kit`

**File:** `functions/api/member/marketing-kit.js` (Cloudflare Pages file-based route).

| Parameter | Required | Behavior |
|-----------|----------|----------|
| `app_id` | yes | Whitelist `ALL_APP_IDS` |
| `format` | no | `html` (default for JSON body) or `plain` |
| `download` | no | If `1` or `true`, return attachment response (ignores JSON format) |

**Responses:**

- `format=html`: `200` JSON `{ app_id, title, html }` where `title` from `<title>` in template.
- `format=plain`: `200` JSON `{ app_id, title, plain_text }`.
- `download=1`: `200` `Content-Type: text/html; charset=utf-8`, `Content-Disposition: attachment; filename="{appId}-landing-template.html"`, body = raw HTML.

Errors use `errorResponse` from `functions/lib/error-page.js` (HTML for navigation, JSON for `fetch`).

## API: `GET /api/member/me` changes

For each object in `apps[]`, add:

```json
"marketing_kit_available": true
```

Rules: `true` when `hasKit(appId)` on server **and** user has entitlement for that `app_id` (same set as `app_ids` list already returned).

Hero metric **Mkt Kit**: count apps where `marketing_kit_available === true` (replace bundle `resources.marketing_kit` count in UI).

Keep `bundles[].resources` shape for backward compatibility; portal v1 UI stops using bundle `marketing_kit` buttons.

## Server library: `functions/lib/marketing-kits.js`

- `hasKit(appId)` — boolean, content present in generated map.
- `getKitHtml(appId)` — string or null.
- `extractPlainText(html)` — remove `script`/`style`, decode entities minimally, collapse whitespace; preserve line breaks between block elements for readability.
- `getKitTitle(html)` — parse `<title>` or fallback to catalog name.

## Build: `scripts/bundle-marketing-kits.mjs`

1. Read all `marketing-kits/*.html`.
2. Validate filenames map to `ALL_APP_IDS` (warn on extras/missing).
3. Emit `functions/lib/marketing-kit-content.js`:

```js
export const MARKETING_KIT_HTML = { adsprint: `...`, ... };
```

4. Wire into `package.json` as `prebuild` or explicit `npm run bundle:kits` before `vite build` and Pages deploy.

**Initial import:** Copy normalized files from `Marketing kit` folder into `marketing-kits/{appId}.html` in repo (one-time migration task in implementation plan).

## Plain text extraction (v1)

- Strip HTML comments (optional: keep reseller comment block at top as plain text prefix).
- Visible text from `body` only.
- Do not attempt markdown conversion in v1.

## UI: `access/index.html`

### Section: “Template Landing Page”

- Placement: after “Aplikasi Anda”, before “Aset Peluncuran”.
- Grid of cards for apps where user has access **and** `marketing_kit_available`.
- Card actions:
  - **Preview & salin** → opens modal.
  - **Unduh HTML** → `window.location` or `fetch` + blob to `/api/member/marketing-kit?app_id=X&download=1` (credentials include).

### Modal

- Title: app name + “Template landing reseller”.
- Tabs: **Salin HTML** | **Salin teks**.
- Load content on tab open via `fetch('/api/member/marketing-kit?...', { credentials: 'include' })`.
- Buttons: **Salin ke clipboard** (`navigator.clipboard.writeText`), toast on success/failure.
- Optional: readonly `<pre>` scroll area for preview.

### Aset Peluncuran

- Remove disabled/enabled “Buka marketing kit” per bundle.
- Keep: **Buka panduan mulai** (`/api/member/resource?type=guide`), Rebrand Workspace, license, upgrade cards.

### Optional v1.1

- Drawer detail: link “Template landing page” opening same modal.

## Deprecation

- `/api/member/resource?type=marketing_kit` may remain for configured external URLs but is **not** linked from portal after this change. Document in AGENTS.md only if env URLs still used for legacy buyers.

## Error handling

| Case | HTTP | User message (ID) |
|------|------|-------------------|
| No session | 401 | Sama pola verify portal |
| No entitlement | 403 | Tidak memiliki akses ke aplikasi ini |
| Bad app_id | 400 | app_id tidak valid |
| Kit missing in bundle | 503 | Template belum tersedia |
| Clipboard denied | — | UI: salin manual dari preview |

## Testing checklist

- [ ] Full vault: 13 cards, all download/copy work.
- [ ] Single bundle: only entitled apps show kits.
- [ ] Direct URL to static path under `dist` for kit HTML returns 404.
- [ ] Unauthenticated API returns 401.
- [ ] `format=plain` readable, placeholders like `[NAMA BRAND]` preserved.
- [ ] Build fails or warns if kit count ≠ 13.

## Security

- No kit HTML in client bundle or `src/scripts`.
- Generated content module only imported by Functions code.
- Do not log full HTML in production.

## Implementation follow-up

Invoke **writing-plans** skill to produce step-by-step implementation plan referencing this spec.