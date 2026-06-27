# Secret Rotation Runbook - appvibe.biz.id

This repo previously had `.staging.vars` tracked. Treat any real value that was ever committed there as exposed.

## Rotate In This Order

1. `ADMIN_TOKEN`
   - Generate a new random token.
   - Set it in Cloudflare Pages for `appvibe-biz-id`.
   - Share it only through a password manager or another private channel.

2. `PAYCORE_APP_SECRET`
   - Generate a new shared secret.
   - Update the PayCore app/client record for `appvibe_vault` in `D:\Coding\paycore`.
   - Set the same value in Cloudflare Pages for `appvibe-biz-id`.
   - Test `/api/checkout/create-order` after both sides match.

3. `PAYCORE_WEBHOOK_SECRET`
   - Generate a new webhook signing secret.
   - Update PayCore's AppVibe fulfillment/webhook config.
   - Set the same value in Cloudflare Pages for `appvibe-biz-id`.
   - Trigger one sandbox paid order and confirm `/api/webhooks/paycore` accepts it.

4. Other secrets if they were present in the tracked file:
   - `PAYCORE_KEY_ID`
   - `FONNTE_TOKEN`
   - `AUTH_TOKEN_PEPPER`
   - `TURNSTILE_SECRET_KEY`
   - webhook URLs that contain private tokens

## Commands

Use Cloudflare's secure prompts. Do not pass secret values as command arguments.

```powershell
npx wrangler pages secret put ADMIN_TOKEN --project-name appvibe-biz-id
npx wrangler pages secret put PAYCORE_APP_SECRET --project-name appvibe-biz-id
npx wrangler pages secret put PAYCORE_WEBHOOK_SECRET --project-name appvibe-biz-id
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name appvibe-biz-id
```

Frontend Turnstile site key is public. Set `VITE_TURNSTILE_SITE_KEY` as a Cloudflare Pages build environment variable, not as a secret, then rebuild/deploy the site.

## Verification

- Admin login works with the new `ADMIN_TOKEN`.
- Checkout creates a PayCore order.
- PayCore callback fulfills the order.
- Member entitlement becomes active.
- Magic link login still works.
