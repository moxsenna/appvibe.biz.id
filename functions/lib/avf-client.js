/**
 * AppVibe Flow Event Client — posts signed domain events to AppVibe Flow Worker.
 *
 * Protocol (PRD §4.4):
 *   POST {AVF_EVENT_URL}
 *   Authorization: Bearer {AVF_API_KEY}
 *   X-AVF-Timestamp: {unix-seconds}
 *   X-AVF-Signature: sha256={HMAC-SHA256(timestamp + "." + rawBody, AVF_HMAC_SECRET)}
 *   Idempotency-Key: {source-event-uuid}
 *
 * Best-effort via waitUntil — never blocks the source request.
 */

import { sha256Hex, hmacSha256Hex } from './paycore-sign.js';

/**
 * @param {object} env       Cloudflare Pages env (secrets: AVF_EVENT_URL, AVF_API_KEY, AVF_HMAC_SECRET, AVF_PROJECT_SLUG)
 * @param {object} params
 * @param {string} params.type           Event type, e.g. "form.submitted", "payment.paid"
 * @param {object} params.contact         Contact data { name?, email?, phone?, whatsapp_opt_in? }
 * @param {object} params.data            Event-specific data { product_name?, amount?, order_id?, checkout_url?, pack_id? }
 * @param {object} [params.metadata]      Optional metadata { source?, utm_*, referrer?, lp_variant? }
 * @returns {Promise<boolean>}  true if accepted, false if not configured or failed
 */
export async function postEventToFlow(env, { type, contact, data, metadata = {} }) {
  const url = env.AVF_EVENT_URL;
  const apiKey = env.AVF_API_KEY;
  const hmacSecret = env.AVF_HMAC_SECRET;
  const projectSlug = env.AVF_PROJECT_SLUG || 'appvibe-biz-id';

  if (!url || !apiKey || !hmacSecret) return false;

  const eventId = `evt_avb_${crypto.randomUUID()}`;
  const idempotencyKey = `avb_${crypto.randomUUID()}`;
  const occurredAt = new Date().toISOString();
  const unixSeconds = Math.floor(Date.now() / 1000);

  const payload = {
    event_id: eventId,
    project_slug: projectSlug,
    type,
    occurred_at: occurredAt,
    contact: {
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      whatsapp_opt_in: contact.whatsapp_opt_in ?? true,
    },
    data: {
      ...data,
      product_name: data.product_name || '',
    },
    metadata: {
      source: 'appvibe-biz-id',
      schema_version: '2026-07-1',
      ...metadata,
    },
  };

  const rawBody = JSON.stringify(payload);
  const signPayload = `${unixSeconds}.${rawBody}`;
  const sigHex = await hmacSha256Hex(hmacSecret, signPayload);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-AVF-Timestamp': String(unixSeconds),
        'X-AVF-Signature': `sha256=${sigHex}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: rawBody,
    });

    if (!res.ok) {
      console.error('[AVF] Event rejected:', res.status, await res.text().catch(() => ''));
      return false;
    }

    const result = await res.json();
    return result.accepted === true;
  } catch (err) {
    console.error('[AVF] Event send failed:', err.message);
    return false;
  }
}
