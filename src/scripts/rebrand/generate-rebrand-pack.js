import { getAppRegistryItem, getCategoryLabel } from './app-registry.js';
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
  'niche',
  'targetBuyer',
  'buyerProblem',
  'buyerDesiredOutcome',
  'positioning',
  'primaryCta',
];

export const REQUIRED_PROJECT_FIELDS = [
  'appId',
  'newAppName',
  'newTargetMarket',
  'useCase',
  'primaryProblem',
  'promisedOutcome',
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
    targetBuyer: '',
    buyerProblem: '',
    buyerDesiredOutcome: '',
    positioning: '',
    differentiator: '',
    toneOfVoice: ['Friendly', 'Educational'],
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
    newTargetMarket: brandFile?.targetBuyer || app?.defaultAudience || '',
    useCase: app?.prompt || app?.promptNotes?.[0] || '',
    primaryProblem: brandFile?.buyerProblem || '',
    promisedOutcome: brandFile?.buyerDesiredOutcome || app?.coreOutcome || '',
    differentiator: brandFile?.differentiator || '',
    visualDirection: 'Premium operating desk, clean, credible, mobile-first, tidak berlebihan efek AI.',
    requiredFeaturesToEmphasize: '',
    featuresNotToChange: '',
    additionalInstructions: '',
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
  const labels = {
    brandName: 'Brand name',
    niche: 'Niche',
    targetBuyer: 'Target buyer',
    buyerProblem: 'Primary buyer problem',
    buyerDesiredOutcome: 'Desired buyer outcome',
    positioning: 'Positioning statement',
    primaryCta: 'Primary CTA',
  };
  return REQUIRED_BRAND_FIELDS.reduce((errors, field) => {
    if (!String(brandFile[field] || '').trim()) errors[field] = `${labels[field]} wajib diisi.`;
    return errors;
  }, {});
}

export function validateProject(project = {}) {
  const labels = {
    appId: 'Aplikasi',
    newAppName: 'Nama aplikasi baru',
    newTargetMarket: 'Target market baru',
    useCase: 'Use case',
    primaryProblem: 'Masalah utama',
    promisedOutcome: 'Outcome yang dijanjikan',
  };
  return REQUIRED_PROJECT_FIELDS.reduce((errors, field) => {
    if (!String(project[field] || '').trim()) errors[field] = `${labels[field]} wajib diisi.`;
    return errors;
  }, {});
}

export function validateRebrandInput({ brandFile, project, app }) {
  const brandErrors = validateBrandFile(brandFile);
  const projectErrors = validateProject(project);
  if (!app) projectErrors.appId = 'Pilih aplikasi yang tersedia terlebih dahulu.';
  if (!REBRAND_SCOPES[project?.scope]) projectErrors.scope = 'Pilih scope rebrand yang valid.';
  return {
    ok: Object.keys(brandErrors).length === 0 && Object.keys(projectErrors).length === 0,
    brandErrors,
    projectErrors,
  };
}

export function buildGenerationContext({ brandFile = {}, project = {}, app = {}, generatedAt = new Date().toISOString() }) {
  const registryApp = getAppRegistryItem(project.appId || app.id) || {};
  const mergedApp = { ...registryApp, ...app };
  const toneOfVoice = Array.isArray(brandFile.toneOfVoice)
    ? brandFile.toneOfVoice
    : normalizeList(brandFile.toneOfVoice);

  return {
    generatedAt,
    projectId: project.id || '',
    brandName: brandFile.brandName,
    businessName: brandFile.businessName,
    niche: brandFile.niche,
    productCategory: brandFile.productCategory || getCategoryLabel(mergedApp.category || ''),
    positioning: project.positioning || brandFile.positioning,
    differentiator: project.differentiator || brandFile.differentiator,
    toneOfVoice,
    mandatoryWords: normalizeList(brandFile.mandatoryWords),
    forbiddenWords: normalizeList([brandFile.forbiddenWords, brandFile.claimsNeverMake].filter(Boolean).join(', ')),
    primaryCta: brandFile.primaryCta,
    primaryCtaUrl: brandFile.primaryCtaUrl,
    websiteUrl: brandFile.websiteUrl,
    instagramHandle: brandFile.instagramHandle,
    whatsappNumber: brandFile.whatsappNumber,
    primaryColor: brandFile.primaryColor,
    secondaryColor: brandFile.secondaryColor,
    accentColor: brandFile.accentColor || mergedApp.accent,
    typographyPreference: brandFile.typographyPreference,
    logoReference: brandFile.logoReference,
    availableProof: brandFile.availableProof,
    claimBoundaries: [brandFile.claimBoundaries, brandFile.claimsNeverMake].filter(Boolean).join(' '),
    originalAppName: mergedApp.name,
    originalAppDescription: mergedApp.shortDescription || mergedApp.function || mergedApp.tagline,
    originalCoreOutcome: mergedApp.coreOutcome || mergedApp.output,
    originalAppCategory: getCategoryLabel(mergedApp.category || ''),
    nonNegotiableLogic: mergedApp.nonNegotiableLogic || [],
    promptNotes: mergedApp.promptNotes || [],
    newAppName: project.newAppName,
    newAppTagline: project.newAppTagline,
    newTargetMarket: project.newTargetMarket || brandFile.targetBuyer || mergedApp.defaultAudience,
    useCase: project.useCase,
    primaryProblem: project.primaryProblem || brandFile.buyerProblem,
    promisedOutcome: project.promisedOutcome || brandFile.buyerDesiredOutcome,
    visualDirection: project.visualDirection,
    requiredFeaturesToEmphasize: normalizeList(project.requiredFeaturesToEmphasize),
    featuresNotToChange: normalizeList(project.featuresNotToChange),
    additionalInstructions: project.additionalInstructions,
  };
}

export function generateRebrandPack({ brandFile, project, app, generatedAt = new Date().toISOString(), skipValidation = false }) {
  const validation = validateRebrandInput({ brandFile, project, app });
  if (!skipValidation && !validation.ok) {
    const err = new Error('Incomplete rebrand input');
    err.validation = validation;
    throw err;
  }

  const scope = REBRAND_SCOPES[project.scope] || REBRAND_SCOPES.quick_rebrand;
  const ctx = buildGenerationContext({ brandFile, project, app, generatedAt });
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
