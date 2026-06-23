# AppVibe LP Optimization — Execution Plan v3

Based on: `appvibe-lp-optimization-execution-plan.md` (872 lines) + 8 mandatory amendments + 5 final revisions.

---

## Revisions applied

### R1: File count corrected — 13 files total
| Action | Count |
|---|---|
| CREATE | 3 files |
| DELETE | 1 file |
| MODIFY | 9 files |

**Total: 13 files**

---

### R2: `selectedPack` starts null — never assumes user choice

```js
window.vaultState = {
  recommendedPack: 'advertiser', // default visual for recommendation card ONLY
  selectedPack: null,            // filled ONLY after user action
  selectedApp: null,
  lastFormPlacement: null
};
```

Rules:
- Recommendation card shows Advertiser Pack as **default visual**, but `selected_pack` in form = `null`
- `selected_pack` is only sent when user explicitly chose a pack or arrived via contextual CTA
- If not selected, send `selected_pack: null`
- General CTA ("Lihat opsi akses saya") → `selected_pack: null`, `selected_app: null`
- Contextual CTA from pack → `selected_pack` = pack_id
- Contextual CTA from app → `selected_pack` + `selected_app` set

---

### R3: Product gallery → Product showcase (3 apps only)

**REMOVED:** Gallery marquee with 13×2=26 cards auto-scrolling

**REPLACED WITH:** Product showcase — 3 featured apps based on active pack

Showcase contains:
- 3 visual preview cards (larger than launcher, static)
- Rebranded product name
- End-user outcome per app
- CTA: "Lihat seluruh 13 aplikasi" (scrolls to launcher)

The app launcher (below showcase) is the ONLY full 13-app catalog. No duplication.

---

### R4: Rate limiting — server-side best-effort only, not in acceptance criteria

**Reality:** Cloudflare Pages Functions are isolated per request. `Map()` in memory is NOT reliable across isolates.

**What we implement:**
- Honeypot (already exists)
- Turnstile server-side (already exists)
- Submit button disabled during request (client guard)
- Idempotency key in payload — client generates, server checks `Map()` as **best-effort**
- Validasi server-side: name ≥2 chars, email regex, WhatsApp length, `selected_pack`/`selected_app` validated against known IDs

**REMOVED from acceptance criteria:** "Rate limit per IP" — unreliable without Cloudflare KV.

---

### R5: Tracking architecture — single path, no duplicates

**Main path:** `dataLayer.push()` → GTM forwards to GA4 + Meta via triggers

**Standard conversion events** (direct, NOT via dataLayer):
```js
// ONLY on form submit success:
fbq('track', 'Lead');                    // Meta standard
gtag('event', 'generate_lead', {...});   // GA4 standard
```

**Vault internal events** via `dataLayer.push()` only:
```js
trackVaultEvent('vault_cta_click', { placement, cta_label });
trackVaultEvent('vault_pack_selected', { pack_id, entry_point });
trackVaultEvent('vault_app_selected', { app_id, pack_context });
trackVaultEvent('vault_form_opened', { placement, form_open_source });
trackVaultEvent('vault_lead_submit_attempt', { selected_pack, selected_app });
trackVaultEvent('vault_lead_submit_success', { selected_pack, selected_app, model_penggunaan });
```

**Acceptance criterion:** One submit success = ONE Meta Lead + ONE GA4 generate_lead. No duplicate from GTM + direct script simultaneously.

---

### Final page order

1. Header (sticky)
2. Hero → CTA1: scroll to packs, CTA2: scroll to launcher
3. Hero stats strip (13 apps · 4 packs · 100% · 0 code)
4. Pain cards (3)
5. Transition strip ("Dari insight → produk")
6. Niche pack selector (2×2 grid, clickable)
7. First-product recommendation card (dynamic, below packs)
8. Product showcase (3 featured apps based on active pack)
9. App launcher (full 13 apps, 5-col desktop, 4-col mobile, detail below)
10. Included / package-dependent (two-column)
11. License: Anda boleh / Tidak termasuk (two-column)
12. FAQ (9 questions)
13. Final CTA ("Lihat opsi akses saya")
14. Lead modal (context-aware, privacy notice)

---

### Additional fixes included

- Saat app dipilih dari launcher, simpan `pack_context` karena satu app bisa di beberapa pack
- `selected_pack` di form mengikuti pack yang dipilih user, bukan default display
- Jika user buka modal dari CTA general, jangan pre-fill pack atau app
- Tambahkan `form_open_source`: `hero`, `pack_card`, `first_product`, `app_launcher`, `final_cta`
- Detail app di mobile otomatis masuk viewport setelah dipilih (jangan scroll bila sudah terlihat)
- Fokus kembali ke tombol pemicu saat modal ditutup
- Sticky header tidak menutup section hasil anchor scroll (`scroll-margin-top: 140px`)
- Gallery marquee DISABLED via CSS (no animation)
- Double-click submit = ONE effective request
- Privacy notice di bawah tombol submit
- "Contoh harga" selalu dilabeli eksplisit bukan harga lisensi

---

## File changes

| File | Action |
|---|---|
| `src/scripts/data/vault-apps.js` | CREATE — 13 apps full metadata |
| `src/scripts/data/vault-packs.js` | CREATE — 4 packs full metadata |
| `src/scripts/first-product.js` | CREATE — dynamic recommendation card |
| `src/scripts/data/apps.js` | DELETE |
| `src/scripts/app-launcher.js` | MODIFY — import vault-apps, 5-col, form CTA, events |
| `src/scripts/lead-form.js` | MODIFY — new fields, idempotency, Meta Lead + GA4, success msg |
| `src/scripts/modal.js` | MODIFY — context open, form_open_source, focus return |
| `src/scripts/tracking.js` | MODIFY — trackVaultEvent, dataLayer-only vault events, direct fbq/gtag only for standard conversions |
| `index.html` | MODIFY — 7 section rewrite, product showcase ≤3, form fields, privacy notice, anchors |
| `functions/api/lead.js` | MODIFY — new fields, server validation, best-effort dedupe |
| `src/styles/landing.css` | MODIFY — first-product card, license 2-col, transition strip, scroll-margin, product showcase |
| `src/styles/launcher.css` | MODIFY — 5-col, disable auto-scroll, detail below |
| `src/styles/responsive.css` | MODIFY — new sections, scroll-margin, mobile showcase |

**Total: 3 create + 1 delete + 9 modify = 13 files**

---

## Implementation order

1. Create `vault-apps.js` + `vault-packs.js` (data foundation)
2. Delete `apps.js`, update `app-launcher.js` imports
3. Build `first-product.js` (dynamic recommendation, uses global state)
4. Rewrite `tracking.js` (trackVaultEvent, event contract)
5. Rewrite `modal.js` (context open, focus return, form_open_source)
6. Rewrite `lead-form.js` (new fields, idempotency, dual analytics)
7. Rewrite `functions/api/lead.js` (server validation, best-effort dedupe)
8. Rebuild `index.html` (all section copy, structure, form fields, product showcase)
9. CSS updates (landing.css → license 2-col, showcase, scroll-margin; launcher.css → 5-col, disable animation; responsive.css)
10. `npm run build` → QA → deploy preview
