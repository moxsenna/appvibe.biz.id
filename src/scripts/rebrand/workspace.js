import { APP_REGISTRY, getCategoryLabel } from './app-registry.js';
import { copyText, downloadMarkdown } from './download-markdown.js';
import { canUseQaMockMode, getMockMemberData, getQaMockMode } from './mock-member-data.js';
import {
  REBRAND_SCOPES,
  TONE_OPTIONS,
  createDefaultBrandFile,
  createDefaultProject,
  generateRebrandPack,
  validateBrandFile,
  validateProject,
} from './generate-rebrand-pack.js';
import {
  clearRebrandWorkspace,
  loadRebrandWorkspace,
  saveActiveStep,
  saveBrandFile,
  saveGeneratedPack,
  saveProject,
} from './storage.js';

const STEP_LABELS = {
  brand: '1 Brand',
  apps: '2 Aplikasi',
  project: '3 Scope',
  pack: '4 Prompt',
  launch: '5 Launch',
};

const STEP_META = {
  brand: { title: 'Brand File' },
  apps: { title: 'Pilih Aplikasi' },
  project: { title: 'Atur Scope' },
  pack: { title: 'Hasil Prompt' },
  launch: { title: 'Checklist Launch' },
};

const CATEGORY_FILTERS = [
  ['all', 'Semua'],
  ['strategy', 'Strategy'],
  ['launch', 'Launch'],
  ['content', 'Content'],
  ['visual', 'Visual'],
  ['campaign', 'Ads'],
  ['website', 'Website'],
  ['marketplace', 'Marketplace'],
  ['proof', 'Proof'],
  ['persona', 'Persona'],
  ['planning', 'Planning'],
  ['video', 'Video'],
  ['voice', 'Voice'],
  ['print', 'Print'],
];

export async function initRebrandWorkspace({ rootId = 'rebrandWorkspace' } = {}) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const state = {
    root,
    member: null,
    memberKey: 'local',
    allApps: [],
    brandFile: null,
    project: null,
    generatedPack: null,
    activeStep: 'brand',
    selectedCategory: 'all',
    detailAppId: null,
    brandErrors: {},
    projectErrors: {},
    statusMessage: '',
    statusType: 'idle',
    copyMessage: '',
    autosaveLabel: '',
    lastFocusedTrigger: null,
  };

  root.addEventListener('input', (event) => handleInput(event, state));
  root.addEventListener('change', (event) => handleChange(event, state));
  root.addEventListener('click', (event) => handleClick(event, state));
  document.addEventListener('keydown', (event) => handleKeydown(event, state));

  renderLoading(root);

  try {
    const qaMode = getQaMockMode();
    const res = await fetch('/api/member/me', { headers: { Accept: 'application/json' } });
    let data = null;

    if (res.ok) {
      data = await res.json();
    } else if (qaMode && canUseQaMockMode()) {
      data = getMockMemberData(qaMode);
      state.autosaveLabel = `${data.qa_mock_label}. Hanya aktif untuk QA lokal.`;
    } else {
      renderAuthGate(root, res.status);
      return;
    }

    if (!data.app_ids || data.app_ids.length === 0) {
      renderPending(root);
      return;
    }

    state.member = data;
    state.memberKey = data.workspace_key || data.member_key || fallbackMemberKey(data);
    state.allApps = mergeEntitledApps(data);

    const stored = loadRebrandWorkspace(state.memberKey);
    state.brandFile = withOwner(stored.brandFile, createDefaultBrandFile(state.memberKey), state.memberKey);
    state.project = normalizeStoredProject(stored.project, state);
    state.generatedPack = stored.generatedPack || null;
    state.activeStep = getAllowedStep(state, stored.activeStep || 'brand');

    saveBrandFile(state.memberKey, state.brandFile);
    saveProject(state.memberKey, state.project);
    saveActiveStep(state.memberKey, state.activeStep);

    track('rebrand_workspace_opened', state, { entry_point: 'direct' });
    if (stored.brandFile || stored.project || stored.generatedPack) {
      state.autosaveLabel = 'Draft lama dipulihkan dari browser ini.';
      track('rebrand_autosave_restored', state, { entry_point: 'local_storage' });
    }

    render(state);
  } catch {
    const qaMode = getQaMockMode();
    if (qaMode && canUseQaMockMode()) {
      const data = getMockMemberData(qaMode);
      state.member = data;
      state.memberKey = data.workspace_key || data.member_key || fallbackMemberKey(data);
      state.allApps = mergeEntitledApps(data);
      const stored = loadRebrandWorkspace(state.memberKey);
      state.brandFile = withOwner(stored.brandFile, createDefaultBrandFile(state.memberKey), state.memberKey);
      state.project = normalizeStoredProject(stored.project, state);
      state.generatedPack = stored.generatedPack || null;
      state.activeStep = getAllowedStep(state, stored.activeStep || 'brand');
      state.autosaveLabel = `${data.qa_mock_label}. Hanya aktif untuk QA lokal.`;
      render(state);
      return;
    }
    renderLoadError(root);
  }
}

function handleKeydown(event, state) {
  if (event.key === 'Escape' && state.detailAppId) {
    closeDetail(state);
    return;
  }

  if (event.key === 'Tab' && state.detailAppId) {
    const modal = state.root.querySelector('.rw-modal');
    if (!modal) return;
    const focusable = getFocusableElements(modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

function renderLoading(root) {
  root.innerHTML = `
    <div class="rw-loader" role="status" aria-live="polite">
      <span class="rw-spinner" aria-hidden="true"></span>
      <p>Memeriksa akses Rebrand Workspace…</p>
    </div>
  `;
}

function renderAuthGate(root, status) {
  root.innerHTML = `
    <section class="rw-empty rw-empty--wide">
      <span class="rw-kicker">Workspace Private</span>
      <h1>Masuk dulu ke AppVibe Vault</h1>
      <p>Rebrand Workspace hanya tersedia untuk buyer yang sudah memiliki akses aplikasi. Silakan masuk memakai WhatsApp pembelian Anda.</p>
      <a class="rw-primary" href="/access/">Masuk ke portal akses</a>
      <p class="rw-small">Status sesi: ${esc(status || 'tidak tersedia')}</p>
    </section>
  `;
}

function renderPending(root) {
  root.innerHTML = `
    <section class="rw-empty rw-empty--wide">
      <span class="rw-kicker">Akses belum aktif</span>
      <h1>Kami belum menemukan aplikasi aktif</h1>
      <p>Jika Anda baru saja membayar, tunggu beberapa saat lalu muat ulang halaman. Jika masalah berlanjut, hubungi support dengan email pembelian Anda.</p>
      <button class="rw-primary" type="button" onclick="location.reload()">Muat ulang</button>
    </section>
  `;
}

function renderLoadError(root) {
  root.innerHTML = `
    <section class="rw-empty rw-empty--wide">
      <span class="rw-kicker">Terjadi kendala</span>
      <h1>Kami belum bisa memverifikasi akses aplikasi Anda</h1>
      <p>Muat ulang halaman. Jika masalah berlanjut, hubungi support dengan email pembelian Anda.</p>
      <button class="rw-primary" type="button" onclick="location.reload()">Muat ulang</button>
    </section>
  `;
}

function render(state) {
  const { member, project, generatedPack } = state;
  const selectedApp = getSelectedApp(state);
  const ownedCount = state.allApps.filter((app) => app.hasAccess).length;

    state.root.innerHTML = `
    <section class="rw-hero" aria-label="Rebrand Workspace">
      <div>
        <span class="rw-kicker">Workspace Rebrand AppVibe</span>
        ${member?.qa_mock_mode ? `<div class="rw-qa-badge">${esc(member.qa_mock_label)}</div>` : ''}
        <h1>Jangan cuma ganti logo. Jadikan aplikasinya produk Anda.</h1>

        <p>Buat identitas brand sekali, pilih aplikasi dari vault Anda, lalu dapatkan prompt rebrand dan marketing kit yang siap dipakai untuk mulai menjual.</p>
        <div class="rw-hero-actions">
          <button class="rw-primary" type="button" data-step="brand">Buat Brand File Saya</button>
          <button class="rw-secondary" type="button" data-step="apps">Pilih Aplikasi</button>
        </div>
      </div>
      <div class="rw-hero-card" aria-label="Ringkasan akses buyer">
        <span class="rw-kicker">Ringkasan buyer</span>
        <strong>${esc(member?.first_name || 'Buyer')}</strong>
        <dl>
          <div><dt>Aplikasi aktif</dt><dd>${ownedCount}/${APP_REGISTRY.length}</dd></div>
          <div><dt>Lisensi</dt><dd>${member?.has_full_vault ? 'Full Vault' : `${member?.bundle_ids?.length || 0} bundle aktif`}</dd></div>
          <div><dt>Status draft</dt><dd>${generatedPack ? 'Sudah dibuat' : project?.appId ? 'Draft berjalan' : 'Belum mulai'}</dd></div>
        </dl>
      </div>
    </section>

    ${renderStepper(state)}
    ${renderStatus(state)}

    <div class="rw-workbench">
      <div class="rw-config-panel">
        ${state.activeStep === 'brand' ? renderBrandFileForm(state) : ''}
        ${state.activeStep === 'apps' ? renderAppCatalog(state) : ''}
        ${state.activeStep === 'project' ? renderProjectForm(state, selectedApp) : ''}
        ${state.activeStep === 'pack' || state.activeStep === 'launch' ? renderPackPanel(state) : ''}
      </div>
      <aside class="rw-preview-panel" aria-label="Ringkasan progres workspace">
        ${renderPreviewPanel(state)}
      </aside>
    </div>

    ${renderStickyAction(state)}
    ${state.detailAppId ? renderAppDetail(state) : ''}
  `;

  focusOpenedModalIfNeeded(state);
}

function renderStepper(state) {
  return `
    <nav class="rw-stepper" aria-label="Tahapan Rebrand Workspace">
      ${Object.entries(STEP_LABELS).map(([id, label]) => {
        const disabled = !isStepAvailable(state, id);
        return `
          <button
            class="rw-step ${state.activeStep === id ? 'active' : ''} ${disabled ? 'disabled' : ''}"
            type="button"
            data-step="${id}"
            ${disabled ? 'disabled aria-disabled="true"' : ''}
            aria-current="${state.activeStep === id ? 'step' : 'false'}"
            title="${disabled ? `Selesaikan langkah sebelumnya untuk membuka ${STEP_META[id].title}.` : STEP_META[id].title}"
          >
            ${esc(label)}
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

function renderStatus(state) {
  const messages = [];
  if (state.statusMessage) messages.push(`<div class="rw-status rw-status--${esc(state.statusType)}" role="status">${esc(state.statusMessage)}</div>`);
  if (state.copyMessage) messages.push(`<div class="rw-status rw-status--success" role="status">${esc(state.copyMessage)}</div>`);
  return `
    <div class="rw-status-stack" aria-live="polite">
      ${messages.join('')}
      ${state.autosaveLabel ? `<p class="rw-autosave">${esc(state.autosaveLabel)}</p>` : ''}
    </div>
  `;
}

function renderBrandFileForm(state) {
  const b = state.brandFile;
  const e = state.brandErrors;
  return `
    <section class="rw-panel" aria-labelledby="brandFileTitle">
      <div class="rw-panel-head">
        <div>
          <span class="rw-kicker">Brand File</span>
          <h2 id="brandFileTitle">Buat identitas yang dipakai ulang</h2>
          <p>Brand File adalah sumber identitas untuk seluruh rebrand project. Isi dengan detail nyata agar hasil rebrand tetap relevan dan kredibel.</p>
        </div>
        <div class="rw-panel-actions">
          <button class="rw-ghost" type="button" data-duplicate-brand>Duplikat draft</button>
          <button class="rw-ghost rw-danger-text" type="button" data-reset-brand>Reset</button>
        </div>
      </div>

      <form class="rw-form" novalidate>
        <fieldset class="rw-fieldset">
          <legend>Identitas brand</legend>
          <div class="rw-grid rw-grid--2">
            ${field('brandName', 'Nama brand', b.brandName, e.brandName, { required: true, scope: 'brand' })}
            ${field('businessName', 'Nama bisnis/agency', b.businessName, e.businessName, { scope: 'brand' })}
            ${field('tagline', 'Tagline brand', b.tagline, e.tagline, { scope: 'brand' })}
            ${field('niche', 'Niche', b.niche, e.niche, { required: true, scope: 'brand' })}
            ${field('productCategory', 'Kategori produk', b.productCategory, e.productCategory, { scope: 'brand' })}
          </div>
        </fieldset>

        <fieldset class="rw-fieldset">
          <legend>Buyer dan positioning</legend>
          ${textarea('targetBuyer', 'Target buyer', b.targetBuyer, e.targetBuyer, { required: true, scope: 'brand', rows: 2 })}
          ${textarea('buyerProblem', 'Masalah utama buyer', b.buyerProblem, e.buyerProblem, { required: true, scope: 'brand', rows: 2 })}
          ${textarea('buyerDesiredOutcome', 'Outcome yang diinginkan buyer', b.buyerDesiredOutcome, e.buyerDesiredOutcome, { required: true, scope: 'brand', rows: 2 })}
          ${textarea('positioning', 'Pernyataan positioning', b.positioning, e.positioning, { required: true, scope: 'brand', rows: 3 })}
          ${textarea('differentiator', 'Pembeda utama', b.differentiator, e.differentiator, { scope: 'brand', rows: 2 })}
        </fieldset>

        <fieldset class="rw-fieldset">
          <legend>Suara brand</legend>
          <div class="rw-chip-grid" role="group" aria-label="Pilihan tone of voice">
            ${TONE_OPTIONS.map((tone) => `
              <label class="rw-check-chip ${b.toneOfVoice?.includes(tone) ? 'active' : ''}">
                <input type="checkbox" data-tone="${esc(tone)}" ${b.toneOfVoice?.includes(tone) ? 'checked' : ''} />
                <span>${esc(tone)}</span>
              </label>
            `).join('')}
          </div>
          <div class="rw-grid rw-grid--2">
            ${textarea('mandatoryWords', 'Kata/frasa yang wajib digunakan', b.mandatoryWords, e.mandatoryWords, { scope: 'brand', rows: 3 })}
            ${textarea('forbiddenWords', 'Kata/frasa yang harus dihindari', b.forbiddenWords, e.forbiddenWords, { scope: 'brand', rows: 3 })}
          </div>
        </fieldset>

        <fieldset class="rw-fieldset">
          <legend>Setup konversi</legend>
          <div class="rw-grid rw-grid--2">
            ${field('primaryCta', 'CTA utama', b.primaryCta, e.primaryCta, { required: true, scope: 'brand' })}
            ${field('primaryCtaUrl', 'URL CTA', b.primaryCtaUrl, e.primaryCtaUrl, { scope: 'brand', type: 'url' })}
            ${field('websiteUrl', 'URL website', b.websiteUrl, e.websiteUrl, { scope: 'brand', type: 'url' })}
            ${field('instagramHandle', 'Instagram', b.instagramHandle, e.instagramHandle, { scope: 'brand' })}
            ${field('whatsappNumber', 'WhatsApp', b.whatsappNumber, e.whatsappNumber, { scope: 'brand', inputmode: 'tel' })}
          </div>
        </fieldset>

        <fieldset class="rw-fieldset">
          <legend>Sistem visual</legend>
          <div class="rw-grid rw-grid--3">
            ${field('primaryColor', 'Warna utama', b.primaryColor, e.primaryColor, { scope: 'brand', type: 'colorText' })}
            ${field('secondaryColor', 'Warna sekunder', b.secondaryColor, e.secondaryColor, { scope: 'brand', type: 'colorText' })}
            ${field('accentColor', 'Warna aksen', b.accentColor, e.accentColor, { scope: 'brand', type: 'colorText' })}
          </div>
          ${field('typographyPreference', 'Preferensi tipografi', b.typographyPreference, e.typographyPreference, { scope: 'brand' })}
          ${textarea('logoReference', 'Catatan referensi logo/upload', b.logoReference, e.logoReference, { scope: 'brand', rows: 2 })}
        </fieldset>

        <fieldset class="rw-fieldset">
          <legend>Proof dan batas klaim</legend>
          ${textarea('availableProof', 'Proof nyata yang tersedia saat ini', b.availableProof, e.availableProof, { scope: 'brand', rows: 3 })}
          ${textarea('claimBoundaries', 'Klaim yang masih boleh digunakan', b.claimBoundaries, e.claimBoundaries, { scope: 'brand', rows: 3 })}
          ${textarea('claimsNeverMake', 'Klaim yang tidak boleh dibuat', b.claimsNeverMake, e.claimsNeverMake, { scope: 'brand', rows: 3 })}
        </fieldset>
      </form>
    </section>
  `;
}

function renderAppCatalog(state) {
  const filtered = state.selectedCategory === 'all'
    ? state.allApps
    : state.allApps.filter((app) => app.category === state.selectedCategory);

  return `
    <section class="rw-panel" aria-labelledby="appCatalogTitle">
      <div class="rw-panel-head">
        <div>
          <span class="rw-kicker">Aplikasi Saya</span>
          <h2 id="appCatalogTitle">Pilih aplikasi untuk direbrand</h2>
          <p>Anda dapat mengganti nama, visual, positioning, contoh use case, dan copy. Fungsi inti aplikasi tetap dipertahankan agar hasil rebrand tetap bisa dipakai.</p>
        </div>
      </div>
      <p class="rw-scroll-hint">Geser untuk melihat kategori lain jika belum terlihat.</p>
      <div class="rw-filters" aria-label="Filter kategori aplikasi">
        ${CATEGORY_FILTERS.map(([id, label]) => `
          <button class="rw-filter ${state.selectedCategory === id ? 'active' : ''}" type="button" data-category-filter="${id}">${esc(label)}</button>
        `).join('')}
      </div>
      <div class="rw-app-grid">
        ${filtered.map((app) => renderAppCard(state, app)).join('')}
      </div>
    </section>
  `;
}

function renderAppCard(state, app) {
  const isSelected = state.project?.appId === app.id;
  const generated = state.generatedPack && isSelected;
  const status = generated ? 'Sudah dibuat' : isSelected ? 'Draft' : 'Baru';
  return `
    <article class="rw-app-card ${app.hasAccess ? 'owned' : 'locked'} ${isSelected ? 'selected' : ''}">
      <div class="rw-app-top">
        <span class="rw-app-icon" style="--app-accent:${esc(app.accent || '#126BFF')}">${esc(app.label || app.name?.slice(0, 3) || 'APP')}</span>
        <span class="rw-access ${app.hasAccess ? 'rw-access--owned' : 'rw-access--locked'}">${app.hasAccess ? 'Aktif' : 'Terkunci'}</span>
      </div>
      <div class="rw-app-body">
        <div class="rw-app-meta">
          <span>${esc(getCategoryLabel(app.category))}</span>
          <span>${esc(status)}</span>
        </div>
        <h3>${esc(app.name)}</h3>
        <p>${esc(app.shortDescription || app.function || '')}</p>
        <p class="rw-protected">Anda bisa ubah brand dan positioning, tanpa mengubah fungsi inti aplikasi.</p>
      </div>
      <div class="rw-card-actions">
        <button class="rw-secondary" type="button" data-detail-app="${esc(app.id)}">Lihat detail</button>
        <button class="rw-primary" type="button" data-select-app="${esc(app.id)}" ${app.hasAccess ? '' : 'disabled'}>
          ${app.hasAccess ? 'Mulai rebrand' : 'Terkunci'}
        </button>
      </div>
      ${app.hasAccess ? '' : '<p class="rw-locked-note">Aplikasi ini belum termasuk akses Anda. Pilih aplikasi dari bundle yang sudah aktif.</p>'}
    </article>
  `;
}

function renderProjectForm(state, selectedApp) {
  if (!selectedApp) {
    return `
      <section class="rw-empty">
        <span class="rw-kicker">Project Rebrand</span>
        <h2>Pilih aplikasi terlebih dahulu</h2>
        <p>Setelah aplikasi dipilih, Anda dapat mengatur scope rebrand dan positioning produk baru.</p>
        <button class="rw-primary" type="button" data-step="apps">Pilih aplikasi</button>
      </section>
    `;
  }

  const p = state.project;
  const e = state.projectErrors;
  return `
    <section class="rw-panel" aria-labelledby="projectTitle">
      <div class="rw-panel-head">
        <div>
          <span class="rw-kicker">Project Rebrand</span>
          <h2 id="projectTitle">${esc(selectedApp.name)} → ${esc(p.newAppName || 'Produk Baru')}</h2>
          <p>Pilih scope yang paling sesuai. Hasil prompt selalu menjaga fungsi inti aplikasi agar tetap aman digunakan.</p>
        </div>
        <button class="rw-secondary" type="button" data-step="apps">Ganti aplikasi</button>
      </div>

      <div class="rw-selected-app">
        <span class="rw-app-icon" style="--app-accent:${esc(selectedApp.accent || '#126BFF')}">${esc(selectedApp.label || selectedApp.name.slice(0, 3))}</span>
        <div>
          <strong>${esc(selectedApp.name)}</strong>
          <p>${esc(selectedApp.coreOutcome || selectedApp.output || selectedApp.shortDescription)}</p>
        </div>
      </div>

      <fieldset class="rw-fieldset">
        <legend>Pilih cakupan rebrand</legend>
        <div class="rw-scope-grid">
          ${Object.values(REBRAND_SCOPES).map((scope) => `
            <button class="rw-scope-card ${p.scope === scope.id ? 'active' : ''}" type="button" data-scope="${scope.id}">
              <strong>${esc(scope.label)}</strong>
              <span>${esc(scope.description)}</span>
            </button>
          `).join('')}
        </div>
        ${e.scope ? `<p class="rw-error">${esc(e.scope)}</p>` : ''}
      </fieldset>

      <form class="rw-form" novalidate>
        <fieldset class="rw-fieldset">
          <legend>Identitas produk baru</legend>
          <div class="rw-grid rw-grid--2">
            ${field('newAppName', 'Nama aplikasi baru', p.newAppName, e.newAppName, { required: true, scope: 'project' })}
            ${field('newAppTagline', 'Tagline aplikasi baru', p.newAppTagline, e.newAppTagline, { scope: 'project' })}
          </div>
          ${textarea('visualDirection', 'Arah visual brand', p.visualDirection, e.visualDirection, { scope: 'project', rows: 3 })}
        </fieldset>

        <fieldset class="rw-fieldset">
          <legend>Repositioning market</legend>
          ${textarea('newTargetMarket', 'Target market baru', p.newTargetMarket, e.newTargetMarket, { required: true, scope: 'project', rows: 2 })}
          ${textarea('useCase', 'Use case utama', p.useCase, e.useCase, { required: true, scope: 'project', rows: 2 })}
          ${textarea('primaryProblem', 'Masalah utama', p.primaryProblem, e.primaryProblem, { required: true, scope: 'project', rows: 2 })}
          ${textarea('promisedOutcome', 'Outcome yang dijanjikan', p.promisedOutcome, e.promisedOutcome, { required: true, scope: 'project', rows: 2 })}
          ${textarea('differentiator', 'Pembeda project', p.differentiator, e.differentiator, { scope: 'project', rows: 2 })}
        </fieldset>

        <fieldset class="rw-fieldset">
          <legend>Batasan dan fokus</legend>
          ${textarea('requiredFeaturesToEmphasize', 'Fitur yang ingin ditonjolkan', p.requiredFeaturesToEmphasize, e.requiredFeaturesToEmphasize, { scope: 'project', rows: 3 })}
          ${textarea('featuresNotToChange', 'Fitur yang tidak boleh diubah', p.featuresNotToChange, e.featuresNotToChange, { scope: 'project', rows: 3 })}
          ${textarea('additionalInstructions', 'Instruksi tambahan', p.additionalInstructions, e.additionalInstructions, { scope: 'project', rows: 3 })}
        </fieldset>

        <div class="rw-generate-box">
          <div>
            <strong>Buat Rebrand Pack</strong>
            <p>Output dibuat otomatis dari data yang Anda isi. Fungsi inti aplikasi dan batas klaim tetap dijaga.</p>
          </div>
          <button class="rw-primary" type="button" data-generate-pack>Buat Rebrand Pack</button>
        </div>
      </form>
    </section>
  `;
}

function renderPackPanel(state) {
  if (!state.generatedPack) {
    return `
      <section class="rw-empty">
        <span class="rw-kicker">Handover Pack</span>
        <h2>Belum ada hasil yang dibuat</h2>
        <p>Lengkapi Brand File, pilih aplikasi, lalu klik Buat Rebrand Pack.</p>
        <button class="rw-primary" type="button" data-step="project">Buka project rebrand</button>
      </section>
    `;
  }

  return `
    <section class="rw-panel" aria-labelledby="packTitle">
      <div class="rw-panel-head">
        <div>
          <span class="rw-kicker">Handover Pack</span>
          <h2 id="packTitle">${esc(state.project.newAppName)} — hasil siap digunakan</h2>
          <p>Salin blok yang dibutuhkan atau download seluruh handover pack sebagai file Markdown.</p>
        </div>
        <button class="rw-primary" type="button" data-download-pack>Download .md</button>
      </div>
      <div class="rw-output-stack">
        ${state.generatedPack.blocks.map((block) => renderOutputCard(block)).join('')}
      </div>
    </section>
  `;
}

function renderPreviewPanel(state) {
  const selectedApp = getSelectedApp(state);
  const brandErrors = validateBrandFile(state.brandFile || {});
  const projectErrors = validateProject(state.project || {});
  const brandReady = Object.keys(brandErrors).length === 0;
  const projectReady = selectedApp && Object.keys(projectErrors).length === 0;

  if (state.generatedPack) {
    return `
      <div class="rw-preview-head">
        <span class="rw-kicker">Hasil sudah siap</span>
        <h2>${esc(state.generatedPack.scopeLabel)}</h2>
        <p>Dibuat pada: ${esc(formatDateTime(state.generatedPack.generatedAt))}</p>
      </div>
      <div class="rw-mini-list">
        ${state.generatedPack.blocks.map((block) => `<button type="button" data-step="pack">${esc(block.title)}</button>`).join('')}
      </div>
      <button class="rw-primary rw-full" type="button" data-download-pack>Download handover pack</button>
    `;
  }

  return `
    <div class="rw-preview-head">
      <span class="rw-kicker">Checklist progres</span>
      <h2>Siap membuat hasil?</h2>
      <p>Lengkapi langkah wajib agar hasil rebrand lebih jelas, lebih realistis, dan tetap aman dipakai.</p>
    </div>
    <ul class="rw-readiness">
      <li class="${brandReady ? 'done' : ''}"><span></span>Brand File minimum lengkap</li>
      <li class="${selectedApp ? 'done' : ''}"><span></span>Aplikasi aktif sudah dipilih</li>
      <li class="${projectReady ? 'done' : ''}"><span></span>Positioning project lengkap</li>
      <li class="${state.project?.scope ? 'done' : ''}"><span></span>Scope rebrand dipilih</li>
    </ul>
    <div class="rw-preview-note">
      <strong>Aturan aman tetap aktif</strong>
      <p>Hasil selalu menyertakan instruksi untuk menjaga fungsi inti aplikasi, menghindari proof palsu, dan menjaga batas klaim.</p>
    </div>
  `;
}

function renderOutputCard(block) {
  return `
    <article class="rw-output-card">
      <div class="rw-output-head">
        <h3>${esc(block.title)}</h3>
        <button class="rw-secondary" type="button" data-copy-block="${esc(block.id)}">Salin</button>
      </div>
      <pre tabindex="0"><code>${esc(block.body)}</code></pre>
    </article>
  `;
}

function renderStickyAction(state) {
  if (state.activeStep === 'brand') {
    return `<div class="rw-sticky"><button class="rw-primary" type="button" data-validate-brand-next>Simpan & pilih aplikasi</button></div>`;
  }
  if (state.activeStep === 'apps') {
    return `<div class="rw-sticky"><button class="rw-primary" type="button" data-step="project" ${state.project?.appId ? '' : 'disabled'}>Lanjut ke scope</button></div>`;
  }
  if (state.activeStep === 'project') {
    return `<div class="rw-sticky"><button class="rw-primary" type="button" data-generate-pack>Buat Rebrand Pack</button></div>`;
  }
  if (state.generatedPack) {
    return `<div class="rw-sticky"><button class="rw-primary" type="button" data-download-pack>Download Handover Pack</button></div>`;
  }
  return '';
}

function renderAppDetail(state) {
  const app = state.allApps.find((item) => item.id === state.detailAppId);
  if (!app) return '';
  const packLabels = (app.bundleIds || app.packs || []).join(', ');
  return `
    <div class="rw-modal-backdrop" role="presentation" data-close-detail>
      <section class="rw-modal" role="dialog" aria-modal="true" aria-labelledby="appDetailTitle" tabindex="-1">
        <button class="rw-modal-close" type="button" data-close-detail aria-label="Tutup detail aplikasi">×</button>
        <span class="rw-kicker">Detail aplikasi</span>
        <h2 id="appDetailTitle">${esc(app.name)}</h2>
        <p>${esc(app.shortDescription || app.function || '')}</p>
        <div class="rw-detail-grid">
          <div><strong>Apa fungsi aplikasi ini</strong><span>${esc(app.coreOutcome || app.output || app.shortDescription)}</span></div>
          <div><strong>Bisa diposisikan ulang untuk siapa</strong><span>${esc(app.defaultAudience || 'Target buyer spesifik sesuai Brand File Anda.')}</span></div>
          <div><strong>Yang boleh diubah</strong><span>Nama, visual, positioning, copy, use case, demo data, CTA, dan framing benefit.</span></div>
          <div><strong>Yang tetap dijaga</strong><span>${esc(app.nonNegotiableLogic?.join(' ') || 'Core workflow and app behavior must stay intact.')}</span></div>
          <div><strong>Contoh repositioning</strong><span>Contoh: ${esc(app.rebrand || app.promptNotes?.[0] || 'produk niche untuk buyer spesifik Anda')}.</span></div>
          <div><strong>Bundle terkait</strong><span>${esc(packLabels || 'Tidak tersedia')}</span></div>
        </div>
        ${app.hasAccess
          ? `<button class="rw-primary rw-full" type="button" data-select-app="${esc(app.id)}">Mulai rebrand ${esc(app.name)}</button>`
          : '<p class="rw-locked-note">Aplikasi ini belum termasuk akses Anda. Pilih aplikasi dari bundle yang sudah aktif, atau buka akses bundle terkait dari halaman penawaran.</p>'}
      </section>
    </div>
  `;
}

function field(name, label, value, error, opts = {}) {
  const type = opts.type === 'url' ? 'url' : opts.type === 'colorText' ? 'text' : opts.type || 'text';
  const scope = opts.scope || 'brand';
  const errorId = `${scope}-${name}-error`;
  return `
    <label class="rw-field ${error ? 'has-error' : ''}">
      <span>${esc(label)} ${opts.required ? '<b>*</b>' : ''}</span>
      <input
        type="${esc(type)}"
        value="${esc(value || '')}"
        data-${scope}-field="${esc(name)}"
        ${opts.inputmode ? `inputmode="${esc(opts.inputmode)}"` : ''}
        ${opts.required ? 'required' : ''}
        ${error ? `aria-invalid="true" aria-describedby="${errorId}"` : ''}
      />
      ${error ? `<small class="rw-error" id="${errorId}">${esc(error)}</small>` : ''}
    </label>
  `;
}

function textarea(name, label, value, error, opts = {}) {
  const scope = opts.scope || 'brand';
  const errorId = `${scope}-${name}-error`;
  return `
    <label class="rw-field rw-field--textarea ${error ? 'has-error' : ''}">
      <span>${esc(label)} ${opts.required ? '<b>*</b>' : ''}</span>
      <textarea
        rows="${opts.rows || 3}"
        data-${scope}-field="${esc(name)}"
        ${opts.required ? 'required' : ''}
        ${error ? `aria-invalid="true" aria-describedby="${errorId}"` : ''}
      >${esc(value || '')}</textarea>
      ${error ? `<small class="rw-error" id="${errorId}">${esc(error)}</small>` : ''}
    </label>
  `;
}

function handleInput(event, state) {
  const brandField = event.target.closest('[data-brand-field]');
  const projectField = event.target.closest('[data-project-field]');

  if (brandField) {
    state.brandFile[brandField.dataset.brandField] = brandField.value;
    state.brandFile.updatedAt = new Date().toISOString();
    const result = saveBrandFile(state.memberKey, state.brandFile);
    setAutosaveState(state, result, 'Brand File tersimpan otomatis.');
  }

  if (projectField) {
    state.project[projectField.dataset.projectField] = projectField.value;
    state.project.updatedAt = new Date().toISOString();
    const result = saveProject(state.memberKey, state.project);
    setAutosaveState(state, result, 'Draft project tersimpan otomatis.');
  }
}

function handleChange(event, state) {
  const toneInput = event.target.closest('[data-tone]');
  if (!toneInput) return;
  const tone = toneInput.dataset.tone;
  const next = new Set(state.brandFile.toneOfVoice || []);
  if (toneInput.checked) next.add(tone);
  else next.delete(tone);
  state.brandFile.toneOfVoice = [...next];
  state.brandFile.updatedAt = new Date().toISOString();
  const result = saveBrandFile(state.memberKey, state.brandFile);
  setAutosaveState(state, result, 'Suara brand tersimpan otomatis.');
  render(state);
}

async function handleClick(event, state) {
  const modalCloseButton = event.target.closest('.rw-modal-close');
  const backdropClick = event.target.classList?.contains('rw-modal-backdrop');
  if (modalCloseButton || backdropClick) {
    closeDetail(state);
    return;
  }

  const stepBtn = event.target.closest('[data-step]');
  if (stepBtn) {
    const nextStep = getAllowedStep(state, stepBtn.dataset.step);
    if (nextStep !== stepBtn.dataset.step) {
      state.statusMessage = `Selesaikan langkah sebelumnya untuk membuka ${STEP_META[stepBtn.dataset.step].title}.`;
      state.statusType = 'error';
      render(state);
      return;
    }
    state.activeStep = nextStep;
    saveActiveStep(state.memberKey, state.activeStep);
    render(state);
    return;
  }

  const categoryBtn = event.target.closest('[data-category-filter]');
  if (categoryBtn) {
    state.selectedCategory = categoryBtn.dataset.categoryFilter;
    render(state);
    return;
  }

  const detailBtn = event.target.closest('[data-detail-app]');
  if (detailBtn) {
    state.lastFocusedTrigger = detailBtn;
    state.detailAppId = detailBtn.dataset.detailApp;
    if (!state.allApps.find((app) => app.id === state.detailAppId)?.hasAccess) {
      track('rebrand_locked_app_viewed', state, { app_id: state.detailAppId });
    }
    render(state);
    return;
  }

  const selectBtn = event.target.closest('[data-select-app]');
  if (selectBtn) {
    state.lastFocusedTrigger = selectBtn;
    selectApp(state, selectBtn.dataset.selectApp);
    return;
  }

  const scopeBtn = event.target.closest('[data-scope]');
  if (scopeBtn) {
    state.project.scope = scopeBtn.dataset.scope;
    state.project.updatedAt = new Date().toISOString();
    saveProject(state.memberKey, state.project);
    state.autosaveLabel = 'Scope rebrand disimpan.';
    track('rebrand_scope_selected', state, { scope: state.project.scope, app_id: state.project.appId });
    render(state);
    return;
  }

  if (event.target.closest('[data-reset-brand]')) {
    if (!confirm('Reset Brand File dan draft project di browser ini? Aksi ini tidak dapat dibatalkan.')) return;
    clearRebrandWorkspace(state.memberKey);
    state.brandFile = createDefaultBrandFile(state.memberKey);
    state.project = createDefaultProject(state.memberKey, null, state.brandFile);
    state.generatedPack = null;
    state.brandErrors = {};
    state.projectErrors = {};
    state.activeStep = 'brand';
    state.statusMessage = 'Workspace lokal sudah direset.';
    state.statusType = 'success';
    state.autosaveLabel = '';
    saveBrandFile(state.memberKey, state.brandFile);
    saveProject(state.memberKey, state.project);
    saveActiveStep(state.memberKey, state.activeStep);
    track('rebrand_workspace_reset', state, { entry_point: 'brand_file' });
    render(state);
    return;
  }

  if (event.target.closest('[data-duplicate-brand]')) {
    state.brandFile = {
      ...state.brandFile,
      id: cryptoSafeId('brand'),
      brandName: state.brandFile.brandName ? `${state.brandFile.brandName} Copy` : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.project.brandFileId = state.brandFile.id;
    saveBrandFile(state.memberKey, state.brandFile);
    saveProject(state.memberKey, state.project);
    state.statusMessage = 'Draft Brand File berhasil diduplikat.';
    state.statusType = 'success';
    render(state);
    return;
  }

  if (event.target.closest('[data-validate-brand-next]')) {
    state.brandErrors = validateBrandFile(state.brandFile);
    if (Object.keys(state.brandErrors).length) {
      state.statusMessage = 'Lengkapi Brand File terlebih dahulu agar hasil rebrand lebih jelas dan tidak melenceng.';
      state.statusType = 'error';
      render(state);
      return;
    }
    track('rebrand_brand_file_saved', state, { is_first_brand_file: !state.project?.appId });
    state.activeStep = 'apps';
    saveActiveStep(state.memberKey, state.activeStep);
    state.statusMessage = '';
    render(state);
    return;
  }

  if (event.target.closest('[data-generate-pack]')) {
    generatePack(state);
    return;
  }

  const copyBtn = event.target.closest('[data-copy-block]');
  if (copyBtn) {
    await copyBlock(state, copyBtn.dataset.copyBlock);
    return;
  }

  if (event.target.closest('[data-download-pack]')) {
    if (!state.generatedPack) return;
    downloadMarkdown(state.generatedPack.handoverMarkdown, state.generatedPack.filename);
    track('rebrand_handover_downloaded', state, { app_id: state.project.appId, scope: state.project.scope });
    state.copyMessage = 'Handover pack berhasil didownload sebagai Markdown.';
    render(state);
  }
}

function selectApp(state, appId) {
  const app = state.allApps.find((item) => item.id === appId);
  if (!app || !app.hasAccess) {
    track('rebrand_locked_app_viewed', state, { app_id: appId });
    return;
  }

  state.project = createDefaultProject(state.memberKey, app, state.brandFile);
  state.project.brandFileId = state.brandFile.id;
  state.project.updatedAt = new Date().toISOString();
  state.generatedPack = null;
  state.projectErrors = {};
  state.detailAppId = null;
  state.activeStep = 'project';
  state.copyMessage = '';
  state.autosaveLabel = 'Aplikasi dipilih. Draft project baru sudah dibuat.';
  saveProject(state.memberKey, state.project);
  saveGeneratedPack(state.memberKey, null);
  saveActiveStep(state.memberKey, state.activeStep);
  track('rebrand_app_selected', state, { app_id: app.id });
  render(state);
}

function generatePack(state) {
  const selectedApp = getSelectedApp(state);
  state.brandErrors = validateBrandFile(state.brandFile);
  state.projectErrors = validateProject(state.project);
  if (!selectedApp) state.projectErrors.appId = 'Pilih aplikasi aktif terlebih dahulu.';

  if (Object.keys(state.brandErrors).length || Object.keys(state.projectErrors).length) {
    state.statusMessage = 'Lengkapi Brand File dan Project Rebrand terlebih dahulu.';
    state.statusType = 'error';
    render(state);
    return;
  }

  try {
    const generatedAt = new Date().toISOString();
    state.project.generatedAt = generatedAt;
    state.project.updatedAt = generatedAt;
    state.generatedPack = generateRebrandPack({
      brandFile: state.brandFile,
      project: state.project,
      app: selectedApp,
      generatedAt,
    });
    saveProject(state.memberKey, state.project);
    saveGeneratedPack(state.memberKey, state.generatedPack);
    state.activeStep = 'pack';
    saveActiveStep(state.memberKey, state.activeStep);
    state.statusMessage = 'Rebrand Pack berhasil dibuat. Anda bisa salin blok yang dibutuhkan atau download file Markdown.';
    state.statusType = 'success';
    state.copyMessage = '';
    state.autosaveLabel = `Draft terakhir diperbarui ${formatDateTime(generatedAt)}.`;
    track('rebrand_pack_generated', state, { app_id: state.project.appId, scope: state.project.scope });
    render(state);
  } catch {
    state.statusMessage = 'Hasil belum bisa dibuat. Periksa field wajib lalu coba lagi.';
    state.statusType = 'error';
    render(state);
  }
}

async function copyBlock(state, blockId) {
  const block = state.generatedPack?.blocks?.find((item) => item.id === blockId);
  if (!block) return;
  try {
    await copyText(block.body);
    state.copyMessage = `${block.title} berhasil disalin.`;
    state.statusMessage = '';
    track('rebrand_prompt_copied', state, { app_id: state.project.appId, scope: state.project.scope, block_id: blockId });
  } catch {
    state.copyMessage = '';
    state.statusMessage = 'Browser tidak mengizinkan salin otomatis. Pilih teks prompt lalu salin secara manual.';
    state.statusType = 'error';
  }
  render(state);
}

function mergeEntitledApps(data) {
  const ownedSet = new Set(data.app_ids || []);
  const apiById = new Map((data.apps || []).map((app) => [app.id, app]));
  return APP_REGISTRY.map((registryApp) => {
    const apiApp = apiById.get(registryApp.id) || {};
    return {
      ...registryApp,
      ...apiApp,
      bundleIds: registryApp.bundleIds,
      packs: apiApp.packs || registryApp.bundleIds,
      shortDescription: registryApp.shortDescription,
      category: registryApp.category,
      defaultAudience: registryApp.defaultAudience,
      coreOutcome: registryApp.coreOutcome,
      nonNegotiableLogic: registryApp.nonNegotiableLogic,
      promptNotes: registryApp.promptNotes,
      hasAccess: data.has_full_vault || ownedSet.has(registryApp.id),
    };
  });
}

function normalizeStoredProject(storedProject, state) {
  if (!storedProject) return createDefaultProject(state.memberKey, null, state.brandFile);
  const selectedApp = state.allApps.find((app) => app.id === storedProject.appId && app.hasAccess) || null;
  return {
    ...createDefaultProject(state.memberKey, selectedApp, state.brandFile),
    ...storedProject,
    ownerId: state.memberKey,
    brandFileId: state.brandFile.id,
  };
}

function withOwner(stored, fallback, ownerId) {
  if (!stored) return fallback;
  return { ...fallback, ...stored, ownerId };
}

function getSelectedApp(state) {
  return state.allApps.find((app) => app.id === state.project?.appId && app.hasAccess) || null;
}

function isStepAvailable(state, step) {
  const hasApp = Boolean(state.project?.appId && getSelectedApp(state));
  const hasPack = Boolean(state.generatedPack);
  if (step === 'project') return hasApp;
  if (step === 'pack' || step === 'launch') return hasPack;
  return true;
}

function getAllowedStep(state, requestedStep) {
  if (isStepAvailable(state, requestedStep)) return requestedStep;
  if (!state.project?.appId) return requestedStep === 'pack' || requestedStep === 'launch' ? 'apps' : 'brand';
  if (!state.generatedPack && (requestedStep === 'pack' || requestedStep === 'launch')) return 'project';
  return 'brand';
}

function setAutosaveState(state, result, successMessage) {
  if (result.ok) {
    state.autosaveLabel = `${successMessage} • ${formatDateTime(new Date().toISOString())}`;
    state.statusMessage = state.statusType === 'error' ? state.statusMessage : '';
    state.copyMessage = state.copyMessage;
  } else {
    state.statusMessage = 'Draft belum tersimpan. Coba lagi, lalu salin prompt Anda sebagai cadangan sebelum menutup halaman.';
    state.statusType = 'error';
  }
  const status = state.root.querySelector('.rw-status-stack');
  if (status) status.innerHTML = renderStatus(state).replace(/^\s*<div class="rw-status-stack" aria-live="polite">|<\/div>\s*$/g, '');
}

function closeDetail(state) {
  state.detailAppId = null;
  render(state);
  if (state.lastFocusedTrigger && typeof state.lastFocusedTrigger.focus === 'function') {
    queueMicrotask(() => state.lastFocusedTrigger.focus());
  }
}

function focusOpenedModalIfNeeded(state) {
  if (!state.detailAppId) return;
  const modal = state.root.querySelector('.rw-modal');
  const closeButton = state.root.querySelector('.rw-modal-close');
  if (closeButton) closeButton.focus();
  else if (modal) modal.focus();
}

function getFocusableElements(container) {
  return [...container.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

function track(eventName, state, payload = {}) {
  if (!window.trackVaultEvent) return;
  window.trackVaultEvent(eventName, {
    app_id: payload.app_id || state.project?.appId || null,
    scope: payload.scope || state.project?.scope || null,
    has_full_vault: Boolean(state.member?.has_full_vault),
    entry_point: payload.entry_point || null,
    is_first_brand_file: payload.is_first_brand_file,
    block_id: payload.block_id,
  });
}

function fallbackMemberKey(data) {
  const raw = [data.first_name, data.has_full_vault, data.bundle_ids?.join('-'), data.app_ids?.join('-')].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return `member_${Math.abs(hash)}`;
}

function cryptoSafeId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function esc(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}
