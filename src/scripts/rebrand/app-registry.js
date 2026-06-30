import { PACKS } from '../../../functions/lib/packs.js';
import { vaultApps } from '../data/vault-apps.js';

export const APP_CATEGORY_LABELS = {
  strategy: 'Strategy',
  launch: 'Launch',
  content: 'Content',
  visual: 'Visual',
  campaign: 'Ads',
  website: 'Website',
  marketplace: 'Marketplace',
  video: 'Video',
  voice: 'Voice',
  proof: 'Proof',
  persona: 'Persona',
  planning: 'Planning',
  print: 'Print',
};

const REGISTRY_BY_ID = {
  arah: {
    id: 'arah',
    name: 'ARAH',
    shortDescription: 'Brand strategy and positioning workspace.',
    category: 'strategy',
    defaultAudience: 'Founders, agencies, and product owners.',
    coreOutcome: 'Build a clear brand direction and positioning system.',
    nonNegotiableLogic: [
      'Keep all brand strategy workflow steps.',
      'Keep existing inputs, structured outputs, and export behavior.',
      'Do not remove planning modules or result sections.',
    ],
    promptNotes: ['Best repositioned as a brand foundation, strategy, or client-discovery product.'],
  },
  mula: {
    id: 'mula',
    name: 'MULA',
    shortDescription: 'Launch campaign planning workspace.',
    category: 'launch',
    defaultAudience: 'Creators, service providers, and product launchers.',
    coreOutcome: 'Plan and package a launch campaign.',
    nonNegotiableLogic: [
      'Keep launch planning logic and all timeline/output modules.',
      'Do not remove campaign brief inputs or generated deliverable sections.',
    ],
    promptNotes: ['Keep timeline and campaign planning as the heart of the product.'],
  },
  pikat: {
    id: 'pikat',
    name: 'PIKAT',
    shortDescription: 'Affiliate content generation workspace.',
    category: 'content',
    defaultAudience: 'Affiliate marketers and commerce creators.',
    coreOutcome: 'Create content angles and affiliate promotion assets.',
    nonNegotiableLogic: [
      'Keep all content generation workflows and content format options.',
      'Retain the existing input-to-output logic.',
    ],
    promptNotes: ['Useful as a creator, affiliate, seller, or content-engine product.'],
  },
  rupa: {
    id: 'rupa',
    name: 'RUPA',
    shortDescription: 'Visual commerce and creative direction workspace.',
    category: 'visual',
    defaultAudience: 'Product sellers, agencies, and visual marketers.',
    coreOutcome: 'Create visual directions and image prompts for products.',
    nonNegotiableLogic: [
      'Keep visual brief structure and all output types.',
      'Retain image prompt and asset planning logic.',
    ],
    promptNotes: ['Keep visual brief, product context, and asset planning visible.'],
  },
  adsprint: {
    id: 'adsprint',
    name: 'ADSprint',
    shortDescription: 'Campaign command center for ad planning.',
    category: 'campaign',
    defaultAudience: 'Performance marketers and local business operators.',
    coreOutcome: 'Plan paid campaign angles and campaign assets.',
    nonNegotiableLogic: [
      'Keep campaign workflow, planning modules, and state management.',
      'Do not remove ad angle or campaign brief sections.',
    ],
    promptNotes: ['Position around campaign clarity before media budget is spent.'],
  },
  cetak: {
    id: 'cetak',
    name: 'CETAK',
    shortDescription: 'Print campaign and offline promotional asset planner.',
    category: 'print',
    defaultAudience: 'Local businesses, events, and offline marketers.',
    coreOutcome: 'Plan print campaign concepts and print asset copy.',
    nonNegotiableLogic: [
      'Keep print campaign workflow and output sections.',
      'Do not remove asset planning options.',
    ],
    promptNotes: ['Good for offline campaign, event, or local-business offers.'],
  },
  adegan: {
    id: 'adegan',
    name: 'ADEGAN',
    shortDescription: 'Video treatment and storyboard direction workspace.',
    category: 'video',
    defaultAudience: 'Video marketers, creators, and agencies.',
    coreOutcome: 'Create video treatment, storyboard, and scene direction.',
    nonNegotiableLogic: [
      'Keep storyboard, treatment, and scene planning workflows.',
      'Do not remove duration, style, or output controls.',
    ],
    promptNotes: ['Rebrand around video concept clarity, UGC planning, or ad scripting.'],
  },
  suara: {
    id: 'suara',
    name: 'SUARA',
    shortDescription: 'Voice direction and audio scripting workspace.',
    category: 'voice',
    defaultAudience: 'Creators, ad producers, and content marketers.',
    coreOutcome: 'Plan voice direction, audio tone, and script delivery.',
    nonNegotiableLogic: [
      'Keep voice direction fields and output modules.',
      'Do not remove audio/voice configuration logic.',
    ],
    promptNotes: ['Useful for podcast, voice-over, brand voice, or audio identity niches.'],
  },
  bukti: {
    id: 'bukti',
    name: 'BUKTI',
    shortDescription: 'Social proof and evidence presentation workspace.',
    category: 'proof',
    defaultAudience: 'Service businesses, creators, and product sellers.',
    coreOutcome: 'Package real proof into credible marketing assets.',
    nonNegotiableLogic: [
      'Keep evidence categorization and proof presentation workflow.',
      'Never create fictional proof or testimonials.',
    ],
    promptNotes: ['Only reposition around real evidence; never generate fake testimonials.'],
  },
  mimik: {
    id: 'mimik',
    name: 'MIMIK',
    shortDescription: 'Persona continuity and brand character workspace.',
    category: 'persona',
    defaultAudience: 'Creators, agencies, and brands needing consistent voice.',
    coreOutcome: 'Maintain consistent persona and brand voice.',
    nonNegotiableLogic: [
      'Keep persona profile, consistency, and output workflow.',
      'Do not remove character/voice continuity controls.',
    ],
    promptNotes: ['Works well as a brand voice, creator persona, or communication system.'],
  },
  ritme: {
    id: 'ritme',
    name: 'RITME',
    shortDescription: 'Editorial rhythm and content planning workspace.',
    category: 'planning',
    defaultAudience: 'Content teams, creators, and social media managers.',
    coreOutcome: 'Plan consistent editorial content cadence.',
    nonNegotiableLogic: [
      'Keep calendar, content cadence, and editorial planning flows.',
      'Do not remove schedule or format planning logic.',
    ],
    promptNotes: ['Rebrand around editorial consistency, content cadence, or community publishing.'],
  },
  tayang: {
    id: 'tayang',
    name: 'TAYANG',
    shortDescription: 'Website blueprint and landing page planning workspace.',
    category: 'website',
    defaultAudience: 'Businesses, agencies, and digital product sellers.',
    coreOutcome: 'Create website and landing page blueprints.',
    nonNegotiableLogic: [
      'Keep website blueprint inputs, page structure, and output modules.',
      'Do not remove conversion or information architecture sections.',
    ],
    promptNotes: ['A strong fit for web designers, funnel builders, and service agencies.'],
  },
  katalog: {
    id: 'katalog',
    name: 'KATALOG',
    shortDescription: 'Marketplace merchandising workspace.',
    category: 'marketplace',
    defaultAudience: 'Marketplace sellers, commerce brands, and resellers.',
    coreOutcome: 'Improve product catalog presentation and marketplace merchandising.',
    nonNegotiableLogic: [
      'Keep merchandising workflow, catalog fields, and output sections.',
      'Do not remove marketplace optimization logic.',
    ],
    promptNotes: ['Rebrand around marketplace growth, listing clarity, or seller operations.'],
  },
};

export function bundleIdsForApp(appId) {
  return Object.entries(PACKS)
    .filter(([packId, pack]) => packId !== 'vault_full' && pack.appIds.includes(appId))
    .map(([packId]) => packId);
}

export const APP_REGISTRY = PACKS.vault_full.appIds.map((appId) => ({
  ...REGISTRY_BY_ID[appId],
  exampleRebrandName: vaultApps[appId]?.exampleRebrandName || REGISTRY_BY_ID[appId]?.name || appId,
  buyerTypes: vaultApps[appId]?.buyerTypes || [],
  bundleIds: bundleIdsForApp(appId),
}));

export function getAppRegistryItem(appId) {
  return APP_REGISTRY.find((app) => app.id === appId) || null;
}

export function getCategoryLabel(category) {
  return APP_CATEGORY_LABELS[category] || category;
}
