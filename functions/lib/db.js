/**
 * Member access repository — the only layer that touches D1.
 *
 * `db` is the APPVIBE_DB D1 binding in production and a fake in tests.
 * Both expose prepare(sql).bind(...).first()/all()/run() and batch([]).
 *
 * All write paths that must be atomic go through `batch()`.
 */
import { PACKS, entitlementForPack, purchaseTypeForPack } from './packs.js';

const now = () => new Date().toISOString();

/**
 * @param {D1Database} db
 */
export function createMemberAccessRepo(db) {
  function prepare(sql) {
    return db.prepare(sql);
  }

  // ---------------- members ----------------

  async function findOrCreateMember({ name, email, phone_e164 }) {
    // Try existing first.
    const existing = await db
      .prepare('SELECT * FROM members WHERE phone_e164 = ?')
      .bind(phone_e164)
      .first();
    if (existing) return existing;

    const id = crypto.randomUUID();
    const ts = now();
    await db
      .prepare(
        `INSERT INTO members (id, name, email_normalized, phone_e164, status, entitlement_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
      )
      .bind(id, name, email ? String(email).toLowerCase() : null, phone_e164, ts, ts)
      .run();
    return { id, name, email_normalized: email ? String(email).toLowerCase() : null, phone_e164, status: 'pending', entitlement_version: 0, current_access: null, first_paid_at: null, last_paid_at: null, created_at: ts, updated_at: ts };
  }

  async function getMemberByPhone(phone_e164) {
    return db.prepare('SELECT * FROM members WHERE phone_e164 = ?').bind(phone_e164).first();
  }

  async function getMemberById(id) {
    return db.prepare('SELECT * FROM members WHERE id = ?').bind(id).first();
  }

  async function getMemberByIdWithEntitlements(id) {
    const member = await getMemberById(id);
    if (!member) return null;
    const { results: entitlements } = await db
      .prepare('SELECT * FROM entitlements WHERE member_id = ?')
      .bind(id)
      .all();
    return { ...member, entitlements };
  }

  // ---------------- orders ----------------

  async function createOrder({
    id, member_id, paycore_order_id, external_order_id,
    pack_id, product_key, purchase_type, amount, currency, created_at,
  }) {
    const ts = created_at || now();
    await db
      .prepare(
        `INSERT INTO orders (id, member_id, paycore_order_id, external_order_id, pack_id, product_key, purchase_type, amount, currency, payment_status, fulfillment_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?)`,
      )
      .bind(id, member_id, paycore_order_id, external_order_id || null, pack_id, product_key, purchase_type, amount, currency, ts, ts)
      .run();
    return { id, member_id, paycore_order_id, external_order_id, pack_id, product_key, purchase_type, amount, currency, payment_status: 'pending', fulfillment_status: 'pending', created_at: ts, updated_at: ts };
  }

  async function getOrderByPaycoreId(paycore_order_id) {
    return db.prepare('SELECT * FROM orders WHERE paycore_order_id = ?').bind(paycore_order_id).first();
  }

  async function updateOrderPaymentStatus({ paycore_order_id, payment_status }) {
    const allowed = new Set(['pending', 'paid', 'failed', 'expired', 'created']);
    if (!allowed.has(payment_status)) return null;
    const ts = now();
    await db
      .prepare('UPDATE orders SET payment_status = ?, updated_at = ? WHERE paycore_order_id = ?')
      .bind(payment_status, ts, paycore_order_id)
      .run();
    return getOrderByPaycoreId(paycore_order_id);
  }

  async function listOrdersByMember(member_id) {
    const { results } = await db
      .prepare('SELECT * FROM orders WHERE member_id = ? ORDER BY created_at DESC')
      .bind(member_id)
      .all();
    return results;
  }

  // ---------------- payment_events (idempotency) ----------------

  async function isEventSeen(event_id) {
    const row = await db.prepare('SELECT event_id FROM payment_events WHERE event_id = ?').bind(event_id).first();
    return !!row;
  }

  async function markEventSeen({ event_id, event_type, paycore_order_id, status }) {
    const ts = now();
    await db
      .prepare(
        `INSERT INTO payment_events (event_id, event_type, paycore_order_id, processed_at, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(event_id, event_type, paycore_order_id, ts, status, ts)
      .run();
  }

  // ---------------- fulfillment (atomic) ----------------

  /**
   * Atomically fulfill a paid order: mark paid + delivered, activate the
   * member, grant the entitlement (no duplicates), bump
   * entitlement_version, set current_access. Idempotent — a replay on an
   * already-delivered order is a no-op.
   */
  async function fulfillOrder({ paycore_order_id, paid_at, fulfilled_at }) {
    const order = await getOrderByPaycoreId(paycore_order_id);
    if (!order) throw new Error(`order_not_found:${paycore_order_id}`);

    // Already delivered — nothing to do.
    if (order.fulfillment_status === 'delivered') return order;

    const ts = now();
    const paidTs = paid_at || ts;
    const fulfilledTs = fulfilled_at || ts;
    const pack = PACKS[order.pack_id];
    const ent = entitlementForPack(order.pack_id);

    const statements = [
      db
        .prepare(
          `UPDATE orders SET payment_status = 'paid', fulfillment_status = 'delivered', paid_at = ?, fulfilled_at = ?, updated_at = ?
           WHERE paycore_order_id = ?`,
        )
        .bind(paidTs, fulfilledTs, ts, paycore_order_id),
    ];

    // 2. Grant entitlement. INSERT OR IGNORE so the unique partial index
    //    uq_entitlements_active(member_id, resource_id) WHERE status='active'
    //    prevents duplicate active entitlements on a rebuy of the same pack.
    //    We detect whether the grant actually added a new entitlement so the
    //    member's entitlement_version only bumps on a real access change.
    const existingEnt = await db
      .prepare(
        `SELECT id FROM entitlements WHERE member_id = ? AND resource_type = ? AND resource_id = ? AND status = 'active'`,
      )
      .bind(order.member_id, ent.resource_type, ent.resource_id)
      .first();

    if (!existingEnt) {
      const entId = crypto.randomUUID();
      statements.push(
        db.prepare(
          `INSERT OR IGNORE INTO entitlements (id, member_id, resource_type, resource_id, status, source_order_id, granted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
        )
          .bind(entId, order.member_id, ent.resource_type, ent.resource_id, order.id, fulfilledTs, ts, ts),
      );
    }

    // 3. Activate member. Bump entitlement_version only when a new entitlement
    //    was granted (a rebuy of the same pack is not an access change).
    const member = await getMemberById(order.member_id);
    const newEntitlementVersion = (member?.entitlement_version || 0) + (existingEnt ? 0 : 1);
    const firstPaid = member?.first_paid_at || paidTs;
    const accessLabel = pack?.resourceType === 'vault' ? 'Full Vault' : pack?.description || order.pack_id;

    statements.push(
      db.prepare(
        `UPDATE members
           SET status = 'active',
               entitlement_version = ?,
               current_access = ?,
               first_paid_at = ?,
               last_paid_at = ?,
               updated_at = ?
         WHERE id = ?`,
      )
        .bind(newEntitlementVersion, accessLabel, firstPaid, paidTs, ts, order.member_id),
    );

    statements.push(
      db.prepare(
        `INSERT INTO audit_logs (member_id, order_id, event_type, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(
          order.member_id,
          order.id,
          'entitlement_granted',
          JSON.stringify({ pack_id: order.pack_id, resource_type: ent.resource_type, resource_id: ent.resource_id }),
          ts,
        ),
    );

    await db.batch(statements);

    return { ...order, payment_status: 'paid', fulfillment_status: 'delivered', paid_at: paidTs, fulfilled_at: fulfilledTs };
  }

  // ---------------- entitlements ----------------

  async function getActiveEntitlements(member_id) {
    const { results } = await db
      .prepare('SELECT * FROM entitlements WHERE member_id = ? AND status = \'active\'')
      .bind(member_id)
      .all();
    return results;
  }

  // ---------------- magic_links ----------------

  async function createMagicLink({ id, member_id, token_hash, purpose, expires_at, requested_phone_hash, requested_ip_hash }) {
    const ts = now();
    await db
      .prepare(
        `INSERT INTO magic_links (id, member_id, token_hash, purpose, expires_at, used_at, requested_phone_hash, requested_ip_hash, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      )
      .bind(id, member_id, token_hash, purpose || 'login', expires_at, requested_phone_hash || null, requested_ip_hash || null, ts)
      .run();
    return { id, member_id, token_hash, purpose: purpose || 'login', expires_at, used_at: null, requested_phone_hash, requested_ip_hash, created_at: ts };
  }

  async function getMagicLinkByHash(token_hash) {
    return db.prepare('SELECT * FROM magic_links WHERE token_hash = ?').bind(token_hash).first();
  }

  async function consumeMagicLink(id) {
    const ts = now();
    await db
      .prepare('UPDATE magic_links SET used_at = ? WHERE id = ? AND used_at IS NULL')
      .bind(ts, id)
      .run();
  }

  /** Invalidate a magic link (e.g. Fonnte send failed). */
  async function invalidateMagicLink(id) {
    const ts = now();
    await db
      .prepare('UPDATE magic_links SET used_at = ? WHERE id = ? AND used_at IS NULL')
      .bind(ts, id)
      .run();
  }

  async function listMagicLinksByMember(member_id) {
    const { results } = await db
      .prepare('SELECT * FROM magic_links WHERE member_id = ? ORDER BY created_at DESC')
      .bind(member_id)
      .all();
    return results;
  }

  // ---------------- sessions ----------------

  async function createSession({ id, member_id, token_hash, expires_at }) {
    const ts = now();
    await db
      .prepare(
        `INSERT INTO sessions (id, member_id, token_hash, expires_at, revoked_at, last_seen_at, created_at)
         VALUES (?, ?, ?, ?, NULL, NULL, ?)`,
      )
      .bind(id, member_id, token_hash, expires_at, ts)
      .run();
    return { id, member_id, token_hash, expires_at, revoked_at: null, last_seen_at: null, created_at: ts };
  }

  async function getSessionByHash(token_hash) {
    return db.prepare('SELECT * FROM sessions WHERE token_hash = ?').bind(token_hash).first();
  }

  async function revokeSession(id) {
    const ts = now();
    await db
      .prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
      .bind(ts, id)
      .run();
  }

  async function touchSession(id, ts) {
    await db
      .prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
      .bind(ts, id)
      .run();
  }

  // ---------------- audit_logs ----------------

  async function insertAuditLog({ member_id, order_id, event_type, metadata_json }) {
    const ts = now();
    await db
      .prepare(
        `INSERT INTO audit_logs (member_id, order_id, event_type, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(member_id || null, order_id || null, event_type, metadata_json || null, ts)
      .run();
  }

  async function listAuditLogs(member_id) {
    const { results } = await db
      .prepare('SELECT * FROM audit_logs WHERE member_id = ? ORDER BY created_at DESC')
      .bind(member_id)
      .all();
    return results;
  }

  // ---------------- rate_limits ----------------

  async function recordRateLimit(key_hash, kind) {
    const ts = now();
    await db
      .prepare('INSERT INTO rate_limits (key_hash, kind, created_at) VALUES (?, ?, ?)')
      .bind(key_hash, kind, ts)
      .run();
  }

  async function countRateLimit(key_hash, sinceIso) {
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM rate_limits WHERE key_hash = ? AND created_at >= ?')
      .bind(key_hash, sinceIso)
      .first();
    return row?.n || 0;
  }

  return {
    findOrCreateMember,
    getMemberByPhone,
    getMemberById,
    getMemberByIdWithEntitlements,
    createOrder,
    getOrderByPaycoreId,
    updateOrderPaymentStatus,
    listOrdersByMember,
    isEventSeen,
    markEventSeen,
    fulfillOrder,
    getActiveEntitlements,
    listMagicLinksByMember,
    createMagicLink,
    getMagicLinkByHash,
    consumeMagicLink,
    invalidateMagicLink,
    createSession,
    getSessionByHash,
    revokeSession,
    touchSession,
    insertAuditLog,
    listAuditLogs,
    recordRateLimit,
    countRateLimit,
    purchaseTypeForPack,
  };
}
