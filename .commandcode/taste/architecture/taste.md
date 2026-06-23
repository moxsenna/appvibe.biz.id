# architecture
- Group CSS into broader files (landing.css, launcher.css, forms.css) instead of per-section files. Confidence: 0.75
- Keep total file count under 25 files for maintainability and consistency. Confidence: 0.70
- For anti-spam, use honeypot + Turnstile (backend-validated) + Cloudflare Rate Limiting Rule on /api/lead endpoint — not in-memory rate limiting in middleware. Confidence: 0.75
- Lead form must forward to operational destination (Google Sheets/Telegram/email/CRM) via Cloudflare env vars — no console.log placeholder for production. Confidence: 0.75
- Include mobile sticky CTA from V1 (appears after hero scroll, full-width, hides during modal). Confidence: 0.70
- Place _headers in public/ folder for Cloudflare Pages static asset rules. Confidence: 0.70
