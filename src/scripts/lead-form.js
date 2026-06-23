import { getUtmParams, getSessionMeta } from './tracking.js';

export function initLeadForm() {
  const form = document.getElementById("leadForm");
  const message = document.getElementById("modalMessage");
  const honeypot = document.getElementById("honeypot");
  const submitBtn = form?.querySelector("button[type='submit']");
  let submitting = false;

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (honeypot && honeypot.value.trim() !== '') {
      showSuccess(message);
      return;
    }

    const formData = new FormData(form);
    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim();
    const niche = formData.get('niche')?.trim();
    const whatsapp = formData.get('whatsapp')?.trim() || '';
    const modelPenggunaan = formData.get('model_penggunaan')?.trim() || '';

    const selectedPack = formData.get('selected_pack')?.trim() || null;
    const selectedApp = formData.get('selected_app')?.trim() || null;
    const planId = formData.get('plan_id')?.trim() || '';
    const planName = formData.get('plan_name')?.trim() || '';
    const planPrice = Number(formData.get('plan_price')) || 0;
    const packId = formData.get('pack_id')?.trim() || '';
    const packName = formData.get('pack_name')?.trim() || '';

    const turnstileToken = (function() {
      const widget = document.querySelector('.cf-turnstile iframe');
      if (widget && typeof window.turnstile !== 'undefined') {
        return window.turnstile.getResponse?.() || '';
      }
      const hidden = formData.get('cf-turnstile-response');
      return hidden || '';
    })();

    if (!name || !email || !niche) return;

    submitting = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Mengirim...'; }

    const utm = getUtmParams();
    const session = getSessionMeta();
    const formOpenSource = formData.get('form_open_source')?.trim() || 'general';
    const eventId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;

    if (typeof window.trackVaultEvent === 'function') {
      window.trackVaultEvent('vault_lead_submit_attempt', {
        selected_pack: selectedPack,
        selected_app: selectedApp,
        model_penggunaan: modelPenggunaan,
        form_open_source: formOpenSource,
      });
    }

    const payload = {
      event_id: eventId,
      name,
      email,
      whatsapp,
      niche,
      model_penggunaan: modelPenggunaan,
      selected_pack: selectedPack,
      selected_app: selectedApp,
      plan_id: planId || undefined,
      plan_name: planName || undefined,
      plan_price: planPrice || undefined,
      pack_id: packId || undefined,
      pack_name: packName || undefined,
      form_open_source: formOpenSource,
      turnstileToken,
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_content: utm.content,
      utm_term: utm.term,
      referrer: session.referrer || document.referrer,
      landing_url: session.landing_url || window.location.href,
      timestamp: new Date().toISOString(),
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    };

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.success) {
          if (typeof window.fireStandardConversions === 'function') {
            window.fireStandardConversions({
              selected_pack: selectedPack,
              selected_app: selectedApp,
              model_penggunaan: modelPenggunaan,
            });
          }
          if (typeof window.trackVaultEvent === 'function') {
            window.trackVaultEvent('vault_lead_submit_success', {
              selected_pack: selectedPack,
              selected_app: selectedApp,
              model_penggunaan: modelPenggunaan,
              form_open_source: formOpenSource,
            });
          }
          showSuccess(message);
          form.reset();
          ['formSelectedPack', 'formSelectedApp', 'formOpenSource', 'selectedPlanId', 'selectedPlanName', 'selectedPlanPrice', 'selectedPackId', 'selectedPackName'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
          });
        }
      } else {
        showErrorByStatus(response.status, response);
      }
    } catch (err) {
      showModalError('Gagal terhubung ke server. Coba lagi nanti.');
    } finally {
      submitting = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Kirim minat akses →'; }
    }
  });
}

function showErrorByStatus(status, response) {
  const map = {
    400: 'Data tidak lengkap. Periksa kembali isian Anda.',
    403: 'Verifikasi keamanan gagal. Silakan muat ulang halaman.',
    409: 'Pengiriman terdeteksi ganda. Tunggu sebentar sebelum mencoba lagi.',
    502: 'Server pemrosesan sedang sibuk. Coba lagi nanti.',
    503: 'Sistem belum siap menerima data. Tim kami sedang menyiapkan konfigurasi.',
  };
  const msg = map[status] || `Terjadi kendala (${status}). Coba lagi.`;
  showModalError(msg);
}

function showModalError(msg) {
  if (typeof window.showModalError === 'function') {
    window.showModalError(msg);
  }
}

function showSuccess(el) {
  if (!el) return;
  el.classList.add("show");
}
