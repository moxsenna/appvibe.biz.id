# PayCore Checkout Integration - appvibe.biz.id

## Project Boundaries

This document is for the `appvibe.biz.id` repository only.

- `appvibe.biz.id` is the product sales site: landing page, checkout, member access, admin settings, legal pages, and Cloudflare Pages Functions.
- `appvibe.web.id` is a different project in `D:\Coding\AppVibe v2`. It focuses on jasa pembuatan landing page and aplikasi.
- PayCore is a different project in `D:\Coding\paycore`. It is the shared payment hub for AppVibe projects.

Do not copy `appvibe.web.id` URLs or assumptions into this repo.

## PayCore Services

- Staging base URL: `https://pay-staging.appvibe.biz.id`
- Production domain: `https://pay.appvibe.biz.id`
- PayCore repo: `D:\Coding\paycore`

`appvibe.biz.id` is a PayCore client. It signs outgoing PayCore requests and verifies incoming PayCore events, but PayCore's core gateway, provider callback, order database, and payment orchestration live in the PayCore repo.

## Current Architecture

```text
Visitor on appvibe.biz.id
  -> chooses product/pack on /
  -> opens /checkout/
  -> submits name/email/phone/pack_id
  -> optional Turnstile verification and checkout rate limit
  -> POST /api/checkout/create-order
  -> Cloudflare Pages Function signs request
  -> POST PayCore /v1/orders
  -> PayCore returns checkout_url
  -> browser redirects to payment gateway
  -> payment provider callback reaches PayCore
  -> PayCore verifies payment
  -> PayCore posts signed event to /api/webhooks/paycore
  -> appvibe.biz.id verifies event signature
  -> D1 marks order paid + delivered and grants entitlement
  -> buyer returns to /checkout/
  -> /checkout/ polls /api/checkout/status
  -> buyer is redirected to /access/
  -> buyer requests WhatsApp magic link
  -> /access/ opens member area after one-time magic link login
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYCORE_BASE_URL` | Yes | PayCore API base URL. Use staging or production PayCore, not this site's domain. |
| `PAYCORE_APP_ID` | Yes | PayCore app identifier, currently `appvibe_vault`. |
| `PAYCORE_KEY_ID` | Yes | Key ID registered in PayCore. |
| `PAYCORE_APP_SECRET` | Yes | Secret used to sign outgoing PayCore API requests. Rotate together with PayCore. |
| `PAYCORE_WEBHOOK_SECRET` | Yes | Secret used to verify PayCore webhook events. Rotate together with PayCore. |
| `PAYCORE_RETURN_URL` | Yes | Buyer return URL after payment. Current default should be `https://appvibe.biz.id/checkout/`. |
| `FULFILLMENT_WEBHOOK_URL` | No | Optional downstream fulfillment/CRM webhook. |
| `LEAD_WEBHOOK_URL` | No | Optional spreadsheet/order forwarding webhook. |
| `TURNSTILE_SECRET_KEY` | Recommended | When set, `/api/checkout/create-order` requires a valid Turnstile token. |
| `VITE_TURNSTILE_SITE_KEY` | Recommended | Public Turnstile site key rendered on `/checkout/`. |
| `ADMIN_TOKEN` | Yes for admin | Token for `/admin/`. Treat as sensitive. |
| `FONNTE_TOKEN` | Yes for WhatsApp login | Fonnte API token used to send magic links. |
| `AUTH_TOKEN_PEPPER` | Yes | Pepper for hashing sessions, magic links, identities, and rate-limit keys. |
| `APP_BASE_URL` | Yes | Canonical public base URL, usually `https://appvibe.biz.id`. |
| `ACCESS_RESOURCE_URLS_JSON` | Fallback only | Server-side fallback app/resource URLs. Admin D1 app links override app URLs. |
| `APPVIBE_DB` | Yes | Cloudflare D1 binding for member access state. |

See `docs/secret-rotation.md` for rotation order.

## Internal Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/checkout/create-order` | Validate buyer/pack, optionally verify Turnstile and rate limits, create PayCore order, persist local D1 order, return `checkout_url`. |
| `GET` | `/api/checkout/status?order_id=xxx` | Return local checkout status and reconcile pending orders with PayCore when possible. |
| `POST` | `/api/webhooks/paycore` | Receive signed PayCore events, mark order paid/delivered, activate member, and grant entitlement. |
| `POST` | `/api/auth/request-magic-link` | Send WhatsApp magic link only for members with active entitlement. |
| `GET` | `/api/auth/consume-magic-link` | Consume one-time magic link and set member session cookie. |
| `GET` | `/api/member/me` | Return current member access for a valid session. |
| `GET` | `/api/member/launch?app_id=xxx` | Validate entitlement and redirect to the configured app URL. |
| `GET` | `/api/member/resource?bundle_id=xxx&type=xxx` | Validate entitlement and redirect to bundle resource URL. |
| `GET` | `/api/admin/orders` | Admin order listing. Requires admin auth. |
| `GET/PUT` | `/api/admin/app-links` | Admin settings for member-area app launch URLs. |

## PayCore API Used By This Repo

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/orders` | Create payment order. Request must be HMAC signed. |
| `GET` | `/v1/orders/:order_id` | Reconcile pending local order status. Request must be HMAC signed. |

## Pages

| Path | Purpose |
|------|---------|
| `/` | Product landing page for AppVibe digital products. |
| `/checkout/` | Dedicated checkout page and payment return handler. |
| `/access/` | Member access and magic-link login. |
| `/admin/` | Internal order panel and app-link settings. |
| `/terms/`, `/privacy/`, `/license/` | Legal pages. |

There is no active `/payment/return` page in this repo. Do not document or configure `/payment/return` unless a real page is added and included in `vite.config.js`.

## Product Data

- Single pack price is currently `Rp97.000`.
- Full Vault price is currently `Rp147.000`.
- Product keys, prices, currency, entitlement resource type, and app IDs are canonical in `functions/lib/packs.js`.
- Frontend presentation data in `src/scripts/data/vault-packs.js` derives those critical checkout fields from `functions/lib/packs.js`.

## Checkout Detail

### 1. Checkout Page

- `/checkout/` renders the checkout UI.
- Query examples:
  - `/checkout/?plan=full-vault`
  - `/checkout/?plan=single-pack&pack=advertiser`
  - `/checkout/?order_id=PAYCORE_ORDER_ID`
- The checkout form posts `{ name, email, phone, pack_id, turnstile_token, utm_* }` to `/api/checkout/create-order`.

### 2. Create Order

`POST /api/checkout/create-order`

- Validates `pack_id`, `name`, `email`, and Indonesian WhatsApp number.
- Verifies Turnstile when `TURNSTILE_SECRET_KEY` is configured.
- Rate-limits checkout attempts when `AUTH_TOKEN_PEPPER` is configured.
- Creates or finds a D1 member by canonical phone.
- Builds an order payload for PayCore.
- Signs the request with `PAYCORE_APP_SECRET`.
- Sends `POST {PAYCORE_BASE_URL}/v1/orders`.
- Stores the pending order in D1 linked to the member.
- Optionally forwards the lead/order to `LEAD_WEBHOOK_URL`.
- Returns `checkout_url` to the frontend.

### 3. Payment Return

- PayCore/payment gateway returns the buyer to `PAYCORE_RETURN_URL`.
- Current intended return URL: `https://appvibe.biz.id/checkout/`.
- The checkout page detects `order_id` in the query string and polls `/api/checkout/status`.
- The return page must not grant final access by itself. Final fulfillment comes from signed PayCore webhook events.
- Redirect to `/access/?from=payment` happens only after D1 fulfillment is delivered.

### 4. Webhook Fulfillment

PayCore posts `POST /api/webhooks/paycore` with:

- `X-PayCore-Event-Timestamp`
- `X-PayCore-Event-Signature: sha256=<hex>`
- JSON body containing `event_id`, `event_type`, `data.order_id`, `data.fulfillment_data`, and payment fields.

Handler responsibilities:

1. Verify HMAC signature.
2. Reject replay attempts via timestamp skew.
3. Enforce event idempotency with D1 `payment_events`.
4. Avoid duplicate fulfillment for already delivered orders.
5. Update D1 order state to paid/delivered.
6. Grant/confirm active entitlement and activate the member.
7. Record audit logs.
8. Optionally forward fulfillment data to downstream webhook.

## D1 Tables

```text
members         -> buyer identity, status, current access summary
orders          -> PayCore/local order state
payment_events  -> webhook idempotency
entitlements    -> active bundle/vault access grants
magic_links     -> one-time login links
sessions        -> member browser sessions
audit_logs      -> fulfillment and auth audit trail
rate_limits     -> hashed rate-limit buckets
app_links       -> admin-configured launch URLs
```

Raw tokens are never stored; sessions and magic links store hashes.

## Test Flow

1. Open `https://appvibe.biz.id/` or local dev.
2. Choose a product/pack.
3. Continue to `/checkout/`.
4. Fill buyer data and complete Turnstile when enabled.
5. Submit checkout.
6. Confirm PayCore order creation and browser redirect to `checkout_url`.
7. Complete payment in staging/sandbox.
8. Confirm PayCore posts to `/api/webhooks/paycore`.
9. Confirm D1 `orders` has `payment_status = paid` and `fulfillment_status = delivered`.
10. Confirm D1 has active entitlement for the member.
11. Return to `/checkout/?order_id=...` and confirm polling redirects to `/access/`.
12. Request magic link by WhatsApp and confirm member area opens.

## Troubleshooting

- `503 payments_not_configured`: `PAYCORE_KEY_ID` or `PAYCORE_APP_SECRET` is missing.
- `401 invalid_signature` on webhook: `PAYCORE_WEBHOOK_SECRET` does not match PayCore.
- Buyer returns to 404: `PAYCORE_RETURN_URL` likely points to a page that does not exist, such as old `/payment/return`.
- `403 turnstile_failed`: `TURNSTILE_SECRET_KEY` is configured but checkout did not send a valid Turnstile token.
- `429 rate_limited`: checkout attempts exceeded the phone/IP bucket. Wait and retry.
- Status remains pending: check PayCore order status, D1 `orders`, D1 `payment_events`, and webhook logs.
- Member login does not send WhatsApp: confirm D1 entitlement is active before debugging Fonnte.
