# Rebrand Workspace

Rebrand Workspace is the private buyer workspace for turning entitled AppVibe Vault apps into buyer-branded digital products.

## Route

- Public path: `/access/rebrand/`
- Vite entry: `access/rebrand/index.html`
- The page is marked `noindex,nofollow` and fetches `/api/member/me` before rendering private workspace data.

## Entitlement source

The workspace uses the same source as the existing buyer access portal:

- Session/member data: `functions/api/member/me.js`
- Entitlement engine: `functions/lib/entitlements.js`
- Canonical pack/app mapping: `functions/lib/packs.js`
- App launch/resource URLs are not exposed in this workspace.

The UI renders all 13 registry apps with access state. Locked apps cannot be selected and cannot generate app-level prompt content.

## Persistence behavior

V1 uses browser-local persistence because this repository does not yet have a private workspace table/storage pattern.

- Brand File key: `appvibe:rebrand:brand-file:{workspace_key}`
- Project key: `appvibe:rebrand:project:{workspace_key}`
- Generated pack key: `appvibe:rebrand:generated-pack:{workspace_key}`

`workspace_key` is returned by `/api/member/me` and is only used as a localStorage namespace. No Brand File text, WhatsApp numbers, proof notes, or other private buyer inputs are sent to analytics.

## Registry and templates

- Registry: `src/scripts/rebrand/app-registry.js`
- Prompt templates: `src/scripts/rebrand/prompt-templates.js`
- Pure generator: `src/scripts/rebrand/generate-rebrand-pack.js`
- Browser workspace: `src/scripts/rebrand/workspace.js`
- Storage helpers: `src/scripts/rebrand/storage.js`
- Copy/download helpers: `src/scripts/rebrand/download-markdown.js`

The generator is deterministic. It does not call Gemini, OpenAI, Claude, image generation APIs, or other AI APIs.

## Prompt scopes

- Quick Rebrand: App Rebrand Prompt only.
- Market Repositioning: App Rebrand Prompt + Landing Page & Offer Prompt.
- Full White-Label Launch: App Rebrand Prompt, Landing Page & Offer Prompt, Content & Ads Prompt, Visual Asset Prompt, Launch Checklist, and Markdown handover pack.

All generated prompts include rules to preserve core app functionality, avoid fake proof, respect claim boundaries, keep Indonesian copy unless intentionally changed, and maintain mobile-first responsive UX.

## Local QA mock mode

For local visual QA in Vite dev mode, the page supports explicit mock-mode query parameters:

- `/access/rebrand/?qa=mock`
- `/access/rebrand/?qa=mock-full`
- `/access/rebrand/?qa=mock-partial`

Behavior:
- Only active in development (`import.meta.env.DEV`).
- Still tries `/api/member/me` first.
- If the request fails in local dev and one of the query params above is present, the page falls back to frontend mock buyer data.
- Production behavior is unchanged.


Focused generator tests live in `tests/rebrand-pack.test.mjs`.

Run:

```bash
npm run test:rebrand
```

Run all Node tests:

```bash
npm test
```

## V1 limitations

- Drafts are stored in the current browser only and do not sync across devices.
- There is no saved pack library or server-side project history yet.
- The workspace does not automatically modify buyer apps; it produces copy-ready prompts and a Markdown handover pack.
