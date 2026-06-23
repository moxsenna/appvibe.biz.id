export function initModal() {
  const modal = document.getElementById("leadModal");
  const modalClose = document.getElementById("modalClose");
  const stickyCta = document.getElementById("stickyCta");
  let lastTrigger = null;

  function openModal(formSource, packId, appId) {
    if (!modal) return;
    if (modal.classList.contains('show')) return; // already open

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    if (stickyCta) stickyCta.classList.add("hidden");

    // Pre-fill hidden fields
    const packField = document.getElementById('formSelectedPack');
    const appField = document.getElementById('formSelectedApp');
    if (packField && packId) packField.value = packId;
    if (appField && appId) appField.value = appId;

    // Store source
    const sourceField = document.getElementById('formOpenSource');
    if (sourceField) sourceField.value = formSource || 'general';

    // Focus first input
    setTimeout(() => modal.querySelector("input[name]")?.focus(), 100);

    // Tracking
    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent('vault_form_opened', {
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

    // Return focus to trigger element
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  }

  // Expose globally
  window.openModal = openModal;
  window.closeModal = closeModal;

  // Generic open buttons
  document.querySelectorAll("[data-open-modal]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      lastTrigger = e.currentTarget;
      openModal('general', null, null);
    });
  });

  // Contextual open buttons
  document.querySelectorAll("[data-open-form]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      lastTrigger = e.currentTarget;
      const src = btn.dataset.formSource || btn.dataset.form_source || 'general';
      const packId = btn.dataset.pack || null;
      const appId = btn.dataset.app || null;
      openModal(src, packId, appId);
    });
  });

  // Close
  modalClose?.addEventListener("click", () => { lastTrigger = modalClose; closeModal(); });
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) { lastTrigger = modal.querySelector('[data-open-modal], [data-open-form]'); closeModal(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("show")) closeModal();
  });
}
