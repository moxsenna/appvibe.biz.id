import { vaultPacks, PACK_ORDER, PACK_PRICES } from './data/vault-packs.js';
import { checkoutStore } from './checkout-store.js';

/** Format price in IDR */
function formatPrice(amount) {
  return 'Rp' + amount.toLocaleString('id-ID');
}

/** Escape HTML to prevent injection */
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/** Templates for each checkout state */
const TEMPLATES = {
  idle() {
    const packs = PACK_ORDER.map((id) => {
      const p = vaultPacks[id];
      if (!p) return '';
      return `
        <button class="co-pack-btn" data-pack="${esc(p.id)}">
          <span class="co-pack-code">${esc(p.code)}</span>
          <div class="co-pack-info">
            <span class="co-pack-name">${esc(p.label)}</span>
            <span class="co-pack-desc">${esc(p.scope)}</span>
          </div>
          <span class="co-pack-price">${formatPrice(PACK_PRICES[p.id] || 0)}</span>
        </button>
      `;
    }).join('');

    return `
      <div class="co-view">
        <div class="co-packs">
          ${packs}
        </div>
        <p class="co-note">Pilih paket di atas untuk melanjutkan ke pembayaran.</p>
      </div>
    `;
  },

  confirm(packId) {
    const p = vaultPacks[packId];
    if (!p) return TEMPLATES.error('Paket tidak dikenal.');

    return `
      <div class="co-view">
        <div class="co-selected-pack">
          <div>
            <span class="co-selected-label">Paket dipilih</span>
            <span class="co-selected-name">${esc(p.label)}</span>
          </div>
          <span class="co-selected-price">${formatPrice(PACK_PRICES[packId] || 0)}</span>
        </div>
        <button class="co-change-pack" id="coChangePack">Ganti paket →</button>
        <form class="co-form" id="coForm">
          <div class="co-field">
            <label for="coName">Nama lengkap *</label>
            <input id="coName" name="name" type="text" required autocomplete="name"
              placeholder="Nama lengkap" />
          </div>
          <div class="co-field">
            <label for="coEmail">Email *</label>
            <input id="coEmail" name="email" type="email" required autocomplete="email"
              placeholder="email@example.com" />
          </div>
          <div class="co-field">
            <label for="coPhone">WhatsApp / telepon</label>
            <input id="coPhone" name="phone" type="tel" autocomplete="tel"
              placeholder="08xxxxxxxxxx" />
          </div>
          <button type="submit" class="btn lime full co-submit" id="coSubmit">
            Lanjut ke pembayaran — ${formatPrice(PACK_PRICES[packId] || 0)}
          </button>
          <p class="form-privacy">Dengan melanjutkan, Anda setuju dengan <a href="/terms" target="_blank">ketentuan</a> dan <a href="/privacy" target="_blank">kebijakan privasi</a> kami.</p>
        </form>
      </div>
    `;
  },

  creating() {
    return `
      <div class="co-view co-center">
        <div class="co-spinner"></div>
        <p class="co-status-text">Menyiapkan pembayaran…</p>
      </div>
    `;
  },

  success(orderId) {
    return `
      <div class="co-view co-center">
        <div class="co-icon co-icon-success">✓</div>
        <h3 class="co-result-title">Pembayaran berhasil!</h3>
        <p class="co-result-text">Akses vault akan dikirim ke email Anda dalam beberapa menit.</p>
        ${orderId ? `<p class="co-order-ref">Order ID: ${esc(orderId)}</p>` : ''}
        <div class="co-result-actions">
          <a href="/" class="btn lime">Kembali ke beranda</a>
        </div>
      </div>
    `;
  },

  failed(reason) {
    return `
      <div class="co-view co-center">
        <div class="co-icon co-icon-fail">✕</div>
        <h3 class="co-result-title">Pembayaran gagal</h3>
        <p class="co-result-text">${esc(reason || 'Silakan coba lagi dengan metode pembayaran lain.')}</p>
        <div class="co-result-actions">
          <button class="btn lime" id="coTryAgain">Coba lagi</button>
          <a href="/" class="btn ghost">Kembali ke beranda</a>
        </div>
      </div>
    `;
  },

  cancelled() {
    return `
      <div class="co-view co-center">
        <div class="co-icon co-icon-fail">✕</div>
        <h3 class="co-result-title">Pembayaran dibatalkan</h3>
        <p class="co-result-text">Anda membatalkan pembayaran. Silakan pilih paket dan coba lagi kapan saja.</p>
        <div class="co-result-actions">
          <button class="btn lime" id="coTryAgain">Coba lagi</button>
          <a href="/" class="btn ghost">Kembali ke beranda</a>
        </div>
      </div>
    `;
  },

  expired() {
    return `
      <div class="co-view co-center">
        <div class="co-icon co-icon-fail">⏱</div>
        <h3 class="co-result-title">Pembayaran kedaluwarsa</h3>
        <p class="co-result-text">Waktu pembayaran telah habis. Silakan pilih paket dan coba lagi.</p>
        <div class="co-result-actions">
          <button class="btn lime" id="coTryAgain">Coba lagi</button>
          <a href="/" class="btn ghost">Kembali ke beranda</a>
        </div>
      </div>
    `;
  },

  already_paid() {
    return `
      <div class="co-view co-center">
        <div class="co-icon co-icon-success">✓</div>
        <h3 class="co-result-title">Pembayaran sudah diproses</h3>
        <p class="co-result-text">Pembayaran untuk order ini sudah pernah berhasil. Akses akan dikirim ke email Anda.</p>
        <div class="co-result-actions">
          <a href="/" class="btn lime">Kembali ke beranda</a>
        </div>
      </div>
    `;
  },

  error(msg) {
    return `
      <div class="co-view co-center">
        <div class="co-icon co-icon-fail">!</div>
        <h3 class="co-result-title">Terjadi kesalahan</h3>
        <p class="co-result-text">${esc(msg || 'Silakan coba lagi.')}</p>
        <div class="co-result-actions">
          <button class="btn lime" id="coTryAgain">Coba lagi</button>
          <a href="/" class="btn ghost">Kembali ke beranda</a>
        </div>
      </div>
    `;
  },

  /** Waiting for payment — shown when returning from Duitku */
  pending(orderId) {
    return `
      <div class="co-view co-center">
        <div class="co-spinner"></div>
        <h3 class="co-result-title">Menunggu konfirmasi pembayaran</h3>
        <p class="co-result-text">Pembayaran sedang diverifikasi. Kami akan mengirim akses ke email Anda setelah pembayaran dikonfirmasi.</p>
        ${orderId ? `<p class="co-order-ref">Order ID: ${esc(orderId)}</p>` : ''}
        <p class="co-result-hint">Halaman ini akan otomatis memeriksa status. Silakan tunggu beberapa saat.</p>
        <div class="co-result-actions">
          <a href="/" class="btn ghost">Kembali ke beranda</a>
        </div>
      </div>
    `;
  },
};

/**
 * Initialize checkout UI.
 *
 * @param {Object} [options]
 * @param {HTMLElement} [options.container] - Dedicated page container (page mode).
 *   When omitted, renders inside the lead modal (modal mode).
 * @returns {{ getState: Function, render: Function, checkReturn: Function }}
 */
export function initCheckoutUI(options = {}) {
  const { container: externalContainer } = options;
  const isPageMode = Boolean(externalContainer);
  let modal, modalCard, pollInterval = null;

  if (!isPageMode) {
    modal = document.getElementById('leadModal');
    modalCard = modal?.querySelector('.modal-card');
    if (!modal || !modalCard) return;
  }

  /** Find or create the checkout container */
  function getContainer() {
    if (isPageMode && externalContainer) {
      return externalContainer;
    }

    // Modal mode — find/create .co-container inside modal card
    let c = modalCard.querySelector('.co-container');
    if (!c) {
      const existingForm = modalCard.querySelector('form');
      if (existingForm) existingForm.style.display = 'none';
      const existingMsg = modalCard.querySelector('.modal-message');
      if (existingMsg) existingMsg.style.display = 'none';

      c = document.createElement('div');
      c.className = 'co-container';
      modalCard.appendChild(c);
    }
    return c;
  }

  /** Render the current checkout state */
  function render(state) {
    const container = getContainer();
    const { current, packId, orderId, error } = state;

    // Stop any polling
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }

    let html;
    switch (current) {
      case 'idle':
      case 'selecting':
        html = TEMPLATES.idle();
        break;
      case 'confirm':
        html = TEMPLATES.confirm(packId);
        break;
      case 'creating':
        html = TEMPLATES.creating();
        break;
      case 'redirecting':
        // Render nothing — page is about to navigate
        html = TEMPLATES.creating();
        break;
      case 'pending':
        html = TEMPLATES.pending(orderId);
        // Start polling after returning from Duitku
        if (orderId) startPolling(orderId);
        break;
      case 'reconciling':
        html = TEMPLATES.pending(orderId);
        break;
      case 'success':
        html = TEMPLATES.success(orderId);
        fireAnalytics('success', packId, orderId);
        break;
      case 'failed':
        html = TEMPLATES.failed(error);
        break;
      case 'cancelled':
        html = TEMPLATES.cancelled();
        break;
      case 'expired':
        html = TEMPLATES.expired();
        break;
      case 'already_paid':
        html = TEMPLATES.already_paid();
        break;
      case 'error':
      default:
        html = TEMPLATES.error(error);
        break;
    }

    container.innerHTML = html;

    // Re-bind event handlers
    bindEvents(container, state);
  }

  /** Bind events after render */
  function bindEvents(container, state) {
    // Pack selection buttons
    container.querySelectorAll('.co-pack-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const packId = btn.dataset.pack;
        if (packId) {
          window.setSelectedPack?.(packId);
          checkoutStore.selectPack(packId);
        }
      });
    });

    // Change pack button
    container.querySelector('#coChangePack')?.addEventListener('click', () => {
      checkoutStore.transition('selecting');
    });

    // Form submit
    container.querySelector('#coForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleCheckoutSubmit(container);
    });

    // Try again buttons
    container.querySelector('#coTryAgain')?.addEventListener('click', () => {
      checkoutStore.transition('selecting');
    });
  }

  /** Handle form submission: create PayCore order */
  async function handleCheckoutSubmit(container) {
    const form = container.querySelector('#coForm');
    if (!form) return;

    const name = form.querySelector('#coName')?.value?.trim();
    const email = form.querySelector('#coEmail')?.value?.trim();
    const phone = form.querySelector('#coPhone')?.value?.trim();
    const packId = checkoutStore.getState().packId;

    // Validate
    if (!name || name.length < 2) {
      showFormError(form, 'Nama lengkap minimal 2 karakter.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFormError(form, 'Email valid wajib diisi.');
      return;
    }
    if (!packId) {
      showFormError(form, 'Silakan pilih paket terlebih dahulu.');
      return;
    }

    checkoutStore.transition('creating');

    // Fire InitiateCheckout
    if (typeof window.fireStandardConversions === 'function') {
      window.fireStandardConversions.checkout?.(packId, PACK_PRICES[packId] || 0);
    }
    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent('vault_checkout_attempt', {
        selected_pack: packId,
        amount: PACK_PRICES[packId] || 0,
      });
    }

    try {
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, pack_id: packId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.message || data.error || 'Gagal membuat order.';
        checkoutStore.transition('error', { error: msg });
        return;
      }

      if (!data.checkout_url) {
        checkoutStore.transition('error', { error: 'Tidak ada URL pembayaran.' });
        return;
      }

      // Store order info and redirect
      checkoutStore.transition('redirecting', {
        orderId: data.order_id,
        checkoutUrl: data.checkout_url,
      });

      // Redirect to Duitku checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      console.error('[Checkout] create-order failed:', err);
      checkoutStore.transition('error', {
        error: 'Koneksi gagal. Silakan coba lagi.',
      });
    }
  }

  /** Show inline form error */
  function showFormError(form, msg) {
    let errEl = form.querySelector('.co-form-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'co-form-error';
      form.prepend(errEl);
    }
    errEl.textContent = msg;
    setTimeout(() => {
      if (errEl.parentNode) errEl.remove();
    }, 4000);
  }

  /** Poll payment status after returning from Duitku */
  function startPolling(orderId) {
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // ~2.5 minutes

    pollInterval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/checkout/status?order_id=${encodeURIComponent(orderId)}`);
        const data = await res.json().catch(() => ({}));

        if (data.payment_status === 'paid') {
          clearInterval(pollInterval);
          pollInterval = null;
          checkoutStore.transition('success', { orderId });
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
          checkoutStore.transition('expired');
          return;
        }

        if (data.payment_status === 'already_paid' || data.fulfillment_status === 'delivered') {
          clearInterval(pollInterval);
          pollInterval = null;
          checkoutStore.transition('already_paid');
          return;
        }

        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollInterval);
          pollInterval = null;
          // Stay in pending — user can check back later
        }
      } catch (err) {
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    }, 5000);
  }

  /** Fire analytics on success */
  function fireAnalytics(stateType, packId, orderId) {
    const pack = vaultPacks[packId];
    if (!pack) return;

    if (stateType === 'success') {
      // Standard Purchase event
      if (typeof window.fireStandardConversions === 'function') {
        window.fireStandardConversions.purchase?.({
          pack_id: packId,
          amount: PACK_PRICES[packId] || 0,
          order_id: orderId,
        });
      }

      // Vault internal
      if (typeof window.trackVaultEvent === 'function') {
        window.trackVaultEvent('vault_checkout_success', {
          selected_pack: packId,
          amount: PACK_PRICES[packId] || 0,
          order_id: orderId,
        });
      }
    }
  }

  // Subscribe to store changes
  checkoutStore.subscribe(({ state }) => {
    render(state);
  });

  // Handle return from Duitku — detect order_id in URL
  function checkReturnFromPayment() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const statusParam = params.get('status') || '';

    if (orderId) {
      const currentState = checkoutStore.getState();

      // Only process if we're not already in a flow
      if (currentState.current === 'idle' || currentState.current === 'selecting') {
        // Coming from Duitku return — check status
        if (statusParam === 'failed') {
          checkoutStore.transition('failed', {
            error: 'Pembayaran tidak berhasil diselesaikan.',
          });
        } else if (statusParam === 'cancelled') {
          checkoutStore.transition('cancelled');
        } else if (statusParam === 'expired') {
          checkoutStore.transition('expired');
        } else {
          checkoutStore.transition('pending', { orderId });
        }
        return true;
      }
    }
    return false;
  }

  // Check on init (in case of direct return)
  checkReturnFromPayment();

  // Expose render for external use
  window.renderCheckout = (state) => render(state);

  return { render, checkReturnFromPayment, getState: () => checkoutStore.getState() };
}

/**
 * Open checkout modal directly with a pre-selected pack.
 * Called from LP pack selection buttons.
 */
export function openCheckoutForPack(packId, formSource = 'pack_selection') {
  if (typeof window.openModal === 'function') {
    window.openModal(formSource, packId, null);
  }
  // Give modal time to open, then set pack
  setTimeout(() => {
    window.setSelectedPack?.(packId);
    checkoutStore.selectPack(packId);
  }, 150);
}

// Expose globally for HTML onclick use
if (typeof window !== 'undefined') {
  window.openCheckoutForPack = openCheckoutForPack;
}
