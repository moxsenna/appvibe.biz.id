/**
 * brand-derive.js — Auto-derive logic for Brand Studio v2
 *
 * Fills in missing Brand File fields from minimal user input + app metadata.
 * These are NOT saved back — they're computed at generate-time and injected
 * into the prompt context. User can always override via "Edit Lengkap".
 */

import { getAppRegistryItem, getCategoryLabel } from './app-registry.js';

// ── Tone Presets ──

export const TONE_PRESETS = {
  professional: {
    id: 'professional',
    label: 'Profesional & Edukatif',
    shortLabel: 'Profesional',
    tones: ['Professional', 'Educational', 'Direct'],
    description: 'Konsultan, B2B, jasa profesional.',
  },
  warm: {
    id: 'warm',
    label: 'Hangat & Bersahabat',
    shortLabel: 'Sahabat',
    tones: ['Friendly', 'Warm', 'Educational'],
    description: 'Kreator, komunitas, edukasi.',
  },
  bold: {
    id: 'bold',
    label: 'Berani & Disruptif',
    shortLabel: 'Berani',
    tones: ['Bold', 'Direct', 'Playful'],
    description: 'Startup, brand modern, produk baru.',
  },
  premium: {
    id: 'premium',
    label: 'Eksklusif & Premium',
    shortLabel: 'Premium',
    tones: ['Premium', 'Minimal', 'Bold'],
    description: 'High-ticket offer, luxury, exclusive.',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    shortLabel: 'Custom',
    tones: [],
    description: 'Pilih tone sendiri.',
  },
};

/**
 * Resolve effective toneOfVoice array from preset or custom.
 */
export function resolveToneOfVoice(brandFile) {
  const preset = TONE_PRESETS[brandFile?.tonePreset];
  if (preset && preset.id !== 'custom' && preset.tones.length) {
    return preset.tones;
  }
  // Fallback: custom tones or legacy array
  if (Array.isArray(brandFile?.toneOfVoice) && brandFile.toneOfVoice.length) {
    return brandFile.toneOfVoice;
  }
  if (Array.isArray(brandFile?.toneCustom) && brandFile.toneCustom.length) {
    return brandFile.toneCustom;
  }
  // Default: warm
  return TONE_PRESETS.warm.tones;
}

// ── Auto-Derive Functions ──

/**
 * Derive niche from targetMarket when niche is empty.
 * Uses keyword matching — not foolproof, but good enough for prompt context.
 */
export function deriveNicheFromTargetMarket(targetMarket) {
  if (!targetMarket) return '';

  const lower = targetMarket.toLowerCase();

  const PATTERNS = [
    { keywords: ['kuliner', 'makanan', 'restoran', 'kafe', 'kopi', 'catering', 'chef', 'food'], niche: 'F&B / Kuliner' },
    { keywords: ['shopee', 'tokopedia', 'marketplace', 'seller', 'etalase', 'listing', 'e-commerce'], niche: 'E-Commerce / Marketplace' },
    { keywords: ['agency', 'jasa', 'freelance', 'konsultan', 'vendor', 'studio'], niche: 'Jasa / Agency' },
    { keywords: ['property', 'rumah', 'real estate', 'agen', 'properti'], niche: 'Properti / Real Estate' },
    { keywords: ['sekolah', 'kursus', 'edukasi', 'belajar', 'training', 'akademi'], niche: 'Edukasi / Pelatihan' },
    { keywords: ['kesehatan', 'klinik', 'dokter', 'bienum', 'salon', 'spa', 'kecantikan'], niche: 'Kesehatan / Kecantikan' },
    { keywords: ['fashion', 'pakaian', 'hijab', 'clothing', 'gaya', 'outfit'], niche: 'Fashion / Gaya' },
    { keywords: ['digital', 'saas', 'aplikasi', 'software', 'tech', 'it '], niche: 'Teknologi / Digital Product' },
    { keywords: ['media', 'konten', 'content', 'video', 'podcast', 'youtube', 'instagram', 'tiktok'], niche: 'Media / Konten Kreator' },
    { keywords: ['finance', 'keuangan', 'investasi', 'asuransi', 'rekening'], niche: 'Keuangan / Finansial' },
  ];

  for (const pattern of PATTERNS) {
    if (pattern.keywords.some((kw) => lower.includes(kw))) {
      return pattern.niche;
    }
  }

  // Generic fallback: capitalize first words from target market
  return targetMarket.split(/[,;]/)[0].trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Derive buyerProblem from targetMarket + niche.
 * Returns a problem statement — generic but specific enough for prompt scaffolding.
 */
export function deriveProblemFrom(targetMarket, niche) {
  if (!targetMarket) return '';
  const effectiveNiche = niche || deriveNicheFromTargetMarket(targetMarket);

  // Problem templates keyed by common patterns
  const lower = (targetMarket + ' ' + effectiveNiche).toLowerCase();

  if (lower.includes('seller') || lower.includes('marketplace') || lower.includes('e-commerce')) {
    return `proses penjualan dan konten masih manual dan tidak terstruktur, sehingga pesan jualan tidak konsisten`;
  }
  if (lower.includes('agency') || lower.includes('jasa') || lower.includes('freelance') || lower.includes('konsultan')) {
    return `penawaran jasa masih terlihat generik dan sulit dibedakan dari kompetitor`;
  }
  if (lower.includes('kuliner') || lower.includes('f&b') || lower.includes('restoran')) {
    return `promosi masih mengandalkan konten sesaat tanpa arah brand yang jelas`;
  }
  if (lower.includes('edukasi') || lower.includes('kursus') || lower.includes('pelatihan')) {
    return `pesan edukasi belum terstruktur sehingga calon peserta ragu untuk mulai`;
  }
  if (lower.includes('fashion') || lower.includes('gaya') || lower.includes('clothing')) {
    return `identitas visual dan pesan brand belum konsisten di semua channel`;
  }
  if (lower.includes('kesehatan') || lower.includes('kecantikan') || lower.includes('klinik')) {
    return `komunikasi layanan masih terkesan generik dan kurang membangun kepercayaan`;
  }
  if (lower.includes('teknologi') || lower.includes('digital') || lower.includes('saas')) {
    return `produk belum diposisikan dengan jelas untuk buyer yang benar-benar membutuhkan`;
  }

  // Fallback generic problem
  return `proses kerja dan komunikasi brand belum terstruktur, sehingga pesan ke market menjadi tidak fokus`;
}

/**
 * Derive buyerDesiredOutcome from primaryCta + targetMarket.
 */
export function deriveOutcomeFrom(primaryCta, targetMarket) {
  if (!primaryCta && !targetMarket) return '';

  // Extract outcome verb from CTA
  const ctaLower = (primaryCta || '').toLowerCase();
  if (ctaLower.includes('mulai') || ctaLower.includes('coba')) {
    return `bisa mulai menerapkan sistem yang lebih terstruktur dan terarah`;
  }
  if (ctaLower.includes('daftar') || ctaLower.includes('bergabung')) {
    return `bergabung dengan sistem yang mendukung kerja lebih efektif`;
  }
  if (ctaLower.includes('beli') || ctaLower.includes('pesan') || ctaLower.includes('checkout')) {
    return `mendapatkan tools yang siap dipakai untuk mempercepat kerja`;
  }
  if (ctaLower.includes('download') || ctaLower.includes('unduh')) {
    return `memiliki asset dan panduan yang siap pakai`;
  }
  if (ctaLower.includes('hubungi') || ctaLower.includes('konsultasi') || ctaLower.includes('wa')) {
    return `mendapatkan arahan jelas untuk memperbaiki proses saat ini`;
  }

  return `punya sistem dan arah kerja yang lebih jelas dan terukur`;
}

/**
 * Derive positioning from brandName + niche + targetMarket.
 */
export function derivePositioningFrom(brandName, niche, targetMarket) {
  if (!brandName && !niche && !targetMarket) return '';

  const effectiveNiche = niche || deriveNicheFromTargetMarket(targetMarket || '');
  const name = brandName || 'brand ini';

  return `tool dan sistem dari ${name} untuk membantu ${(targetMarket || 'buyer target').toLowerCase()} memiliki arah kerja dan komunikasi brand yang lebih terstruktur di bidang ${effectiveNiche.toLowerCase()}`;
}

// ── Main Derive Function ──

/**
 * Derive missing Brand File fields from minimal input.
 * Returns a new object with derived fields filled in.
 * Does NOT mutate the input brandFile.
 */
export function deriveBrandContext(brandFile, app = null) {
  const b = brandFile || {};

  const niche = b.niche?.trim()
    ? b.niche
    : deriveNicheFromTargetMarket(b.targetMarket || '');

  const buyerProblem = b.buyerProblem?.trim()
    ? b.buyerProblem
    : deriveProblemFrom(b.targetMarket || '', b.niche || '');

  const buyerDesiredOutcome = b.buyerDesiredOutcome?.trim()
    ? b.buyerDesiredOutcome
    : deriveOutcomeFrom(b.primaryCta || '', b.targetMarket || '');

  const positioning = b.positioning?.trim()
    ? b.positioning
    : derivePositioningFrom(b.brandName || '', b.niche || niche, b.targetMarket || '');

  const toneOfVoice = resolveToneOfVoice(b);

  // Derive project-level fields if app is provided
  const registryApp = app ? (getAppRegistryItem(app.id) || app) : null;

  const newTargetMarket = b.targetMarket?.trim()
    || (registryApp?.defaultAudience)  || '';

  const useCase = registryApp?.promptNotes?.[0] || registryApp?.coreOutcome || '';

  const primaryProblem = buyerProblem;

  const promisedOutcome = buyerDesiredOutcome;

  const differentiator = b.differentiator?.trim()
    || ((b.brandName ? `pendekatan ${b.brandName} yang lebih terstruktur` : ''))
    || '';

  const visualDirection = 'Premium operating desk, clean, credible, mobile-first, tidak berlebihan efek AI.';

  return {
    // Brand-level derived
    niche,
    buyerProblem,
    buyerDesiredOutcome,
    positioning,
    toneOfVoice,
    // Project-level derived (used when project fields are empty)
    newTargetMarket,
    useCase,
    primaryProblem,
    promisedOutcome,
    differentiator,
    visualDirection,
  };
}

/**
 * Merge derived context into brandFile + project for prompt generation.
 * User-provided values take priority; derived values fill gaps.
 */
export function mergeDerivedContext(brandFile, project, app) {
  const derived = deriveBrandContext(brandFile, app);
  const b = brandFile || {};
  const p = project || {};

  return {
    brandFile: {
      ...b,
      niche: b.niche?.trim() || derived.niche,
      buyerProblem: b.buyerProblem?.trim() || derived.buyerProblem,
      buyerDesiredOutcome: b.buyerDesiredOutcome?.trim() || derived.buyerDesiredOutcome,
      positioning: b.positioning?.trim() || derived.positioning,
      toneOfVoice: resolveToneOfVoice(b),
    },
    project: {
      ...p,
      newTargetMarket: p.newTargetMarket?.trim() || derived.newTargetMarket,
      useCase: p.useCase?.trim() || derived.useCase,
      primaryProblem: p.primaryProblem?.trim() || derived.primaryProblem,
      promisedOutcome: p.promisedOutcome?.trim() || derived.promisedOutcome,
      differentiator: p.differentiator?.trim() || derived.differentiator,
      visualDirection: p.visualDirection?.trim() || derived.visualDirection,
    },
  };
}
