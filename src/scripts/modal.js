export function initModal() {
  const modal = document.getElementById("leadModal");
  const modalClose = document.getElementById("modalClose");
  const openButtons = document.querySelectorAll("[data-open-modal]");
  const stickyCta = document.getElementById("stickyCta");

  function openModal() {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    if (stickyCta) stickyCta.classList.add("hidden");
    setTimeout(() => modal.querySelector("input")?.focus(), 100);

    if (typeof window.trackEvent === 'function') {
      window.trackEvent('LeadForm_Open');
    }
  }

  function closeModal() {
    modal.classList.remove("show");
    document.body.style.overflow = "";
    if (stickyCta) stickyCta.classList.remove("hidden");
  }

  openButtons.forEach(btn => btn.addEventListener("click", openModal));
  modalClose?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal?.classList.contains("show")) closeModal();
  });
}
