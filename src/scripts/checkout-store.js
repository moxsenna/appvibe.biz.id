/**
 * Checkout state machine for appvibe.biz.id PayCore integration.
 *
 * States:
 * - idle:           No pack selected, checkout not started
 * - selecting:      User is browsing/selecting a pack
 * - confirm:        Pack selected, showing customer info form
 * - creating:       Sending create-order request to backend
 * - redirecting:    Redirecting user to PayCore checkout_url
 * - pending:        User is at payment provider checkout (waiting for payment)
 * - reconciling:    Checking payment status after return
 * - success:        Payment confirmed via status check
 * - failed:         Payment failed or rejected
 * - cancelled:      Payment cancelled by user
 * - expired:        Payment expired
 * - already_paid:   Order was already completed
 * - error:          System error (network, config, etc.)
 *
 * any → idle (reset)
 */

const VALID_STATES = [
  'idle', 'selecting', 'confirm', 'creating', 'redirecting',
  'pending', 'reconciling', 'success', 'failed', 'cancelled',
  'expired', 'already_paid', 'error',
];

const STATE_LABELS = {
  idle: 'Belum memilih paket',
  selecting: 'Pilih paket Anda',
  confirm: 'Lengkapi data pembayaran',
  creating: 'Menyiapkan pembayaran…',
  redirecting: 'Mengarahkan ke halaman bayar…',
  pending: 'Menunggu pembayaran',
  reconciling: 'Memverifikasi pembayaran…',
  success: 'Pembayaran berhasil',
  failed: 'Pembayaran gagal',
  cancelled: 'Pembayaran dibatalkan',
  expired: 'Pembayaran kedaluwarsa',
  already_paid: 'Pembayaran sudah pernah diproses',
  error: 'Terjadi kesalahan',
};

const DEFAULT_STATE = { current: 'idle', packId: null, orderId: null, externalOrderId: null, error: null };

let state = { ...DEFAULT_STATE };
let listeners = [];

export const checkoutStore = {
  /** Get current state snapshot (safe to read, don't mutate) */
  getState() {
    return { ...state };
  },

  /** Get human-readable label for current state */
  getStateLabel() {
    return STATE_LABELS[state.current] || state.current;
  },

  /** Transition to a new state with optional payload */
  transition(newState, payload = {}) {
    if (!VALID_STATES.includes(newState)) {
      console.error(`[checkout-store] Invalid state: ${newState}`);
      return;
    }

    const prev = state.current;
    state = { ...state, current: newState, ...payload, error: payload.error || null };

    if (import.meta.env.DEV) {
      console.debug(`[checkout-store] ${prev} → ${newState}`, payload);
    }

    // Fire vault event
    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent('vault_checkout_state', {
        from: prev,
        to: newState,
        pack_id: state.packId,
        order_id: state.orderId,
      });
    }

    // Notify listeners
    listeners.forEach((fn) => fn({ prev, current: newState, state: { ...state } }));
  },

  /** Reset to idle */
  reset() {
    state = { ...DEFAULT_STATE };
    listeners.forEach((fn) =>
      fn({ prev: state.current, current: 'idle', state: { ...state } }),
    );
  },

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  /** Set selected pack (user explicitly chose) */
  selectPack(packId) {
    state = { ...state, packId };
    this.transition('confirm', { packId });
  },
};

// Expose globally for inline event handlers
if (typeof window !== 'undefined') {
  window.checkoutStore = checkoutStore;
}
