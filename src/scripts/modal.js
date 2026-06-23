import { getSelectedOffer } from './pricing.js';

export function initModal() {
  const modal = document.getElementById("leadModal");
  const modalClose = document.getElementById("modalClose");
  const stickyCta = document.getElementById("stickyCta");
  const title = document.getElementById('modalTitle');
  const description = document.getElementById('modalDescription');
  const offerSummary = document.getElementById('modalOfferSummary');
  const offerName = document.getElementById('modalOfferName');
  const offerMeta = document.getElementById('modalOfferMeta');
  let lastTrigger = null;

  function renderOffer(offer) {
    if (!offer?.plan) return;

    const packLabel = offer.pack ? ` · ${offer.pack.name}` : '';
    if (title) title.textContent = 'Pilihan Anda sudah disiapkan.';
    if (description) {
      description.textContent = 'Isi detail singkat di bawah agar kami dapat mengarahkan Anda ke paket yang dipilih dan informasi aksesnya.';
    }
    if (offerName) offerName.textContent = `${offer.plan.name}${packLabel}`;
    if (offerMeta) offerMeta.textContent = `${offer.plan.priceLabel} sekali bayar`;
    offerSummary?.removeAttribute('hidden');
  }

  function clearOffer() {
    offerSummary?.setAttribute('hidden', '');
    if (title) title.textContent = 'Lihat opsi akses.';
    if (description) {
      description.textContent = 'Tinggalkan detail singkat. Anda akan menerima informasi paket, batas lisensi, dan jalur yang paling sesuai dengan market Anda.';
    }
  }

  function openModal(formSource, packId, appId) {
    if (!modal) return;
    if (modal.classList.contains('show')) return;

    // Clear pricing offer summary for non-pricing CTAs
    if (!formSource?.startsWith('pricing')) {
      clearOffer();
    }

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

    // Clear error message on re-open
    const errEl = document.getElementById('modalError');
    if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }

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

  function showError(message) {
    const errEl = document.getElementById('modalError');
    if (errEl) { errEl.textContent = message; errEl.classList.add('show'); }
  }

  window.openModal = openModal;
  window.closeModal = closeModal;
  window.showModalError = showError;

  // Delegated CTA click listener (vault_cta_click)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cta], [data-open-modal], [data-open-form], [data-scroll-to]');
    if (!btn) return;
    const placement = btn.dataset.placement || btn.dataset.ctaPlacement || 'unknown';
    const ctaLabel = btn.dataset.ctaLabel || btn.textContent.trim()?.slice(0, 60) || '';
    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent('vault_cta_click', { placement, cta_label: ctaLabel });
    }
  });

  // [data-open-modal] — never pre-fill pack/app
  document.querySelectorAll("[data-open-modal]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      lastTrigger = e.currentTarget;
      const formSource = btn.dataset.formSource || btn.dataset.form_source || 'general';
      openModal(formSource, null, null);
    });
  });

  // [data-open-form] — contextual CTAs
  document.querySelectorAll("[data-open-form]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      lastTrigger = e.currentTarget;
      const src = btn.dataset.formSource || btn.dataset.form_source || 'contextual';
      const packId = btn.dataset.pack || null;
      const appId = btn.dataset.app || null;
      openModal(src, packId, appId);
    });
  });

  // Pricing CTA — appvibe:open-lead-modal event contract
  window.addEventListener('appvibe:open-lead-modal', (event) => {
    const offer = event.detail?.offer;
    if (!offer?.plan) return;

    lastTrigger = document.activeElement;
    renderOffer(offer);

    // Set hidden plan/pack fields
    const planIdField = document.getElementById('selectedPlanId');
    const planNameField = document.getElementById('selectedPlanName');
    const planPriceField = document.getElementById('selectedPlanPrice');
    const packIdField = document.getElementById('selectedPackId');
    const packNameField = document.getElementById('selectedPackName');
    if (planIdField) planIdField.value = offer.plan.id;
    if (planNameField) planNameField.value = offer.plan.name;
    if (planPriceField) planPriceField.value = String(offer.plan.price);
    if (packIdField) packIdField.value = offer.pack?.id || '';
    if (packNameField) packNameField.value = offer.pack?.name || '';

    openModal('pricing_cta', offer.pack?.id || null, null);

    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent('vault_pricing_cta_click', {
        plan_id: offer.plan.id,
        plan_name: offer.plan.name,
        pack_id: offer.pack?.id || null,
        value: offer.plan.price,
        currency: 'IDR',
      });
    }
  });

  modalClose?.addEventListener("click", () => { lastTrigger = modalClose; closeModal(); });
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("show")) closeModal();
  });
}
