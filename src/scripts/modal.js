export function initModal() {
  const modal = document.getElementById("leadModal");
  const modalClose = document.getElementById("modalClose");
  const stickyCta = document.getElementById("stickyCta");
  let lastTrigger = null;

  function openModal(formSource, packId, appId) {
    if (!modal) return;
    if (modal.classList.contains('show')) return;

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    if (stickyCta) stickyCta.classList.add("hidden");

    // Restore modal card to checkout-able state
    const container = modal.querySelector('.co-container');
    if (container) container.innerHTML = '';
    const existingForm = modal.querySelector('form');
    if (existingForm) existingForm.style.display = '';
    const existingMsg = modal.querySelector('.modal-message');
    if (existingMsg) existingMsg.style.display = '';

    // If packId is provided, auto-select it in the checkout store
    if (packId && typeof window.checkoutStore !== 'undefined') {
      window.checkoutStore.reset();
      setTimeout(() => {
        window.setSelectedPack?.(packId);
        window.checkoutStore.selectPack(packId);
      }, 100);
    } else if (typeof window.checkoutStore !== 'undefined') {
      window.checkoutStore.transition('selecting', { packId: null });
    }

    // Pre-fill hidden fields (for legacy lead form compat)
    const packField = document.getElementById('formSelectedPack');
    const appField = document.getElementById('formSelectedApp');
    if (packField && packId) packField.value = packId;
    if (appField && appId) appField.value = appId;

    const sourceField = document.getElementById('formOpenSource');
    if (sourceField) sourceField.value = formSource || 'general';

    // Focus first input in checkout form
    setTimeout(() => {
      const firstInput = modal.querySelector('#coName, input[name]');
      if (firstInput && typeof firstInput.focus === 'function') firstInput.focus();
    }, 300);

    // Tracking
    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent('vault_checkout_opened', {
        placement: formSource || 'general',
        form_open_source: formSource || 'general',
        selected_pack: packId || null,
        selected_app: appId || null,
      });
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("show");
    document.body.style.overflow = "";
    if (stickyCta) stickyCta.classList.remove("hidden");

    // Reset checkout state
    if (typeof window.checkoutStore !== 'undefined') {
      window.checkoutStore.reset();
    }

    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  }

  // Expose globally
  window.openModal = openModal;
  window.closeModal = closeModal;

  // [data-open-modal] — open checkout with optional pack context
  document.querySelectorAll("[data-open-modal]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      lastTrigger = e.currentTarget;
      const src = btn.dataset.formSource || btn.dataset.form_source || 'general';
      const packId = btn.dataset.pack || null;
      const appId = btn.dataset.app || null;

      // Update vaultState
      if (window.vaultState) {
        window.vaultState.lastFormPlacement = src;
        if (packId) window.vaultState.selectedPack = packId;
        if (appId) window.vaultState.selectedApp = appId;
      }

      openModal(src, packId, appId);
    });
  });

  // [data-open-checkout] — open checkout with pre-selected pack (new style)
  document.querySelectorAll("[data-open-checkout]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      lastTrigger = e.currentTarget;
      const packId = btn.dataset.pack || btn.dataset.openCheckout || null;
      const src = btn.dataset.formSource || 'pack_selection';

      if (window.vaultState && packId) {
        window.vaultState.selectedPack = packId;
        window.vaultState.lastFormPlacement = src;
      }

      openModal(src, packId, null);
    });
  });

  // Close handlers
  modalClose?.addEventListener("click", () => { lastTrigger = modalClose; closeModal(); });

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("show")) closeModal();
  });
}
