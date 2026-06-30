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
  return `# LANDING PAGE & OFFER BRIEF — ${inlineValue(ctx.newAppName)}

Create a conversion-focused Indonesian landing page for the product below.

## Product
- Product name: ${inlineValue(ctx.newAppName)}
- Category: ${inlineValue(ctx.productCategory, ctx.originalAppCategory)}
- Original app foundation: ${inlineValue(ctx.originalAppName)} — ${inlineValue(ctx.originalAppDescription)}
- Target buyer: ${inlineValue(ctx.newTargetMarket)}
- Buyer problem: ${inlineValue(ctx.primaryProblem)}
- Desired outcome: ${inlineValue(ctx.promisedOutcome)}
- Positioning: ${inlineValue(ctx.positioning)}
- Differentiator: ${inlineValue(ctx.differentiator, 'Tidak disebutkan')}
- Primary use case: ${inlineValue(ctx.useCase)}

## Brand
- Brand name: ${inlineValue(ctx.brandName)}
- Tone: ${inlineValue(ctx.toneOfVoice)}
- Primary CTA: ${inlineValue(ctx.primaryCta)}
- CTA URL: ${inlineValue(ctx.primaryCtaUrl, 'Belum ditentukan')}
- Website: ${inlineValue(ctx.websiteUrl, 'Belum ditentukan')}
- Instagram: ${inlineValue(ctx.instagramHandle, 'Belum ditentukan')}
- WhatsApp: ${inlineValue(ctx.whatsappNumber, 'Belum ditentukan')}

## Real proof only
- Available proof: ${proofValue(ctx.availableProof)}
- Claim boundaries: ${claimBoundaryValue(ctx.claimBoundaries)}

## Requirements
Create:
1. Hero headline, subheadline, CTA, and trust note.
2. Problem-awareness section.
3. How the product works section.
4. Feature-to-benefit section that keeps the original app capabilities intact.
5. Use case section for ${inlineValue(ctx.newTargetMarket)}.
6. Honest proof section: use supplied proof only; if unavailable, use a proof-neutral format such as product walkthrough, creator note, or feature transparency.
7. FAQ that handles reasonable objections without inventing claims.
8. Closing CTA.

## Guardrails
${listToMarkdown(GENERAL_PROMPT_RULES)}
- Avoid generic claims such as “terbaik”, “pasti laris”, or “menghasilkan jutaan” unless the supplied proof explicitly supports them.
- Treat the buyer as the full owner and creator of the rebranded product. AppVibe attribution is not required.`;
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
