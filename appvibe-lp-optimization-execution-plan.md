# AppVibe — White-Label AI Vault Landing Page Optimization Plan

**Document type:** implementation brief for an AI coding/design agent  
**Primary URL:** `https://appvibe.biz.id/`  
**Revision:** v1.0  
**Objective:** Increase qualified lead conversion without changing the core offer, app catalog, licensing substance, or delivery infrastructure unless expressly required below.

> Status note: this is a historical landing-page optimization brief. The current `appvibe.biz.id` repo now includes a checkout page at `/checkout/` and PayCore integration. `appvibe.web.id` is a separate service-business project in `D:\Coding\AppVibe v2`; PayCore is a separate payment hub in `D:\Coding\paycore`.

---

## 1. Executive directive

The current landing page has strong product positioning: it presents an ecosystem of 13 rebrandable AI applications, four audience-specific packs, a launch kit, and a white-label licensing model. The revision must make the purchase decision feel faster and safer for cold traffic.

The landing page must evolve from:

> “Here are 13 rebrandable applications.”

into:

> “Choose the first branded AI product you can launch for the audience you already have.”

This is an **information architecture, conversion UX, copy, proof, and lead qualification upgrade**. It is **not** a full visual rebrand and not an excuse to replace the existing design system with an unrelated aesthetic.

---

## 2. Primary business goal

### Primary conversion
A qualified prospect submits the access form after understanding:

1. Who this is for.
2. Which pack fits their audience.
3. What product they can launch first.
4. What they receive.
5. What the license permits and prohibits.
6. What happens after they submit their interest.

### Secondary conversion signals
Track these as intent events:

- Selecting a niche pack.
- Opening a specific application detail.
- Opening the lead form.
- Clicking the primary CTA.
- Clicking the catalog/demo CTA.
- Reaching the licensing section.
- Submitting the form successfully.

### North-star metric
`qualified_lead_submit_success`

A qualified lead is not merely an email capture. It includes at minimum a selected audience/niche and enough contact information for follow-up.

---

## 3. Target buyers and message hierarchy

The page must directly speak to these audience groups:

| Buyer group | Existing distribution | First product opportunity |
|---|---|---|
| Advertiser / performance agency / ads mentor | clients, media buyers, ad community | campaign strategy and creative direction tools |
| Ecommerce / marketplace operator / seller mentor | seller community, ecommerce clients | listing, visual commerce, proof, affiliate content tools |
| Creator educator / affiliate mentor / social-media agency | audience, student group, creator clients | content system, hook, script, voice, and persona tools |
| Brand strategist / web designer / course creator / consultant | clients, workshops, cohorts | brand foundation, launch, website, and campaign tools |

### Message hierarchy, in order

1. **Outcome:** launch an AI product under your own brand.
2. **Mechanism:** select a niche pack, rebrand the app, package and sell access.
3. **Fit:** identify the audience type and best first product.
4. **Product reality:** show real applications and real output/use-case evidence.
5. **What is included:** product access plus positioning and go-to-market guidance.
6. **Risk control:** explain license boundaries and next step clearly.

---

## 4. Non-negotiable constraints

The implementing agent must follow these rules.

1. **Do not invent claims.** Do not add revenue guarantees, user counts, fake scarcity, fake testimonials, fake client logos, or fabricated before/after metrics.
2. **Do not change the license meaning.** The standard license allows selling access to branded products, but does not allow reselling core files/templates or forwarding white-label rights. Preserve this legal boundary.
3. **Do not promise all 13 apps inside every package** unless the actual commercial offer confirms that. Copy must be configurable.
4. **Do not expose app source files or imply downloadable source code** unless the offer actually includes it.
5. **Historical lead-capture note:** this brief originally assumed a lead form. In the current repo, preserve checkout, analytics, UTM persistence, and responsive behavior. Inspect first and extend safely.
6. **Do not use an auto-running app carousel as the primary proof.** It creates duplicated content, makes browsing harder, and can hide the app selector on mobile.
7. **Do not perform a wholesale visual redesign.** Retain the existing visual language, typography hierarchy, and premium editorial tone wherever feasible.
8. **No new heavyweight dependency** merely for animation, carousel, form validation, or a modal.
9. **No deployment directly to production before a preview build and QA evidence are available.**

---

## 5. Required information architecture

### Target page order

1. Sticky navigation
2. Hero: value proposition + two CTAs + credibility chips
3. Buyer-role / pack selector
4. Pain-to-product bridge
5. “Launch your first product” pack result card
6. How it works: three steps
7. Product proof: selected application + outcome preview
8. Explore all 13 applications launcher
9. What you receive
10. License clarity: allowed vs prohibited
11. FAQ
12. Final CTA and qualified lead form
13. Footer / policies

### Why this order matters

The user should identify themselves **before** being asked to inspect thirteen applications. The app catalog remains a core proof element, but it must follow audience fit and first-product framing.

---

## 6. Detailed section requirements

### 6.1 Sticky navigation

Replace or adjust navigation labels to match the revised journey:

- Cara kerja
- Pilih pack
- Lihat aplikasi
- Yang Anda dapatkan
- Lisensi
- FAQ
- Primary CTA: `Pilih pack saya` or `Ambil akses`

#### Requirements

- Navigation anchors must match actual section IDs.
- On mobile, the nav may horizontally scroll but must not obscure hero content.
- Primary CTA remains visible at desktop width; on narrow mobile it may move into the menu or a compact sticky action bar.
- Clicking a nav item must use smooth scroll and preserve accessibility focus behavior.

---

### 6.2 Hero

#### Purpose
Within five seconds, a cold visitor must understand that AppVibe helps them launch a branded AI product for their existing audience without building it from zero.

#### Recommended hero copy

**Eyebrow**

`WHITE-LABEL AI APP VAULT · FOR OWNERS WITH AN AUDIENCE`

**Headline**

`Ubah audiens Anda menjadi pembeli produk AI ber-brand Anda.`

Alternative if the first line wraps poorly on mobile:

`Luncurkan produk AI bermerek untuk audiens yang sudah Anda miliki.`

**Supporting copy**

`Pilih aplikasi yang relevan, sesuaikan nama dan positioning-nya, lalu kemas sebagai tool berbayar, bonus program, atau client portal—tanpa membangun software dari nol.`

**Primary CTA**

`Pilih pack untuk audiens saya`

Action: scroll to pack selector; do not immediately force form completion.

**Secondary CTA**

`Lihat demo aplikasi`

Action: scroll to the product proof/catalog section.

**Credibility chips**

- `13 aplikasi siap rebrand`
- `4 niche pack`
- `Lifetime access sesuai paket`
- `Tanpa coding dari nol`

Only retain “100% white-label” if it accurately reflects the license. Otherwise use the more precise phrase above.

#### Hero interaction requirements

- A click on the primary CTA must generate `vault_cta_click` with `placement: hero`.
- A click on the secondary CTA must generate `vault_demo_click` with `placement: hero`.
- No automatic video, autoplay audio, or text animation that delays comprehension.
- Keep all hero text readable above the fold at 375 px wide.

---

### 6.3 Buyer-role / pack selector

This is the new decision layer directly below the hero.

#### Section heading

`Produk pertama Anda sebaiknya mengikuti market yang sudah Anda pahami.`

Supporting copy:

`Pilih tipe audiens Anda. Kami akan tunjukkan pack yang paling logis untuk diluncurkan lebih dulu.`

#### Required packs

1. Advertiser App Pack
2. Commerce & Marketplace Pack
3. Creator & Affiliate Pack
4. Brand & Launch Pack

#### Pack card content

Each card must have:

- Target persona.
- Core end-customer problem.
- Recommended first app.
- 3–5 relevant apps in the pack.
- A one-line monetization route.
- A clear selection CTA.

Example for Advertiser:

- **Ideal for:** media buyers, agency performance, mentor ads.
- **First product:** `Campaign Blueprint AI`.
- **End-customer outcome:** campaign direction and creative testing ideas before budget is spent.
- **Launch model:** lifetime tool, mentorship bonus, or client portal.
- **CTA:** `Pilih Advertiser Pack`.

#### Interaction behavior

- Clicking a pack card selects it and updates the “Launch your first product” result card below.
- It must also preselect the corresponding interest in the lead form.
- The selected state must not rely solely on color. Use clear label/icon/border/aria state.
- On mobile, use a vertical card stack or horizontally scrollable cards with no cropped text. Do not use a hidden carousel.
- Selection should update the URL hash or query only if it does not cause analytics or routing regressions. Example: `#pack=advertiser` is acceptable; no requirement to implement if the site architecture does not support it safely.

#### Tracking

`vault_pack_selected`

Parameters:

```json
{
  "pack_id": "advertiser|commerce|creator|brand_launch",
  "entry_point": "hero|scroll|nav|direct",
  "device_type": "mobile|tablet|desktop"
}
```

---

### 6.4 Pain-to-product bridge

Retain the current three problems but make the relationship to the product more immediate.

#### Section headline

`Anda sudah punya distribusi. Yang belum ada adalah produk yang layak dibeli berulang.`

#### Keep the three themes

- Konten bukan produk.
- Membuat app dari nol terlalu berat untuk validasi cepat.
- Prompt saja sulit menciptakan persepsi produk premium.

#### Required visual change

Immediately after the three cards, add a transition strip:

`Dari insight dan audiens → produk AI bernama, berbentuk, dan bisa dijual.`

CTA:

`Pilih produk pertama saya`

This CTA scrolls back to, or focuses, the pack selector.

---

### 6.5 “Launch your first product” result card

This section translates a selected pack into an actionable business concept.

#### Required structure

- Eyebrow: `REKOMENDASI UNTUK [PACK]`
- Headline: `Mulai dengan [REBRANDED PRODUCT NAME].`
- What it helps the end user do.
- Who buys it.
- Suggested launch model.
- 3 highlighted included/related applications.
- CTA: `Lihat aplikasi pembentuk pack ini`
- CTA: `Saya tertarik dengan pack ini`

#### Initial/default state

Default to the Advertiser App Pack only when no choice has been made. Clearly label it:

`Contoh rekomendasi: Advertiser App Pack`

When a user selects a pack, remove the word “contoh” and replace content dynamically.

#### Data model

Do not hardcode data in JSX/HTML repeatedly. Centralize it in a configuration object or data file adapted to the stack.

Minimum fields:

```ts
type Pack = {
  id: string;
  label: string;
  targetAudience: string;
  primaryProductName: string;
  productOutcome: string;
  buyerTypes: string[];
  launchModels: string[];
  appIds: string[];
  formInterestValue: string;
};
```

---

### 6.6 How it works

Keep the existing three-step mechanism but revise copy to explain delivery and buyer action precisely.

1. **Pilih niche yang sudah punya pasar Anda.**
2. **Rebrand menjadi produk yang terasa milik Anda.**
3. **Luncurkan sebagai akses, bundle, atau bonus premium.**

#### Add an implementation clarification line

`Setelah memilih paket, Anda akan menerima detail akses dan jalur implementasi yang sesuai dengan paket serta model distribusi Anda.`

Do not state that delivery is instant, hosted, source-code based, or assisted unless that is commercially true.

#### Correct the pricing example

The current “Bundle Rp149K–Rp799K” must be explicitly labeled:

`Contoh harga jual ke end user—bukan harga lisensi AppVibe.`

If the figure is not supported by a documented pricing rationale, replace it with:

`Contoh model monetisasi: lifetime access, bundle niche, bonus program, atau client portal.`

---

### 6.7 Product proof

Product proof must show that the applications are real, purposeful, and not generic prompt templates.

#### Required proof components

1. **One selected-app visual** from the real app UI or a faithful static capture of it.
2. **Input → process → output** representation for the selected app.
3. **Concrete outcome statement** tied to the buyer’s work.
4. **A “rebrand snapshot”:** original app name → example branded product name → buyer → sellable delivery format.

#### Initial proof example

**ADSprint → Campaign Blueprint AI**

- Input: product/offer, target audience, campaign goal.
- Output: campaign direction, audience angles, creative briefs, testing ideas.
- Buyer: media buyer, affiliate, UMKM, ads team.
- Sell as: lifetime tool, mentorship bonus, agency client portal.

#### Asset rules

- Use genuine UI screenshots/captures of the included applications when possible.
- Do not use artificial generic dashboards that could misrepresent the actual product.
- Avoid videos at first unless real product walkthrough clips are ready. Static proof is acceptable and safer.
- Use compressed WebP/AVIF assets and lazy-load below-the-fold media.

---

### 6.8 Explore all 13 applications launcher

This remains the catalog proof section, but must be after the user sees why a pack matters.

#### Section headline

`Pilih satu produk dulu. Lalu perluas menjadi katalog yang relevan.`

Supporting copy:

`Ketuk aplikasi untuk melihat contoh positioning, pasar akhir, dan bentuk produk yang dapat Anda luncurkan dengan brand sendiri.`

#### Launcher requirements

- Preserve the app-launcher interaction pattern: icon + name, then detail below.
- On mobile, display **four compact columns** when width permits; gracefully use three/two columns on narrower devices without tiny tap targets.
- Every app item needs a minimum 44×44 px tap target.
- Do not duplicate the 13 apps to create a running loop.
- Do not use an autoplay/auto-scroll preview.
- Detail updates must be immediate, keyboard accessible, and announced for screen readers if feasible.
- The selected app detail must contain:
  - Original app name.
  - Example rebranded product name.
  - Target buyer.
  - End-user outcome.
  - Monetization format.
  - Pack badges.
  - CTA: `Saya ingin meluncurkan produk seperti ini`.

#### Suggested app detail CTA behavior

Opens the lead form and pre-fills both:

- `interest_pack`
- `interest_app`

---

### 6.9 What you receive

The current launch-kit section has the correct intent but needs clearer deliverables.

#### New section title

`Bukan hanya akses aplikasi. Anda mendapatkan fondasi untuk meluncurkannya.`

#### Required format

Use a two-column “Included / Depends on your selected package” structure.

**Included / standard components only if true:**

- Aplikasi yang tercakup dalam paket.
- Hak rebrand yang sesuai lisensi.
- Arah positioning per target market dan use case.
- Template headline, CTA, dan sales-page angle.
- Ide konten promosi dan campaign angle.
- Format bundling serta skenario monetisasi.
- Contoh bentuk produk akhir/deliverable.

**Package-dependent components:**

- Jumlah aplikasi.
- Tingkat bantuan branding atau rebrand.
- Metode dan tempat delivery.
- Material pendamping tambahan.
- Setup teknis atau onboarding.

#### Important

All package-dependent statements must be explicitly marked. Do not let an undecided feature sound included by default.

---

### 6.10 License clarity

Change the visible label from:

`White-label reseller license`

to:

`Lisensi akses produk white-label`

Alternative:

`White-label Product Access License`

#### Required headline

`Jual produk bermerek Anda. Bukan file inti kami.`

#### Use a simple two-column card

**Anda boleh**

- Mengubah nama produk, visual identity, niche, copy, dan strategi penawaran.
- Menjual akses aplikasi ke customer, member komunitas, atau client.
- Menjadikannya bonus program, mentorship, atau client portal premium.

**Tidak termasuk lisensi standar**

- Menjual file/template inti.
- Mengirim file aplikasi inti ke customer sebagai produk mentah.
- Meneruskan hak white-label atau hak rebrand kepada pihak lain.
- Mengklaim hak kepemilikan atas framework inti.

#### Required links

- `Baca ringkasan lisensi`
- `Lihat ketentuan lengkap`

Use actual policy/terms routes only. Do not create dead links.

---

### 6.11 FAQ

Retain the current FAQ, then add the following only if answers are operationally accurate:

1. **Bagaimana produk ini diserahkan dan digunakan?**
2. **Apakah saya harus membeli seluruh katalog?**
3. **Apa yang perlu saya siapkan sebelum meluncurkan produk pertama?**
4. **Apakah saya boleh menjualnya ke client saya?**
5. **Apa yang tidak saya dapatkan dalam lisensi standar?**
6. **Apakah harga Rp149K–Rp799K adalah harga lisensi AppVibe?**

Recommended answer to question six:

`Bukan. Itu hanya contoh rentang harga jual yang dapat dipertimbangkan oleh partner untuk produk mereka ke end user. Harga lisensi AppVibe dibahas berdasarkan paket dan kebutuhan penggunaan.`

Only use that answer if pricing is genuinely handled through qualification rather than public checkout.

---

### 6.12 Final CTA and lead form

#### Final CTA copy

**Headline**

`Pilih niche Anda. Kami bantu Anda menentukan produk pertama yang paling layak diluncurkan.`

**Supporting copy**

`Tinggalkan detail singkat. Anda akan menerima informasi paket, batas lisensi, dan jalur yang paling sesuai dengan market Anda.`

**Primary CTA**

`Lihat opsi akses saya`

Do not use “Ambil akses awal” everywhere. Keep it only if there is genuine early-access availability. Otherwise use more concrete language.

#### Form fields

Keep it compact enough for cold traffic but rich enough to qualify follow-up.

Required:

- Nama lengkap
- Email
- Nomor WhatsApp
- Audiens utama / niche
- Model penggunaan yang paling dekat

Optional:

- Perkiraan jumlah audiens/klien
- Aplikasi atau pack yang diminati
- Catatan singkat tentang produk yang ingin diluncurkan

Hidden/system fields:

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `landing_page`
- `selected_pack`
- `selected_app`
- `cta_placement`
- `referrer`
- `submitted_at`

#### Form UX requirements

- Selected pack/app must prefill automatically if user arrived via selection CTA.
- Show inline validation, not alert popups.
- Disable submit only while sending.
- Show clear success state with next step; do not merely say “Terima kasih.”
- Example success text:

`Minat Anda sudah kami terima. Kami akan mengirim detail opsi yang relevan berdasarkan niche dan produk yang Anda pilih.`

- Preserve existing endpoint and anti-spam measures, or add a lightweight honeypot/rate limit only if compatible with the current stack.

---

## 7. Content configuration requirements

Create one source of truth for all pack/app metadata. The exact file path depends on the codebase, but the goal is mandatory.

### Suggested structure

```txt
src/
  data/
    vault-packs.ts
    vault-apps.ts
  components/
    PackSelector.*
    FirstProductRecommendation.*
    AppLauncher.*
    AppDetail.*
    LicenseClarity.*
    LeadForm.*  # historical; current repo uses checkout buyer-data capture
  lib/
    analytics.*
    utm.*
```

### App metadata contract

```ts
type VaultApp = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  iconLabel: string;
  packs: string[];
  exampleRebrandName: string;
  buyerTypes: string[];
  endUserOutcome: string;
  monetizationFormats: string[];
  proofAsset?: string;
};
```

### Benefits

- No duplicated application cards or inconsistent copy.
- Pack selector, launcher, detail drawer, and lead form remain synchronized.
- Future app additions require editing a data file rather than multiple page sections.

---

## 8. Analytics and attribution specification

### Rule

First inspect the existing analytics setup. Reuse existing GTM/GA4/Meta integration if present. Do not add duplicate tags or parallel pageview systems.

### Events

| Event name | Trigger | Required parameters |
|---|---|---|
| `vault_cta_click` | Any primary CTA click | `placement`, `cta_label` |
| `vault_demo_click` | Demo/catalog CTA click | `placement` |
| `vault_pack_selected` | Pack chosen | `pack_id`, `entry_point` |
| `vault_app_selected` | App icon/card chosen | `app_id`, `pack_context` |
| `vault_form_opened` | Form modal/section opened | `placement`, `selected_pack`, `selected_app` |
| `vault_lead_submit_attempt` | Submit pressed | `selected_pack`, `selected_app` |
| `vault_lead_submit_success` | Lead accepted | `selected_pack`, `selected_app`, `cta_placement` |
| `vault_lead_submit_error` | Lead fails | `error_type` only; do not send PII |

### Privacy rules

- Never send email, phone, name, or full free-text answers as analytics event parameters.
- Preserve consent mechanisms already in place.
- Store UTM values with the form submission, not as visible form clutter.

---

## 9. Mobile-first requirements

Most paid social traffic is likely to be mobile. Prioritize 360–430 px widths before desktop polish.

### Required checks

- No horizontal overflow at 320, 360, 375, 393, and 430 px widths.
- Hero primary CTA is full width or sufficiently prominent.
- Secondary CTA remains discoverable without competing visually with primary CTA.
- Pack cards are readable without requiring hover.
- Application launcher has clear selected state and no obscured app labels.
- Four-column launcher is permitted only if labels stay legible and tap targets stay at least 44 px; otherwise collapse gracefully.
- The dynamic app detail must appear immediately below the launcher, never behind sticky UI.
- Form inputs are at least 16 px font size to prevent iOS zoom.
- Any modal form must be scrollable, focus-trapped, escapable, and not hidden behind browser UI.
- Respect `prefers-reduced-motion`.

### Avoid

- Auto-rotating carousel.
- Tiny icon-only actions without labels.
- Sticky buttons covering the application launcher or form submit button.
- Hover-only explanations.
- Excessively large hero height that hides the next meaningful action on mobile.

---

## 10. Accessibility and quality requirements

- Use one logical H1 and ordered heading hierarchy.
- All interactive controls must be keyboard operable.
- App selector and pack selector need semantic buttons, not clickable `div`s.
- Selection states use `aria-pressed` or appropriate tab/radio semantics.
- Form fields must have visible labels and accessible error messages.
- Color must not be the only state signal.
- Images require meaningful alt text; decorative images use empty alt text.
- Ensure adequate contrast for small labels and muted text.
- Do not use text embedded in images as the sole carrier of critical information.

---

## 11. Performance requirements

- No new uncompressed hero video.
- Use static screenshots in WebP/AVIF where practical.
- Lazy-load below-the-fold proof assets.
- Avoid loading all 13 large app preview images at page load.
- Avoid adding large animation libraries or slider packages.
- Preserve or improve current mobile LCP; do not make the hero dependent on late-loading media.
- Confirm no console errors, hydration errors, layout shifts, or blocked submit state after deployment preview.

---

## 12. Implementation workflow for the agent

### Phase 0 — Discovery and baseline

1. Inspect the repository and identify:
   - framework/build tool;
   - page entry point;
   - existing components and style system;
   - form submission endpoint and validation;
   - analytics/tag manager setup;
   - current section IDs and navigation;
   - deployment workflow.
2. Capture desktop and mobile baseline screenshots.
3. Verify existing CTA behavior and submit behavior before changing anything.
4. Create a dedicated implementation branch.
5. Write a short `BASELINE.md` or implementation note with findings and explicit assumptions.

**Do not begin a visual rewrite before the baseline is understood.**

### Phase 1 — Data and content architecture

1. Centralize the 13 applications and four pack definitions.
2. Build the pack-to-app mapping.
3. Add app rebrand examples, buyer profiles, outcomes, and monetization formats to data.
4. Ensure the form can receive selected pack/app values.
5. Remove duplicated catalog rendering caused solely by loop/carousel behavior.

### Phase 2 — Page flow and copy

1. Update hero wording and CTAs.
2. Move/add the pack selector directly after hero.
3. Keep the pain section after the user-identification layer.
4. Add “Launch your first product” dynamic recommendation.
5. Keep how-it-works, but correct pricing-example labeling.
6. Place product proof before the full catalog.
7. Build the “What you receive” section with clear package-dependent wording.
8. Rename and simplify the license section.
9. Update FAQ and final CTA/form copy.

### Phase 3 — Interactions

1. Pack selection updates recommendation and form intent.
2. App selection updates detail below the launcher.
3. CTAs scroll/focus/open form correctly.
4. Build any modal/drawer with accessibility and mobile behavior.
5. Add state persistence for the current session only if simple and safe; do not introduce account/database requirements.

### Phase 4 — Historical lead capture / current checkout instrumentation

1. Preserve working checkout/order submission transport.
2. Add optional qualification fields only if the current checkout endpoint supports them; otherwise extend checkout/status/webhook safely.
3. Persist UTM/referrer/selection metadata.
4. Implement named events through the existing analytics layer.
5. Test success, validation, error, retry, and duplicate-submit behavior.

### Phase 5 — QA and release

1. Perform the acceptance tests in this document.
2. Run lint/typecheck/build/tests relevant to the repository.
3. Produce preview deployment.
4. Capture final desktop and mobile screenshots.
5. Provide a change report and test evidence.
6. Request final human approval before production deployment.

---

## 13. Acceptance criteria

### Message clarity

A new visitor can answer each question within one page pass:

- Is this for someone like me?
- Which product pack should I start with?
- What could I sell to my audience?
- What do I receive from AppVibe?
- Can I sell access to end users?
- What am I not allowed to resell?
- What happens after I submit the form?

### Interaction criteria

- Hero primary CTA takes user to pack selector.
- Every pack selects successfully and changes the first-product card.
- Pack choice pre-fills the lead form.
- Every app selection changes the detail content.
- Catalog does not auto-scroll or duplicate for loop effects.
- All form submit flows work and show a specific success message.
- UTM and pack/app metadata are attached to the submitted lead.

### Responsive criteria

- Tested at 320, 360, 375, 393, 430, 768, 1024, and 1440 px widths.
- No horizontal overflow.
- No clipped headers, CTA buttons, app labels, or form controls.
- Sticky UI never covers selected details or submit controls.
- Touch targets are appropriate for mobile.

### Technical criteria

- Production build succeeds.
- No new critical console errors.
- Existing form integration remains functional.
- Existing analytics pageview tracking is not duplicated.
- New interaction events fire exactly once per user action.
- No PII appears in analytics payloads.

---

## 14. Explicitly out of scope

Unless separately requested, do not implement in this landing-page optimization brief:

- PayCore server/payment-hub logic, which belongs in `D:\Coding\paycore`;
- login/authentication;
- customer portal;
- actual rebranding or deployment of the 13 applications;
- source-code packaging/delivery;
- legal rewrite beyond the visible summary and links;
- fabricated testimonials/case studies;
- a complete AppVibe brand redesign;
- unrelated SEO blog pages;
- back-office CRM changes beyond form-field compatibility.

---

## 15. Owner decisions that must remain configurable

The agent must not invent answers to these commercial details. Keep them as configuration or clearly report them as pending before final deploy.

| Decision | Default safe handling |
|---|---|
| Exact offer scope | Use “aplikasi yang tercakup dalam paket” |
| Public license price | Do not display a price unless supplied |
| Delivery method | Say “detail akses dan jalur implementasi” |
| Included onboarding/support | Do not promise it |
| Number of apps per package | Use pack-specific configuration |
| Availability / early access | Only use when real |
| Case studies/testimonials | Omit until evidence exists |

---

## 16. Required final delivery from the agent

The agent’s completion report must include:

1. Summary of changes by section.
2. Files created, changed, and removed.
3. Any commercial copy left configurable/pending.
4. Form and analytics event mapping.
5. Screenshots at mobile and desktop widths.
6. Test results: build, lint, typecheck, form submission, analytics events.
7. Preview deployment URL.
8. A concise list of risks or follow-up items before production launch.

The agent must not claim completion without evidence for form behavior, responsive QA, and build validation.

---

## 17. Final instruction to the implementation agent

Implement this as a focused conversion optimization release. Preserve the current AppVibe visual identity and core message that this is a product ecosystem—not a generic prompt bundle. Make the decision path clearer: **identify audience → choose pack → see first product → understand what is included and licensed → submit qualified interest**.

When a requirement conflicts with existing code or offer reality, choose the safer interpretation, retain existing working functionality, record the assumption, and do not fabricate commercial or legal claims.
