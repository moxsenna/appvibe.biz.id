# AppVibe checkout redesign — replacement files

> Repo boundary: these files target `appvibe.biz.id`, the product sales and checkout repo. Do not apply them to `appvibe.web.id`; that is a separate service-business project in `D:\Coding\AppVibe v2`.

This bundle contains full replacements for three files in `moxsenna/appvibe.biz.id`:

- `checkout/index.html`
- `src/scripts/checkout-ui.js`
- `src/styles/checkout.css`

## What this changes

1. Rebuilds the bare checkout into a two-column desktop checkout with a sticky, value-led order summary.
2. Creates a mobile-first stack: order summary appears before the form instead of leaving the visitor with an isolated form.
3. Makes all CSS selectors match the HTML emitted by `checkout-ui.js`; the existing version styles obsolete selectors while the runtime generates different class names.
4. Shows the concrete offer: app count, app list, license rights, marketing-kit inclusion, and the Full Vault upgrade rationale.
5. Keeps the existing PayCore/Duitku backend contract unchanged:
   `POST /api/checkout/create-order` with `{ name, email, phone, pack_id }`, followed by the existing order-status polling flow.
6. Restores direct checkout-page tracking initialization and replaces the inactive `window.fireStandardConversions.checkout?.()` / `.purchase?.()` calls with guarded standard `InitiateCheckout` and `Purchase` events.

## Before deploy

Run:

```bash
npm run build
```

Then test these URLs locally and in staging:

```text
/checkout/?plan=full-vault&ref=pricing_section
/checkout/?plan=single-pack&pack=advertiser
/checkout/
/checkout/?order_id=YOUR_TEST_ORDER
```

## Important analytics note

The current repository’s landing page contains placeholder Meta Pixel, Google Tag Manager, and GA4 identifiers. The replacement checkout UI emits browser events only when those platform scripts (or GTM) are actually installed with real production IDs.
