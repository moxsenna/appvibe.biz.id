# appvibe.biz.id

`appvibe.biz.id` is the AppVibe product sales site. This repo contains the landing page, offer/pricing sections, checkout page, buyer access page, legal pages, and Cloudflare Pages Functions used to sell AppVibe digital products.

## What This Repo Is

- Public domain: `https://appvibe.biz.id`
- Main experience: product landing page and checkout for AppVibe digital products
- Checkout entry: `/checkout/`
- Buyer access lookup: `/access/`
- Runtime: Vite static site on Cloudflare Pages with Pages Functions

## What This Repo Is Not

- It is not `appvibe.web.id`. That is a separate project in `D:\Coding\AppVibe v2` focused on jasa pembuatan landing page and aplikasi.
- It is not PayCore. PayCore is the shared payment hub in `D:\Coding\paycore`.

## Related Payment Service

All AppVibe projects should connect to the shared PayCore service instead of implementing payment gateway logic independently.

- Staging PayCore: `https://pay-staging.appvibe.biz.id`
- Production PayCore: `https://pay.appvibe.biz.id`
- PayCore repo: `D:\Coding\paycore`

This repo signs outgoing PayCore API requests and verifies incoming PayCore webhooks, but PayCore itself remains a separate repository/service.

## Current Checkout Flow

1. Visitor chooses a product/pack on `/`.
2. Visitor continues to `/checkout/`.
3. Checkout page posts buyer data to `/api/checkout/create-order`.
4. The Cloudflare Function signs and sends `POST /v1/orders` to PayCore.
5. PayCore returns `checkout_url`; the browser redirects there for payment.
6. PayCore sends signed payment events to `/api/webhooks/paycore`.
7. The local KV namespace `CHECKOUT_EVENTS` stores order/event/access status.
8. The checkout page polls `/api/checkout/status?order_id=...` after return.

`PAYCORE_RETURN_URL` should point to `https://appvibe.biz.id/checkout/` unless a real dedicated return page is added to the app.

## Key Files

- `index.html` - main product landing page
- `checkout/index.html` - checkout shell
- `src/scripts/checkout-ui.js` - checkout UI/state rendering
- `functions/api/checkout/create-order.js` - creates PayCore order
- `functions/api/checkout/status.js` - checks/reconciles checkout status
- `functions/api/webhooks/paycore.js` - signed PayCore webhook receiver
- `functions/lib/packs.js` - backend pack/product definitions
- `src/scripts/data/vault-packs.js` - frontend pack/product definitions

## Development

```bash
npm install
npm run dev
npm run build
```

Do not commit real environment secrets. Use `.env.example` and `.staging.vars.example` only as templates.
