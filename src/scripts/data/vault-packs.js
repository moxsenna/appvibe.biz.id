import { PACKS as CANONICAL_PACKS } from '../../../functions/lib/packs.js';

const PACK_META = {
  advertiser: {
    code: '01',
    label: 'Advertiser App Pack',
    scope: 'FOR MEDIA BUYERS',
    targetAudience: 'Media buyer, agency performance, mentor ads',
    audienceProblem: 'Klien butuh strategi campaign yang terukur, bukan trial-and-error di Ads Manager.',
    primaryProductName: 'Campaign Blueprint AI',
    primaryAppId: 'adsprint',
    productOutcome: 'Campaign direction, audience angles, creative brief, dan testing framework sebelum budget iklan terpakai.',
    buyerTypes: ['Media buyer', 'Affiliate', 'UMKM', 'Tim ads'],
    launchModels: ['Lifetime tool', 'Bonus mentorship', 'Agency client portal'],
    formInterestValue: 'advertiser',
    gradient: 'linear-gradient(145deg,#eaf0ff,#dbe5ff)',
  },
  commerce: {
    code: '02',
    label: 'Commerce & Marketplace Pack',
    scope: 'FOR ECOMMERCE OPERATORS',
    targetAudience: 'Seller mentor, marketplace operator, ecommerce agency',
    audienceProblem: 'Seller butuh listing, visual, proof, dan konten affiliate yang meningkatkan konversi dan persepsi nilai.',
    primaryProductName: 'Marketplace Growth AI',
    primaryAppId: 'katalog',
    productOutcome: 'Merchandising, listing optimization, proof asset, affiliate content system, dan campaign ads.',
    buyerTypes: ['Seller Shopee/Tokopedia', 'Agency marketplace', 'Brand owner'],
    launchModels: ['Seller toolkit', 'Bundle course', 'Member benefit'],
    formInterestValue: 'commerce',
    gradient: 'linear-gradient(145deg,#eef9fb,#d8eef0)',
  },
  creator: {
    code: '03',
    label: 'Creator & Affiliate Pack',
    scope: 'FOR CREATOR EDUCATORS',
    targetAudience: 'Creator educator, affiliate mentor, social media agency',
    audienceProblem: 'Creator butuh sistem konten yang konsisten, bukan ide sporadis yang cepat habis.',
    primaryProductName: 'Affiliate Content Engine',
    primaryAppId: 'pikat',
    productOutcome: 'Content system, hook library, voice direction, script planning, dan persona continuity.',
    buyerTypes: ['Creator', 'Affiliate mentor', 'Social media agency'],
    launchModels: ['Creator bundle', 'Komunitas bonus', 'Access pass'],
    formInterestValue: 'creator',
    gradient: 'linear-gradient(145deg,#f1edff,#e2d8ff)',
  },
  brand_launch: {
    code: '04',
    label: 'Brand & Launch Pack',
    scope: 'FOR STRATEGISTS & BUILDERS',
    targetAudience: 'Brand strategist, web designer, course creator, consultant',
    audienceProblem: 'Klien butuh fondasi brand dan struktur launch yang jelas, bukan template generik yang bisa dicari di Google.',
    primaryProductName: 'Brand Compass AI',
    primaryAppId: 'arah',
    productOutcome: 'Brand foundation, launch map, website blueprint, print campaign, dan voice system.',
    buyerTypes: ['Brand strategist', 'Web designer', 'Course creator', 'Consultant'],
    launchModels: ['Mini brand kit', 'Launch program', 'Agency portal'],
    formInterestValue: 'brand_launch',
    gradient: 'linear-gradient(145deg,#e8f5ee,#d2ecdc)',
  },
  vault_full: {
    code: '00',
    label: 'Full AppVibe Vault',
    scope: 'ALL ACCESS',
    targetAudience: 'Power users who want all packs',
  },
};

export const vaultPacks = Object.fromEntries(
  Object.entries(CANONICAL_PACKS).map(([id, pack]) => [
    id,
    {
      id,
      ...PACK_META[id],
      appIds: pack.appIds,
      amount: pack.amount,
      currency: pack.currency,
      productKey: pack.product_key,
    },
  ]),
);

export const PACK_ORDER = Object.keys(CANONICAL_PACKS).filter((id) => id !== 'vault_full');
export const PACK_PRICES = Object.fromEntries(Object.entries(CANONICAL_PACKS).map(([id, pack]) => [id, pack.amount]));
export const PACK_PRODUCT_KEYS = Object.fromEntries(Object.entries(CANONICAL_PACKS).map(([id, pack]) => [id, pack.product_key]));
