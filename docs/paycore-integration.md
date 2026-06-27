# PayCore Checkout Integration - appvibe.biz.id

## Project Boundaries

This document is for the `appvibe.biz.id` repository only.

- `appvibe.biz.id` is the product sales site: landing page, product offers, checkout, access lookup, legal pages, and Cloudflare Pages Functions.
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
  -> POST /api/checkout/create-order
  -> Cloudflare Pages Function signs request
  -> POST PayCore /v1/orders
  -> PayCore returns checkout_url
  -> browser redirects to payment gateway
  -> payment provider callback reaches PayCore
  -> PayCore verifies payment
  -> PayCore posts signed event to /api/webhooks/paycore
  -> appvibe.biz.id verifies event signature
  -> CHECKOUT_EVENTS KV stores order/event/access state
  -> buyer returns to PAYCORE_RETURN_URL
  -> /checkout/ polls /api/checkout/status
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYCORE_BASE_URL` | Yes | PayCore API base URL. Use staging or production PayCore, not this site's domain. |
| `PAYCORE_APP_ID` | Yes | PayCore app identifier, currently `appvibe_vault`. |
| `PAYCORE_KEY_ID` | Yes | Key ID registered in PayCore. |
| `PAYCORE_APP_SECRET` | Yes | Secret used to sign outgoing PayCore API requests. |
| `PAYCORE_WEBHOOK_SECRET` | Yes | Secret used to verify PayCore webhook events. |
| `PAYCORE_RETURN_URL` | Yes | Buyer return URL after payment. Current default should be `https://appvibe.biz.id/checkout/`. |
| `FULFILLMENT_WEBHOOK_URL` | No | Optional downstream fulfillment/CRM/email webhook. |
| `LEAD_WEBHOOK_URL` | No | Legacy/ops webhook. Current code may also use it for spreadsheet/order forwarding. |
| `ADMIN_TOKEN` | Yes for admin | Token for `/admin/` order panel. Treat as sensitive. |
| `TURNSTILE_SECRET_KEY` | Optional/currently not enforced | Reserved for anti-spam if Turnstile is wired into checkout. |
| `CHECKOUT_EVENTS` | Yes | Cloudflare KV namespace binding for local order/event/access state. |

## Internal Endpoints In This Repo

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/checkout/create-order` | Validate buyer/pack, create PayCore order, persist initial local KV record, return `checkout_url`. |
| `GET` | `/api/checkout/status?order_id=xxx` | Return local checkout status and reconcile pending orders with PayCore when possible. |
| `POST` | `/api/webhooks/paycore` | Receive signed PayCore events and mark paid/delivered state. |
| `GET` | `/api/access?email=xxx` | Buyer access lookup. Needs stronger auth before production hardening. |
| `GET` | `/api/admin/orders` | Admin order listing. Requires admin auth. |

## PayCore API Used By This Repo

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/orders` | Create payment order. Request must be HMAC signed. |
| `GET` | `/v1/orders/:order_id` | Reconcile pending local order status. Request must be HMAC signed. |

## Pages In This Repo

| Path | Purpose |
|------|---------|
| `/` | Product landing page for AppVibe digital products. |
| `/checkout/` | Dedicated checkout page and payment return handler. |
| `/access/` | Buyer access/status lookup. |
| `/admin/` | Internal order panel. |
| `/terms/`, `/privacy/`, `/license/` | Legal pages. |

There is no active `/payment/return` page in this repo. Do not document or configure `/payment/return` unless a real page is added and included in `vite.config.js`.

## Checkout Detail

### 1. Offer Selection

- Landing page displays public offers and pack choices.
- Single pack price is currently `Rp97.000`.
- Full Vault price is currently `Rp147.000`.
- Product/pack definitions must stay aligned between:
  - `functions/lib/packs.js`
  - `src/scripts/data/vault-packs.js`

### 2. Checkout Page

- `/checkout/` renders the checkout UI.
- Query examples:
  - `/checkout/?plan=full-vault`
  - `/checkout/?plan=single-pack&pack=advertiser`
  - `/checkout/?order_id=PAYCORE_ORDER_ID`
- The checkout form posts `{ name, email, phone, pack_id }` to `/api/checkout/create-order`.

### 3. Create Order

`POST /api/checkout/create-order`

- Validates `pack_id`, `name`, and `email`.
- Builds an order payload for PayCore.
- Signs the request with `PAYCORE_APP_SECRET`.
- Sends `POST {PAYCORE_BASE_URL}/v1/orders`.
- Stores best-effort local KV records:
  - `order:{paycore_order_id}`
  - `ext:{external_order_id}`
  - `buyer:{email}`
- Returns `checkout_url` to the frontend.

### 4. Payment Return

- PayCore/payment gateway returns the buyer to `PAYCORE_RETURN_URL`.
- Current intended return URL: `https://appvibe.biz.id/checkout/`.
- The checkout page detects `order_id` in the query string and polls `/api/checkout/status`.
- The return page must not grant final access by itself. Final fulfillment comes from signed PayCore webhook events.

### 5. Webhook Fulfillment

PayCore posts `POST /api/webhooks/paycore` with:

- `X-PayCore-Event-Timestamp`
- `X-PayCore-Event-Signature: sha256=<hex>`
- JSON body containing `event_id`, `event_type`, `data.order_id`, `data.fulfillment_data`, and payment fields.

Handler responsibilities:

1. Verify HMAC signature.
2. Reject replay attempts via timestamp skew.
3. Enforce event idempotency with `evt:{event_id}`.
4. Avoid duplicate fulfillment for already delivered orders.
5. Update local KV order state to paid/delivered.
6. Record fulfillment/audit keys.
7. Optionally forward fulfillment data to downstream webhook.

## KV Structure

```text
order:{paycore_order_id} -> local order record
ext:{external_order_id}  -> paycore_order_id
buyer:{email}            -> latest paycore_order_id for buyer email
fulfilled:{email}        -> latest fulfilled access record
evt:{event_id}           -> webhook idempotency/audit record
audit:{order_id}         -> webhook/order audit trail
```

Email keys should be normalized consistently before write and read.

## Test Flow

1. Open `https://appvibe.biz.id/` or local dev.
2. Choose a product/pack.
3. Continue to `/checkout/`.
4. Fill buyer data.
5. Submit checkout.
6. Confirm PayCore order creation and browser redirect to `checkout_url`.
7. Complete payment in staging/sandbox.
8. Confirm PayCore posts to `/api/webhooks/paycore`.
9. Confirm local KV `order:{order_id}` has `payment_status = paid` and `fulfillment_status = delivered`.
10. Return to `/checkout/?order_id=...` and confirm polling shows the correct status.

## Troubleshooting

- `503 payments_not_configured`: `PAYCORE_KEY_ID` or `PAYCORE_APP_SECRET` is missing.
- `401 invalid_signature` on webhook: `PAYCORE_WEBHOOK_SECRET` does not match PayCore.
- Buyer returns to 404: `PAYCORE_RETURN_URL` likely points to a page that does not exist, such as old `/payment/return`.
- Status remains pending: check PayCore order status, local KV `order:{order_id}`, and webhook logs.
- Access lookup fails for a paid buyer: check email normalization and `fulfilled:{email}` / `buyer:{email}` keys.
