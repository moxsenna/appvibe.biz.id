import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getAppRegistryItem } from '../src/scripts/rebrand/app-registry.js';
import {
  buildPackFilename,
  createDefaultBrandFile,
  createDefaultProject,
  generateRebrandPack,
  slugifyFilename,
  validateBrandFile,
} from '../src/scripts/rebrand/generate-rebrand-pack.js';

function sampleBrand() {
  return {
    ...createDefaultBrandFile('member_test'),
    brandName: 'Nusa Growth Lab',
    businessName: 'Nusa Studio',
    niche: 'seller marketplace lokal',
    productCategory: 'digital product toolkit',
    targetBuyer: 'seller Shopee dan TikTok Shop yang ingin merapikan campaign produk',
    buyerProblem: 'konten dan listing masih dibuat acak sehingga pesan jualan tidak konsisten',
    buyerDesiredOutcome: 'punya sistem campaign, visual, dan copy yang lebih rapi sebelum promosi',
    positioning: 'toolkit rebrand untuk membantu seller menyusun campaign produk dengan arah yang jelas',
    differentiator: 'menggabungkan prompt rebrand app dan marketing kit dalam satu handover pack',
    toneOfVoice: ['Friendly', 'Educational', 'Direct'],
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

test('brand file validation requires minimum fields', () => {
  const errors = validateBrandFile(createDefaultBrandFile('member_test'));
  assert.deepEqual(Object.keys(errors).sort(), [
    'brandName',
    'buyerDesiredOutcome',
    'buyerProblem',
    'niche',
    'positioning',
    'primaryCta',
    'targetBuyer',
  ].sort());
});

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

test('filename slug is safe and predictable', () => {
  assert.equal(slugifyFilename('Nusa Growth Lab!'), 'nusa-growth-lab');
  assert.equal(buildPackFilename('Nusa Growth Lab', 'Marketplace Growth Desk'), 'nusa-growth-lab-marketplace-growth-desk-rebrand-pack.md');
});
