# AppVibe — Pricing Decoy Implementation

> Status note: this document records an earlier pricing/lead-capture implementation phase. The current `appvibe.biz.id` project has a real checkout page at `/checkout/` and PayCore integration through `/api/checkout/*` plus `/api/webhooks/paycore`. Treat any `appvibe:open-lead-modal`, `functions/api/lead.js`, or "checkout nanti" language as historical unless the current code explicitly restores that flow.

Implementasi ini menambahkan dua opsi pembelian dengan aturan bisnis berikut:

- **Pilih 1 Niche Pack — Rp97.000**: pembeli wajib memilih tepat satu dari empat pack.
- **Full AppVibe Vault — Rp147.000**: mendapatkan empat pack / 13 aplikasi.
- Kedua opsi mencakup **marketing kit, lisensi jual ulang akses produk jadi, dan hak rebrand** sesuai ketentuan lisensi.
- Tidak ada plan atau pack yang otomatis terpilih saat halaman dimuat (`selectedPlan` dan `selectedPack` dimulai sebagai `null`).
- Current CTA behavior should lead into the dedicated checkout flow. The older `appvibe:open-lead-modal` contract is historical.

> Catatan lisensi: “jual ulang” di UI ini sengaja dijelaskan sebagai menjual **akses produk branded kepada end user**, bukan menjual ulang file/master template atau memindahkan hak lisensi ke pembeli. Ubah copy ini hanya bila kebijakan lisensi Anda memang berbeda.

---

## 1) Tambahkan import CSS

Di `src/styles/index.css`, tambahkan satu baris setelah `@import './landing.css';`:

```css
@import './pricing.css';
```

---

## 2) Buat file baru: `src/styles/pricing.css`

```css
/* ===== PRICING ===== */
.pricing-section {
  position: relative;
}

.pricing-intro {
  max-width: 760px;
}

.pricing-intro .section-copy {
  max-width: 650px;
  margin-top: 14px;
}

.pricing-license-band {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: center;
  margin: 0 0 18px;
  padding: 16px 18px;
  border: 1px solid rgba(18, 107, 255, .22);
  border-radius: var(--r-lg);
  background:
    radial-gradient(circle at 100% 0%, rgba(16, 220, 213, .11), transparent 35%),
    linear-gradient(135deg, rgba(18, 107, 255, .08), rgba(109, 53, 255, .06));
}

.pricing-license-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #fff;
  background: var(--gradient-brand);
  font-size: 19px;
  box-shadow: 0 8px 18px rgba(18, 107, 255, .18);
}

.pricing-license-band strong {
  display: block;
  color: var(--ink);
  font-size: 13px;
  letter-spacing: -.2px;
}

.pricing-license-band p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}

.pricing-grid {
  display: grid;
  grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
  gap: 16px;
  align-items: stretch;
}

.price-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  padding: 29px;
  border: 1px solid var(--line);
  border-radius: var(--r-xl);
  background: var(--paper-2);
  box-shadow: var(--soft-shadow);
}

.price-card--single {
  background:
    radial-gradient(circle at 100% 0%, rgba(16, 220, 213, .10), transparent 30%),
    var(--paper-2);
}

.price-card--featured {
  z-index: 1;
  border-color: transparent;
  color: #fff;
  background:
    radial-gradient(circle at 100% 0%, rgba(16, 220, 213, .25), transparent 33%),
    radial-gradient(circle at 0% 100%, rgba(109, 53, 255, .24), transparent 34%),
    #07142F;
  box-shadow: 0 20px 48px rgba(7, 20, 47, .28);
}

.price-card--featured::before {
  content: "";
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: var(--gradient-brand);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.price-card > * {
  position: relative;
  z-index: 1;
}

.price-badge {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 7px;
  min-height: 28px;
  padding: 8px 10px;
  border: 1px solid rgba(18, 107, 255, .22);
  border-radius: var(--pill);
  color: var(--av-blue-600);
  background: rgba(18, 107, 255, .08);
  font: 600 9px/1 "DM Mono", monospace;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.price-badge--featured {
  color: #bffcf8;
  border-color: rgba(16, 220, 213, .36);
  background: rgba(16, 220, 213, .12);
}

.price-badge i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px rgba(18, 107, 255, .10);
}

.price-card h3 {
  max-width: 520px;
  margin: 21px 0 0;
  color: var(--ink);
  font: 700 clamp(28px, 3vw, 40px)/.98 "Space Grotesk", sans-serif;
  letter-spacing: -1.35px;
}

.price-card--featured h3 {
  color: #fff;
}

.price-card h3 em {
  font-style: italic;
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.price-card--featured h3 em {
  background: linear-gradient(135deg, #10DCD5, #A9C8FF 50%, #BCA6FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.price-description {
  min-height: 42px;
  max-width: 570px;
  margin: 11px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.62;
}

.price-card--featured .price-description {
  color: #b8c6df;
}

.price-block {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  margin: 26px 0 8px;
}

.price-currency {
  padding-bottom: 8px;
  color: var(--muted);
  font: 600 13px/1 "DM Mono", monospace;
}

.price-amount {
  color: var(--ink);
  font: 700 clamp(47px, 5vw, 66px)/.84 "Space Grotesk", sans-serif;
  letter-spacing: -3px;
}

.price-card--featured .price-currency {
  color: #8fa4c8;
}

.price-card--featured .price-amount {
  color: #fff;
}

.price-period {
  padding-bottom: 8px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
}

.price-card--featured .price-period {
  color: #aabbd6;
}

.price-divider {
  height: 1px;
  margin: 20px 0;
  background: var(--line);
}

.price-card--featured .price-divider {
  background: rgba(255, 255, 255, .14);
}

.price-includes {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.price-includes li {
  display: grid;
  grid-template-columns: 19px minmax(0, 1fr);
  gap: 9px;
  align-items: start;
  color: #53657c;
  font-size: 11px;
  line-height: 1.5;
}

.price-includes li::before {
  content: "✓";
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: #0B2352;
  background: rgba(16, 220, 213, .18);
  font-size: 11px;
  font-weight: 900;
}

.price-card--featured .price-includes li {
  color: #c6d3e7;
}

.price-card--featured .price-includes li::before {
  color: #061C1B;
  background: #10DCD5;
}

.pack-picker {
  margin-top: 24px;
  padding: 14px;
  border: 1px solid rgba(18, 107, 255, .15);
  border-radius: 17px;
  background: rgba(18, 107, 255, .045);
}

.pack-picker-label {
  display: block;
  margin-bottom: 10px;
  color: var(--ink);
  font: 700 10px/1 "DM Mono", monospace;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.pack-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pack-option {
  min-height: 70px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--ink);
  background: #fff;
  text-align: left;
  transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease;
}

.pack-option:hover,
.pack-option:focus-visible {
  border-color: var(--av-blue-600);
  outline: none;
  transform: translateY(-1px);
  box-shadow: 0 7px 15px rgba(18, 107, 255, .10);
}

.pack-option[aria-checked="true"] {
  border-color: var(--av-blue-600);
  background: linear-gradient(145deg, #EEF5FF, #E4F9F8);
  box-shadow: 0 0 0 3px rgba(18, 107, 255, .12);
}

.pack-option strong,
.pack-option span {
  display: block;
}

.pack-option strong {
  font-size: 10px;
  letter-spacing: -.1px;
}

.pack-option span {
  margin-top: 4px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.35;
}

.price-cta {
  margin-top: 22px;
}

.price-card--single .price-cta {
  margin-top: auto;
  padding-top: 22px;
}

.price-cta[disabled] {
  cursor: not-allowed;
  color: #8894a7;
  border-color: #d9e0ea;
  background: #e8edf4;
  box-shadow: none;
  transform: none;
}

.price-card--featured .price-cta {
  color: #07142F;
  background: #10DCD5;
  box-shadow: 0 5px 0 #0C9A95;
}

.price-card--featured .price-cta:hover {
  box-shadow: 0 7px 0 #0C9A95;
}

.price-helper,
.price-value-logic {
  margin: 11px 0 0;
  text-align: center;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.5;
}

.price-card--featured .price-value-logic {
  color: #aebed9;
}

.price-value-logic strong {
  color: #10DCD5;
}

.price-comparison {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  margin-top: 19px;
  padding: 13px;
  border: 1px solid rgba(16, 220, 213, .20);
  border-radius: 15px;
  background: rgba(16, 220, 213, .08);
}

.price-comparison span {
  color: #c8d8ef;
  font-size: 10px;
  line-height: 1.48;
}

.price-comparison b {
  color: #fff;
  font: 700 18px/1 "Space Grotesk", sans-serif;
  letter-spacing: -.5px;
}

@media (max-width: 760px) {
  .pricing-license-band {
    align-items: start;
    padding: 14px;
  }

  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .price-card {
    padding: 23px 18px;
    border-radius: 23px;
  }

  .price-card--featured {
    order: -1;
  }

  .price-card h3 {
    font-size: 31px;
    letter-spacing: -1.2px;
  }

  .price-description {
    min-height: 0;
  }

  .price-block {
    margin-top: 21px;
  }

  .price-amount {
    font-size: 51px;
    letter-spacing: -2.5px;
  }

  .pack-options {
    grid-template-columns: 1fr;
  }

  .pack-option {
    min-height: 58px;
  }

  .price-comparison {
    margin-top: 15px;
  }
}
```

---

## 3) Tambahkan section HTML pricing

Di `index.html`, letakkan section ini **setelah** section `id="included"` dan **sebelum** section `id="lisensi"`.

```html
<section class="section pricing-section" id="harga" aria-labelledby="pricing-title">
  <div class="section-head">
    <div class="pricing-intro">
      <div class="section-kicker">Pilih skala produk Anda</div>
      <h2 id="pricing-title">Mulai dari satu niche. Atau buka <em>seluruh katalog sekaligus.</em></h2>
      <p class="section-copy">
        Kedua pilihan memberi marketing kit dan lisensi white-label yang sama. Perbedaannya hanya pada jumlah niche pack dan aplikasi yang langsung bisa Anda bawa ke pasar.
      </p>
    </div>
  </div>

  <div class="pricing-license-band" role="note">
    <div class="pricing-license-icon" aria-hidden="true">✦</div>
    <div>
      <strong>Semua pilihan sudah termasuk marketing kit + lisensi jual ulang + hak rebrand.</strong>
      <p>Anda dapat mengganti nama, visual, niche, dan positioning; lalu menjual akses produk branded kepada end user sesuai ketentuan lisensi.</p>
    </div>
  </div>

  <div class="pricing-grid">
    <article class="price-card price-card--single" aria-labelledby="single-pack-title">
      <span class="price-badge"><i></i> mulai dari satu niche</span>
      <h3 id="single-pack-title">Pilih <em>1 Niche Pack.</em></h3>
      <p class="price-description">Untuk Anda yang ingin fokus memvalidasi satu pasar terlebih dahulu dengan lini produk yang lebih spesifik.</p>

      <div class="price-block" aria-label="Harga Rp97.000 sekali bayar">
        <span class="price-currency">Rp</span>
        <span class="price-amount">97.000</span>
        <span class="price-period">sekali bayar</span>
      </div>

      <div class="price-divider"></div>

      <ul class="price-includes">
        <li>Pilih tepat 1 dari 4 niche pack</li>
        <li>Aplikasi yang ada di pack pilihan Anda</li>
        <li>Marketing kit khusus untuk pack tersebut</li>
        <li>Lisensi jual ulang akses produk + rebrand</li>
      </ul>

      <div class="pack-picker">
        <span class="pack-picker-label" id="single-pack-label">Pilih niche pack Anda</span>
        <div class="pack-options" role="radiogroup" aria-labelledby="single-pack-label">
          <button class="pack-option" type="button" role="radio" aria-checked="false"
            data-pack-choice data-pack-id="advertiser" data-pack-name="Advertiser &amp; Agency">
            <strong>Advertiser &amp; Agency</strong>
            <span>ADSprint · RUPA · MULA</span>
          </button>
          <button class="pack-option" type="button" role="radio" aria-checked="false"
            data-pack-choice data-pack-id="commerce" data-pack-name="Commerce &amp; Affiliate">
            <strong>Commerce &amp; Affiliate</strong>
            <span>PIKAT · CETAK · KATALOG</span>
          </button>
          <button class="pack-option" type="button" role="radio" aria-checked="false"
            data-pack-choice data-pack-id="creator" data-pack-name="Creator &amp; Content">
            <strong>Creator &amp; Content</strong>
            <span>ADEGAN · SUARA · MIMIK · RITME</span>
          </button>
          <button class="pack-option" type="button" role="radio" aria-checked="false"
            data-pack-choice data-pack-id="branding" data-pack-name="Brand &amp; Website">
            <strong>Brand &amp; Website</strong>
            <span>ARAH · BUKTI · TAYANG</span>
          </button>
        </div>
      </div>

      <button class="btn paper full price-cta" type="button"
        data-pricing-cta="single-pack" disabled>
        Pilih 1 Niche Pack →
      </button>
      <p class="price-helper">Pilih pack dulu untuk melanjutkan.</p>
    </article>

    <article class="price-card price-card--featured" aria-labelledby="full-vault-title">
      <span class="price-badge price-badge--featured"><i></i> pilihan paling rasional</span>
      <h3 id="full-vault-title">Full <em>AppVibe Vault.</em></h3>
      <p class="price-description">Untuk Anda yang ingin punya lebih banyak lini produk, angle promosi, dan ruang untuk menjual ke berbagai tipe buyer.</p>

      <div class="price-block" aria-label="Harga Rp147.000 sekali bayar">
        <span class="price-currency">Rp</span>
        <span class="price-amount">147.000</span>
        <span class="price-period">sekali bayar</span>
      </div>

      <div class="price-divider"></div>

      <ul class="price-includes">
        <li>Semua 4 niche pack</li>
        <li>Seluruh 13 aplikasi siap rebrand</li>
        <li>Semua marketing kit dan arah positioning</li>
        <li>Lisensi jual ulang akses produk + rebrand</li>
      </ul>

      <div class="price-comparison" aria-label="Perbandingan nilai paket">
        <span>Tambahkan Rp50.000 dari 1 pack untuk membuka tiga niche pack tambahan.</span>
        <b>+ 3 pack</b>
      </div>

      <button class="btn full price-cta" type="button" data-pricing-cta="full-vault">
        Ambil Semua 13 Aplikasi →
      </button>
      <p class="price-value-logic"><strong>Rp11.300-an per aplikasi</strong> saat Anda membuka seluruh vault.</p>
    </article>
  </div>
</section>
```

Tambahkan juga link navigasi ini di desktop dan mobile nav agar visitor dapat langsung lompat ke harga:

```html
<a href="#harga">Harga</a>
```

---

## 4) Buat file baru: `src/scripts/pricing.js`

```js
const PLANS = {
  'single-pack': {
    id: 'single-pack',
    name: 'Pilih 1 Niche Pack',
    price: 97000,
    priceLabel: 'Rp97.000',
  },
  'full-vault': {
    id: 'full-vault',
    name: 'Full AppVibe Vault',
    price: 147000,
    priceLabel: 'Rp147.000',
  },
};

const PACKS = {
  advertiser: {
    id: 'advertiser',
    name: 'Advertiser & Agency',
    apps: ['ADSprint', 'RUPA', 'MULA'],
  },
  commerce: {
    id: 'commerce',
    name: 'Commerce & Affiliate',
    apps: ['PIKAT', 'CETAK', 'KATALOG'],
  },
  creator: {
    id: 'creator',
    name: 'Creator & Content',
    apps: ['ADEGAN', 'SUARA', 'MIMIK', 'RITME'],
  },
  branding: {
    id: 'branding',
    name: 'Brand & Website',
    apps: ['ARAH', 'BUKTI', 'TAYANG'],
  },
};

// Deliberately starts empty. No pack or plan is auto-selected.
let selectedPlanId = null;
let selectedPackId = null;

export function getSelectedOffer() {
  return {
    plan: selectedPlanId ? PLANS[selectedPlanId] : null,
    pack: selectedPackId ? PACKS[selectedPackId] : null,
  };
}

function trackPricingEvent(eventName, properties) {
  if (typeof window.trackEvent === 'function') {
    window.trackEvent(eventName, properties);
    return;
  }

  window.dataLayer?.push({ event: eventName, ...properties });
}

function setSelectedOffer(planId, packId = null) {
  selectedPlanId = planId;
  selectedPackId = packId;

  const offer = getSelectedOffer();
  window.dispatchEvent(new CustomEvent('appvibe:offer-change', { detail: { offer } }));
  return offer;
}

// Historical snippet. Current repo redirects/links to /checkout/ instead of opening a lead modal.
function openSelectedOffer(offer) {
  window.dispatchEvent(new CustomEvent('appvibe:open-lead-modal', { detail: { offer } }));
}

function renderPackChoice(packButtons, singleCta, helper) {
  packButtons.forEach((button) => {
    const isSelected = button.dataset.packId === selectedPackId;
    button.setAttribute('aria-checked', String(isSelected));
  });

  const hasSelectedPack = Boolean(selectedPackId);
  singleCta.disabled = !hasSelectedPack;
  singleCta.textContent = hasSelectedPack
    ? `Pilih ${PACKS[selectedPackId].name} →`
    : 'Pilih 1 Niche Pack →';
  helper.textContent = hasSelectedPack
    ? `${PACKS[selectedPackId].apps.join(' · ')} siap Anda rebrand.`
    : 'Pilih pack dulu untuk melanjutkan.';
}

export function initPricing() {
  const packButtons = [...document.querySelectorAll('[data-pack-choice]')];
  const singleCta = document.querySelector('[data-pricing-cta="single-pack"]');
  const fullCta = document.querySelector('[data-pricing-cta="full-vault"]');
  const helper = document.querySelector('.price-card--single .price-helper');

  if (!packButtons.length || !singleCta || !fullCta || !helper) return;

  renderPackChoice(packButtons, singleCta, helper);

  packButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const packId = button.dataset.packId;
      const offer = setSelectedOffer('single-pack', packId);

      renderPackChoice(packButtons, singleCta, helper);
      trackPricingEvent('vault_pack_select', {
        plan_id: offer.plan.id,
        pack_id: offer.pack.id,
        pack_name: offer.pack.name,
        value: offer.plan.price,
        currency: 'IDR',
      });
    });
  });

  singleCta.addEventListener('click', () => {
    const offer = getSelectedOffer();
    if (!offer.plan || !offer.pack) return;

    trackPricingEvent('vault_checkout_intent', {
      plan_id: offer.plan.id,
      plan_name: offer.plan.name,
      pack_id: offer.pack.id,
      pack_name: offer.pack.name,
      value: offer.plan.price,
      currency: 'IDR',
    });
    openSelectedOffer(offer);
  });

  fullCta.addEventListener('click', () => {
    const offer = setSelectedOffer('full-vault');

    trackPricingEvent('vault_checkout_intent', {
      plan_id: offer.plan.id,
      plan_name: offer.plan.name,
      value: offer.plan.price,
      currency: 'IDR',
    });
    openSelectedOffer(offer);
  });
}
```

---

## 5) Historical: Ubah `src/main.js`

Tambahkan import dan inisialisasi pricing. In the current repo, do not reintroduce `initLeadForm()` unless the lead-modal flow is intentionally restored.

```js
import './styles/index.css';
import { initAppLauncher } from './scripts/app-launcher.js';
import { initMobileNav } from './scripts/mobile-nav.js';
import { initModal } from './scripts/modal.js';
import { initTracking } from './scripts/tracking.js';
import { initLeadForm } from './scripts/lead-form.js';
import { initPricing } from './scripts/pricing.js';

document.addEventListener('DOMContentLoaded', () => {
  initTracking();
  initAppLauncher();
  initMobileNav();
  initModal();
  initPricing();
  initLeadForm();
});
```

---

## 6) Ganti `src/scripts/modal.js`

Versi ini tetap mendukung semua CTA lama `[data-open-modal]`, tetapi CTA dari pricing membawa data plan/pack ke form.

```js
import { getSelectedOffer } from './pricing.js';

export function initModal() {
  const modal = document.getElementById('leadModal');
  const modalClose = document.getElementById('modalClose');
  const openButtons = document.querySelectorAll('[data-open-modal]');
  const stickyCta = document.getElementById('stickyCta');
  const title = document.getElementById('modalTitle');
  const description = document.getElementById('modalDescription');
  const offerSummary = document.getElementById('modalOfferSummary');
  const offerName = document.getElementById('modalOfferName');
  const offerMeta = document.getElementById('modalOfferMeta');
  const planIdInput = document.getElementById('selectedPlanId');
  const planNameInput = document.getElementById('selectedPlanName');
  const planPriceInput = document.getElementById('selectedPlanPrice');
  const packIdInput = document.getElementById('selectedPackId');
  const packNameInput = document.getElementById('selectedPackName');

  if (!modal) return;

  function resetOffer() {
    offerSummary?.setAttribute('hidden', '');
    if (title) title.textContent = 'Ambil akses awal.';
    if (description) {
      description.textContent = 'Tinggalkan detail Anda untuk menerima informasi paket, lisensi white-label, dan jalur paling cocok berdasarkan niche bisnis Anda.';
    }
    if (planIdInput) planIdInput.value = '';
    if (planNameInput) planNameInput.value = '';
    if (planPriceInput) planPriceInput.value = '';
    if (packIdInput) packIdInput.value = '';
    if (packNameInput) packNameInput.value = '';
  }

  function renderOffer(offer) {
    if (!offer?.plan) {
      resetOffer();
      return;
    }

    const packLabel = offer.pack ? ` · ${offer.pack.name}` : '';
    if (title) title.textContent = 'Pilihan Anda sudah disiapkan.';
    if (description) {
      description.textContent = 'Isi detail singkat di bawah agar kami dapat mengarahkan Anda ke paket yang dipilih dan informasi aksesnya.';
    }
    if (offerName) offerName.textContent = `${offer.plan.name}${packLabel}`;
    if (offerMeta) offerMeta.textContent = `${offer.plan.priceLabel} sekali bayar`;
    offerSummary?.removeAttribute('hidden');

    if (planIdInput) planIdInput.value = offer.plan.id;
    if (planNameInput) planNameInput.value = offer.plan.name;
    if (planPriceInput) planPriceInput.value = String(offer.plan.price);
    if (packIdInput) packIdInput.value = offer.pack?.id || '';
    if (packNameInput) packNameInput.value = offer.pack?.name || '';
  }

  function openModal(offer = getSelectedOffer()) {
    renderOffer(offer);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    stickyCta?.classList.add('hidden');
    setTimeout(() => modal.querySelector('input:not([type="hidden"])')?.focus(), 100);

    if (typeof window.trackEvent === 'function') {
      window.trackEvent('LeadForm_Open', {
        plan_id: offer?.plan?.id || '',
        pack_id: offer?.pack?.id || '',
        value: offer?.plan?.price || undefined,
        currency: offer?.plan ? 'IDR' : undefined,
      });
    }
  }

  function closeModal() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    stickyCta?.classList.remove('hidden');
  }

  openButtons.forEach((button) => button.addEventListener('click', () => openModal()));
  window.addEventListener('appvibe:open-lead-modal', (event) => openModal(event.detail?.offer));
  modalClose?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('show')) closeModal();
  });
}
```

---

## 7) Ubah markup modal di `index.html`

Ganti isi modal saat ini dengan markup berikut. Turnstile, honeypot, dan endpoint lead tetap dipertahankan.

```html
<div class="modal" id="leadModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
  <div class="modal-card">
    <button class="modal-close" id="modalClose" aria-label="Tutup">&times;</button>
    <h3 id="modalTitle">Ambil akses awal.</h3>
    <p id="modalDescription">Tinggalkan detail Anda untuk menerima informasi paket, lisensi white-label, dan jalur paling cocok berdasarkan niche bisnis Anda.</p>

    <div class="modal-offer-summary" id="modalOfferSummary" hidden>
      <span>Pilihan Anda</span>
      <strong id="modalOfferName"></strong>
      <small id="modalOfferMeta"></small>
    </div>

    <form class="modal-form" id="leadForm">
      <input type="text" id="honeypot" name="website" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <input type="hidden" id="selectedPlanId" name="plan_id" />
      <input type="hidden" id="selectedPlanName" name="plan_name" />
      <input type="hidden" id="selectedPlanPrice" name="plan_price" />
      <input type="hidden" id="selectedPackId" name="pack_id" />
      <input type="hidden" id="selectedPackName" name="pack_name" />

      <input type="text" name="name" placeholder="Nama Anda" required />
      <input type="email" name="email" placeholder="Email aktif" required />
      <input type="text" name="niche" placeholder="Niche Anda (mis. advertiser, marketplace, komunitas)" required />
      <div class="cf-turnstile" data-sitekey="0x4AAAAAAAXxxxxx_REPLACE_ME"></div>
      <button class="btn lime full" type="submit">Kirim minat akses →</button>
    </form>
    <div class="modal-message" id="modalMessage">Terima kasih. Detail akses akan kami kirimkan melalui email.</div>
  </div>
</div>
```

Tambahkan CSS ini di akhir `src/styles/forms.css`:

```css
.modal-offer-summary {
  margin: 16px 0;
  padding: 13px 14px;
  border: 1px solid rgba(18, 107, 255, .25);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(18, 107, 255, .08), rgba(16, 220, 213, .08));
}

.modal-offer-summary span,
.modal-offer-summary strong,
.modal-offer-summary small {
  display: block;
}

.modal-offer-summary span {
  color: var(--av-blue-600);
  font: 600 9px/1 "DM Mono", monospace;
  letter-spacing: .75px;
  text-transform: uppercase;
}

.modal-offer-summary strong {
  margin-top: 7px;
  color: var(--ink);
  font-size: 14px;
  letter-spacing: -.2px;
}

.modal-offer-summary small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}
```

---

## 8) Historical: metadata offer pada `src/scripts/lead-form.js`

Pada bagian setelah pembacaan `name`, `email`, dan `niche`, tambahkan:

```js
const planId = formData.get('plan_id')?.trim() || '';
const planName = formData.get('plan_name')?.trim() || '';
const planPrice = Number(formData.get('plan_price')) || 0;
const packId = formData.get('pack_id')?.trim() || '';
const packName = formData.get('pack_name')?.trim() || '';
```

Lalu tambahkan field berikut ke object `payload`:

```js
plan_id: planId,
plan_name: planName,
plan_price: planPrice || undefined,
pack_id: packId,
pack_name: packName,
```

Historical note: `functions/api/lead.js` is not the current checkout backend in this repo. Current order creation goes through `functions/api/checkout/create-order.js`.

---

## Historical Contract for Checkout / PayCore

Checkout nyata saat ini sudah aktif melalui `/checkout/`. Bagian di bawah dipertahankan sebagai referensi struktur offer lama, bukan instruksi implementasi utama. Data offer yang tersedia:

```js
{
  plan: {
    id: 'single-pack' | 'full-vault',
    name: string,
    price: 97000 | 147000,
    priceLabel: string
  },
  pack: null | {
    id: 'advertiser' | 'commerce' | 'creator' | 'branding',
    name: string,
    apps: string[]
  }
}
```

Aturan validasi checkout:

```js
if (offer.plan.id === 'single-pack' && !offer.pack) {
  throw new Error('Single Pack requires an explicit pack selection.');
}
```

`full-vault` selalu mengirim `pack: null`, karena isinya seluruh vault, bukan satu pack tertentu.
