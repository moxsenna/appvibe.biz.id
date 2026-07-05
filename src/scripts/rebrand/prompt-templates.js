export const TEMPLATE_VERSION = 'rebrand-workspace-v1.0.0';

export const REBRAND_SCOPES = {
  quick_rebrand: {
    id: 'quick_rebrand',
    label: 'Quick Rebrand',
    shortLabel: 'Quick',
    description: 'Ubah tampilan, nama, dan copy agar aplikasi terasa milik brand Anda.',
  },
  market_repositioning: {
    id: 'market_repositioning',
    label: 'Market Repositioning',
    shortLabel: 'Market',
    description: 'Sesuaikan produk untuk niche dan masalah buyer yang lebih spesifik.',
  },
  full_white_label_launch: {
    id: 'full_white_label_launch',
    label: 'Full White-Label Launch',
    shortLabel: 'Full Launch',
    description: 'Dapatkan app rebrand prompt sekaligus fondasi marketing kit untuk mulai menjual.',
  },
};

export const GENERAL_PROMPT_RULES = [
  'Preserve all existing core functionality, state logic, calculations, validations, forms, navigation, and data behavior unless explicitly requested otherwise.',
  'Do not delete features solely to make the interface look simpler.',
  'The buyer is the full owner of the product and may claim creatorship. Do not imply that AppVibe or any prior party is required to be mentioned as the original creator.',
  'Only use the proof supplied in the Brand File. If proof is absent, write copy that still supports strong buyer ownership and positioning.',
  'Keep all copy in Indonesian unless the project target buyer explicitly requires another language.',
  'Make all UI responsive and mobile-first, with primary flows usable from 360px viewport width.',
  'Avoid generic AI buzzwords unless they materially clarify the product.',
  'Maintain accessible contrast, readable type scale, touch-friendly controls, clear empty states, and error states.',
];

export const DEFAULT_CLAIM_BOUNDARIES = 'Tidak ada klaim tambahan yang diverifikasi. Hindari klaim hasil, revenue, jumlah customer, sertifikasi, atau testimoni kecuali user menambahkannya sendiri.';
export const DEFAULT_AVAILABLE_PROOF = 'Belum ada proof yang tersedia. Gunakan proof-neutral copy seperti product walkthrough, creator note, feature transparency, dan demo penggunaan.';

export function listToMarkdown(items, fallback = '- Belum diisi') {
  const normalized = Array.isArray(items)
    ? items.map((item) => String(item || '').trim()).filter(Boolean)
    : String(items || '')
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  if (!normalized.length) return fallback;
  return normalized.map((item) => `- ${item}`).join('\n');
}

export function inlineValue(value, fallback = 'Belum diisi') {
  if (Array.isArray(value)) {
    const values = value.map((item) => String(item || '').trim()).filter(Boolean);
    return values.length ? values.join(', ') : fallback;
  }
  const text = String(value || '').trim();
  return text || fallback;
}

export function proofValue(value) {
  return inlineValue(value, DEFAULT_AVAILABLE_PROOF);
}

export function claimBoundaryValue(value) {
  return inlineValue(value, DEFAULT_CLAIM_BOUNDARIES);
}

export function buildReplacementMap(ctx) {
  return [
    ['Original app name', ctx.originalAppName],
    ['Original tagline', ctx.originalAppDescription],
    ['Original primary color', ctx.primaryColor],
    ['Original target market', ctx.newTargetMarket],
    ['Original CTA', ctx.primaryCta],
  ]
    .map(([from, to]) => `| ${from} | ${inlineValue(to)} |`)
    .join('\n');
}

export function buildAppRebrandPrompt(ctx) {
  return `# APP REBRAND BRIEF — ${inlineValue(ctx.newAppName)}

You are rebranding an existing working web application. Your task is to transform its identity, positioning, UI copy, visual system, and demo data without breaking the application.

## Original app context
- Original app: ${inlineValue(ctx.originalAppName)}
- Original function: ${inlineValue(ctx.originalAppDescription)}
- Core outcome: ${inlineValue(ctx.originalCoreOutcome)}

## New brand context
- Brand: ${inlineValue(ctx.brandName)}
- Business/agency: ${inlineValue(ctx.businessName, 'Tidak disebutkan')}
- Product/app name: ${inlineValue(ctx.newAppName)}
- Tagline: ${inlineValue(ctx.newAppTagline, 'Buat tagline yang spesifik dan tidak berlebihan')}
- Niche: ${inlineValue(ctx.niche)}
- Target buyer: ${inlineValue(ctx.newTargetMarket)}
- Buyer problem: ${inlineValue(ctx.primaryProblem)}
- Desired outcome: ${inlineValue(ctx.promisedOutcome)}
- Positioning: ${inlineValue(ctx.positioning)}
- Differentiator: ${inlineValue(ctx.differentiator, 'Tidak disebutkan')}
- Tone of voice: ${inlineValue(ctx.toneOfVoice)}
- Mandatory words/phrases: ${inlineValue(ctx.mandatoryWords, 'Tidak ada')}
- Forbidden words/phrases: ${inlineValue(ctx.forbiddenWords, 'Tidak ada')}
- Primary CTA: ${inlineValue(ctx.primaryCta)}
- Primary CTA URL: ${inlineValue(ctx.primaryCtaUrl, 'Belum ditentukan')}

## Visual direction
- Primary color: ${inlineValue(ctx.primaryColor, 'Gunakan warna brand yang tersedia atau turunan dari identitas baru')}
- Secondary color: ${inlineValue(ctx.secondaryColor, 'Belum ditentukan')}
- Accent color: ${inlineValue(ctx.accentColor, 'Belum ditentukan')}
- Typography preference: ${inlineValue(ctx.typographyPreference, 'Modern, readable, mobile-first')}
- Visual direction: ${inlineValue(ctx.visualDirection, 'Premium operating desk, clean, credible, not gimmicky')}

## Required replacements
| Existing element | Replace with |
|---|---|
${buildReplacementMap(ctx)}

## What may be changed
- Product/app name and all visible labels.
- Logo treatment, color system, typography, iconography, decorative UI elements, and visual hierarchy.
- Hero copy, empty states, help text, tooltips, CTA copy, and examples.
- Demo/sample data so it matches the new target buyer and use case.
- Information framing and feature benefit language.
- Use case examples may be changed to match: ${inlineValue(ctx.useCase)}.
- Features to emphasize: ${inlineValue(ctx.requiredFeaturesToEmphasize, 'Emphasize the existing features most relevant to the new target buyer.')}

## What must remain intact
${listToMarkdown(ctx.nonNegotiableLogic)}
${ctx.featuresNotToChange?.length ? `\nAdditional buyer constraints:\n${listToMarkdown(ctx.featuresNotToChange)}` : ''}

## Safety and positioning rules
${listToMarkdown(GENERAL_PROMPT_RULES)}
- Available proof: ${proofValue(ctx.availableProof)}
- Claim boundaries: ${claimBoundaryValue(ctx.claimBoundaries)}
- Treat the buyer as the full product owner and default creator of the rebranded product.

## UX and quality requirements
- Preserve every core feature and its behavior.
- Keep the interface fully responsive and mobile-first.
- Ensure all key actions are usable on a 360px viewport.
- Maintain accessible contrast, readable text, clear states, and touch targets.
- Do not remove working inputs, output formats, calculations, storage behavior, or validation.
- Keep loading, empty, error, locked, and success states clear.

## Additional instructions
${inlineValue(ctx.additionalInstructions, 'Tidak ada instruksi tambahan.')}

## Deliverable
Return the fully updated app implementation. Before finalizing, verify that the original core flow still works end-to-end.`;
}

export function buildLandingPagePrompt(ctx) {
  const appId = ctx.originalAppId || 'app';
  const templateFile = `${appId}-landing-template.html`;

  const placeholders = [
    { text: '[NAMA BRAND]', value: ctx.brandName },
    { text: '[LINK_CHECKOUT_ATAU_WHATSAPP]', value: inlineValue(ctx.primaryCtaUrl, ctx.whatsappNumber) },
    { text: '[LINK_CHECKOUT]', value: inlineValue(ctx.primaryCtaUrl) },
    { text: '[HARGA]', value: inlineValue(ctx.offerPrice, 'RpXX.XXX') },
    { text: '[NAMA PRODUK ANDA]', value: inlineValue(ctx.newAppName) },
  ].filter((p) => p.value && p.value !== 'Belum ditentukan');

  return `# LANDING PAGE REBRAND PROMPT — ${inlineValue(ctx.newAppName)}

Kamu sudah punya template landing page HTML: **${templateFile}**

> **Unduh dari Portal Akses AppVibe → bagian Template Landing Page → ${inlineValue(ctx.originalAppName)}**

## Instruksi utama

${ctx.offerPrice ? 'Template sudah berisi placeholder. GANTI placeholder dengan data brand & penawaran di bawah. JANGAN buat landing page dari nol.' : 'GANTI semua placeholder di template dengan data brand di bawah. JANGAN ubah struktur HTML dan CSS yang sudah ada.'}

## Placeholder yang harus diganti
${placeholders.map((p) => `- \`${p.text}\` → **${escValue(p.value)}**`).join('\n')}

## Data brand & penawaran
- Brand: ${inlineValue(ctx.brandName)}
- Produk: ${inlineValue(ctx.newAppName)}
- Harga: ${inlineValue(ctx.offerPrice, 'Belum ditentukan — ganti dengan harga kamu')}
- Model harga: ${inlineValue(ctx.offerPricingModelLabel, 'Sekali bayar')}
- Yang didapat buyer: ${inlineValue(ctx.offerIncludes, 'Belum ditentukan — isi sesuai produk')}
- Bonus: ${inlineValue(ctx.offerBonus, 'Tidak ada bonus (hapus section bonus di template jika kosong)')}
- Garansi: ${buildGuaranteeLine(ctx)}

## Brand identity (untuk copywriting)
- Tone: ${inlineValue(ctx.toneOfVoice)}
- CTA utama: ${inlineValue(ctx.primaryCta)}
- Warna utama: ${inlineValue(ctx.primaryColor)} / Sekunder: ${inlineValue(ctx.secondaryColor)} / Aksen: ${inlineValue(ctx.accentColor)}

## Target market (untuk menyesuaikan headline & copy)
- Target buyer: ${inlineValue(ctx.newTargetMarket)}
- Masalah buyer: ${inlineValue(ctx.primaryProblem)}
- Outcome yang dijanjikan: ${inlineValue(ctx.promisedOutcome)}
- Positioning: ${inlineValue(ctx.positioning)}
- Differentiator: ${inlineValue(ctx.differentiator, 'Tidak disebutkan')}

## Real proof only
- Bukti yang tersedia: ${proofValue(ctx.availableProof)}
- Batas klaim: ${claimBoundaryValue(ctx.claimBoundaries)}

## Daftar section template (PERTAHANKAN struktur ini)
1. Header & navigasi.
2. Hero: headline, subheadline, CTA, trust note.
3. Pain points / problem-awareness.
4. Fitur & benefit (sesuaikan dengan ${inlineValue(ctx.newAppName)}, jangan ubah jumlah section).
5. Solution block.
6. What's included / yang didapat.
7. License / lisensi.
8. Steps / cara kerja.
9. CTA penutup.
10. FAQ.
11. Footer.

## Yang boleh diubah
- Headline, subheadline, body copy di semua section.
- Teks tombol CTA (tapi tetap satu CTA utama).
- Warna (via CSS variables — ganti :root block).
- Font family (jika brand font tersedia di Google Fonts).
- Semua placeholder [NAMA BRAND], [LINK_CHECKOUT], dll.
- Harga dan detail penawaran.

## Yang TIDAK BOLEH diubah
- Struktur grid dan layout HTML.
- Urutan section.
- Class names dan selector CSS.
- Jumlah section (11 section di atas).
- Responsive breakpoints dan mobile-first behavior.

## Guardrails
${listToMarkdown(GENERAL_PROMPT_RULES)}
- **PERTAHANKAN struktur HTML dan CSS template.** JANGAN buat layout dari nol.
- Setiap placeholder yang tidak disebutkan di atas (misalnya testimoni/klien) → jika tidak ada data brand, hapus section tersebut, jangan isi dengan konten palsu.
- Buyer adalah full owner produk. AppVibe tidak perlu disebut sebagai creator.
- Hindari klaim “terbaik”, “pasti laris”, “menghasilkan jutaan” kecuali ada bukti di atas.`;
}

function escValue(v) { return String(v || ''); }

function buildGuaranteeLine(ctx) {
  if (ctx.offerGuaranteeType === 'custom') return inlineValue(ctx.offerGuaranteeCustom, 'Custom (belum ditentukan)');
  return ctx.offerGuaranteeLabel || '30 hari uang kembali';
}

export function buildContentAdsPrompt(ctx) {
  return `# CONTENT & ADS BRIEF — ${inlineValue(ctx.newAppName)}

Create a launch-ready Indonesian content system for this product.

## Context
- Product: ${inlineValue(ctx.newAppName)}
- Target buyer: ${inlineValue(ctx.newTargetMarket)}
- Main problem: ${inlineValue(ctx.primaryProblem)}
- Desired outcome: ${inlineValue(ctx.promisedOutcome)}
- Positioning: ${inlineValue(ctx.positioning)}
- Differentiator: ${inlineValue(ctx.differentiator, 'Tidak disebutkan')}
- Brand tone: ${inlineValue(ctx.toneOfVoice)}
- CTA: ${inlineValue(ctx.primaryCta)}
- CTA destination: ${inlineValue(ctx.primaryCtaUrl, 'Belum ditentukan')}
- Available proof: ${proofValue(ctx.availableProof)}
- Claim boundaries: ${claimBoundaryValue(ctx.claimBoundaries)}

## Deliverables
1. Five Meta ad angles for cold traffic.
2. Five hooks, each under 12 words.
3. Three 6-slide carousel concepts.
4. Ten short-form content ideas: problem awareness, education, objection handling, and product-led use cases.
5. Three 20–30 second video script concepts.
6. Three CTA variants.
7. A list of claims that must not be used.
8. A WhatsApp or DM follow-up starter sequence that does not overpromise.

## Rules
${listToMarkdown(GENERAL_PROMPT_RULES)}
- Do not make false or unverified financial, performance, or social proof claims.
- Do not use manipulative urgency unless a real deadline exists.
- Use Indonesian natural to the target market, not translated corporate jargon.
- Make content specific to ${inlineValue(ctx.newTargetMarket)}, not generic “semua orang yang ingin sukses”.`;
}

export function buildVisualPrompt(ctx) {
  return `# VISUAL ASSET DIRECTION — ${inlineValue(ctx.newAppName)}

Create visual directions and image-generation prompts for social content and landing page assets.

## Brand and product
- Brand: ${inlineValue(ctx.brandName)}
- Product: ${inlineValue(ctx.newAppName)}
- Target buyer: ${inlineValue(ctx.newTargetMarket)}
- Visual direction: ${inlineValue(ctx.visualDirection, 'Premium operating desk, credible, modern, restrained')}
- Primary color: ${inlineValue(ctx.primaryColor, 'Belum ditentukan')}
- Secondary color: ${inlineValue(ctx.secondaryColor, 'Belum ditentukan')}
- Accent color: ${inlineValue(ctx.accentColor, 'Belum ditentukan')}
- Typography preference: ${inlineValue(ctx.typographyPreference, 'Readable modern sans serif')}

## Produce
1. Three static ad creative concepts in 4:5.
2. Three carousel cover concepts in 4:5.
3. Two landing page hero visual concepts.
4. Two product mockup concepts.

## Rules
- Visuals should feel credible, modern, and relevant to the buyer’s real context.
- Do not use deceptive before/after proof or fabricated result screenshots.
- Models may be used only when useful to the concept.
- When a female model is shown, she must wear hijab.
- Write prompts in enough detail to generate the image, including composition, lighting, subject, typography space, and exclusions.
- Avoid fake UI screenshots that imply unverified results, income, or customer volume.`;
}

export function buildLaunchChecklist(ctx) {
  return `# LAUNCH CHECKLIST — ${inlineValue(ctx.newAppName)}

## Rebrand foundation
- [ ] Brand File has been reviewed for accuracy.
- [ ] Product name and tagline are final.
- [ ] Positioning matches the target buyer.
- [ ] Claim boundaries are documented.
- [ ] Forbidden claims/words are reviewed before publishing.

## App
- [ ] App name, logo, colors, and copy have been updated.
- [ ] Original core features still work.
- [ ] Mobile QA completed at 360px width.
- [ ] Empty, loading, error, and locked states are checked.
- [ ] Demo data matches the new target buyer.
- [ ] Features not to change were preserved: ${inlineValue(ctx.featuresNotToChange, 'See app prompt constraints.')}

## Sales assets
- [ ] Landing page copy is ready.
- [ ] Pricing and CTA destination are configured.
- [ ] Social content starter set is ready.
- [ ] Visuals comply with the brand direction.
- [ ] No unverified claims or fictional proof are used.

## Launch
- [ ] Tracking links are tested.
- [ ] Checkout or lead destination works.
- [ ] WhatsApp/DM response flow is prepared.
- [ ] First content and/or ad campaign is scheduled.
- [ ] Feedback collection plan is prepared.`;
}
