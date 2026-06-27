# AppVibe Member Access Foundation — Documentation

> **Status:** Tahap 1 selesai. Cloudflare D1 + WhatsApp Magic Link via Fonnte.

---

## 1. Arsitektur

```text
Browser ──POST /api/auth/request-magic-link──► Cloudflare Pages Function
  │                                                  │
  │  normalizePhone()                                │
  │  checkRateLimit() ──► D1 (rate_limits)           │
  │  getMemberByPhone() ──► D1 (members)             │
  │  getActiveEntitlements() ──► D1 (entitlements)   │
  │  generateToken() + hashToken()                   │
  │  createMagicLink() ──► D1 (magic_links)          │
  │  sendMagicLinkWhatsApp() ──► Fonnte API          │
  │                                                  │
  ◄── "Jika nomor terdaftar, tautan akses telah      │
       dikirim melalui WhatsApp." (selalu generik)   │

WhatsApp ──menerima link──► /access/verify?token=TOKEN
  │
  │  user menekan "Lanjut masuk" (scanner protection)
  │
  └──POST /api/auth/consume-magic-link──► Cloudflare Pages Function
       │                                        │
       │  hashToken(token) + lookup by hash     │
       │  consumeMagicLink()                    │
       │  generateToken() → session token       │
       │  createSession() ──► D1 (sessions)     │
       │  Set-Cookie: av_session=TOKEN; ...     │
       │                                        │
       ◄── { ok: true, member_name } + Cookie  │

GET /api/member/me ◄── Cookie: av_session=TOKEN
  │
  │  getSessionByHash() + touchSession()
  │  getMemberById()
  │  getActiveEntitlements()
  │  summarizeAccess() → app_ids, bundle_ids
  │  listOrdersByMember()
  │
  ◄── { member_name, has_full_vault, bundle_ids, app_ids, orders }

POST /api/auth/logout ◄── Cookie: av_session=TOKEN
  │
  │  revokeSession()
  │  Set-Cookie: av_session=; Max-Age=0
  │
  ◄── { ok: true }
```

### Stack

| Layer | Technology |
|-------|-----------|
| Database | Cloudflare D1 (SQLite) |
| Auth | WhatsApp magic link (Fonnte) + session cookie |
| Payment | PayCore (signed API + signed webhooks) |
| Hosting | Cloudflare Pages + Pages Functions |

---

## 2. Struktur Tabel D1

### `members`
Satu baris per pemilik akses. `phone_e164` unik, canonical `+628xxxxxxxxxx`.
Kolom: `id, name, email_normalized, phone_e164, status, current_access, entitlement_version, first_paid_at, last_paid_at, created_at, updated_at`.

### `orders`
Append-only. Satu baris per transaksi. `paycore_order_id` unik.
Kolom: `id, member_id, paycore_order_id, external_order_id, pack_id, product_key, purchase_type, amount, currency, payment_status, fulfillment_status, paid_at, fulfilled_at, created_at, updated_at`.

### `entitlements`
Sumber utama hak akses. Unique partial index `(member_id, resource_id) WHERE status='active'` mencegah duplikat.
Kolom: `id, member_id, resource_type, resource_id, status, source_order_id, granted_at, revoked_at, created_at, updated_at`.

### `payment_events`
Idempotency webhook PayCore. `event_id` unik.
Kolom: `event_id, event_type, paycore_order_id, processed_at, status, created_at`.

### `magic_links`
Single-use, 15-menit. Hanya token hash yang disimpan.
Kolom: `id, member_id, token_hash, purpose, expires_at, used_at, requested_phone_hash, requested_ip_hash, created_at`.

### `sessions`
30-hari. Hanya token hash yang disimpan. Mendukung revoke.
Kolom: `id, member_id, token_hash, expires_at, revoked_at, last_seen_at, created_at`.

### `audit_logs`
Event penting untuk audit.
Kolom: `id, member_id, order_id, event_type, metadata_json, created_at`.

### `rate_limits`
Batas permintaan magic-link (hashed identity).
Kolom: `id, key_hash, kind, created_at`.

---

## 3. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APPVIBE_DB` | ✅ | D1 binding (set via Cloudflare dashboard / wrangler.toml) |
| `FONNTE_TOKEN` | ✅ | Fonnte API token |
| `APP_BASE_URL` | ✅ | `https://appvibe.biz.id` |
| `AUTH_TOKEN_PEPPER` | ✅ | Pepper for HMAC token/identity hashing (>= 32 chars) |
| `PAYCORE_BASE_URL` | ✅ | PayCore base URL |
| `PAYCORE_APP_ID` | ✅ | PayCore app ID |
| `PAYCORE_KEY_ID` | ✅ | PayCore signing key ID |
| `PAYCORE_APP_SECRET` | ✅ | PayCore signing secret |
| `PAYCORE_WEBHOOK_SECRET` | ✅ | PayCore webhook HMAC secret |
| `PAYCORE_RETURN_URL` | | Return URL after payment |
| `FULFILLMENT_WEBHOOK_URL` | | Forward fulfillment events |
| `LEAD_WEBHOOK_URL` | | Forward lead events |
| `ADMIN_TOKEN` | | Admin panel auth token |

---

## 4. Setup D1 Database

```bash
# 1. Create the D1 database in Cloudflare
wrangler d1 create appvibe-member-access

# 2. Copy the database_id from the output into wrangler.toml

# 3. Run migrations
wrangler d1 migrations apply appvibe-member-access --remote

# 4. For local development
wrangler d1 migrations apply appvibe-member-access --local
```

---

## 5. Konfigurasi Fonnte

1. Daftar di https://fonnte.com.
2. Salin API token dari dashboard Fonnte.
3. Set `FONNTE_TOKEN` di environment Cloudflare Pages.
4. Pastikan nomor target sudah terdaftar dan aktif di Fonnte.

---

## 6. Checklist Test End-to-End

1. ✅ Normalisasi semua format nomor Indonesia (`tests/phone.test.mjs` — 13 tests)
2. ✅ Nomor tidak terdaftar mendapat respons generik (`tests/request-magic-link.test.mjs`)
3. ✅ Member tanpa entitlement tidak dikirimi link (`tests/request-magic-link.test.mjs`)
4. ✅ Magic link valid dapat membuat session (`tests/auth-flow.test.mjs`)
5. ✅ Halaman verify tidak mengkonsumsi token otomatis (`access/verify.html` — explicit click required)
6. ✅ Magic link hanya dapat digunakan sekali (`tests/auth-flow.test.mjs`)
7. ✅ Magic link expired ditolak (`tests/auth-flow.test.mjs`)
8. ✅ Session expired/revoked ditolak (`tests/auth-flow.test.mjs`)
9. ✅ Logout menghapus akses (`tests/auth-flow.test.mjs`)
10. ✅ Duplicate event_id tidak menggandakan order/entitlement (`tests/paycore-webhook.test.mjs`)
11. ✅ Bundle sukses memberi entitlement tepat (`tests/paycore-webhook.test.mjs`)
12. ✅ vault_full membuka semua aplikasi (`tests/auth-flow.test.mjs`)
13. ✅ Endpoint lama `/api/access?email=...` mengembalikan 410 Gone (`functions/api/access.js`)
14. ✅ Checkout status tidak bisa lookup berdasarkan email (`functions/api/checkout/status.js`)
15. ✅ Data lifetime tidak memakai TTL atau KV (`migrations/0001_init.sql` — no TTL columns)

```bash
# Run all tests:
node --test tests/phone.test.mjs tests/entitlements.test.mjs tests/auth-crypto.test.mjs \
  tests/db.test.mjs tests/fonnte.test.mjs tests/rate-limit.test.mjs \
  tests/create-order.test.mjs tests/paycore-webhook.test.mjs \
  tests/request-magic-link.test.mjs tests/auth-flow.test.mjs
```

---

## 7. Prosedur Rollback

1. Kode lama masih di KV (`CHECKOUT_EVENTS`). Binding KV tidak dihapus.
2. Rollback kode: `git revert <commit-hash>` lalu redeploy.
3. Data D1 bersifat permanent — tidak perlu migrasi balik kecuali tabel dihapus.
4. Jika rollback penuh diperlukan, restore D1 dari Cloudflare dashboard (point-in-time recovery).

---

## 8. Catatan Google Sheets

Google Sheets dapat ditambahkan nanti hanya sebagai mirror/laporan (via `LEAD_WEBHOOK_URL` / `FULFILLMENT_WEBHOOK_URL`), bukan source of truth. Data canonical tetap di D1.
