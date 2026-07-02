import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getAppRegistryItem } from '../src/scripts/rebrand/app-registry.js';
import {
  buildPackFilename,
  createDefaultBrandFile,
  createDefaultProject,
  generateRebrandPack,
  inferTonePreset,
  normalizeBrandFile,
  slugifyFilename,
  validateBrandFile,
  validateProject,
} from '../src/scripts/rebrand/generate-rebrand-pack.js';
import {
  deriveBrandContext,
  deriveNicheFromTargetMarket,
  deriveOutcomeFrom,
  derivePositioningFrom,
  deriveProblemFrom,
  mergeDerivedContext,
  resolveToneOfVoice,
  TONE_PRESETS,
} from '../src/scripts/rebrand/brand-derive.js';

// ── Test helpers ──

function sampleBrand() {
  return {
    ...createDefaultBrandFile('member_test'),
    brandName: 'Nusa Growth Lab',
    businessName: 'Nusa Studio',
    niche: 'seller marketplace lokal',
    productCategory: 'digital product toolkit',
    targetMarket: 'seller Shopee dan TikTok Shop yang ingin merapikan campaign produk',
    buyerProblem: 'konten dan listing masih dibuat acak sehingga pesan jualan tidak konsisten',
    buyerDesiredOutcome: 'punya sistem campaign, visual, dan copy yang lebih rapi sebelum promosi',
    positioning: 'toolkit rebrand untuk membantu seller menyusun campaign produk dengan arah yang jelas',
    differentiator: 'menggabungkan prompt rebrand app dan marketing kit dalam satu handover pack',
    tonePreset: 'warm',
    toneOfVoice: ['Friendly', 'Warm', 'Educational'],
    mandatoryWords: 'rapi, terarah, realistis',
    forbiddenWords: 'pasti laris, auto kaya',
    primaryCta: 'Mulai susun campaign',
    primaryCtaUrl: 'https://example.com/checkout',
    primaryColor: '#126BFF',
    secondaryColor: '#10DCD5',
    accentColor: '#8756FF',
    typographyPreference: 'Modern sans serif',
    availableProof: 'Demo produk dan walkthrough fitur internal.',
    claimBoundaries: 'Boleh klaim membantu merapikan proses; jangan klaim peningkatan omzet.',
    claimsNeverMake: 'Jangan membuat testimoni, revenue, atau customer count palsu.',
  };
}

function sampleProject(scope = 'quick_rebrand') {
  const app = getAppRegistryItem('katalog');
  return {
    ...createDefaultProject('member_test', app, sampleBrand()),
    appId: 'katalog',
    scope,
    newAppName: 'Marketplace Growth Desk',
    newAppTagline: 'Rancang listing dan campaign marketplace lebih terarah',
    newTargetMarket: 'seller Shopee, Tokopedia, dan TikTok Shop skala kecil-menengah',
    useCase: 'membuat arah listing, etalase, dan narasi promosi sebelum campaign berjalan',
    primaryProblem: 'seller punya banyak produk tetapi pesan tiap listing tidak fokus',
    promisedOutcome: 'arah merchandising dan campaign yang lebih jelas sebelum seller membuat konten',
    differentiator: 'fokus pada workflow marketplace lokal tanpa klaim hasil berlebihan',
    visualDirection: 'clean, commerce-focused, modern dashboard, warna biru-cyan',
    requiredFeaturesToEmphasize: 'struktur katalog, narasi listing, prioritas produk',
    featuresNotToChange: 'alur input katalog, output merchandising, validasi field',
    additionalInstructions: 'Gunakan Bahasa Indonesia kasual-profesional.',
  };
}

function assertCleanOutput(pack) {
  const joined = [pack.handoverMarkdown, ...pack.blocks.map((block) => block.body)].join('\n');
  assert.equal(/\{\{[^}]+\}\}/.test(joined), false, 'output should not contain unresolved template placeholders');
  assert.equal(/undefined|null/.test(joined), false, 'output should not contain undefined/null text');
}

// ── Brand File validation tests ──

test('brand file validation requires v2 minimum fields (brandName, targetMarket, primaryCta)', () => {
  const errors = validateBrandFile(createDefaultBrandFile('member_test'));
  assert.deepEqual(Object.keys(errors).sort(), [
    'brandName',
    'primaryCta',
    'targetMarket',
  ].sort());
});

test('brand file validation passes when v2 required fields are filled', () => {
  const b = createDefaultBrandFile('member_test');
  b.brandName = 'Test Brand';
  b.targetMarket = 'UMKM';
  b.primaryCta = 'Mulai';
  const errors = validateBrandFile(b);
  assert.equal(Object.keys(errors).length, 0);
});

test('brand file validation normalizes v1 targetBuyer to targetMarket', () => {
  const b = createDefaultBrandFile('member_test');
  delete b.targetMarket;
  b.targetBuyer = 'Seller marketplace';
  b.brandName = 'Test';
  b.primaryCta = 'Go';
  const errors = validateBrandFile(b);
  assert.equal(Object.keys(errors).length, 0, 'targetBuyer should satisfy targetMarket requirement');
});

// ── Project validation tests ──

test('project validation requires only appId and newAppName', () => {
  const errors = validateProject(createDefaultProject('member_test'));
  assert.deepEqual(Object.keys(errors).sort(), ['appId', 'newAppName'].sort());
});

test('project validation passes with appId and newAppName', () => {
  const p = createDefaultProject('member_test');
  p.appId = 'arah';
  p.newAppName = 'My App';
  const errors = validateProject(p);
  assert.equal(Object.keys(errors).length, 0);
});

// ── normalizeBrandFile tests ──

test('normalizeBrandFile migrates targetBuyer to targetMarket', () => {
  const b = { targetBuyer: 'seller Shopee', brandName: 'X' };
  const normalized = normalizeBrandFile(b);
  assert.equal(normalized.targetMarket, 'seller Shopee');
  assert.equal(normalized.targetBuyer, undefined);
});

test('normalizeBrandFile does not overwrite existing targetMarket', () => {
  const b = { targetMarket: 'brand owner', targetBuyer: 'seller Shopee', brandName: 'X' };
  const normalized = normalizeBrandFile(b);
  assert.equal(normalized.targetMarket, 'brand owner');
});

test('normalizeBrandFile infers tonePreset from toneOfVoice', () => {
  const b = { toneOfVoice: ['Professional', 'Direct'] };
  const normalized = normalizeBrandFile(b);
  assert.equal(normalized.tonePreset, 'professional');
});

test('normalizeBrandFile handles null input', () => {
  const normalized = normalizeBrandFile(null);
  assert.equal(normalized, null);
});

// ── inferTonePreset tests ──

test('inferTonePreset matches premium tones', () => {
  assert.equal(inferTonePreset(['Premium', 'Minimal']), 'premium');
});

test('inferTonePreset matches bold tones', () => {
  assert.equal(inferTonePreset(['Bold', 'Playful']), 'bold');
});

test('inferTonePreset matches professional tones', () => {
  assert.equal(inferTonePreset(['Professional', 'Direct']), 'professional');
});

test('inferTonePreset matches warm tones', () => {
  assert.equal(inferTonePreset(['Friendly', 'Warm']), 'warm');
});

test('inferTonePreset falls back to custom for unrecognized', () => {
  assert.equal(inferTonePreset(['Quirky', 'Sarcastic']), 'custom');
});

test('inferTonePreset defaults to warm for empty', () => {
  assert.equal(inferTonePreset([]), 'warm');
});

// ── Tone preset / resolveToneOfVoice tests ──

test('resolveToneOfVoice uses preset tones when not custom', () => {
  const brand = { tonePreset: 'professional' };
  const result = resolveToneOfVoice(brand);
  assert.deepEqual(result, TONE_PRESETS.professional.tones);
});

test('resolveToneOfVoice uses custom array for custom preset', () => {
  const brand = { tonePreset: 'custom', toneOfVoice: ['Bold', 'Technical', 'Playful'] };
  const result = resolveToneOfVoice(brand);
  assert.deepEqual(result, ['Bold', 'Technical', 'Playful']);
});

test('resolveToneOfVoice uses toneCustom if toneOfVoice empty', () => {
  const brand = { tonePreset: 'custom', toneCustom: ['Warm', 'Direct'] };
  const result = resolveToneOfVoice(brand);
  assert.deepEqual(result, ['Warm', 'Direct']);
});

test('resolveToneOfVoice defaults to warm preset', () => {
  const brand = {};
  const result = resolveToneOfVoice(brand);
  assert.deepEqual(result, TONE_PRESETS.warm.tones);
});

// ── deriveNicheFromTargetMarket tests ──

test('deriveNicheFromTargetMarket detects kuliner', () => {
  assert.equal(deriveNicheFromTargetMarket('pemilik restoran dan kafe'), 'F&B / Kuliner');
});

test('deriveNicheFromTargetMarket detects marketplace/e-commerce', () => {
  assert.equal(deriveNicheFromTargetMarket('seller Shopee dan Tokopedia'), 'E-Commerce / Marketplace');
});

test('deriveNicheFromTargetMarket detects agency/jasa', () => {
  assert.equal(deriveNicheFromTargetMarket('agency digital marketing'), 'Jasa / Agency');
});

test('deriveNicheFromTargetMarket detects edukasi', () => {
  assert.equal(deriveNicheFromTargetMarket('pemilik kursus online'), 'Edukasi / Pelatihan');
});

test('deriveNicheFromTargetMarket falls back to first segment', () => {
  const result = deriveNicheFromTargetMarket('pemilik toko batik di Solo');
  assert.ok(result.length > 0);
});

test('deriveNicheFromTargetMarket returns empty for empty input', () => {
  assert.equal(deriveNicheFromTargetMarket(''), '');
});

// ── deriveProblemFrom tests ──

test('deriveProblemFrom detects marketplace problem', () => {
  const result = deriveProblemFrom('seller marketplace', 'E-Commerce');
  assert.ok(result.includes('penjualan'));
});

test('deriveProblemFrom detects agency problem', () => {
  const result = deriveProblemFrom('agency dan konsultan', 'Jasa');
  assert.ok(result.includes('generik'));
});

test('deriveProblemFrom returns generic fallback for unknown', () => {
  const result = deriveProblemFrom('pemilik usaha peternakan', 'Peternakan');
  assert.ok(result.includes('terstruktur'));
});

// ── deriveOutcomeFrom tests ──

test('deriveOutcomeFrom detects "mulai" verb', () => {
  const result = deriveOutcomeFrom('Mulai berjualan', 'seller');
  assert.ok(result.includes('mulai'));
});

test('deriveOutcomeFrom detects "daftar" verb', () => {
  const result = deriveOutcomeFrom('Daftar sekarang', 'buyer');
  assert.ok(result.includes('bergabung'));
});

test('deriveOutcomeFrom returns generic for empty', () => {
  const result = deriveOutcomeFrom('', '');
  assert.equal(result, '');
});

// ── derivePositioningFrom tests ──

test('derivePositioningFrom creates positioning statement', () => {
  const result = derivePositioningFrom('BrandX', 'E-Commerce', 'seller Shopee');
  assert.ok(result.includes('BrandX'));
  assert.ok(result.toLowerCase().includes('seller shopee'));
  assert.ok(result.toLowerCase().includes('e-commerce'));
});

// ── deriveBrandContext tests ──

test('deriveBrandContext fills niche from targetMarket', () => {
  const brand = { targetMarket: 'seller Shopee', brandName: 'Test' };
  const ctx = deriveBrandContext(brand);
  assert.equal(ctx.niche, 'E-Commerce / Marketplace');
});

test('deriveBrandContext preserves user-provided values', () => {
  const brand = { targetMarket: 'seller', niche: 'Custom Niche', buyerProblem: 'My problem' };
  const ctx = deriveBrandContext(brand);
  assert.equal(ctx.niche, 'Custom Niche');
  assert.equal(ctx.buyerProblem, 'My problem');
});

test('deriveBrandContext derives buyerProblem when empty', () => {
  const brand = { targetMarket: 'agency digital' };
  const ctx = deriveBrandContext(brand);
  assert.ok(ctx.buyerProblem.length > 0);
});

test('deriveBrandContext derives all fields for empty brand', () => {
  const ctx = deriveBrandContext({});
  assert.ok(ctx.niche || ctx.niche === '');
  assert.ok(ctx.buyerProblem || ctx.buyerProblem === '');
  assert.ok(ctx.buyerDesiredOutcome || ctx.buyerDesiredOutcome === '');
  assert.ok(ctx.positioning || ctx.positioning === '');
  assert.ok(Array.isArray(ctx.toneOfVoice));
});

test('deriveBrandContext uses app metadata for project-level fields', () => {
  const brand = { targetMarket: 'seller Shopee' };
  const app = getAppRegistryItem('arah');
  const ctx = deriveBrandContext(brand, app);
  assert.ok(ctx.useCase.length > 0);
  assert.ok(ctx.newTargetMarket.length > 0);
});

// ── mergeDerivedContext tests ──

test('mergeDerivedContext returns merged brand and project', () => {
  const brand = { brandName: 'Test', targetMarket: 'seller', primaryCta: 'Mulai' };
  const project = { appId: 'arah', newAppName: 'My ARAH', scope: 'quick_rebrand' };
  const app = getAppRegistryItem('arah');
  const result = mergeDerivedContext(brand, project, app);

  assert.equal(result.brandFile.brandName, 'Test');
  assert.ok(result.brandFile.niche.length > 0);
  assert.ok(result.brandFile.buyerProblem.length > 0);
  assert.equal(result.project.newAppName, 'My ARAH');
});

test('mergeDerivedContext preserves user overrides over derived values', () => {
  const brand = {
    brandName: 'Test',
    targetMarket: 'seller',
    primaryCta: 'Mulai',
    niche: 'My Custom Niche',
    buyerProblem: 'Custom problem',
  };
  const project = {
    appId: 'arah',
    newAppName: 'My ARAH',
    scope: 'quick_rebrand',
    primaryProblem: 'Custom project problem',
  };
  const app = getAppRegistryItem('arah');
  const result = mergeDerivedContext(brand, project, app);

  assert.equal(result.brandFile.niche, 'My Custom Niche');
  assert.equal(result.brandFile.buyerProblem, 'Custom problem');
  assert.equal(result.project.primaryProblem, 'Custom project problem');
});

// ── generateRebrandPack integration tests ──

test('quick rebrand outputs app prompt only', () => {
  const app = getAppRegistryItem('katalog');
  const pack = generateRebrandPack({ brandFile: sampleBrand(), project: sampleProject('quick_rebrand'), app });

  assert.equal(pack.blocks.length, 1);
  assert.equal(pack.blocks[0].title, 'App Rebrand Prompt');
  assert.equal(pack.landingPagePrompt, undefined);
  assert.match(pack.appRebrandPrompt, /Preserve all existing core functionality/);
  assert.match(pack.appRebrandPrompt, /Marketplace Growth Desk/);
  assert.match(pack.appRebrandPrompt, /KATALOG/);
  assert.match(pack.appRebrandPrompt, /The buyer is the full owner of the product/);
  assertCleanOutput(pack);
});

test('market repositioning adds landing page and offer prompt', () => {
  const app = getAppRegistryItem('katalog');
  const pack = generateRebrandPack({ brandFile: sampleBrand(), project: sampleProject('market_repositioning'), app });

  assert.deepEqual(pack.blocks.map((block) => block.title), ['App Rebrand Prompt', 'Landing Page & Offer Prompt']);
  assert.match(pack.landingPagePrompt, /LANDING PAGE & OFFER BRIEF/);
  assert.match(pack.handoverMarkdown, /## 4\. Landing Page & Offer Prompt/);
  assertCleanOutput(pack);
});

test('full white-label launch outputs all prompt blocks and visual safety rule', () => {
  const app = getAppRegistryItem('katalog');
  const pack = generateRebrandPack({ brandFile: sampleBrand(), project: sampleProject('full_white_label_launch'), app });

  assert.deepEqual(pack.blocks.map((block) => block.title), [
    'App Rebrand Prompt',
    'Landing Page & Offer Prompt',
    'Content & Ads Prompt',
    'Visual Asset Prompt',
    'Launch Checklist',
  ]);
  assert.match(pack.contentAdsPrompt, /Five Meta ad angles/);
  assert.match(pack.visualPrompt, /female model is shown, she must wear hijab/);
  assert.match(pack.launchChecklist, /Original core features still work/);
  assert.match(pack.handoverMarkdown, /Source-of-Truth Notes/);
  assertCleanOutput(pack);
});

test('generateRebrandPack works with v2 minimal brand (only 3 required fields)', () => {
  const app = getAppRegistryItem('arah');
  const brand = {
    ...createDefaultBrandFile('member_test'),
    brandName: 'Quick Brand',
    targetMarket: 'agency dan freelancer digital',
    primaryCta: 'Mulai rebrand',
  };
  const project = {
    ...createDefaultProject('member_test', app, brand),
    appId: 'arah',
    newAppName: 'My Strategy Tool',
  };
  const pack = generateRebrandPack({ brandFile: brand, project, app });

  assert.equal(pack.blocks.length, 1);
  assert.match(pack.appRebrandPrompt, /My Strategy Tool/);
  // Derived fields should fill in — no "Belum diisi" for core context
  assert.match(pack.appRebrandPrompt, /Jasa|agency|freelancer/i);
  assertCleanOutput(pack);
});

test('generateRebrandPack accepts v1 brand with targetBuyer', () => {
  const app = getAppRegistryItem('arah');
  const brand = {
    ...createDefaultBrandFile('member_test'),
    brandName: 'V1 Brand',
    primaryCta: 'Go',
  };
  delete brand.targetMarket;
  brand.targetBuyer = 'konsultan dan agency';
  const project = {
    ...createDefaultProject('member_test', app, brand),
    appId: 'arah',
    newAppName: 'V1 App',
  };
  const pack = generateRebrandPack({ brandFile: brand, project, app });
  assert.match(pack.appRebrandPrompt, /V1 App/);
  assertCleanOutput(pack);
});

// ── Filename tests ──

test('filename slug is safe and predictable', () => {
  assert.equal(slugifyFilename('Nusa Growth Lab!'), 'nusa-growth-lab');
  assert.equal(buildPackFilename('Nusa Growth Lab', 'Marketplace Growth Desk'), 'nusa-growth-lab-marketplace-growth-desk-rebrand-pack.md');
});
