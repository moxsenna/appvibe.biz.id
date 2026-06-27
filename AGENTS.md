# Agent Instructions for appvibe.biz.id

This repository is for `appvibe.biz.id`.

## Project Identity

- `appvibe.biz.id` is the product sales site. It contains the landing page, product catalog/offer copy, legal pages, buyer access page, checkout page, and Cloudflare Pages Functions for checkout/status/webhook/admin.
- This repo sells AppVibe digital products such as the White-Label AI App Vault and related product packs.
- Do not treat this repo as the `appvibe.web.id` service-business website.

## Related Projects

- `appvibe.web.id` is a separate project in `D:\Coding\AppVibe v2`. That project focuses on jasa pembuatan landing page and aplikasi.
- PayCore is a separate payment hub in `D:\Coding\paycore`.
- Staging PayCore base URL: `https://pay-staging.appvibe.biz.id`.
- Production PayCore domain: `https://pay.appvibe.biz`.
- This repo integrates with PayCore through signed API calls and signed webhooks. Do not move PayCore server logic into this repo.

## Current Checkout Flow

- Buyer lands on `/` and chooses an offer.
- Buyer is sent to `/checkout/`.
- `/checkout/` renders the checkout UI and posts to `/api/checkout/create-order`.
- `/api/checkout/create-order` creates an order in PayCore and returns `checkout_url`.
- Buyer pays on the gateway page.
- PayCore sends signed events to `/api/webhooks/paycore`.
- Buyer returns to `PAYCORE_RETURN_URL`, which should point to `/checkout/` on `appvibe.biz.id` unless a real dedicated return page is added.
- `/api/checkout/status` polls local KV and can reconcile pending orders with PayCore.

## Documentation Rules

- Use `appvibe.biz.id` for this repository's public URL, canonical URL, checkout return URL, robots/sitemap URL, and examples.
- Mention `appvibe.web.id` only as a separate repo/project, never as this repository's domain.
- Do not document `/payment/return` as active unless that page is actually created and wired into `vite.config.js`.
- Do not document `/api/lead` as the current backend unless `functions/api/lead.js` exists again. Current checkout backend is under `/api/checkout/*` plus `/api/webhooks/paycore`.
- Keep product pricing and pack IDs aligned with `functions/lib/packs.js` and `src/scripts/data/vault-packs.js`.

## Safety Notes

- Never commit real secrets. `.env`, `.staging.vars`, and Cloudflare secret values must stay local or in Cloudflare dashboard.
- Admin access should be treated as sensitive. Avoid query-string tokens in new docs or examples.
- If changing checkout/payment behavior, verify both frontend build and Cloudflare Pages Functions behavior.
