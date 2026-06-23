/**
 * checkout.js — Dedicated conversion checkout page logic.
 * Handles offer validation, form submission, payment redirect, and return polling.
 */
import { PLANS, vaultPacks, validateOffer, getAppIdsForOffer, getPackLabel } from '../scripts/data/offer-catalog.js';

/* ---- State ---- */
let state = {
  planId: null,
  packId: null,
  plan: null,
  pack: null,
  submitting: false,
  pollingTimer: null,
  pollAttempts: 0,
};

const MAX_POLL_ATTEMPTS = 40;
const POLL_INTERVAL = 5000;
const CREATE_ORDER_ENDPOINT = '/api/checkout/create-order';
const STATUS_ENDPOINT = '/api/checkout/status';

/* ---- DOM refs ---- */
let els = {};

function cacheDoms() {
  els = {
    wrapper: document.getElementById('co-wrapper'),
    orderSummary: document.getElementById('co-order-summary'),
    offerName: document.getElementById('co-offer-name'),
    offerPrice: document.getElementById('co-offer-price'),
    once: document.getElementById('co-once'),
    packName: document.getElementById('co-pack-name'),
    appList: document.getElementById('co-app-list'),
    licenseNote: document.getElementById('co-license-note'),
    changeLink: document.getElementById('co-change-link'),
    formCard: document.getElementById('co-form-card'),
    form: document.getElementById('co-form'),
    nameInput: document.getElementById('co-name'),
    emailInput: document.getElementById('co-email'),
    phoneInput: document.getElementById('co-phone'),
    agreeCheck: document.getElementById('co-agree'),
    submitBtn: document.getElementById('co-submit'),
    submitError: document.getElementById('co-submit-error'),
    returnView: document.getElementById('co-return-view'),
    statusIcon: document.getElementById('co-status-icon'),
    statusBadge: document.getElementById('co-status-badge'),
    statusTitle: document.getElementById('co-status-title'),
    statusDesc: document.getElementById('co-status-desc'),
    statusAction: document.getElementById('co-status-action'),
    invalidView: document.getElementById('co-invalid'),
    errorMessage: document.getElementById('co-error-message'),
  };
}

/* ---- Tracking ---- */
function trackCheckoutEvent(eventName, extra) {
  const base = {
    plan_id: state.planId,
    plan_name: state.plan?.name || null,
    pack_id: state.packId,
    value: state.plan?.price || 0,
    currency: 'IDR',
    entry_point: getUrlParam('ref') || 'direct',
  };

  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  utmKeys.forEach((key) => {
    const val = getUrlParam(key) || sessionStorage.getItem(key);
    if (val) base[key] = val;
  });

  const props = { ...base, ...extra };

  if (typeof window.trackVaultEvent === 'function') {
    window.trackVaultEvent(eventName, props);
  }

  if (eventName === 'vault_checkout_submit' && typeof window.fireStandardConversions === 'function') {
    window.fireStandardConversions({
      event: 'checkout',
      value: state.plan?.price || 0,
      currency: 'IDR',
      content_ids: [state.packId || state.planId],
      content_type: 'product',
    });
  }
}

/* ---- URL helpers ---- */
function getUrlParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function getOfferFromUrl() {
  const planId = getUrlParam('plan');
  const packId = getUrlParam('pack') || null;
  return { planId, packId };
}

/* ---- Rendering ---- */
function renderInvalidOffer(message) {
  els.formCard.style.display = 'none';
  els.orderSummary.style.display = 'none';
  els.returnView.style.display = 'none';
  els.invalidView.style.display = 'block';
  if (els.errorMessage) els.errorMessage.textContent = message;

  trackCheckoutEvent('vault_checkout_offer_invalid', { error: message });
}

function renderOffer() {
  const { plan, pack } = state;

  if (state.planId === 'full-vault') {
    els.offerName.textContent = 'Full AppVibe Vault';
    els.packName.style.display = 'none';
    els.once.textContent = 'Sekali bayar · Tidak ada biaya bulanan · Semua 4 pack dan 13 aplikasi';
  } else if (pack) {
    els.offerName.textContent = `${plan.name}`;
    els.packName.textContent = pack.label;
    els.packName.style.display = 'block';
    els.once.textContent = 'Sekali bayar · Tidak ada biaya bulanan';
  }

  els.offerPrice.textContent = plan.priceLabel;

  const appIds = getAppIdsForOffer(state.planId, state.packId);
  const appNames = appIds.map((id) => {
    const app = vaultPacks[id];
    return app ? app.label : id;
  });

  els.appList.innerHTML = appNames
    .map((name) => `<li>${name}</li>`)
    .join('');

  els.licenseNote.innerHTML =
    'Termasuk: marketing kit · lisensi rebrand · hak menjual akses produk jadi ke end user. ' +
    '<strong>Tidak termasuk</strong> hak menjual file inti/template atau meneruskan white-label license.';

  els.changeLink.href = '/#harga';

  els.submitBtn.textContent = `Lanjut ke Pembayaran Aman — ${plan.priceLabel}`;

  trackCheckoutEvent('vault_checkout_view');
}

function showReturnView(orderId) {
  els.formCard.style.display = 'none';
  els.returnView.classList.add('show');
  els.statusBadge.textContent = 'Menunggu pembayaran';
  els.statusBadge.className = 'co-status-badge pending';
  els.statusTitle.textContent = 'Menunggu konfirmasi pembayaran';
  els.statusDesc.textContent = 'Pembayaran sedang diproses. Halaman ini akan diperbarui secara otomatis.';
  els.statusAction.style.display = 'none';
  startPolling(orderId);
}

function showSuccess() {
  clearPolling();
  els.returnView.classList.add('show');
  els.statusIcon.textContent = '✅';
  els.statusBadge.textContent = 'Pembayaran berhasil';
  els.statusBadge.className = 'co-status-badge success';
  els.statusTitle.textContent = 'Pembayaran diterima!';
  els.statusDesc.innerHTML =
    'Akses Anda sedang diproses. Tim kami akan mengirim detail login dan panduan ke <strong>' +
    (els.emailInput?.value || 'email Anda') +
    '</strong> dalam waktu 1×24 jam.';
  els.statusAction.style.display = 'inline-block';
  els.statusAction.textContent = 'Kembali ke halaman utama';
  els.statusAction.href = '/';
}

function showFailed(status) {
  clearPolling();
  els.returnView.classList.add('show');
  els.statusIcon.textContent = '❌';
  els.statusBadge.textContent = 'Pembayaran gagal';
  els.statusBadge.className = 'co-status-badge failed';
  els.statusTitle.textContent = 'Pembayaran tidak berhasil';

  const messages = {
    failed: 'Pembayaran ditolak. Silakan coba lagi dengan metode pembayaran lain.',
    cancelled: 'Pembayaran dibatalkan. Anda dapat memilih ulang paket kapan saja.',
    expired: 'Sesi pembayaran kedaluwarsa. Silakan mulai checkout ulang.',
  };
  els.statusDesc.textContent = messages[status] || 'Terjadi kendala saat memproses pembayaran. Silakan coba lagi.';
  els.statusAction.style.display = 'inline-block';
  els.statusAction.textContent = 'Coba checkout ulang';
  els.statusAction.href = window.location.pathname + window.location.search;
}

function showError(message) {
  els.submitError.textContent = message;
  els.submitError.classList.add('show');
  els.submitBtn.disabled = false;
  els.submitBtn.classList.remove('loading');
  state.submitting = false;

  trackCheckoutEvent('vault_checkout_error', { error: message });
}

function setSubmitting(isSubmitting) {
  state.submitting = isSubmitting;
  els.submitBtn.disabled = isSubmitting;
  els.submitBtn.classList.toggle('loading', isSubmitting);

  if (isSubmitting) {
    els.submitBtn.textContent = 'Memproses...';
  } else {
    els.submitBtn.textContent = `Lanjut ke Pembayaran Aman — ${state.plan?.priceLabel || ''}`;
  }

  els.submitError.classList.remove('show');
  els.submitError.textContent = '';
}

/* ---- API ---- */
async function createOrder(name, email, phone) {
  const body = {
    name,
    email,
    phone,
    plan_id: state.planId,
    pack_id: state.packId || '',
  };

  const response = await fetch(CREATE_ORDER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Gagal (${response.status})`);
  }

  return data;
}

async function pollStatus(orderId) {
  try {
    const url = `${STATUS_ENDPOINT}?order_id=${encodeURIComponent(orderId)}`;
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    return data;
  } catch {
    return null;
  }
}

/* ---- Polling ---- */
function startPolling(orderId) {
  clearPolling();
  state.pollAttempts = 0;

  state.pollingTimer = setInterval(async () => {
    state.pollAttempts++;
    const data = await pollStatus(orderId);

    if (!data) return;

    if (data.payment_status === 'paid' || data.payment_status === 'settlement') {
      showSuccess();
      return;
    }

    if (
      data.payment_status === 'failed' ||
      data.payment_status === 'cancelled' ||
      data.payment_status === 'expired'
    ) {
      showFailed(data.payment_status);
      return;
    }

    if (state.pollAttempts >= MAX_POLL_ATTEMPTS) {
      clearPolling();
      els.statusDesc.textContent =
        'Waktu tunggu habis. Status pembayaran belum diperbarui. Silakan hubungi kami jika Anda sudah melakukan pembayaran.';
      els.statusAction.style.display = 'inline-block';
      els.statusAction.textContent = 'Hubungi kami';
      els.statusAction.href = '/';
    }
  }, POLL_INTERVAL);
}

function clearPolling() {
  if (state.pollingTimer) {
    clearInterval(state.pollingTimer);
    state.pollingTimer = null;
  }
}

/* ---- Form validation ---- */
function validateForm() {
  const name = els.nameInput.value.trim();
  const email = els.emailInput.value.trim();
  const phone = els.phoneInput.value.trim();
  const agreed = els.agreeCheck.checked;

  if (!name || name.length < 2) {
    showError('Nama lengkap wajib diisi (minimal 2 karakter).');
    els.nameInput.focus();
    return null;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('Email valid wajib diisi.');
    els.emailInput.focus();
    return null;
  }
  if (!phone || phone.length < 8) {
    showError('Nomor WhatsApp valid wajib diisi.');
    els.phoneInput.focus();
    return null;
  }
  if (!agreed) {
    showError('Anda harus menyetujui ketentuan lisensi untuk melanjutkan.');
    els.agreeCheck.focus();
    return null;
  }

  return { name, email, phone };
}

/* ---- Submit handler ---- */
async function handleSubmit(e) {
  e.preventDefault();
  if (state.submitting) return;

  const valid = validateForm();
  if (!valid) return;

  setSubmitting(true);
  state.submitting = true;

  try {
    const data = await createOrder(valid.name, valid.email, valid.phone);

    trackCheckoutEvent('vault_checkout_redirect', {
      order_id: data.order_id,
    });

    window.location.href = data.checkout_url;
  } catch (err) {
    showError(err.message || 'Gagal membuat order pembayaran. Silakan coba lagi.');
    setSubmitting(false);
  }
}

/* ---- Return handler ---- */
function handleReturn() {
  const orderId = getUrlParam('order_id');
  const status = getUrlParam('status');

  if (!orderId) return false;

  showReturnView(orderId);

  if (status === 'failed' || status === 'cancelled' || status === 'expired') {
    showFailed(status);
  }

  return true;
}

/* ---- Init ---- */
export function initCheckout() {
  cacheDoms();

  if (handleReturn()) return;

  const { planId, packId } = getOfferFromUrl();
  const result = validateOffer(planId, packId);

  if (!result.valid) {
    renderInvalidOffer(result.error);
    return;
  }

  state.planId = planId;
  state.packId = packId;
  state.plan = result.plan;
  state.pack = result.pack || null;

  renderOffer();
  els.form.addEventListener('submit', handleSubmit);
}
