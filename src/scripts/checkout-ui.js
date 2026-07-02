import { vaultApps } from './data/vault-apps.js';
import { vaultPacks, PACK_ORDER, PACK_PRICES } from './data/vault-packs.js';
import { checkoutStore } from './checkout-store.js';
import { getCheckoutAttribution } from './tracking.js';

/** Format price in Indonesian Rupiah. */
function formatPrice(amount = 0) {
  return `Rp${Number(amount || 0).toLocaleString('id-ID')}`;
}

/** Escape values before inserting them into an HTML template. */
function esc(value = '') {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

const ACCESS_FROM_PAYMENT_URL = '/access/?from=payment';
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

function icon(name) {
  const icons = {
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2"/><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M12 14v2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="m14 7 5 5-5 5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    cards: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M8 15h3"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/></svg>',
  };
  return icons[name] || '';
}

function getApps(pack) {
  return (pack?.appIds || []).map((appId) => vaultApps[appId]).filter(Boolean);
}

function getPackMeta(pack) {
  const appCount = getApps(pack).length;
  const isVault = pack?.id === 'vault_full';

  if (isVault) {
    return {
      eyebrow: 'FULL ACCESS · PALING WORTH IT',
      heading: 'Semua produk yang Anda butuhkan untuk mulai menjual.',
      subcopy: 'Buka seluruh 4 bundle dan pilih produk yang paling tepat untuk setiap tipe buyer di audiens Anda.',
      badge: 'Buka 4 bundle sekaligus',
      valueLine: 'Tambah Rp50.000 untuk membuka 3 bundle tambahan.',
      featureRows: [
        '13 aplikasi AI siap rebrand',
        'Semua 4 niche bundle',
        'Marketing kit untuk seluruh vault',
        'Lisensi jual ulang & rebrand',
      ],
      appCount,
    };
  }

  return {
    eyebrow: `1 NICHE PACK · ${esc(pack?.scope || 'APPVIBE ACCESS')}`,
    heading: `Mulai dari produk yang paling relevan untuk audiens ${esc(pack?.targetAudience || 'Anda')}.`,
    subcopy: pack?.productOutcome || 'Akses aplikasi dan kit yang dibutuhkan untuk membentuk satu produk digital siap jual.',
    badge: `${appCount} aplikasi di dalam pack`,
    valueLine: 'Anda dapat meng-upgrade ke Full AppVibe Vault kapan saja.',
    featureRows: [
      `${appCount} aplikasi siap rebrand`,
      'Marketing kit untuk pack pilihan',
      'Lisensi jual ulang',
      'Lisensi rebrand',
    ],
    appCount,
  };
}

function renderAppGrid(pack) {
  const apps = getApps(pack);
  const visible = apps.slice(0, 13);
  const items = visible.map((app) => `
    <li class="co-app-item" title="${esc(app.name)} — ${esc(app.tagline)}">
      <span class="co-app-mark" aria-hidden="true">${esc(app.iconLabel || app.name.slice(0, 1))}</span>
      <span>${esc(app.name)}</span>
    </li>
  `).join('');

  return `
    <div class="co-summary-apps">
      <div class="co-summary-apps-head">
        <span>Produk dalam akses ini</span>
        <strong>${apps.length} aplikasi</strong>
      </div>
      <ul class="co-app-grid" aria-label="Daftar aplikasi dalam paket">
        ${items}
      </ul>
    </div>
  `;
}

function renderFeatureList(rows) {
  return `
    <ul class="co-feature-list">
      ${rows.map((row) => `<li>${icon('check')}<span>${esc(row)}</span></li>`).join('')}
    </ul>
  `;
}

function renderPackCard(packId, { recommended = false } = {}) {
  const pack = vaultPacks[packId];
  if (!pack) return '';
  const apps = getApps(pack);
  const isVault = pack.id === 'vault_full';

  return `
    <button type="button" class="co-pack-option ${recommended ? 'is-recommended' : ''}" data-pack="${esc(pack.id)}">
      <span class="co-pack-option-top">
        <span class="co-option-code">${esc(pack.code)}</span>
        ${recommended ? '<span class="co-option-badge">Paling worth it</span>' : ''}
      </span>
      <span class="co-option-name">${esc(pack.label)}</span>
      <span class="co-option-copy">${isVault ? 'Akses seluruh 4 bundle dan 13 aplikasi.' : `${apps.length} aplikasi untuk ${esc(pack.targetAudience || 'niche pilihan')}.`}</span>
      <span class="co-option-bottom">
        <strong>${formatPrice(PACK_PRICES[pack.id])}</strong>
        <span>${isVault ? 'Sekali bayar' : 'Mulai dari'}</span>
      </span>
    </button>
  `;
}

function renderSelection() {
  return `
    <section class="co-selection" aria-labelledby="coSelectionTitle">
      <div class="co-selection-intro">
        <span class="co-kicker">APPVIBE CHECKOUT</span>
        <h1 id="coSelectionTitle">Pilih akses yang paling masuk akal untuk Anda mulai.</h1>
        <p>Semua paket sudah termasuk lisensi rebrand, lisensi jual ulang, dan marketing kit. Yang berbeda hanya seberapa banyak produk yang langsung bisa Anda pasarkan.</p>
      </div>
      <div class="co-plan-grid">
        ${PACK_ORDER.map((packId) => renderPackCard(packId)).join('')}
        ${renderPackCard('vault_full', { recommended: true })}
      </div>
      <p class="co-selection-footnote">${icon('shield')} Pembayaran diproses di halaman gateway yang aman setelah Anda mengisi data.</p>
    </section>
  `;
}

function renderConfirm(packId) {
  const pack = vaultPacks[packId];
  if (!pack) return renderStatus('error', { error: 'Paket tidak dikenal.' });

  const meta = getPackMeta(pack);
  const price = PACK_PRICES[packId] || 0;
  const isVault = pack.id === 'vault_full';

  return `
    <div class="co-checkout-layout">
      <section class="co-form-card" aria-labelledby="coFormTitle">
        <div class="co-form-intro">
          <span class="co-kicker">${icon('lock')} Checkout aman</span>
          <h1 id="coFormTitle">Selesaikan akses ke ${esc(pack.label)}.</h1>
          <p>Isi data Anda untuk melanjutkan ke metode pembayaran. Akses akan dikirim setelah pembayaran terverifikasi.</p>
        </div>

        <ol class="co-steps" aria-label="Tahapan checkout">
          <li class="is-complete"><span>1</span><b>Pilih akses</b></li>
          <li class="is-active" aria-current="step"><span>2</span><b>Data Anda</b></li>
          <li><span>3</span><b>Pembayaran</b></li>
        </ol>

        <form class="co-form" id="coForm" novalidate>
          <div class="co-form-error" role="alert" aria-live="polite" hidden></div>
          <div class="co-field">
            <label for="coName">Nama lengkap <em>*</em></label>
            <input id="coName" name="name" type="text" required autocomplete="name" placeholder="Nama lengkap Anda" />
          </div>
          <div class="co-field">
            <label for="coEmail">Email <em>*</em></label>
            <input id="coEmail" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="email@contoh.com" />
            <p class="co-field-help">Detail akses dan bukti pembayaran akan dikirim ke email ini.</p>
          </div>
          <div class="co-field">
            <label for="coPhone">WhatsApp <em>*</em></label>
            <input id="coPhone" name="phone" type="tel" required autocomplete="tel" inputmode="tel" placeholder="08xxxxxxxxxx" />
          </div>
          ${TURNSTILE_SITE_KEY ? `
          <div class="co-turnstile">
            <div class="cf-turnstile" data-sitekey="${esc(TURNSTILE_SITE_KEY)}" data-action="turnstile-spin-v1"></div>
          </div>
          ` : ''}

          <div class="co-submit-area">
            <button type="submit" class="co-submit" id="coSubmit">
              <span>Amankan akses — ${formatPrice(price)}</span>
              ${icon('arrow')}
            </button>
            <div class="co-payment-note">
              ${icon('cards')}
              <span>Anda akan memilih metode pembayaran di halaman gateway berikutnya.</span>
            </div>
          </div>

          <div class="co-trust-note" style="margin-top:24px; padding:18px; border:1px solid var(--co-line-soft); border-radius:14px; background:var(--co-surface-muted);">
            <div style="display:flex; gap:12px; margin-bottom:14px; align-items:flex-start;">
              <div style="flex:none; width:36px; height:36px; border-radius:10px; background:rgba(18,107,255,.08); display:grid; place-items:center; color:var(--co-blue);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg></div>
              <div>
                <strong style="display:block; color:var(--co-text); font-size:13px; margin-bottom:3px;">Akses Instan Otomatis</strong>
                <span style="color:var(--co-muted); font-size:12px; line-height:1.5;">Akses ke seluruh vault akan langsung terbuka otomatis begitu pembayaran Anda berhasil.</span>
              </div>
            </div>
            <div style="display:flex; gap:12px; align-items:flex-start;">
              <div style="flex:none; width:36px; height:36px; border-radius:10px; background:rgba(22,134,109,.08); display:grid; place-items:center; color:var(--co-success);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></div>
              <div>
                <strong style="display:block; color:var(--co-text); font-size:13px; margin-bottom:3px;">Dukungan Admin via WhatsApp</strong>
                <span style="color:var(--co-muted); font-size:12px; line-height:1.5;">Butuh bantuan kapan pun? Admin kami siap merespons via chat <a href="https://wa.me/6285117259331" target="_blank" rel="noopener noreferrer" style="color:var(--co-success); font-weight:600;">0851-1725-9331</a>.</span>
              </div>
            </div>
          </div>

          <p class="co-privacy-note">Dengan melanjutkan, Anda menyetujui <a href="/terms" target="_blank" rel="noopener noreferrer">ketentuan</a> dan <a href="/privacy" target="_blank" rel="noopener noreferrer">kebijakan privasi</a> AppVibe.</p>
        </form>
      </section>

      <aside class="co-summary-card" aria-label="Ringkasan pesanan">
        <div class="co-summary-top">
          <span class="co-summary-badge">${esc(meta.eyebrow)}</span>
          <button type="button" class="co-change-pack" id="coChangePack">Ganti akses</button>
        </div>
        <h2>${esc(pack.label)}</h2>
        <p class="co-summary-copy">${esc(meta.heading)}</p>

        <div class="co-price-block">
          <span>Total pembayaran</span>
          <strong>${formatPrice(price)}</strong>
          <small>Sekali bayar · akses lifetime</small>
        </div>

        ${isVault ? `<p class="co-value-callout">${icon('spark')} ${esc(meta.valueLine)}</p>` : ''}
        ${renderFeatureList(meta.featureRows)}
        ${renderAppGrid(pack)}

        <div class="co-license-note">
          ${icon('shield')}
          <p><strong>Hak penggunaan:</strong> jual ulang dan rebrand menjadi produk ber-brand Anda sendiri.</p>
        </div>
      </aside>
    </div>
  `;
}

function renderLoading() {
  return `
    <section class="co-status-card co-status-loading" aria-live="polite">
      <span class="co-loader" aria-hidden="true"></span>
      <p class="co-kicker">MENYIAPKAN CHECKOUT</p>
      <h1>Mengarahkan Anda ke metode pembayaran…</h1>
      <p>Mohon jangan tutup halaman ini.</p>
    </section>
  `;
}

function renderStatus(type, { orderId, error } = {}) {
  const definitions = {
    success: {
      mark: '✓',
      kicker: 'PEMBAYARAN BERHASIL',
      title: 'Akses Anda sudah siap.',
      text: 'Kami akan mengarahkan Anda ke halaman akses. Masukkan nomor WhatsApp checkout untuk menerima tautan login.',
      action: `<a href="${ACCESS_FROM_PAYMENT_URL}" class="co-status-primary">Lihat akses saya →</a>`,
    },
    failed: {
      mark: '!',
      kicker: 'PEMBAYARAN GAGAL',
      title: 'Pembayaran belum berhasil diproses.',
      text: error || 'Silakan coba kembali dengan metode pembayaran lain.',
      action: '<button type="button" class="co-status-primary" id="coTryAgain">Coba lagi</button>',
    },
    cancelled: {
      mark: '—',
      kicker: 'PEMBAYARAN DIBATALKAN',
      title: 'Tidak ada pembayaran yang diproses.',
      text: 'Anda dapat kembali memilih akses dan melanjutkan kapan saja.',
      action: '<button type="button" class="co-status-primary" id="coTryAgain">Pilih akses lagi</button>',
    },
    expired: {
      mark: '⌁',
      kicker: 'PEMBAYARAN KEDALUWARSA',
      title: 'Waktu pembayaran sudah habis.',
      text: 'Silakan mulai checkout kembali untuk mendapatkan tautan pembayaran baru.',
      action: '<button type="button" class="co-status-primary" id="coTryAgain">Buat pembayaran baru</button>',
    },
    already_paid: {
      mark: '✓',
      kicker: 'ORDER SUDAH DIBAYAR',
      title: 'Pembayaran untuk order ini sudah diterima.',
      text: 'Akses sudah tersedia. Tidak perlu melakukan pembayaran ulang.',
      action: `<a href="${ACCESS_FROM_PAYMENT_URL}" class="co-status-primary">Lihat akses saya →</a>`,
    },
    preparing_access: {
      mark: '…',
      kicker: 'PEMBAYARAN DITERIMA',
      title: 'Menyiapkan akses Anda.',
      text: 'Pembayaran sudah diterima. Halaman ini akan lanjut otomatis setelah akses aktif.',
      action: '<a href="/" class="co-status-secondary">Kembali ke beranda</a>',
    },
    pending: {
      mark: '…',
      kicker: 'MENUNGGU KONFIRMASI',
      title: 'Pembayaran sedang diverifikasi.',
      text: 'Halaman ini akan memeriksa status secara otomatis. Akses dikirim setelah pembayaran terkonfirmasi.',
      action: '<a href="/" class="co-status-secondary">Kembali ke beranda</a>',
    },
    error: {
      mark: '!',
      kicker: 'TERJADI KESALAHAN',
      title: 'Checkout belum dapat dilanjutkan.',
      text: error || 'Silakan coba kembali dalam beberapa saat.',
      action: '<button type="button" class="co-status-primary" id="coTryAgain">Coba lagi</button>',
    },
  };

  const status = definitions[type] || definitions.error;
  return `
    <section class="co-status-card co-status-${esc(type)}" aria-live="polite">
      <span class="co-status-mark" aria-hidden="true">${status.mark}</span>
      <p class="co-kicker">${status.kicker}</p>
      <h1>${status.title}</h1>
      <p>${esc(status.text)}</p>
      ${orderId ? `<p class="co-order-reference">Referensi order: <strong>${esc(orderId)}</strong></p>` : ''}
      <div class="co-status-actions">${status.action}</div>
    </section>
  `;
}

function pushCheckoutEvent(eventName, packId, orderId) {
  const pack = vaultPacks[packId];
  if (!pack) return;

  const amount = PACK_PRICES[packId] || 0;
  const lpVariant = sessionStorage.getItem('lp_variant') || '';
  const lpPlan = sessionStorage.getItem('lp_plan') || '';
  const payload = {
    event: eventName,
    currency: 'IDR',
    value: amount,
    pack_id: packId,
    pack_name: pack.label,
    order_id: orderId || undefined,
    lp_variant: lpVariant,
    lp_plan: lpPlan,
  };

  if (typeof window.trackVaultEvent === 'function') {
    window.trackVaultEvent(`vault_${eventName}`, payload);
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(payload);
  }

  if (eventName === 'add_to_cart') {
    window.fbq?.('track', 'AddToCart', { value: amount, currency: 'IDR', content_name: pack.label });
    window.gtag?.('event', 'add_to_cart', { currency: 'IDR', value: amount, items: [{ item_id: packId, item_name: pack.label, price: amount, quantity: 1 }] });
  }

  if (eventName === 'begin_checkout') {
    window.fbq?.('track', 'InitiateCheckout', { value: amount, currency: 'IDR', content_name: pack.label });
    window.gtag?.('event', 'begin_checkout', { currency: 'IDR', value: amount, items: [{ item_id: packId, item_name: pack.label, price: amount, quantity: 1 }] });
  }

  if (eventName === 'purchase') {
    window.fbq?.('track', 'Purchase', { value: amount, currency: 'IDR', content_name: pack.label });
    window.gtag?.('event', 'purchase', { transaction_id: orderId || undefined, currency: 'IDR', value: amount, items: [{ item_id: packId, item_name: pack.label, price: amount, quantity: 1 }] });
  }
}

/**
 * Initialize checkout UI for the dedicated checkout page or modal mode.
 * The backend contract remains unchanged: POST /api/checkout/create-order
 * with { name, email, phone, pack_id }, then redirect to checkout_url.
 */
export function initCheckoutUI({ container } = {}) {
  if (!container) throw new Error('Checkout container required');
  let pollInterval = null;
  const trackedPurchases = new Set();
  const trackedATCs = new Set();

  function getContainer() { return container; }

  function render(state) {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }

    const { current, packId, orderId, error } = state;
    let html = '';

    switch (current) {
      case 'idle':
      case 'selecting':
        html = renderSelection();
        break;
      case 'confirm':
        html = renderConfirm(packId);
        if (packId && !trackedATCs.has(packId)) {
          trackedATCs.add(packId);
          pushCheckoutEvent('add_to_cart', packId);
        }
        break;
      case 'creating':
      case 'redirecting':
        html = renderLoading();
        break;
      case 'pending':
        html = renderStatus('pending', { orderId });
        if (orderId) startPolling(orderId);
        break;
      case 'reconciling':
        html = renderStatus('preparing_access', { orderId });
        if (orderId) startPolling(orderId);
        break;
      case 'success':
        html = renderStatus('success', { orderId });
        if (packId && !trackedPurchases.has(orderId || packId)) {
          trackedPurchases.add(orderId || packId);
          pushCheckoutEvent('purchase', packId, orderId);
        }
        break;
      case 'failed':
        html = renderStatus('failed', { error });
        break;
      case 'cancelled':
        html = renderStatus('cancelled');
        break;
      case 'expired':
        html = renderStatus('expired');
        break;
      case 'already_paid':
        html = renderStatus('already_paid', { orderId });
        break;
      case 'error':
      default:
        html = renderStatus('error', { error });
        break;
    }

    const container = getContainer();
    container.innerHTML = html;
    bindEvents(container);
  }

  function bindEvents(container) {
    container.querySelectorAll('[data-pack]').forEach((button) => {
      button.addEventListener('click', () => {
        const packId = button.dataset.pack;
        if (packId && vaultPacks[packId]) checkoutStore.selectPack(packId);
      });
    });

    container.querySelector('#coChangePack')?.addEventListener('click', () => {
      checkoutStore.transition('selecting');
    });

    container.querySelector('#coForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await handleCheckoutSubmit(container);
    });

    container.querySelector('#coTryAgain')?.addEventListener('click', () => {
      checkoutStore.transition('selecting');
    });
  }

  function showFormError(form, message) {
    const errorElement = form.querySelector('.co-form-error');
    if (!errorElement) return;
    errorElement.textContent = message;
    errorElement.hidden = false;
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function handleCheckoutSubmit(container) {
    const form = container.querySelector('#coForm');
    if (!form) return;

    const name = form.querySelector('#coName')?.value?.trim();
    const email = form.querySelector('#coEmail')?.value?.trim();
    const phone = form.querySelector('#coPhone')?.value?.trim();
    const packId = checkoutStore.getState().packId;
    const turnstileToken = form.querySelector('[name="cf-turnstile-response"]')?.value || '';

    if (!name || name.length < 2) {
      showFormError(form, 'Nama lengkap minimal 2 karakter.');
      form.querySelector('#coName')?.focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFormError(form, 'Masukkan alamat email yang valid.');
      form.querySelector('#coEmail')?.focus();
      return;
    }
    if (!phone || phone.length < 8) {
      showFormError(form, 'Masukkan nomor WhatsApp yang valid.');
      form.querySelector('#coPhone')?.focus();
      return;
    }
    if (!packId || !vaultPacks[packId]) {
      showFormError(form, 'Silakan pilih akses terlebih dahulu.');
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      showFormError(form, 'Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }

    checkoutStore.transition('creating', { buyerEmail: email, buyerName: name });
    pushCheckoutEvent('begin_checkout', packId);

    try {
      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          pack_id: packId,
          turnstile_token: turnstileToken,
          ...getCheckoutAttribution(),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        checkoutStore.transition('error', { error: data.message || data.error || 'Gagal membuat order.' });
        return;
      }
      if (!data.checkout_url) {
        checkoutStore.transition('error', { error: 'URL pembayaran tidak tersedia. Silakan coba lagi.' });
        return;
      }

      checkoutStore.transition('redirecting', {
        orderId: data.order_id,
        checkoutUrl: data.checkout_url,
      });
      // Persist buyer email across payment redirect + return
      try { sessionStorage.setItem('av_checkout_email', email); } catch {}
      try { sessionStorage.setItem('av_checkout_phone', phone); } catch {}
      window.location.assign(data.checkout_url);
    } catch (error) {
      console.error('[Checkout] create-order failed:', error);
      checkoutStore.transition('error', { error: 'Koneksi bermasalah. Silakan cek internet Anda lalu coba lagi.' });
    }
  }

  function startPolling(orderId) {
    let attempts = 0;
    const maxAttempts = 30;

    pollInterval = window.setInterval(async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/checkout/status?order_id=${encodeURIComponent(orderId)}`);
        const data = await response.json().catch(() => ({}));

        if (data.fulfillment_status === 'delivered') {
          clearInterval(pollInterval);
          pollInterval = null;
          checkoutStore.transition('success', { orderId });
          window.setTimeout(() => window.location.assign(ACCESS_FROM_PAYMENT_URL), 800);
          return;
        }
        if (data.payment_status === 'paid') {
          const current = checkoutStore.getState().current;
          if (current !== 'reconciling') checkoutStore.transition('reconciling', { orderId });
          return;
        }
        if (data.payment_status === 'failed') {
          clearInterval(pollInterval);
          pollInterval = null;
          checkoutStore.transition('failed', { error: 'Pembayaran gagal diproses.' });
          return;
        }
        if (data.payment_status === 'expired') {
          clearInterval(pollInterval);
          pollInterval = null;
          checkoutStore.transition('expired', { orderId });
          return;
        }
        if (data.payment_status === 'already_paid') {
          clearInterval(pollInterval);
          pollInterval = null;
          checkoutStore.transition('already_paid', { orderId });
          window.setTimeout(() => window.location.assign(ACCESS_FROM_PAYMENT_URL), 800);
          return;
        }
      } catch (error) {
        console.warn('[Checkout] status poll failed:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }, 5000);
  }

  function checkReturnFromPayment() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const status = params.get('status') || '';

    if (!orderId) return false;

    const currentState = checkoutStore.getState();
    if (!['idle', 'selecting'].includes(currentState.current)) return false;

    if (status === 'failed') {
      checkoutStore.transition('failed', { orderId, error: 'Pembayaran tidak berhasil diselesaikan.' });
    } else if (status === 'cancelled') {
      checkoutStore.transition('cancelled', { orderId });
    } else if (status === 'expired') {
      checkoutStore.transition('expired', { orderId });
    } else {
      checkoutStore.transition('pending', { orderId });
    }
    return true;
  }

  checkoutStore.subscribe(({ state }) => render(state));
  const returnedFromPayment = checkReturnFromPayment();
  if (!returnedFromPayment) render(checkoutStore.getState());

  window.renderCheckout = (state) => render(state);
  return { render, checkReturnFromPayment, getState: () => checkoutStore.getState() };
}
