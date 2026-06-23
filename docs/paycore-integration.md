# PayCore Checkout Integration — appvibe.web.id

## Tujuan

PayCore adalah payment hub untuk semua produk AppVibe. Aplikasi konsumen (`appvibe.web.id`) tidak berkomunikasi langsung dengan Duitku — semua pembayaran melalui PayCore.

## Arsitektur

```
User (LP) → Klik "Beli" → Modal checkout → Isi data → POST /api/checkout/create-order
  → Cloudflare Function → HMAC-sign → POST PayCore /v1/orders
  → PayCore buat Duitku checkout → return checkout_url
  → User redirect ke Duitku → bayar
  → Duitku callback → PayCore verifikasi → POST /api/webhooks/paycore (signed event)
  → appvibe.web.id verifikasi signature → idempotency check → fulfillment → KV persist
  → Forward ke FULFILLMENT_WEBHOOK_URL (CRM/email)
  → User kembali ke /payment/return → status polling via /api/checkout/status
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYCORE_BASE_URL` | Yes | PayCore API URL (staging/production) |
| `PAYCORE_APP_ID` | Yes | App identifier (`appvibe_vault`) |
| `PAYCORE_KEY_ID` | Yes | Key ID for HMAC signing |
| `PAYCORE_APP_SECRET` | Yes | Secret for signing requests to PayCore |
| `PAYCORE_WEBHOOK_SECRET` | Yes | Secret for verifying events from PayCore |
| `PAYCORE_RETURN_URL` | Yes | URL after Duitku payment |
| `FULFILLMENT_WEBHOOK_URL` | No | Fulfillment notification target (falls back to LEAD_WEBHOOK_URL) |
| `LEAD_WEBHOOK_URL` | No | Legacy lead capture webhook |
| `CHECKOUT_EVENTS` | Yes | KV namespace binding for orders/events |

## Endpoints

### Internal API (Cloudflare Pages Functions)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/checkout/create-order` | Create PayCore order + redirect URL |
| `GET` | `/api/checkout/status?order_id=xxx` | Poll payment/fulfillment status |
| `POST` | `/api/webhooks/paycore` | Receive payment.succeeded from PayCore |

### PayCore API (outgoing)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/orders` | Create payment order (signed) |
| `GET` | `/v1/orders/:order_id` | Get order status |

### Halaman

| Path | Description |
|------|-------------|
| `/` | Landing page dengan pack selector + checkout modal |
| `/payment/return` | Post-payment status page (status polling) |

## Alur Checkout Detail

### 1. User Pilih Pack

- Pack cards di `#niche-pack` menampilkan harga (Rp99.000 / Rp199.000)
- User klik "Beli" → modal checkout terbuka
- State: `selectedPack = null` on page load → user explicitly selects

### 2. Checkout Modal

Menampilkan:
- Daftar pack dengan harga (5 opsi: 4 niche + vault_full)
- Setelah pack dipilih: form data pembeli (nama, email, telepon)
- Tombol "Lanjut ke pembayaran — RpXXX.XXX"

### 3. Create Order (Backend)

`POST /api/checkout/create-order`

- Validasi pack_id, nama, email
- Build HMAC-signed request ke PayCore `POST /v1/orders`
- Simpan order record di KV (`CHECKOUT_EVENTS`)
- Return `checkout_url` ke frontend

### 4. Redirect ke Duitku

- Frontend redirect ke `checkout_url`
- User bayar di halaman Duitku Sandbox/Live

### 5. Return dari Duitku

- User kembali ke `PAYCORE_RETURN_URL?order_id=xxx`
- Halaman `/payment/return` polling status via `/api/checkout/status`
- JANGAN give akses — hanya display status

### 6. Webhook (Final Fulfillment)

PayCore mengirim `POST /api/webhooks/paycore` dengan:
- `X-PayCore-Event-Timestamp`
- `X-PayCore-Event-Signature: sha256=<hex>`
- `event_id`, `event_type`, `data.order_id`, dll.

Handler:
1. Verifikasi HMAC signature (timing-safe)
2. Cek timestamp skew (±5 menit)
3. Idempotency: `event_id` → KV → skip if seen
4. Cek `order_id` → skip if already fulfilled
5. Update KV: `payment_status → paid`, `fulfillment_status → delivered`
6. Forward ke `FULFILLMENT_WEBHOOK_URL`
7. Return 200

## Idempotency & Duplicate Prevention

- **event_id**: Unique constraint via KV — processed only once
- **order_id**: fulfillment_status check — only fulfilled once
- **Double-click**: Tidak dicegah di frontend — backend tidak membuat order duplikat karena setiap request punya `external_order_id` unik
- **Retry**: PayCore retry dengan `event_id` yang sama → idempotent (200)

## KV Structure

```text
order:{paycore_order_id} → { payment_status, fulfillment_status, ... }
ext:{external_order_id}  → paycore_order_id (lookup)
evt:{event_id}           → { event_type, order_id, status, at }
buyer:{email}             → paycore_order_id (last order)
fulfilled:{email}         → { order_id, pack_id, fulfilled_at }
audit:{order_id}          → [{ event, event_id, at, amount }]
```

## Tes Flow

1. Buka `https://appvibe.web.id/` (atau localhost)
2. Scroll ke `#niche-pack`, klik "Beli Advertiser Pack"
3. Di modal, isi nama/email/telepon
4. Klik "Lanjut ke pembayaran"
5. Redirect ke Duitku Sandbox
6. Bayar pilih metode (contoh: Transfer BCA)
7. Kembali ke `/payment/return`
8. Cek status: pending → paid (dalam ~30 detik)
9. Cek KV: `order:{order_id}` → `fulfillment_status = "delivered"`
10. Cek webhook log di Cloudflare Pages

## Troubleshooting

- **403 webhook**: `PAYCORE_WEBHOOK_SECRET` mismatch
- **503 create-order**: `PAYCORE_KEY_ID`/`PAYCORE_APP_SECRET` not set
- **Timeout polling**: Checkout masih pending, cek PayCore D1 `payment_orders`
- **No fulfillment**: Cek `FULFILLMENT_WEBHOOK_URL` dan KV `fulfilled:{email}`
