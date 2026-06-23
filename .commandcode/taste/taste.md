# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# architecture
See [architecture/taste.md](architecture/taste.md)
# data
- Use a single source of truth for structured data (apps, packs, products); do not duplicate the same data in separate files — re-export or import from the canonical source instead. Confidence: 0.75

# analytics
- When adding custom analytics events (vault_*), preserve existing standard platform conversion events (Meta Pixel Lead, GA4 generate_lead) that dashboards and ad platforms depend on. Confidence: 0.72
- Centralize tracking calls in a single helper function rather than sprinkling analytics calls across multiple component files. Confidence: 0.72
- Avoid double-counting tracking events: when GTM + direct script calls coexist, choose one path (dataLayer.push via GTM dispatches to Meta/GA4, OR direct fbq/gtag calls) — one submit success = one Meta Lead + one GA4 generate_lead, no duplicates. Confidence: 0.70

# form-state
- Do NOT pre-fill user selection state (e.g., selected_pack, selected_app) with a default value; keep selections null until the user actively chooses, to avoid sending misleading lead data. Confidence: 0.75
- Use separate state fields for "display default" (for visual recommendation) vs "user selection" (for form data) — never conflate the two. Confidence: 0.70

# performance
- Use concrete mobile performance targets: no overflow at 320px, hero CTA visible without long scroll, 16px form inputs, 4-column app launcher, no iframes or fake mockups. Confidence: 0.70
- When auditing layout, check ALL responsive breakpoints (mobile, tablet, desktop) — not just desktop viewport. Confidence: 0.65

