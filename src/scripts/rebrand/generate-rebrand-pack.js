import { getAppRegistryItem, getCategoryLabel } from './app-registry.js';
import { mergeDerivedContext, resolveToneOfVoice } from './brand-derive.js';
import {
  REBRAND_SCOPES,
  TEMPLATE_VERSION,
  buildAppRebrandPrompt,
  buildContentAdsPrompt,
  buildLandingPagePrompt,
  buildLaunchChecklist,
  buildVisualPrompt,
  claimBoundaryValue,
  inlineValue,
  proofValue,
} from './prompt-templates.js';

export { REBRAND_SCOPES };

export const REQUIRED_BRAND_FIELDS = [
  'brandName',
  'targetMarket',
  'primaryCta',
];

export const REQUIRED_PROJECT_FIELDS = [
  'appId',
  'newAppName',
];

export const TONE_OPTIONS = [
  'Professional',
  'Friendly',
  'Direct',
  'Premium',
  'Playful',
  'Educational',
  'Bold',
  'Warm',
  'Minimal',
  'Technical',
];

export const OFFER_PRICING_MODELS = {
  sekali_bayar: 'Sekali bayar',
  berlangganan: 'Berlangganan',
  tiered: 'Tiered (beberapa paket)',
};

export const OFFER_GUARANTEE_TYPES = {
  '30_hari': '30 hari uang kembali',
  '7_hari': '7 hari uang kembali',
  kepuasan: 'Garansi kepuasan',
  tanpa: 'Tanpa garansi',
  custom: 'Custom',
};

/**
 * Normalize v1 brand file fields to v2.
 * - targetBuyer → targetMarket
 * - toneOfVoice array → tonePreset (best match) + preserve array
 */
export function normalizeBrandFile(raw) {
  if (!raw) return raw;
  const b = { ...raw };

  // Migrate targetBuyer → targetMarket
  if (!b.targetMarket?.trim() && b.targetBuyer?.trim()) {
    b.targetMarket = b.targetBuyer;
  }
  delete b.targetBuyer; // clean up old key

  // Infer tonePreset from toneOfVoice if missing
  if (!b.tonePreset && Array.isArray(b.toneOfVoice) && b.toneOfVoice.length) {
    b.tonePreset = inferTonePreset(b.toneOfVoice);
  }
  if (!b.tonePreset) {
    b.tonePreset = 'warm';
  }

  return b;
}

/**
 * Best-guess tone preset from a list of tone strings.
 */
export function inferTonePreset(tones = []) {
  const set = new Set(tones.map((t) => t?.toLowerCase()));
  if (set.has('premium') || set.has('minimal')) return 'premium';
  if (set.has('bold') || set.has('playful')) return 'bold';
  if (set.has('professional') || set.has('direct') || set.has('technical')) return 'professional';
  if (set.has('friendly') || set.has('warm') || set.has('educational')) return 'warm';
  if (set.size > 0) return 'custom';
  return 'warm';
}

export function createDefaultBrandFile(ownerId = 'local') {
  const ts = new Date().toISOString();
  return {
    id: cryptoSafeId('brand'),
    ownerId,
    brandName: '',
    businessName: '',
    tagline: '',
    niche: '',
    productCategory: '',
    targetMarket: '',
    targetBuyer: '',   // kept for v1 backward compat — normalizeBrandFile migrates this
    buyerProblem: '',
    buyerDesiredOutcome: '',
    positioning: '',
    differentiator: '',
    tonePreset: 'warm',
    toneOfVoice: ['Friendly', 'Warm', 'Educational'],
    toneCustom: [],
    mandatoryWords: '',
    forbiddenWords: 'pasti laris, auto kaya, dijamin omzet, testimoni palsu',
    primaryCta: '',
    primaryCtaUrl: '',
    websiteUrl: '',
    instagramHandle: '',
    whatsappNumber: '',
    primaryColor: '#126BFF',
    secondaryColor: '#10DCD5',
    accentColor: '#8756FF',
    typographyPreference: 'Modern sans serif, readable, premium',
    logoReference: '',
    availableProof: '',
    claimBoundaries: '',
    claimsNeverMake: 'Jangan klaim revenue, jumlah customer, hasil iklan, atau testimoni jika belum ada bukti nyata.',
    offerGuaranteeType: '30_hari',
    offerGuaranteeCustom: '',
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createDefaultProject(ownerId = 'local', app = null, brandFile = null) {
  const ts = new Date().toISOString();
  const appName = app?.exampleRebrandName || app?.rebrand || app?.name || '';
  return {
    id: cryptoSafeId('project'),
    ownerId,
    brandFileId: brandFile?.id || '',
    appId: app?.id || '',
    scope: 'quick_rebrand',
    newAppName: appName,
    newAppTagline: app?.coreOutcome || app?.output || '',
    newTargetMarket: '',
    useCase: '',
    primaryProblem: '',
    promisedOutcome: '',
    differentiator: '',
    visualDirection: 'Premium operating desk, clean, credible, mobile-first, tidak berlebihan efek AI.',
    requiredFeaturesToEmphasize: '',
    featuresNotToChange: '',
    additionalInstructions: '',
    offerPrice: '',
    offerPricingModel: 'sekali_bayar',
    offerIncludes: '',
    offerBonus: '',
    generatedAt: '',
    createdAt: ts,
    updatedAt: ts,
  };
}

export function cryptoSafeId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateBrandFile(brandFile = {}) {
  const b = normalizeBrandFile(brandFile);
  const labels = {
    brandName: 'Brand name',
    targetMarket: 'Target market',
    primaryCta: 'Primary CTA',
  };
  return REQUIRED_BRAND_FIELDS.reduce((errors, field) => {
    if (!String(b[field] || '').trim()) errors[field] = `${labels[field]} wajib diisi.`;
    return errors;
  }, {});
}

export function validateProject(project = {}) {
  const labels = {
    appId: 'Aplikasi',
    newAppName: 'Nama aplikasi baru',
  };
  return REQUIRED_PROJECT_FIELDS.reduce((errors, field) => {
    if (!String(project[field] || '').trim()) errors[field] = `${labels[field]} wajib diisi.`;
    return errors;
  }, {});
}

export function validateRebrandInput({ brandFile, project, app }) {
  const normalized = normalizeBrandFile(brandFile);
  const brandErrors = validateBrandFile(normalized);
  const projectErrors = validateProject(project);
  if (!app) projectErrors.appId = 'Pilih aplikasi yang tersedia terlebih dahulu.';
  if (!REBRAND_SCOPES[project?.scope]) projectErrors.scope = 'Pilih scope rebrand yang valid.';
  return {
    ok: Object.keys(brandErrors).length === 0 && Object.keys(projectErrors).length === 0,
    brandErrors,
    projectErrors,
  };
}

export function buildGenerationContext({ brandFile = {}, project = {}, app = {}, derived = null, generatedAt = new Date().toISOString() }) {
  const registryApp = getAppRegistryItem(project.appId || app.id) || {};
  const mergedApp = { ...registryApp, ...app };

  // Normalize v1 brand file fields
  const normalizedBrand = normalizeBrandFile(brandFile);

  // Use derived context if available, otherwise do inline derivation
  const d = derived || mergeDerivedContext(normalizedBrand, project, mergedApp);
  const b = d.brandFile;
  const p = d.project;

  const toneOfVoice = resolveToneOfVoice(b);

  return {
    generatedAt,
    projectId: project.id || '',
    brandName: b.brandName,
    businessName: b.businessName,
    niche: b.niche,
    productCategory: b.productCategory || getCategoryLabel(mergedApp.category || ''),
    positioning: p.positioning || b.positioning,
    differentiator: p.differentiator || b.differentiator,
    toneOfVoice,
    mandatoryWords: normalizeList(b.mandatoryWords),
    forbiddenWords: normalizeList([b.forbiddenWords, b.claimsNeverMake].filter(Boolean).join(', ')),
    primaryCta: b.primaryCta,
    primaryCtaUrl: b.primaryCtaUrl,
    websiteUrl: b.websiteUrl,
    instagramHandle: b.instagramHandle,
    whatsappNumber: b.whatsappNumber,
    primaryColor: b.primaryColor,
    secondaryColor: b.secondaryColor,
    accentColor: b.accentColor || mergedApp.accent,
    typographyPreference: b.typographyPreference,
    logoReference: b.logoReference,
    availableProof: b.availableProof,
    claimBoundaries: [b.claimBoundaries, b.claimsNeverMake].filter(Boolean).join(' '),
    originalAppName: mergedApp.name,
    originalAppDescription: mergedApp.shortDescription || mergedApp.function || mergedApp.tagline,
    originalCoreOutcome: mergedApp.coreOutcome || mergedApp.output,
    originalAppCategory: getCategoryLabel(mergedApp.category || ''),
    nonNegotiableLogic: mergedApp.nonNegotiableLogic || [],
    promptNotes: mergedApp.promptNotes || [],
    newAppName: p.newAppName,
    newAppTagline: p.newAppTagline,
    newTargetMarket: p.newTargetMarket || b.targetMarket || mergedApp.defaultAudience,
    useCase: p.useCase,
    primaryProblem: p.primaryProblem || b.buyerProblem,
    promisedOutcome: p.promisedOutcome || b.buyerDesiredOutcome,
    visualDirection: p.visualDirection,
    requiredFeaturesToEmphasize: normalizeList(p.requiredFeaturesToEmphasize),
    featuresNotToChange: normalizeList(p.featuresNotToChange),
    additionalInstructions: p.additionalInstructions,
    // Offer fields
    offerPrice: p.offerPrice || '',
    offerPricingModel: p.offerPricingModel || 'sekali_bayar',
    offerPricingModelLabel: OFFER_PRICING_MODELS[p.offerPricingModel] || OFFER_PRICING_MODELS.sekali_bayar,
    offerIncludes: p.offerIncludes || '',
    offerBonus: p.offerBonus || '',
    offerGuaranteeType: b.offerGuaranteeType || '30_hari',
    offerGuaranteeLabel: OFFER_GUARANTEE_TYPES[b.offerGuaranteeType] || OFFER_GUARANTEE_TYPES['30_hari'],
    offerGuaranteeCustom: b.offerGuaranteeCustom || '',
    originalAppId: mergedApp.id || project.appId || '',
  };
}

export function generateRebrandPack({ brandFile, project, app, generatedAt = new Date().toISOString(), skipValidation = false }) {
  const normalizedBrand = normalizeBrandFile(brandFile);
  const validation = validateRebrandInput({ brandFile: normalizedBrand, project, app });
  if (!skipValidation && !validation.ok) {
    const err = new Error('Incomplete rebrand input');
    err.validation = validation;
    throw err;
  }

  const scope = REBRAND_SCOPES[project.scope] || REBRAND_SCOPES.quick_rebrand;
  const derived = mergeDerivedContext(normalizedBrand, project, app);
  const ctx = buildGenerationContext({ brandFile: normalizedBrand, project, app, derived, generatedAt });
  const appRebrandPrompt = cleanupOutput(buildAppRebrandPrompt(ctx));
  const blocks = [{ id: 'appRebrandPrompt', title: 'App Rebrand Prompt', body: appRebrandPrompt }];

  let landingPagePrompt = '';
  let contentAdsPrompt = '';
  let visualPrompt = '';
  let launchChecklist = '';

  if (project.scope === 'market_repositioning' || project.scope === 'full_white_label_launch') {
    landingPagePrompt = cleanupOutput(buildLandingPagePrompt(ctx));
    blocks.push({ id: 'landingPagePrompt', title: 'Landing Page & Offer Prompt', body: landingPagePrompt });
  }

  if (project.scope === 'full_white_label_launch') {
    contentAdsPrompt = cleanupOutput(buildContentAdsPrompt(ctx));
    visualPrompt = cleanupOutput(buildVisualPrompt(ctx));
    launchChecklist = cleanupOutput(buildLaunchChecklist(ctx));
    blocks.push(
      { id: 'contentAdsPrompt', title: 'Content & Ads Prompt', body: contentAdsPrompt },
      { id: 'visualPrompt', title: 'Visual Asset Prompt', body: visualPrompt },
      { id: 'launchChecklist', title: 'Launch Checklist', body: launchChecklist },
    );
  }

  const handoverMarkdown = buildHandoverMarkdown({ ctx, scope, blocks });

  return {
    projectId: project.id,
    generatedAt,
    scope: scope.id,
    scopeLabel: scope.label,
    appRebrandPrompt,
    landingPagePrompt: landingPagePrompt || undefined,
    marketingKitPrompt: landingPagePrompt || undefined,
    contentAdsPrompt: contentAdsPrompt || undefined,
    visualPrompt: visualPrompt || undefined,
    launchChecklist: launchChecklist || undefined,
    handoverMarkdown,
    templateVersion: TEMPLATE_VERSION,
    blocks,
    filename: buildPackFilename(ctx.brandName, ctx.newAppName),
  };
}

export function buildHandoverMarkdown({ ctx, scope, blocks }) {
  const promptSections = blocks.map((block, index) => {
    if (block.id === 'launchChecklist') {
      return `## ${index + 3}. ${block.title}\n\n${block.body}`;
    }
    return `## ${index + 3}. ${block.title}\n\n\`\`\`text\n${block.body}\n\`\`\``;
  }).join('\n\n');

  return cleanupOutput(`# ${inlineValue(ctx.newAppName)} — Rebrand Handover Pack

Generated: ${inlineValue(ctx.generatedAt)}
Brand: ${inlineValue(ctx.brandName)}
Original App: ${inlineValue(ctx.originalAppName)}
Scope: ${inlineValue(scope.label)}
Template Version: ${TEMPLATE_VERSION}

---

## 1. Brand Summary

- Brand: ${inlineValue(ctx.brandName)}
- Business: ${inlineValue(ctx.businessName, 'Tidak disebutkan')}
- Niche: ${inlineValue(ctx.niche)}
- Target buyer: ${inlineValue(ctx.newTargetMarket)}
- Tone: ${inlineValue(ctx.toneOfVoice)}
- Primary CTA: ${inlineValue(ctx.primaryCta)}

## 2. Product Repositioning

- New product/app name: ${inlineValue(ctx.newAppName)}
- Original app foundation: ${inlineValue(ctx.originalAppName)}
- Original function: ${inlineValue(ctx.originalAppDescription)}
- Core outcome to preserve: ${inlineValue(ctx.originalCoreOutcome)}
- Primary problem: ${inlineValue(ctx.primaryProblem)}
- Promised outcome: ${inlineValue(ctx.promisedOutcome)}
- Positioning: ${inlineValue(ctx.positioning)}
- Differentiator: ${inlineValue(ctx.differentiator, 'Tidak disebutkan')}

${promptSections}

## ${blocks.length + 3}. Source-of-Truth Notes

- Proof used: ${proofValue(ctx.availableProof)}
- Claim limitations: ${claimBoundaryValue(ctx.claimBoundaries)}
- Core functionality to preserve: ${inlineValue(ctx.nonNegotiableLogic)}
- Visual safety: When a female model is shown in generated visual assets, she must wear hijab.
- Reminder: This pack is deterministic and does not call an AI API.`);
}

export function buildPackFilename(brandName, appName) {
  return `${slugifyFilename(brandName || 'brand')}-${slugifyFilename(appName || 'app')}-rebrand-pack.md`;
}

export function slugifyFilename(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'untitled';
}

export function cleanupOutput(text) {
  return String(text || '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/undefined|null/g, 'Belum diisi')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}
