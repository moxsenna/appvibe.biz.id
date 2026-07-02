import { summarizeAccess } from '../../lib/entitlements.js';
import { PACKS } from '../../lib/packs.js';
import { resolveSession } from '../../lib/session.js';
import {
  createPaycoreOrderForPack,
  corsHeaders,
  json,
  pickMeta,
} from '../../lib/checkout-order.js';
import {
  FULL_VAULT_UPGRADE_PURCHASE_TYPE,
  getFullVaultUpgradeOffer,
} from '../../lib/upgrades.js';

export async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, cors);
  }

  const baseUrl = env.PAYCORE_BASE_URL || 'https://pay-staging.appvibe.biz.id';
  const appId = env.PAYCORE_APP_ID || 'appvibe_vault';
  const keyId = env.PAYCORE_KEY_ID;
  const appSecret = env.PAYCORE_APP_SECRET;
  const returnUrl = env.PAYCORE_RETURN_URL || 'https://appvibe.biz.id/checkout/';

  if (!keyId || !appSecret) {
    return json(
      {
        error: 'payments_not_configured',
        message: 'Pembayaran belum siap. Hubungi support jika masalah berlanjut.',
      },
      503,
      cors,
    );
  }

  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER,
  });
  if (!session.ok) {
    return json({ error: session.error, message: session.message }, session.status, cors);
  }

  const accessSummary = summarizeAccess(session.entitlements);
  const orders = await session.repo.listOrdersByMember(session.member.id);
  const offer = getFullVaultUpgradeOffer({ accessSummary, orders });

  if (offer.reason === 'already_full_vault') {
    return json({ error: 'already_full_vault', message: 'Akun Anda sudah memiliki Full Vault.' }, 409, cors);
  }
  if (!offer.eligible) {
    const status = offer.reason === 'no_active_bundle_access' ? 403 : 422;
    return json(
      {
        error: 'upgrade_not_eligible',
        reason: offer.reason,
        message: 'Akun Anda belum memenuhi syarat untuk upgrade +50rb ke Full Vault.',
      },
      status,
      cors,
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const memberName = session.member.name || 'Member';
  const email = session.member.email_normalized || `${session.member.id}@member.appvibe.local`;
  const phoneE164 = session.member.phone_e164;
  const pack = PACKS.vault_full;
  const appIdTrigger = pickMeta(body, 'app_id');
  const lpVariant = pickMeta(body, 'lp_variant') || 'brand_studio';
  const lpPlan = pickMeta(body, 'lp_plan') || 'upgrade';
  const lpPack = pickMeta(body, 'lp_pack') || 'vault_full';
  const source = pickMeta(body, 'source') || 'brand_studio_locked_card';

  try {
    const created = await createPaycoreOrderForPack({
      repo: session.repo,
      member: session.member,
      name: memberName,
      email,
      phoneE164,
      packId: 'vault_full',
      pack,
      baseUrl,
      appId,
      keyId,
      appSecret,
      returnUrl,
      amountOverride: offer.upgradeAmount,
      purchaseTypeOverride: FULL_VAULT_UPGRADE_PURCHASE_TYPE,
      fulfillmentMeta: {
        source,
        offer_type: 'upgrade_full_vault',
        upgrade_from: 'bundle_access',
        upgrade_to: 'vault_full',
        credit_amount: String(offer.creditAmount),
        upgrade_amount: String(offer.upgradeAmount),
        lp_variant: lpVariant,
        lp_plan: lpPlan,
        lp_pack: lpPack,
        app_id: appIdTrigger,
      },
      leadMeta: {
        lp_variant: lpVariant,
        lp_plan: lpPlan,
        lp_pack: lpPack,
      },
    });

    if (!created.ok) {
      const data = await created.response.json();
      return json(data, created.response.status, cors);
    }

    return json(
      {
        ok: true,
        checkout_url: created.paycoreJson.checkout_url,
        order_id: created.paycoreJson.order_id,
        external_order_id: created.paycoreJson.external_order_id,
        payment_status: created.paycoreJson.payment_status || 'pending',
        amount: created.amount,
        purchase_type: created.purchaseType,
      },
      201,
      cors,
    );
  } catch (err) {
    console.error('[Checkout] create-upgrade-order error:', err);
    return json(
      {
        error: 'create_upgrade_order_failed',
        message: 'Gagal membuat order upgrade. Silakan coba lagi nanti.',
      },
      502,
      cors,
    );
  }
}
