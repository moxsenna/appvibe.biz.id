export const PACK_PRODUCT_KEYS = {
  advertiser: 'pack_advertiser',
  commerce: 'pack_commerce',
  creator: 'pack_creator',
  brand_launch: 'pack_branding',  // 'branding' is the PayCore product_key
  vault_full: 'vault_full_license',
};

export const PACK_PRICES = {
  advertiser: 97000,
  commerce: 97000,
  creator: 97000,
  brand_launch: 97000,
  vault_full: 199000,
};

export const vaultPacks = {
  advertiser: {
    id: 'advertiser',
    code: '01',
    label: 'Advertiser App Pack',
    product_key: 'pack_advertiser',
    amount: 97000,
    currency: 'IDR',
    scope: 'FOR MEDIA BUYERS',
    targetAudience: 'Media buyer, agency performance, mentor ads',
    audienceProblem: 'Klien butuh strategi campaign yang terukur, bukan trial-and-error di Ads Manager.',
    primaryProductName: 'Campaign Blueprint AI',
    primaryAppId: 'adsprint',
    productOutcome: 'Campaign direction, audience angles, creative brief, dan testing framework sebelum budget iklan terpakai.',
    buyerTypes: ['Media buyer', 'Affiliate', 'UMKM', 'Tim ads'],
    launchModels: ['Lifetime tool', 'Bonus mentorship', 'Agency client portal'],
    appIds: ['adsprint', 'rupa', 'adegan', 'bukti', 'mula'],
    formInterestValue: 'advertiser',
    gradient: 'linear-gradient(145deg,#eaf0ff,#dbe5ff)'
  },
  commerce: {
    id: 'commerce',
    code: '02',
    label: 'Commerce & Marketplace Pack',
    product_key: 'pack_commerce',
    amount: 99000,
    currency: 'IDR',
    scope: 'FOR ECOMMERCE OPERATORS',
    targetAudience: 'Seller mentor, marketplace operator, ecommerce agency',
    audienceProblem: 'Seller butuh listing, visual, proof, dan konten affiliate yang meningkatkan konversi dan persepsi nilai.',
    primaryProductName: 'Marketplace Growth AI',
    primaryAppId: 'katalog',
    productOutcome: 'Merchandising, listing optimization, proof asset, affiliate content system, dan campaign ads.',
    buyerTypes: ['Seller Shopee/Tokopedia', 'Agency marketplace', 'Brand owner'],
    launchModels: ['Seller toolkit', 'Bundle course', 'Member benefit'],
    appIds: ['katalog', 'rupa', 'bukti', 'pikat', 'adsprint'],
    formInterestValue: 'commerce',
    gradient: 'linear-gradient(145deg,#eef9fb,#d8eef0)'
  },
  creator: {
    id: 'creator',
    code: '03',
    label: 'Creator & Affiliate Pack',
    product_key: 'pack_creator',
    amount: 99000,
    currency: 'IDR',
    scope: 'FOR CREATOR EDUCATORS',
    targetAudience: 'Creator educator, affiliate mentor, social media agency',
    audienceProblem: 'Creator butuh sistem konten yang konsisten, bukan ide sporadis yang cepat habis.',
    primaryProductName: 'Affiliate Content Engine',
    primaryAppId: 'pikat',
    productOutcome: 'Content system, hook library, voice direction, script planning, dan persona continuity.',
    buyerTypes: ['Creator', 'Affiliate mentor', 'Social media agency'],
    launchModels: ['Creator bundle', 'Komunitas bonus', 'Access pass'],
    appIds: ['pikat', 'ritme', 'mimik', 'rupa', 'suara'],
    formInterestValue: 'creator',
    gradient: 'linear-gradient(145deg,#f1edff,#e2d8ff)'
  },
  brand_launch: {
    id: 'brand_launch',
    code: '04',
    label: 'Brand & Launch Pack',
    product_key: 'pack_branding',
    amount: 97000,
    currency: 'IDR',
    scope: 'FOR STRATEGISTS & BUILDERS',
    targetAudience: 'Brand strategist, web designer, course creator, consultant',
    audienceProblem: 'Klien butuh fondasi brand dan struktur launch yang jelas, bukan template generik yang bisa dicari di Google.',
    primaryProductName: 'Brand Compass AI',
    primaryAppId: 'arah',
    productOutcome: 'Brand foundation, launch map, website blueprint, print campaign, dan voice system.',
    buyerTypes: ['Brand strategist', 'Web designer', 'Course creator', 'Consultant'],
    launchModels: ['Mini brand kit', 'Launch program', 'Agency portal'],
    appIds: ['arah', 'mimik', 'mula', 'tayang', 'cetak'],
    formInterestValue: 'brand_launch',
    gradient: 'linear-gradient(145deg,#e8f5ee,#d2ecdc)'
  },
  vault_full: {
    id: 'vault_full',
    code: '05',
    label: 'Full Vault License',
    product_key: 'vault_full_license',
    amount: 199000,
    currency: 'IDR',
    scope: 'FULL ACCESS — 13 APPS',
    targetAudience: 'Agency, reseller, dan professional yang ingin seluruh katalog',
    audienceProblem: 'Anda ingin akses penuh ke semua aplikasi tanpa dibatasi pack.',
    primaryProductName: 'White-Label AI App Vault',
    primaryAppId: 'katalog',
    productOutcome: 'Semua 13 aplikasi dengan lisensi white-label penuh, arahan rebrand, dan kit go-to-market.',
    buyerTypes: ['Agency', 'Reseller', 'Professional'],
    launchModels: ['Full catalog', 'Reseller license', 'Enterprise access'],
    appIds: ['adsprint', 'pikat', 'rupa', 'mula', 'arah', 'cetak', 'adegan', 'suara', 'bukti', 'mimik', 'ritme', 'tayang', 'katalog'],
    formInterestValue: 'vault_full',
    gradient: 'linear-gradient(145deg,#fef8e8,#fdf0d0)'
  }
};

/** Canonical list of sellable pack IDs in display order */
export const PACK_ORDER = ['advertiser', 'commerce', 'creator', 'brand_launch', 'vault_full'];

// Expose on window for inline event handlers
if (typeof window !== 'undefined') {
  window.vaultPacks = vaultPacks;
  window.PACK_ORDER = PACK_ORDER;
}
