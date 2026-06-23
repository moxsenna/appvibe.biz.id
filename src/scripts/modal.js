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

    // ALWAYS set hidden fields — clear if no context
    const packField = document.getElementById('formSelectedPack');
    const appField = document.getElementById('formSelectedApp');
    const sourceField = document.getElementById('formOpenSource');
    if (packField) packField.value = packId || '';
    if (appField) appField.value = appId || '';
    if (sourceField) sourceField.value = formSource || 'general';

    // Focus first visible input
    setTimeout(() => {
      const firstInput = modal.querySelector('input[name="name"], input[name]');
      if (firstInput && typeof firstInput.focus === 'function') firstInput.focus();
    }, 300);

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
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  }

  window.openModal = openModal;
  window.closeModal = closeModal;

  // Generic CTAs — no pack/app context
  document.querySelectorAll("[data-open-modal]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      lastTrigger = e.currentTarget;
      openModal('general', null, null);
    });
  });

  // Contextual CTAs
  document.querySelectorAll("[data-open-form]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      lastTrigger = e.currentTarget;
      const src = btn.dataset.formSource || btn.dataset.form_source || 'contextual';
      const packId = btn.dataset.pack || null;
      const appId = btn.dataset.app || null;
      openModal(src, packId, appId);
    });
  });

  modalClose?.addEventListener("click", () => { lastTrigger = modalClose; closeModal(); });
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("show")) closeModal();
  });
}
