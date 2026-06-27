-- ===========================================================
-- AppVibe Member Access Foundation — initial schema
-- Target: Cloudflare D1 (SQLite)
-- Single source of truth for members, orders, entitlements,
-- payment events, magic links, sessions, audit logs, rate limits.
-- No TTLs. Lifetime data. Foreign keys enforced.
-- ===========================================================

-- Enable foreign-key enforcement for every connection.
-- D1 honours PRAGMA foreign_keys per statement batch.
PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------
-- members: one row per access owner. Identity = phone_e164.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  email_normalized    TEXT,
  phone_e164          TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending',   -- pending | active
  current_access      TEXT,                              -- quick summary, not authoritative
  entitlement_version INTEGER NOT NULL DEFAULT 0,
  first_paid_at       TEXT,
  last_paid_at        TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_email_normalized ON members (email_normalized);

-- -----------------------------------------------------------
-- orders: append-only permanent transaction history.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT PRIMARY KEY,
  member_id           TEXT NOT NULL REFERENCES members (id),
  paycore_order_id    TEXT NOT NULL UNIQUE,
  external_order_id   TEXT UNIQUE,
  pack_id             TEXT NOT NULL,
  product_key         TEXT NOT NULL,
  purchase_type       TEXT NOT NULL,                     -- initial_bundle | full_vault | upgrade
  amount              INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'IDR',
  payment_status      TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | failed | expired
  fulfillment_status  TEXT NOT NULL DEFAULT 'pending',   -- pending | delivered
  paid_at             TEXT,
  fulfilled_at        TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_member_id ON orders (member_id);

-- -----------------------------------------------------------
-- entitlements: authoritative access rights.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS entitlements (
  id                TEXT PRIMARY KEY,
  member_id         TEXT NOT NULL REFERENCES members (id),
  resource_type     TEXT NOT NULL,                       -- bundle | vault
  resource_id       TEXT NOT NULL,                       -- advertiser | commerce | creator | brand_launch | vault_full
  status            TEXT NOT NULL DEFAULT 'active',      -- active | revoked
  source_order_id   TEXT NOT NULL REFERENCES orders (id),
  granted_at        TEXT NOT NULL,
  revoked_at        TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entitlements_member_id ON entitlements (member_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements (status);
-- Prevent duplicate ACTIVE entitlement for the same member + resource.
CREATE UNIQUE INDEX IF NOT EXISTS uq_entitlements_active
  ON entitlements (member_id, resource_id) WHERE status = 'active';

-- -----------------------------------------------------------
-- payment_events: PayCore webhook idempotency.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_events (
  event_id          TEXT PRIMARY KEY,
  event_type        TEXT NOT NULL,
  paycore_order_id  TEXT NOT NULL,
  processed_at      TEXT NOT NULL,
  status            TEXT NOT NULL,
  created_at        TEXT NOT NULL
);

-- -----------------------------------------------------------
-- magic_links: single-use, 15-minute login tokens.
-- Only token_hash is stored — never the raw token.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS magic_links (
  id                   TEXT PRIMARY KEY,
  member_id            TEXT NOT NULL REFERENCES members (id),
  token_hash           TEXT NOT NULL UNIQUE,
  purpose              TEXT NOT NULL DEFAULT 'login',
  expires_at           TEXT NOT NULL,
  used_at              TEXT,
  requested_phone_hash TEXT,
  requested_ip_hash    TEXT,
  created_at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_links_member_id ON magic_links (member_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links (expires_at);

-- -----------------------------------------------------------
-- sessions: 30-day auth sessions. Only token_hash stored.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  member_id     TEXT NOT NULL REFERENCES members (id),
  token_hash    TEXT NOT NULL UNIQUE,
  expires_at    TEXT NOT NULL,
  revoked_at    TEXT,
  last_seen_at  TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_member_id ON sessions (member_id);

-- -----------------------------------------------------------
-- audit_logs: important security/business events.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id      TEXT,
  order_id       TEXT,
  event_type     TEXT NOT NULL,
  metadata_json  TEXT,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_member_id ON audit_logs (member_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_order_id ON audit_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

-- -----------------------------------------------------------
-- rate_limits: hashed identity buckets for magic-link spam
-- protection. One row per attempt; counted over a window.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash    TEXT NOT NULL,          -- HMAC of phone or IP (never raw)
  kind        TEXT NOT NULL,          -- phone | ip
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON rate_limits (key_hash, created_at);
