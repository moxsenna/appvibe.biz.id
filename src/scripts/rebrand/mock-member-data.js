import { APP_REGISTRY } from './app-registry.js';

function buildApps(appIds) {
  return APP_REGISTRY.filter((app) => appIds.includes(app.id)).map((app) => ({
    id: app.id,
    name: app.name,
    label: app.name.slice(0, 3).toUpperCase(),
    function: app.shortDescription,
    output: app.coreOutcome,
    rebrand: app.promptNotes?.[0] || app.name,
    prompt: app.promptNotes?.[0] || app.coreOutcome,
    accent: '#126BFF',
    packs: app.bundleIds,
  }));
}

export function getMockMemberData(mode = 'mock-full') {
  const isPartial = mode === 'mock-partial';
  const appIds = isPartial
    ? ['arah', 'mula', 'tayang', 'cetak', 'mimik']
    : APP_REGISTRY.map((app) => app.id);

  const bundleIds = isPartial
    ? ['brand_launch']
    : ['advertiser', 'commerce', 'creator', 'brand_launch'];

  const bundles = bundleIds.map((id) => ({
    id,
    name: id === 'brand_launch'
      ? 'Brand & Launch Pack'
      : id === 'advertiser'
        ? 'Advertiser App Pack'
        : id === 'commerce'
          ? 'Commerce & Marketplace Pack'
          : 'Creator & Affiliate Pack',
    resources: { marketing_kit: true, guide: true },
  }));

  return {
    member_name: isPartial ? 'QA Partial Buyer' : 'QA Full Buyer',
    first_name: 'QA',
    member_key: isPartial ? 'qa_mock_partial' : 'qa_mock_full',
    workspace_key: isPartial ? 'qa_mock_partial' : 'qa_mock_full',
    has_full_vault: !isPartial,
    bundle_ids: bundleIds,
    app_ids: appIds,
    apps: buildApps(appIds),
    bundles,
    resources: Object.fromEntries(bundleIds.map((id) => [id, { marketing_kit: true, guide: true }])),
    orders: [
      {
        order_id: isPartial ? 'QA-PARTIAL-001' : 'QA-FULL-001',
        pack_id: isPartial ? 'brand_launch' : 'vault_full',
        pack_name: isPartial ? 'Brand & Launch Pack' : 'Full AppVibe Vault',
        amount: isPartial ? 97000 : 147000,
        currency: 'IDR',
        payment_status: 'paid',
        fulfillment_status: 'delivered',
        created_at: '2026-06-30T01:00:00.000Z',
        paid_at: '2026-06-30T01:05:00.000Z',
      },
    ],
    qa_mock_mode: true,
    qa_mock_label: isPartial ? 'QA Mock Mode — Partial Access' : 'QA Mock Mode — Full Access',
  };
}

export function getQaMockMode() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('qa');
  if (mode === 'mock' || mode === 'mock-full') return 'mock-full';
  if (mode === 'mock-partial') return 'mock-partial';
  return null;
}

export function canUseQaMockMode() {
  return import.meta.env.DEV;
}
