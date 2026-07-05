import { APP_REGISTRY, getCategoryLabel } from './app-registry.js';
import { copyText, downloadMarkdown } from './download-markdown.js';
import { canUseQaMockMode, getMockMemberData, getQaMockMode } from './mock-member-data.js';
import {
  REBRAND_SCOPES, TONE_OPTIONS,
  OFFER_PRICING_MODELS, OFFER_GUARANTEE_TYPES,
  createDefaultBrandFile, createDefaultProject, generateRebrandPack,
  normalizeBrandFile, validateBrandFile, validateProject,
} from './generate-rebrand-pack.js';
import {
  deriveBrandContext, TONE_PRESETS,
} from './brand-derive.js';
import {
  clearRebrandWorkspace, detectStalePacks, isWalkthroughSeen, loadGeneratedPack,
  loadRebrandWorkspace, markWalkthroughSeen, saveBrandFile, saveGeneratedPack, saveProject,
  clearWalkthroughFlag,
} from './storage.js';

const CATEGORY_FILTERS = [
  ['all', 'Semua'], ['strategy', 'Strategy'], ['launch', 'Launch'],
  ['content', 'Content'], ['visual', 'Visual'], ['campaign', 'Ads'],
  ['website', 'Website'], ['marketplace', 'Marketplace'], ['proof', 'Proof'],
  ['persona', 'Persona'], ['planning', 'Planning'], ['video', 'Video'],
  ['voice', 'Voice'], ['print', 'Print'],
];

const STATUS_LABELS = { empty: 'Baru', draft: 'Draft', done: 'Selesai', stale: 'Perbarui' };

function appStatus(state, appId) {
  if (state.packs[appId]) return state.stalePacks[appId] ? 'stale' : 'done';
  const p = state.projects[appId];
  if (p?.newAppName) {
    const reg = APP_REGISTRY.find((a) => a.id === appId)?.name || '';
    if (p.newAppName !== reg) return 'draft';
  }
  return 'empty';
}

function projectForApp(state, app) {
  if (!state.projects[app.id]) {
    state.projects[app.id] = createDefaultProject(state.memberKey, app, state.brandFile);
    state.projects[app.id].brandFileId = state.brandFile.id;
  }
  return state.projects[app.id];
}

export async function initRebrandWorkspace({ rootId = 'rebrandWorkspace' } = {}) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const state = {
    root, member: null, memberKey: 'local', allApps: [],
    brandFile: null, brandMode: 'setup', brandErrors: {}, brandFullModalOpen: false,
    projects: {}, packs: {}, stalePacks: {},
    selectedCategory: 'all', expandedResults: null, bottomSheetApp: null,
    detailAppId: null, searchQuery: '', batchApps: new Set(), batchRunning: false,
    statusMessage: '', statusType: 'idle', copyMessage: '', autosaveLabel: '',
    lastFocusedTrigger: null,
    walkthrough: { active: false, step: 0 },
  };
  root._walkthroughState = state;

  root.addEventListener('input', (e) => handleInput(e, state));
  root.addEventListener('change', (e) => handleChange(e, state));
  root.addEventListener('click', (e) => handleWalkthroughClick(e, state) || handleClick(e, state));
  document.addEventListener('keydown', (e) => handleWalkthroughKey(e, state) || handleKeydown(e, state));
  renderLoading(root);

  try {
    const qaMode = getQaMockMode();
    const res = await fetch('/api/member/me', { headers: { Accept: 'application/json' } });
    let data = null;
    if (res.ok) { data = await res.json(); }
    else if (qaMode && canUseQaMockMode()) { data = getMockMemberData(qaMode); state.autosaveLabel = `${data.qa_mock_label}. Hanya aktif untuk QA lokal.`; }
    else { renderAuthGate(root, res.status); return; }
    if (!data.app_ids || data.app_ids.length === 0) { renderPending(root); return; }

    state.member = data;
    state.memberKey = data.workspace_key || data.member_key || fallbackMemberKey(data);
    state.allApps = mergeEntitledApps(data);
    hydrateState(state);

    track('rebrand_workspace_opened', state, { entry_point: 'direct' });
    if (state.brandFile?.brandName || Object.keys(state.projects).length > 0) {
      state.autosaveLabel = state.autosaveLabel || 'Draft lama dipulihkan dari browser ini.';
      track('rebrand_autosave_restored', state, { entry_point: 'local_storage' });
    }
    render(state);
  } catch {
    const qaMode = getQaMockMode();
    if (qaMode && canUseQaMockMode()) {
      const data = getMockMemberData(qaMode);
      state.member = data; state.memberKey = data.workspace_key || data.member_key || fallbackMemberKey(data);
      state.allApps = mergeEntitledApps(data); hydrateState(state);
      state.autosaveLabel = `${data.qa_mock_label}. Hanya aktif untuk QA lokal.`; render(state); return;
    }
    renderLoadError(root);
  }
}

function hydrateState(state) {
  const stored = loadRebrandWorkspace(state.memberKey);
  state.brandFile = normalizeBrandFile(stored.brandFile) || createDefaultBrandFile(state.memberKey);
  state.brandFile.ownerId = state.memberKey;
  state.projects = stored.projects || {};
  state.packs = {}; state.stalePacks = {};
  for (const appId of Object.keys(state.projects)) {
    state.packs[appId] = loadGeneratedPack(state.memberKey, appId) || null;
  }
  state.stalePacks = detectStalePacks(state.memberKey);
  for (const appId of Object.keys(state.projects)) {
    const app = state.allApps.find((a) => a.id === appId) || null;
    state.projects[appId] = { ...createDefaultProject(state.memberKey, app, state.brandFile), ...state.projects[appId], ownerId: state.memberKey, brandFileId: state.brandFile.id };
  }
  if (stored.legacyProject) {
    const appId = stored.legacyProject.appId;
    if (appId) {
      const app = state.allApps.find((a) => a.id === appId) || null;
      state.projects[appId] = { ...createDefaultProject(state.memberKey, app, state.brandFile), ...stored.legacyProject, ownerId: state.memberKey, brandFileId: state.brandFile.id };
      if (stored.legacyPack) state.packs[appId] = stored.legacyPack;
    }
  }
  saveBrandFile(state.memberKey, state.brandFile);
  for (const [appId, project] of Object.entries(state.projects)) saveProject(state.memberKey, appId, project);
  state.brandMode = Object.keys(validateBrandFile(state.brandFile)).length === 0 ? 'bar' : 'setup';
}

function handleKeydown(event, state) {
  if (event.key === 'Escape') {
    if (state.brandFullModalOpen) { closeBrandModal(state); return; }
    if (state.bottomSheetApp) { closeBottomSheet(state); return; }
    if (state.detailAppId) { closeDetail(state); return; }
  }
  const openModal = state.root.querySelector('.rw-modal[aria-modal="true"], .rw-bottom-sheet[aria-modal="true"]');
  if (event.key === 'Tab' && openModal) {
    const fl = getFocusableElements(openModal); if (!fl.length) return;
    if (event.shiftKey && document.activeElement === fl[0]) { event.preventDefault(); fl[fl.length - 1].focus(); }
    else if (!event.shiftKey && document.activeElement === fl[fl.length - 1]) { event.preventDefault(); fl[0].focus(); }
  }
}

function renderLoading(root) { root.innerHTML = `<div class="rw-loader" role="status" aria-live="polite"><span class="rw-spinner" aria-hidden="true"></span><p>Memuat Brand Studio…</p></div>`; }
function renderAuthGate(root, s) { root.innerHTML = `<section class="rw-empty rw-empty--wide"><span class="rw-kicker">Studio Private</span><h1>Masuk dulu ke AppVibe Vault</h1><p>Brand Studio hanya tersedia untuk buyer yang sudah memiliki akses aplikasi.</p><a class="rw-primary" href="/access/">Masuk ke portal akses</a><p class="rw-small">Status sesi: ${esc(s || 'tidak tersedia')}</p></section>`; }
function renderPending(root) { root.innerHTML = `<section class="rw-empty rw-empty--wide"><span class="rw-kicker">Akses belum aktif</span><h1>Kami belum menemukan aplikasi aktif</h1><p>Jika Anda baru saja membayar, tunggu beberapa saat lalu muat ulang halaman.</p><button class="rw-primary" type="button" onclick="location.reload()">Muat ulang</button></section>`; }
function renderLoadError(root) { root.innerHTML = `<section class="rw-empty rw-empty--wide"><span class="rw-kicker">Terjadi kendala</span><h1>Kami belum bisa memverifikasi akses aplikasi Anda</h1><p>Muat ulang halaman. Jika masalah berlanjut, hubungi support.</p><button class="rw-primary" type="button" onclick="location.reload()">Muat ulang</button></section>`; }

function render(state) {
  const { member } = state;
  const owned = state.allApps.filter((a) => a.hasAccess).length;
  const packed = Object.values(state.packs).filter(Boolean).length;

  state.root.innerHTML = `
    <section class="rw-hero" aria-label="Brand Studio">
      <div>
        <span class="rw-kicker">Brand Studio AppVibe</span>
        ${member?.qa_mock_mode ? `<div class="rw-qa-badge">${esc(member.qa_mock_label)}</div>` : ''}
        <h1>Jangan cuma ganti logo. Jadikan aplikasinya produk Anda.</h1>
        <p>Buat identitas brand sekali, pilih aplikasi dari vault Anda, lalu dapatkan prompt rebrand yang siap dipakai.</p>
      </div>
      <div class="rw-hero-card" aria-label="Ringkasan buyer">
        <span class="rw-kicker">Ringkasan buyer</span>
        <strong>${esc(member?.first_name || 'Buyer')}</strong>
        <dl>
          <div><dt>Aplikasi aktif</dt><dd>${owned}/${APP_REGISTRY.length}</dd></div>
          <div><dt>Lisensi</dt><dd>${member?.has_full_vault ? 'Full Vault' : `${member?.bundle_ids?.length || 0} bundle`}</dd></div>
          <div><dt>Prompt dibuat</dt><dd>${packed}</dd></div>
        </dl>
      </div>
    </section>
    ${renderStatus(state)}
    ${state.brandMode === 'bar' ? renderBrandBar(state) : renderBrandSetup(state)}
    <section class="rw-app-section" aria-label="Aplikasi Saya">${renderAppGrid(state)}</section>
    ${renderRecentActivity(state)}
    ${renderBatchBar(state)}
    ${state.detailAppId ? renderAppDetail(state) : ''}
    ${state.bottomSheetApp ? renderBottomSheet(state) : ''}
    ${state.brandFullModalOpen ? renderBrandEditModal(state) : ''}
  `;
  focusOpenedModalIfNeeded(state);

  // Start walkthrough for first-time visitors
  if (!state.walkthrough.active && !isWalkthroughSeen(state.memberKey)) {
    requestAnimationFrame(() => startWalkthrough(state));
  }
}

function renderStatus(state) {
  const ms = [];
  if (state.statusMessage) ms.push(`<div class="rw-status rw-status--${esc(state.statusType)}" role="status">${esc(state.statusMessage)}</div>`);
  if (state.copyMessage) ms.push(`<div class="rw-status rw-status--success" role="status">${esc(state.copyMessage)}</div>`);
  return `<div class="rw-status-stack" aria-live="polite">${ms.join('')}${state.autosaveLabel ? `<p class="rw-autosave">${esc(state.autosaveLabel)}</p>` : ''}</div>`;
}

/* ── BRAND SETUP ── */

function renderBrandSetup(state) {
  const b = state.brandFile, e = state.brandErrors, tp = b.tonePreset || 'warm';
  return `<section class="rw-brand-setup rw-panel" aria-labelledby="bsTitle">
    <div class="rw-panel-head"><div><span class="rw-kicker">Brand File</span><h2 id="bsTitle">Buat identitas yang dipakai ulang</h2><p>Isi data inti brand sekali. Otomatis dipakai untuk semua aplikasi yang direbrand.</p></div>
      <div class="rw-panel-actions"><button class="rw-ghost rw-danger-text" type="button" data-reset-brand>Reset</button></div></div>
    <form class="rw-form" novalidate>
      <div class="rw-grid rw-grid--2">
        ${field('brandName','Nama Brand',b.brandName,e.brandName,{required:true,scope:'brand'})}
        ${field('targetMarket','Target Market',b.targetMarket,e.targetMarket,{required:true,scope:'brand'})}
      </div>
      <div class="rw-grid rw-grid--2">
        ${field('primaryCta','CTA Utama',b.primaryCta,e.primaryCta,{required:true,scope:'brand'})}
        <label class="rw-field"><span>Tone</span><select data-brand-field="tonePreset" class="rw-tone-select">${Object.values(TONE_PRESETS).map((p)=>`<option value="${esc(p.id)}" ${tp===p.id?'selected':''}>${esc(p.label)}</option>`).join('')}</select></label>
      </div>
      <div class="rw-color-row">
        <label class="rw-color-swatch"><input type="color" value="${esc(b.primaryColor||'#126BFF')}" data-brand-field="primaryColor"/><span>Utama</span></label>
        <label class="rw-color-swatch"><input type="color" value="${esc(b.secondaryColor||'#10DCD5')}" data-brand-field="secondaryColor"/><span>Sekunder</span></label>
        <label class="rw-color-swatch"><input type="color" value="${esc(b.accentColor||'#8756FF')}" data-brand-field="accentColor"/><span>Aksen</span></label>
      </div>
      ${field('niche','Niche (opsional — kosongkan untuk auto-derive)',b.niche,e.niche,{scope:'brand'})}
      <button class="rw-primary rw-full" type="button" data-brand-save>Kunci Identitas & Mulai Rebrand</button>
      <p class="rw-small rw-center">Ingin isi detail lengkap? <button class="rw-ghost" type="button" data-brand-full>Buka editor lengkap ▸</button></p>
    </form></section>`;
}

/* ── BRAND BAR ── */

function renderBrandBar(state) {
  const b = state.brandFile, ts = TONE_PRESETS[b.tonePreset||'warm']?.shortLabel||'Sahabat';
  const pc = Object.values(state.packs).filter(Boolean).length;
  const niche = b.niche || deriveBrandContext(b).niche || '-';
  return `<div class="rw-brand-bar" aria-label="Brand File">
    <div class="rw-brand-bar-summary">
      <span class="rw-brand-dot" style="background:${esc(b.primaryColor||'#126BFF')}"></span>
      <strong>${esc(b.brandName||'Brand')}</strong><span class="rw-brand-bar-sep">·</span><span>${esc(ts)}</span><span class="rw-brand-bar-sep">·</span><span>${pc} app siap</span><span class="rw-brand-bar-sep">·</span><span class="rw-muted-sm">${esc(niche)}</span>
    </div>
    <div class="rw-brand-bar-actions">
      <button class="rw-ghost" type="button" data-brand-edit>Edit</button>
      <button class="rw-ghost" type="button" data-brand-full>Lihat Lengkap</button>
    </div></div>`;
}

/* ── BRAND EDIT MODAL ── */

function renderBrandEditModal(state) {
  const b = state.brandFile, e = state.brandErrors, tp = b.tonePreset||'warm', isCustom = tp==='custom';
  return `<div class="rw-modal-backdrop" role="presentation" data-close-brand-modal>
    <section class="rw-modal rw-modal--wide" role="dialog" aria-modal="true" aria-labelledby="beTitle" tabindex="-1">
      <button class="rw-modal-close" type="button" data-close-brand-modal aria-label="Tutup">×</button>
      <span class="rw-kicker">Brand File Lengkap</span><h2 id="beTitle">Identitas brand Anda</h2>
      <form class="rw-form" novalidate>
        <fieldset class="rw-fieldset"><legend>Identitas brand</legend><div class="rw-grid rw-grid--2">
          ${field('brandName','Nama brand',b.brandName,e.brandName,{required:true,scope:'brand'})}
          ${field('businessName','Nama bisnis/agency',b.businessName,e.businessName,{scope:'brand'})}
          ${field('tagline','Tagline',b.tagline,e.tagline,{scope:'brand'})}
          ${field('targetMarket','Target market',b.targetMarket,e.targetMarket,{required:true,scope:'brand'})}
          ${field('niche','Niche',b.niche,e.niche,{scope:'brand'})}
          ${field('productCategory','Kategori produk',b.productCategory,e.productCategory,{scope:'brand'})}
        </div></fieldset>
        <fieldset class="rw-fieldset"><legend>Buyer dan positioning</legend>
          ${textarea('buyerProblem','Masalah utama buyer / Angle fokus',b.buyerProblem,e.buyerProblem,{scope:'brand',rows:2})}
          ${textarea('buyerDesiredOutcome','Outcome yang diinginkan',b.buyerDesiredOutcome,e.buyerDesiredOutcome,{scope:'brand',rows:2})}
          ${textarea('positioning','Positioning',b.positioning,e.positioning,{scope:'brand',rows:3})}
          ${textarea('differentiator','Pembeda utama',b.differentiator,e.differentiator,{scope:'brand',rows:2})}
        </fieldset>
        <fieldset class="rw-fieldset"><legend>Suara brand</legend>
          <label class="rw-field"><span>Tone preset</span><select data-brand-field="tonePreset" class="rw-tone-select">${Object.values(TONE_PRESETS).map((p)=>`<option value="${esc(p.id)}" ${tp===p.id?'selected':''}>${esc(p.label)}</option>`).join('')}</select></label>
          ${isCustom?`<div class="rw-chip-grid" role="group">${TONE_OPTIONS.map((t)=>`<label class="rw-check-chip ${b.toneCustom?.includes(t)?'active':''}"><input type="checkbox" data-tone-custom="${esc(t)}" ${b.toneCustom?.includes(t)?'checked':''}/><span>${esc(t)}</span></label>`).join('')}</div>`:''}
          <div class="rw-grid rw-grid--2">
            ${textarea('mandatoryWords','Kata wajib',b.mandatoryWords,e.mandatoryWords,{scope:'brand',rows:3})}
            ${textarea('forbiddenWords','Kata dihindari',b.forbiddenWords,e.forbiddenWords,{scope:'brand',rows:3})}
          </div></fieldset>
        <fieldset class="rw-fieldset"><legend>Setup konversi</legend><div class="rw-grid rw-grid--2">
          ${field('primaryCta','CTA utama',b.primaryCta,e.primaryCta,{required:true,scope:'brand'})}
          ${field('primaryCtaUrl','URL CTA',b.primaryCtaUrl,e.primaryCtaUrl,{scope:'brand',type:'url'})}
          ${field('websiteUrl','URL website',b.websiteUrl,e.websiteUrl,{scope:'brand',type:'url'})}
          ${field('instagramHandle','Instagram',b.instagramHandle,e.instagramHandle,{scope:'brand'})}
          ${field('whatsappNumber','WhatsApp',b.whatsappNumber,e.whatsappNumber,{scope:'brand',inputmode:'tel'})}
        </div></fieldset>
        <fieldset class="rw-fieldset"><legend>Sistem visual</legend>
          <div class="rw-color-row">
            <label class="rw-color-swatch"><input type="color" value="${esc(b.primaryColor||'#126BFF')}" data-brand-field="primaryColor"/><span>Utama</span></label>
            <label class="rw-color-swatch"><input type="color" value="${esc(b.secondaryColor||'#10DCD5')}" data-brand-field="secondaryColor"/><span>Sekunder</span></label>
            <label class="rw-color-swatch"><input type="color" value="${esc(b.accentColor||'#8756FF')}" data-brand-field="accentColor"/><span>Aksen</span></label>
          </div>
          ${field('typographyPreference','Tipografi',b.typographyPreference,e.typographyPreference,{scope:'brand'})}
          ${textarea('logoReference','Referensi logo',b.logoReference,e.logoReference,{scope:'brand',rows:2})}
        </fieldset>
        <fieldset class="rw-fieldset"><legend>Proof dan batas klaim</legend>
          ${textarea('availableProof','Proof nyata',b.availableProof,e.availableProof,{scope:'brand',rows:3})}
          ${textarea('claimBoundaries','Klaim yang boleh',b.claimBoundaries,e.claimBoundaries,{scope:'brand',rows:3})}
          ${textarea('claimsNeverMake','Klaim dilarang',b.claimsNeverMake,e.claimsNeverMake,{scope:'brand',rows:3})}
        </fieldset>
        <fieldset class="rw-fieldset"><legend>Informasi Penawaran</legend>
          <label class="rw-field"><span>Garansi</span><select data-brand-field="offerGuaranteeType">${Object.entries(OFFER_GUARANTEE_TYPES).map(([k,v])=>`<option value="${esc(k)}" ${b.offerGuaranteeType===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
          ${b.offerGuaranteeType==='custom'?textarea('offerGuaranteeCustom','Detail garansi (custom)',b.offerGuaranteeCustom,e.offerGuaranteeCustom,{scope:'brand',rows:2}):''}
        </fieldset>
      </form>
      <div class="rw-modal-footer"><button class="rw-primary" type="button" data-brand-modal-save>Simpan & Tutup</button></div>
    </section></div>`;
}

/* ── APP GRID ── */

function renderAppGrid(state) {
  const apps = getFilteredApps(state);
  return `<div class="rw-section-head"><div><span class="rw-kicker">Aplikasi Saya</span><h2>Pilih aplikasi untuk direbrand</h2></div>
    <div class="rw-search-box"><input type="search" placeholder="Cari aplikasi…" data-app-search value="${esc(state.searchQuery)}"/></div></div>
    <p class="rw-scroll-hint">Geser untuk melihat kategori lain jika belum terlihat.</p>
    <div class="rw-filters">${CATEGORY_FILTERS.map(([id,l])=>`<button class="rw-filter ${state.selectedCategory===id?'active':''}" type="button" data-category-filter="${id}">${esc(l)}</button>`).join('')}</div>
    <div class="rw-app-grid">${apps.map((a)=>renderAppCard(state,a)).join('')}</div>`;
}

function getFilteredApps(state) {
  let apps = state.allApps;
  if (state.selectedCategory!=='all') apps = apps.filter((a)=>a.category===state.selectedCategory);
  if (state.searchQuery) { const q=state.searchQuery.toLowerCase(); apps=apps.filter((a)=>a.name.toLowerCase().includes(q)||(a.shortDescription||'').toLowerCase().includes(q)||(a.category||'').toLowerCase().includes(q)); }
  return [...apps.filter((a)=>a.hasAccess),...apps.filter((a)=>!a.hasAccess)];
}

function renderAppCard(state, app) {
  const st = appStatus(state,app.id), proj = projectForApp(state,app), pack = state.packs[app.id]||null;
  const br = Object.keys(validateBrandFile(state.brandFile)).length===0;
  const isExp = state.expandedResults===app.id;
  return `<article class="rw-app-card ${app.hasAccess?'owned':'locked'}" data-app-id="${esc(app.id)}">
    <div class="rw-app-top"><div class="rw-app-left">
      <span class="rw-app-icon" style="--app-accent:${esc(app.accent||'#126BFF')}">${esc(app.label||app.name?.slice(0,3)||'APP')}</span>
      <div><div class="rw-app-meta"><span>${esc(getCategoryLabel(app.category))}</span><span class="rw-app-status rw-app-status--${esc(st)}">${esc(STATUS_LABELS[st])}</span></div><h3>${esc(app.name)}</h3></div>
    </div>${app.hasAccess?`<label class="rw-batch-check"><input type="checkbox" data-batch-app="${esc(app.id)}" ${state.batchApps.has(app.id)?'checked':''}/><span></span></label>`:''}</div>
    <p class="rw-app-desc">${esc(app.shortDescription||app.function||'')}</p>
    ${app.hasAccess?`
      <div class="rw-app-config">
        <label class="rw-field rw-field--inline"><span>Nama baru</span><input type="text" value="${esc(proj.newAppName||'')}" data-project-field="newAppName" data-app-id="${esc(app.id)}" placeholder="${esc(app.exampleRebrandName||app.name)}"/></label>
        <div class="rw-scope-segment" role="radiogroup" aria-label="Scope">${Object.values(REBRAND_SCOPES).map((s)=>`<button class="rw-seg-btn ${proj.scope===s.id?'active':''}" type="button" data-scope="${s.id}" data-app-id="${esc(app.id)}" title="${esc(s.description)}">${esc(s.shortLabel)}</button>`).join('')}</div>
      </div>
      <div class="rw-app-actions">
        <button class="rw-primary" type="button" data-generate-pack data-app-id="${esc(app.id)}" ${br?'':'disabled'}>Buat Prompt</button>
        <button class="rw-secondary" type="button" data-toggle-results data-app-id="${esc(app.id)}" ${!pack?'disabled':''}>${pack?(isExp?'Tutup':'Lihat Hasil'):'Hasil'}</button>
      </div>
      <button class="rw-advanced-toggle" type="button" data-toggle-advanced data-app-id="${esc(app.id)}">▼ Opsi lanjutan</button>
      <div class="rw-advanced-body" id="rw-adv-${esc(app.id)}" hidden>
        ${pf('newTargetMarket','Target market override',proj.newTargetMarket,2,app.id)}
        ${pf('useCase','Use case',proj.useCase,2,app.id)}
        ${pf('visualDirection','Arah visual',proj.visualDirection,2,app.id)}
        ${pf('requiredFeaturesToEmphasize','Fitur ditonjolkan',proj.requiredFeaturesToEmphasize,3,app.id)}
        ${pf('featuresNotToChange','Fitur tidak diubah',proj.featuresNotToChange,3,app.id)}
        ${pf('additionalInstructions','Instruksi tambahan',proj.additionalInstructions,3,app.id)}
        ${(proj.scope==='market_repositioning'||proj.scope==='full_white_label_launch')?renderOfferFields(proj,app.id):''}
      </div>
      ${isExp&&pack?renderResultsInline(state,app,pack):''}
    `:`
      <p class="rw-locked-note">Aplikasi ini belum termasuk akses Anda.</p>
      ${!state.member?.has_full_vault && (state.member?.bundle_ids?.length || 0) > 0 ? '<p class="rw-upgrade-badge">Tambah 50rb buka semua app</p>' : ''}
      <div class="rw-app-actions">
        ${!state.member?.has_full_vault && (state.member?.bundle_ids?.length || 0) > 0
          ? `<button class="rw-primary" type="button" data-upgrade-full-vault data-app-id="${esc(app.id)}">Upgrade ke Full Vault +50rb</button>`
          : ''}
        <button class="rw-secondary" type="button" data-detail-app="${esc(app.id)}">Lihat detail</button>
      </div>
    `}</article>`;
}

function pf(name,label,value,rows,appId) {
  return `<label class="rw-field rw-field--textarea"><span>${esc(label)}</span><textarea rows="${rows}" data-project-field="${esc(name)}" data-app-id="${esc(appId)}">${esc(value||'')}</textarea></label>`;
}

function renderOfferFields(proj, appId) {
  const pmOptions = Object.entries(OFFER_PRICING_MODELS).map(([k,v])=>`<option value="${esc(k)}" ${proj.offerPricingModel===k?'selected':''}>${esc(v)}</option>`).join('');
  return `<fieldset class="rw-fieldset"><legend>Data Penawaran</legend>
    <div class="rw-grid rw-grid--2">
      <label class="rw-field"><span>Harga produk</span><input type="text" value="${esc(proj.offerPrice||'')}" data-project-field="offerPrice" data-app-id="${esc(appId)}" placeholder="Rp97.000"/></label>
      <label class="rw-field"><span>Model harga</span><select data-project-field="offerPricingModel" data-app-id="${esc(appId)}">${pmOptions}</select></label>
    </div>
    <label class="rw-field rw-field--textarea"><span>Yang didapat buyer</span><textarea rows="3" data-project-field="offerIncludes" data-app-id="${esc(appId)}" placeholder="Akses seumur hidup, update gratis, support WhatsApp…">${esc(proj.offerIncludes||'')}</textarea></label>
    <label class="rw-field rw-field--textarea"><span>Bonus (opsional)</span><textarea rows="2" data-project-field="offerBonus" data-app-id="${esc(appId)}" placeholder="Template Canva, guide tambahan…">${esc(proj.offerBonus||'')}</textarea></label>
  </fieldset>`;
}

function renderResultsInline(state, app, pack) {
  return `<div class="rw-result-inline">
    <div class="rw-result-head"><strong>✓ ${esc(app.name)} → ${esc(state.projects[app.id]?.newAppName||app.name)}</strong><span class="rw-app-status rw-app-status--done">${esc(pack.scopeLabel)}</span></div>
    <div class="rw-output-stack">${pack.blocks.map((b)=>renderOutputBlock(b,app.id)).join('')}</div>
    <div class="rw-result-actions">
      <button class="rw-secondary" type="button" data-download-pack data-app-id="${esc(app.id)}">Download .md</button>
      <button class="rw-ghost" type="button" data-regenerate data-app-id="${esc(app.id)}">Buat ulang</button>
    </div></div>`;
}

function renderOutputBlock(block, appId) {
  return `<article class="rw-output-card">
    <div class="rw-output-head"><h3>${esc(block.title)}</h3><button class="rw-secondary" type="button" data-copy-block="${esc(block.id)}" data-app-id="${esc(appId)}">Salin</button></div>
    <pre tabindex="0"><code>${esc(block.body)}</code></pre></article>`;
}

function renderBottomSheet(state) {
  const appId = state.bottomSheetApp;
  const app = state.allApps.find((a) => a.id === appId);
  const pack = state.packs[appId];
  if (!app || !pack) return '';
  return `<div class="rw-bottom-sheet-backdrop" role="presentation" data-close-sheet>
    <section class="rw-bottom-sheet" role="dialog" aria-modal="true" aria-label="Hasil rebrand ${esc(app.name)}" tabindex="-1">
      <div class="rw-sheet-handle"></div>
      <div class="rw-sheet-head">
        <strong>${esc(app.name)} → ${esc(state.projects[appId]?.newAppName || app.name)}</strong>
        <span class="rw-app-status rw-app-status--done">${esc(pack.scopeLabel)}</span>
        <button class="rw-modal-close" type="button" data-close-sheet aria-label="Tutup hasil">×</button>
      </div>
      <div class="rw-sheet-body">
        <div class="rw-output-stack">${pack.blocks.map((b) => renderOutputBlock(b, appId)).join('')}</div>
      </div>
      <div class="rw-sheet-footer">
        <button class="rw-primary rw-full" type="button" data-download-pack data-app-id="${esc(appId)}">Download .md</button>
      </div>
    </section></div>`;
}

/* ── APP DETAIL MODAL (locked app info) ── */

function renderAppDetail(state) {
  const app = state.allApps.find((item) => item.id === state.detailAppId);
  if (!app) return '';
  const packLabels = (app.bundleIds || app.packs || []).join(', ');
  return `<div class="rw-modal-backdrop" role="presentation" data-close-detail>
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
        ? `<button class="rw-primary rw-full" type="button" data-close-detail>Tutup</button>`
        : '<p class="rw-locked-note">Aplikasi ini belum termasuk akses Anda. Pilih aplikasi dari bundle yang sudah aktif, atau buka akses bundle terkait dari halaman penawaran.</p>'}
    </section></div>`;
}

/* ── RECENT ACTIVITY ── */

function renderRecentActivity(state) {
  const entries = Object.entries(state.packs)
    .filter(([, pack]) => pack)
    .map(([appId, pack]) => ({ appId, pack, app: state.allApps.find((a) => a.id === appId) }))
    .filter((e) => e.app)
    .sort((a, b) => new Date(b.pack.generatedAt) - new Date(a.pack.generatedAt))
    .slice(0, 5);

  if (!entries.length) return '';

  return `<section class="rw-activity-section" aria-label="Aktivitas terakhir">
    <span class="rw-kicker">Terakhir Dibuat</span>
    <div class="rw-activity-list">
      ${entries.map(({ appId, pack, app }) => `
        <div class="rw-activity-row">
          <button class="rw-activity-info" type="button" data-toggle-results data-app-id="${esc(appId)}">
            <span class="rw-app-icon rw-app-icon--sm" style="--app-accent:${esc(app.accent || '#126BFF')}">${esc(app.label || app.name?.slice(0, 3) || 'APP')}</span>
            <span><strong>${esc(app.name)}</strong><span class="rw-muted-sm"> · ${esc(pack.scopeLabel)} · ${esc(formatRelativeTime(pack.generatedAt))}</span></span>
          </button>
          <div class="rw-activity-actions">
            <button class="rw-ghost" type="button" data-download-pack data-app-id="${esc(appId)}">.md</button>
          </div>
        </div>
      `).join('')}
    </div>
  </section>`;
}

/* ── BATCH BAR ── */

function renderBatchBar(state) {
  if (state.batchApps.size === 0) return '';
  return `<div class="rw-batch-bar">
    <span>${state.batchApps.size} aplikasi dipilih</span>
    <button class="rw-primary" type="button" data-batch-generate ${state.batchRunning ? 'disabled' : ''}>${state.batchRunning ? 'Membuat…' : 'Batch Generate'}</button>
    <button class="rw-ghost" type="button" data-batch-clear>Batal</button>
  </div>`;
}

function field(name, label, value, error, opts = {}) {
  const type = opts.type === 'url' ? 'url' : opts.type || 'text';
  const scope = opts.scope || 'brand';
  const errorId = `${scope}-${name}-error`;
  return `<label class="rw-field ${error ? 'has-error' : ''}">
    <span>${esc(label)} ${opts.required ? '<b>*</b>' : ''}</span>
    <input type="${esc(type)}" value="${esc(value || '')}" data-${scope}-field="${esc(name)}"
      ${opts.inputmode ? `inputmode="${esc(opts.inputmode)}"` : ''}
      ${opts.required ? 'required' : ''}
      ${error ? `aria-invalid="true" aria-describedby="${errorId}"` : ''} />
    ${error ? `<small class="rw-error" id="${errorId}">${esc(error)}</small>` : ''}
  </label>`;
}

function textarea(name, label, value, error, opts = {}) {
  const scope = opts.scope || 'brand';
  const errorId = `${scope}-${name}-error`;
  return `<label class="rw-field rw-field--textarea ${error ? 'has-error' : ''}">
    <span>${esc(label)} ${opts.required ? '<b>*</b>' : ''}</span>
    <textarea rows="${opts.rows || 3}" data-${scope}-field="${esc(name)}"
      ${opts.required ? 'required' : ''}
      ${error ? `aria-invalid="true" aria-describedby="${errorId}"` : ''}>${esc(value || '')}</textarea>
    ${error ? `<small class="rw-error" id="${errorId}">${esc(error)}</small>` : ''}
  </label>`;
}

/* ══════════════════════════════════════════
   EVENT HANDLERS
   ══════════════════════════════════════════ */

function handleInput(event, state) {
  const brandField = event.target.closest('[data-brand-field]');
  const projectField = event.target.closest('[data-project-field]');
  const search = event.target.closest('[data-app-search]');

  if (brandField) {
    state.brandFile[brandField.dataset.brandField] = brandField.value;
    state.brandFile.updatedAt = new Date().toISOString();
    const result = saveBrandFile(state.memberKey, state.brandFile);
    setAutosaveState(state, result, 'Brand File tersimpan otomatis.');
    return;
  }

  if (projectField) {
    const appId = projectField.dataset.appId;
    if (!appId || !state.projects[appId]) return;
    state.projects[appId][projectField.dataset.projectField] = projectField.value;
    state.projects[appId].updatedAt = new Date().toISOString();
    const result = saveProject(state.memberKey, appId, state.projects[appId]);
    setAutosaveState(state, result, 'Draft project tersimpan otomatis.');
    // Update status badge live without full re-render (avoid losing focus)
    updateAppStatusBadge(state, appId);
    return;
  }

  if (search) {
    state.searchQuery = search.value;
    render(state);
  }
}

function updateAppStatusBadge(state, appId) {
  const card = state.root.querySelector(`.rw-app-card[data-app-id="${cssEscape(appId)}"]`);
  if (!card) return;
  const badge = card.querySelector('.rw-app-status');
  if (!badge) return;
  const st = appStatus(state, appId);
  badge.className = `rw-app-status rw-app-status--${st}`;
  badge.textContent = STATUS_LABELS[st];
}

function handleChange(event, state) {
  const toneCustom = event.target.closest('[data-tone-custom]');
  if (toneCustom) {
    const tone = toneCustom.dataset.toneCustom;
    const next = new Set(state.brandFile.toneCustom || []);
    if (toneCustom.checked) next.add(tone); else next.delete(tone);
    state.brandFile.toneCustom = [...next];
    state.brandFile.updatedAt = new Date().toISOString();
    const result = saveBrandFile(state.memberKey, state.brandFile);
    setAutosaveState(state, result, 'Suara brand tersimpan otomatis.');
    render(state);
    return;
  }

  const tonePresetSelect = event.target.closest('[data-brand-field="tonePreset"]');
  if (tonePresetSelect) {
    state.brandFile.tonePreset = tonePresetSelect.value;
    state.brandFile.updatedAt = new Date().toISOString();
    const result = saveBrandFile(state.memberKey, state.brandFile);
    setAutosaveState(state, result, 'Tone brand tersimpan otomatis.');
    render(state);
    return;
  }

  const colorInput = event.target.closest('[data-brand-field]');
  if (colorInput && colorInput.type === 'color') {
    state.brandFile[colorInput.dataset.brandField] = colorInput.value;
    state.brandFile.updatedAt = new Date().toISOString();
    const result = saveBrandFile(state.memberKey, state.brandFile);
    setAutosaveState(state, result, 'Warna brand tersimpan otomatis.');
    if (state.brandMode === 'bar') render(state);
    return;
  }

  const batchCheck = event.target.closest('[data-batch-app]');
  if (batchCheck) {
    const appId = batchCheck.dataset.batchApp;
    if (batchCheck.checked) state.batchApps.add(appId); else state.batchApps.delete(appId);
    render(state);
  }
}

async function handleClick(event, state) {
  // Modal / sheet close
  if (event.target.closest('.rw-modal-close') || event.target.classList?.contains('rw-modal-backdrop')) {
    if (state.brandFullModalOpen) { closeBrandModal(state); return; }
    if (state.detailAppId) { closeDetail(state); return; }
  }
  if (event.target.closest('[data-close-sheet]') || event.target.classList?.contains('rw-bottom-sheet-backdrop')) {
    closeBottomSheet(state); return;
  }
  if (event.target.closest('[data-close-brand-modal]')) { closeBrandModal(state); return; }
  if (event.target.closest('[data-close-detail]')) { closeDetail(state); return; }

  // Brand: save quick setup
  if (event.target.closest('[data-brand-save]')) {
    state.brandErrors = validateBrandFile(state.brandFile);
    if (Object.keys(state.brandErrors).length) {
      state.statusMessage = 'Lengkapi Brand File terlebih dahulu agar hasil rebrand lebih jelas dan tidak melenceng.';
      state.statusType = 'error';
      render(state);
      return;
    }
    state.brandFile.updatedAt = new Date().toISOString();
    saveBrandFile(state.memberKey, state.brandFile);
    state.stalePacks = detectStalePacks(state.memberKey);
    state.brandMode = 'bar';
    state.statusMessage = 'Brand File tersimpan. Silakan pilih aplikasi untuk direbrand.';
    state.statusType = 'success';
    track('rebrand_brand_file_saved', state, { is_first_brand_file: Object.keys(state.projects).length === 0 });
    render(state);
    return;
  }

  // Brand: switch to quick edit mode
  if (event.target.closest('[data-brand-edit]')) {
    state.brandMode = 'setup';
    render(state);
    return;
  }

  // Brand: open full modal
  if (event.target.closest('[data-brand-full]')) {
    state.lastFocusedTrigger = event.target;
    state.detailAppId = null;
    state.bottomSheetApp = null;
    state.expandedResults = null;
    state.brandFullModalOpen = true;
    render(state);
    return;
  }

  // Brand: save from full modal
  if (event.target.closest('[data-brand-modal-save]')) {
    state.brandErrors = validateBrandFile(state.brandFile);
    if (Object.keys(state.brandErrors).length) {
      state.statusMessage = 'Lengkapi field wajib sebelum menutup editor.';
      state.statusType = 'error';
      render(state);
      return;
    }
    state.brandFile.updatedAt = new Date().toISOString();
    saveBrandFile(state.memberKey, state.brandFile);
    state.stalePacks = detectStalePacks(state.memberKey);
    state.brandMode = 'bar';
    state.brandFullModalOpen = false;
    state.statusMessage = 'Brand File lengkap tersimpan.';
    state.statusType = 'success';
    render(state);
    return;
  }

  // Reset brand + all projects
  if (event.target.closest('[data-reset-brand]')) {
    if (!confirm('Reset Brand File dan semua draft project di browser ini? Aksi ini tidak dapat dibatalkan.')) return;
    clearRebrandWorkspace(state.memberKey);
    state.brandFile = createDefaultBrandFile(state.memberKey);
    state.projects = {};
    state.packs = {};
    state.stalePacks = {};
    state.brandErrors = {};
    state.brandMode = 'setup';
    state.expandedResults = null;
    state.batchApps = new Set();
    state.statusMessage = 'Workspace lokal sudah direset.';
    state.statusType = 'success';
    state.autosaveLabel = '';
    saveBrandFile(state.memberKey, state.brandFile);
    track('rebrand_workspace_reset', state, { entry_point: 'brand_file' });
    render(state);
    return;
  }

  // Category filter
  const categoryBtn = event.target.closest('[data-category-filter]');
  if (categoryBtn) { state.selectedCategory = categoryBtn.dataset.categoryFilter; render(state); return; }

  // App detail (locked apps)
  const detailBtn = event.target.closest('[data-detail-app]');
  if (detailBtn) {
    state.lastFocusedTrigger = detailBtn;
    state.brandFullModalOpen = false;
    state.bottomSheetApp = null;
    state.expandedResults = null;
    state.detailAppId = detailBtn.dataset.detailApp;
    if (!state.allApps.find((a) => a.id === state.detailAppId)?.hasAccess) {
      track('rebrand_locked_app_viewed', state, { app_id: state.detailAppId });
    }
    render(state);
    return;
  }

  // Scope segmented control
  const scopeBtn = event.target.closest('[data-scope]');
  if (scopeBtn) {
    const appId = scopeBtn.dataset.appId;
    if (!appId || !state.projects[appId]) return;
    state.projects[appId].scope = scopeBtn.dataset.scope;
    state.projects[appId].updatedAt = new Date().toISOString();
    saveProject(state.memberKey, appId, state.projects[appId]);
    track('rebrand_scope_selected', state, { scope: state.projects[appId].scope, app_id: appId });
    render(state);
    return;
  }

  // Toggle advanced options
  const advToggle = event.target.closest('[data-toggle-advanced]');
  if (advToggle) {
    const appId = advToggle.dataset.appId;
    const body = state.root.querySelector(`#rw-adv-${cssEscape(appId)}`);
    if (body) {
      const isHidden = body.hasAttribute('hidden');
      if (isHidden) body.removeAttribute('hidden'); else body.setAttribute('hidden', '');
      advToggle.textContent = isHidden ? '▲ Opsi lanjutan' : '▼ Opsi lanjutan';
    }
    return;
  }

  // Toggle results (expand inline on desktop, bottom sheet on mobile)
  const toggleResultsBtn = event.target.closest('[data-toggle-results]');
  if (toggleResultsBtn) {
    const appId = toggleResultsBtn.dataset.appId;
    if (!state.packs[appId]) return;
    state.detailAppId = null;
    state.brandFullModalOpen = false;
    if (isMobileViewport()) {
      state.expandedResults = null;
      state.bottomSheetApp = state.bottomSheetApp === appId ? null : appId;
    } else {
      state.bottomSheetApp = null;
      state.expandedResults = state.expandedResults === appId ? null : appId;
    }
    render(state);
    return;
  }

  // Upgrade partial access to full vault
  const upgradeBtn = event.target.closest('[data-upgrade-full-vault]');
  if (upgradeBtn) {
    const appId = upgradeBtn.dataset.appId || '';
    await startFullVaultUpgrade(state, appId);
    return;
  }

  // Generate pack for a single app
  const genBtn = event.target.closest('[data-generate-pack]');
  if (genBtn) {
    const appId = genBtn.dataset.appId;
    generatePackForApp(state, appId);
    return;
  }

  // Regenerate (from inline results)
  const regenBtn = event.target.closest('[data-regenerate]');
  if (regenBtn) {
    const appId = regenBtn.dataset.appId;
    generatePackForApp(state, appId);
    return;
  }

  // Copy block
  const copyBtn = event.target.closest('[data-copy-block]');
  if (copyBtn) {
    await copyBlock(state, copyBtn.dataset.appId, copyBtn.dataset.copyBlock);
    return;
  }

  // Download pack
  const downloadBtn = event.target.closest('[data-download-pack]');
  if (downloadBtn) {
    const appId = downloadBtn.dataset.appId;
    const pack = state.packs[appId];
    if (!pack) return;
    downloadMarkdown(pack.handoverMarkdown, pack.filename);
    track('rebrand_handover_downloaded', state, { app_id: appId, scope: state.projects[appId]?.scope });
    state.copyMessage = 'Handover pack berhasil didownload sebagai Markdown.';
    render(state);
    return;
  }

  // Batch generate
  if (event.target.closest('[data-batch-generate]')) {
    await batchGenerate(state);
    return;
  }
  if (event.target.closest('[data-batch-clear]')) {
    state.batchApps = new Set();
    render(state);
    return;
  }
}

/* ── App generation actions ── */

function generatePackForApp(state, appId) {
  const app = state.allApps.find((a) => a.id === appId);
  if (!app || !app.hasAccess) return;
  const project = projectForApp(state, app);

  if (!project.newAppName?.trim()) project.newAppName = app.exampleRebrandName || app.name;

  state.brandErrors = validateBrandFile(state.brandFile);
  const projectErrors = validateProject(project);

  if (Object.keys(state.brandErrors).length) {
    state.statusMessage = 'Lengkapi Brand File terlebih dahulu.';
    state.statusType = 'error';
    state.brandMode = 'setup';
    render(state);
    return;
  }
  if (Object.keys(projectErrors).length) {
    state.statusMessage = 'Lengkapi data project aplikasi terlebih dahulu.';
    state.statusType = 'error';
    render(state);
    return;
  }

  try {
    const generatedAt = new Date().toISOString();
    project.generatedAt = generatedAt;
    project.updatedAt = generatedAt;
    const pack = generateRebrandPack({ brandFile: state.brandFile, project, app, generatedAt });
    state.packs[appId] = pack;
    delete state.stalePacks[appId];
    saveProject(state.memberKey, appId, project);
    saveGeneratedPack(state.memberKey, appId, pack);
    state.detailAppId = null;
    state.brandFullModalOpen = false;
    if (isMobileViewport()) {
      state.expandedResults = null;
      state.bottomSheetApp = appId;
    } else {
      state.bottomSheetApp = null;
      state.expandedResults = appId;
    }
    state.statusMessage = `Prompt untuk ${app.name} berhasil dibuat.`;
    state.statusType = 'success';
    state.copyMessage = '';
    state.autosaveLabel = `Draft terakhir diperbarui ${formatDateTime(generatedAt)}.`;
    track('rebrand_pack_generated', state, { app_id: appId, scope: project.scope });
    render(state);
  } catch {
    state.statusMessage = 'Hasil belum bisa dibuat. Periksa field wajib lalu coba lagi.';
    state.statusType = 'error';
    render(state);
  }
}

async function batchGenerate(state) {
  const appIds = [...state.batchApps];
  if (!appIds.length) return;

  state.brandErrors = validateBrandFile(state.brandFile);
  if (Object.keys(state.brandErrors).length) {
    state.statusMessage = 'Lengkapi Brand File terlebih dahulu sebelum batch generate.';
    state.statusType = 'error';
    state.brandMode = 'setup';
    render(state);
    return;
  }

  state.batchRunning = true;
  state.statusMessage = `Menyiapkan batch generate untuk ${appIds.length} aplikasi…`;
  state.statusType = 'idle';
  render(state);
  await nextPaint();

  let successCount = 0;
  for (const appId of appIds) {
    const app = state.allApps.find((a) => a.id === appId);
    if (!app || !app.hasAccess) continue;
    const project = projectForApp(state, app);
    if (!project.newAppName?.trim()) project.newAppName = app.exampleRebrandName || app.name;

    state.statusMessage = `Membuat prompt ${app.name}…`;
    state.statusType = 'idle';
    render(state);
    await nextPaint();

    try {
      const generatedAt = new Date().toISOString();
      project.generatedAt = generatedAt;
      project.updatedAt = generatedAt;
      const pack = generateRebrandPack({ brandFile: state.brandFile, project, app, generatedAt });
      state.packs[appId] = pack;
      delete state.stalePacks[appId];
      saveProject(state.memberKey, appId, project);
      saveGeneratedPack(state.memberKey, appId, pack);
      successCount += 1;
    } catch {
      // skip failed app, continue batch
    }
  }

  state.batchRunning = false;
  state.batchApps = new Set();
  state.statusMessage = `${successCount} dari ${appIds.length} prompt berhasil dibuat.`;
  state.statusType = successCount > 0 ? 'success' : 'error';
  track('rebrand_batch_generated', state, { entry_point: 'batch_bar' });
  render(state);
}

async function startFullVaultUpgrade(state, appId) {
  try {
    state.statusMessage = 'Menyiapkan checkout upgrade Full Vault…';
    state.statusType = 'idle';
    render(state);

    const res = await fetch('/api/checkout/create-upgrade-order', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        source: 'brand_studio_locked_card',
        app_id: appId,
        lp_variant: 'brand_studio',
        lp_plan: 'upgrade',
        lp_pack: 'vault_full',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.checkout_url) {
      state.statusMessage = data.message || 'Upgrade belum bisa diproses saat ini.';
      state.statusType = 'error';
      render(state);
      return;
    }
    track('rebrand_upgrade_started', state, { app_id: appId, entry_point: 'locked_card' });
    window.location.href = data.checkout_url;
  } catch {
    state.statusMessage = 'Gagal membuka checkout upgrade. Silakan coba lagi.';
    state.statusType = 'error';
    render(state);
  }
}

async function copyBlock(state, appId, blockId) {
  const pack = state.packs[appId];
  const block = pack?.blocks?.find((b) => b.id === blockId);
  if (!block) return;
  try {
    await copyText(block.body);
    state.copyMessage = `${block.title} berhasil disalin.`;
    state.statusMessage = '';
    track('rebrand_prompt_copied', state, { app_id: appId, scope: state.projects[appId]?.scope, block_id: blockId });
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

function closeDetail(state) {
  state.detailAppId = null;
  render(state);
  if (state.lastFocusedTrigger && typeof state.lastFocusedTrigger.focus === 'function') {
    queueMicrotask(() => state.lastFocusedTrigger.focus());
  }
}

function closeBottomSheet(state) {
  state.bottomSheetApp = null;
  render(state);
  if (state.lastFocusedTrigger && typeof state.lastFocusedTrigger.focus === 'function') {
    queueMicrotask(() => state.lastFocusedTrigger.focus());
  }
}

function closeBrandModal(state) {
  state.brandFullModalOpen = false;
  render(state);
  if (state.lastFocusedTrigger && typeof state.lastFocusedTrigger.focus === 'function') {
    queueMicrotask(() => state.lastFocusedTrigger.focus());
  }
}

function focusOpenedModalIfNeeded(state) {
  if (state.brandFullModalOpen) {
    const closeButton = state.root.querySelector('.rw-modal--wide .rw-modal-close');
    if (closeButton) closeButton.focus();
    return;
  }
  if (state.detailAppId) {
    const modal = state.root.querySelector('[aria-labelledby="appDetailTitle"]');
    const closeButton = modal?.querySelector('.rw-modal-close');
    if (closeButton) closeButton.focus();
    else if (modal) modal.focus();
    return;
  }
  if (state.bottomSheetApp) {
    const sheet = state.root.querySelector('.rw-bottom-sheet');
    const closeButton = sheet?.querySelector('.rw-modal-close');
    if (closeButton) closeButton.focus();
    else if (sheet) sheet.focus();
  }
}

function getFocusableElements(container) {
  return [...container.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 980;
}

function nextPaint() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function setAutosaveState(state, result, successMessage) {
  if (result.ok) {
    state.autosaveLabel = `${successMessage} • ${formatDateTime(new Date().toISOString())}`;
    state.statusMessage = state.statusType === 'error' ? state.statusMessage : '';
  } else {
    state.statusMessage = 'Draft belum tersimpan. Coba lagi, lalu salin prompt Anda sebagai cadangan sebelum menutup halaman.';
    state.statusType = 'error';
  }
  const status = state.root.querySelector('.rw-status-stack');
  if (status) status.outerHTML = renderStatus(state);
}

function track(eventName, state, payload = {}) {
  if (!window.trackVaultEvent) return;
  window.trackVaultEvent(eventName, {
    app_id: payload.app_id || null,
    scope: payload.scope || null,
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

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatRelativeTime(value) {
  if (!value) return '-';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Kemarin';
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return formatDateTime(value);
}

function esc(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(String(value));
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

// ── Walkthrough ──

const WALKTHROUGH_STEPS = [
  {
    selector: '.rw-brand-setup',
    title: 'Isi Brand File',
    desc: 'Nama brand, target market, dan CTA utama — ini dipakai ulang untuk semua aplikasi yang kamu rebrand. Isi minimal 3 field wajib lalu klik <b>Kunci Identitas</b>.',
    position: { desktop: 'right', fallback: 'bottom' },
  },
  {
    selector: '.rw-app-card.owned:first-of-type',
    title: 'Pilih Aplikasi & Scope',
    desc: 'Pilih app dari vault kamu, beri <b>nama baru</b> (contoh: "Campaign Blueprint AI"), lalu pilih scope: <b>Quick</b> (cepat), <b>Market</b> (menengah + landing page), atau <b>Full Launch</b> (lengkap).',
    position: { desktop: 'right', fallback: 'bottom' },
  },
  {
    selector: '.rw-app-card.owned:first-of-type .rw-app-config',
    title: 'Lengkapi Data Penawaran',
    desc: 'Untuk scope Market/Full Launch — buka <b>Opsi lanjutan ▼</b> di bawah ini dan isi section <b>Data Penawaran</b>: harga, yang didapat buyer, bonus. Bikin prompt landing page lebih siap pakai.',
    position: { desktop: 'top', fallback: 'bottom' },
  },
  {
    selector: '.rw-app-card.owned:first-of-type .rw-app-actions',
    title: 'Generate & Rebrand',
    desc: 'Klik <b>Buat Prompt</b> → hasil prompt bisa kamu salin per bagian atau download sebagai .md. Prompt sudah menyebut <b>template HTML</b> yang bisa diunduh dari Portal Akses → Template Landing Page. Copas prompt ke LLM favorit kamu.',
    position: { desktop: 'bottom', fallback: 'bottom' },
  },
];

function startWalkthrough(state) {
  state.walkthrough = { active: true, step: 0 };
  createWalkthroughDOM(state);
  // Wait a bit for layout to settle
  setTimeout(() => positionWalkthrough(state), 50);
}

function createWalkthroughDOM(state) {
  removeWalkthroughDOM();
  const backdrop = document.createElement('div');
  backdrop.className = 'rw-wt-backdrop';
  backdrop.id = 'rwWtBackdrop';
  backdrop.addEventListener('click', () => dismissWalkthrough(state));

  const spot = document.createElement('div');
  spot.className = 'rw-wt-spot';
  spot.id = 'rwWtSpot';

  const tooltip = document.createElement('div');
  tooltip.className = 'rw-wt-tooltip';
  tooltip.id = 'rwWtTooltip';
  tooltip.addEventListener('click', (e) => e.stopPropagation());

  document.body.appendChild(backdrop);
  document.body.appendChild(spot);
  document.body.appendChild(tooltip);

  const scrollHandler = () => {
    if (!state.walkthrough.active) { window.removeEventListener('scroll', scrollHandler); return; }
    const step = WALKTHROUGH_STEPS[state.walkthrough.step];
    if (step) {
      const el = document.querySelector(step.selector);
      if (el) {
        // Disable transition during scroll so cutout sticks perfectly to element
        spot.style.transition = 'none';
        tooltip.style.transition = 'none';
        updateSpotAndTooltip(el, spot, tooltip, step, state);
        
        // Restore transition after scroll stops
        clearTimeout(spot._scrollTid);
        spot._scrollTid = setTimeout(() => {
          spot.style.transition = '';
          tooltip.style.transition = '';
        }, 50);
      }
    }
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });
}

function removeWalkthroughDOM() {
  document.getElementById('rwWtBackdrop')?.remove();
  document.getElementById('rwWtSpot')?.remove();
  document.getElementById('rwWtTooltip')?.remove();
}

function positionWalkthrough(state) {
  const step = WALKTHROUGH_STEPS[state.walkthrough.step];
  if (!step) { dismissWalkthrough(state); return; }

  const el = document.querySelector(step.selector);
  const spot = document.getElementById('rwWtSpot');
  const tooltip = document.getElementById('rwWtTooltip');

  if (!el) {
    if (state.walkthrough.step < WALKTHROUGH_STEPS.length - 1) {
      state.walkthrough.step++;
      requestAnimationFrame(() => positionWalkthrough(state));
    } else {
      dismissWalkthrough(state);
    }
    return;
  }

  // Auto-scroll target into view if outside
  const r = el.getBoundingClientRect();
  if (r.top < 100 || r.bottom > window.innerHeight - 100) {
    // Disable transition for jump
    spot.style.transition = 'none';
    tooltip.style.transition = 'none';
    window.scrollBy({ top: r.top - 120, behavior: 'instant' });
    
    // Allow DOM to process the scroll
    requestAnimationFrame(() => {
      updateSpotAndTooltip(el, spot, tooltip, step, state);
      spot.style.transition = '';
      tooltip.style.transition = '';
    });
    return;
  }

  updateSpotAndTooltip(el, spot, tooltip, step, state);
}

function updateSpotAndTooltip(el, spot, tooltip, step, state) {
  const r = el.getBoundingClientRect();
  const pad = 6;
  
  spot.style.left = `${r.left - pad}px`;
  // Fixed overlay — do not add scrollY
  spot.style.top = `${r.top - pad}px`;
  spot.style.width = `${r.width + pad * 2}px`;
  spot.style.height = `${r.height + pad * 2}px`;

  const stepIndex = state.walkthrough.step;
  const isLast = stepIndex === WALKTHROUGH_STEPS.length - 1;
  tooltip.innerHTML = `
    <h4>${step.title} <span style="font-weight:400;color:var(--muted-light);font-size:11px">${stepIndex + 1}/4</span></h4>
    <p>${step.desc}</p>
    <div class="rw-wt-actions">
      <div class="rw-wt-dots">${WALKTHROUGH_STEPS.map((_, i) => `<span class="rw-wt-dot ${i === stepIndex ? 'active' : ''}"></span>`).join('')}</div>
      <button class="rw-wt-skip" id="rwWtSkip">Lewati</button>
      ${stepIndex > 0 ? '<button class="rw-wt-btn rw-wt-btn--ghost" id="rwWtPrev">← Kembali</button>' : ''}
      <button class="rw-wt-btn rw-wt-btn--primary" id="rwWtNext">${isLast ? 'Selesai ✓' : 'Lanjut →'}</button>
    </div>`;

  document.getElementById('rwWtSkip')?.addEventListener('click', () => dismissWalkthrough(state));
  document.getElementById('rwWtPrev')?.addEventListener('click', () => { state.walkthrough.step--; positionWalkthrough(state); });
  document.getElementById('rwWtNext')?.addEventListener('click', () => {
    if (state.walkthrough.step >= WALKTHROUGH_STEPS.length - 1) { dismissWalkthrough(state); return; }
    state.walkthrough.step++;
    positionWalkthrough(state);
  });

  // Position tooltip
  const isMobile = window.innerWidth < 640;
  const pos = isMobile ? 'bottom' : (step.position.desktop || 'right');
  const tw = 340, th = tooltip.offsetHeight || 200;
  let tx, ty;

  if (pos === 'right') {
    tx = r.right + 20;
    ty = r.top + r.height / 2 - th / 2;
  } else if (pos === 'left') {
    tx = r.left - tw - 20;
    ty = r.top + r.height / 2 - th / 2;
  } else if (pos === 'top') {
    tx = r.left + r.width / 2 - tw / 2;
    ty = r.top - th - 16;
  } else { // bottom
    tx = r.left + r.width / 2 - tw / 2;
    ty = r.bottom + 16;
  }

  // Clamp to viewport
  tx = Math.max(16, Math.min(tx, window.innerWidth - tw - 16));
  ty = Math.max(16, Math.min(ty, window.innerHeight - th - 16));

  tooltip.style.left = `${tx}px`;
  tooltip.style.top = `${ty}px`;
}

function dismissWalkthrough(state) {
  removeWalkthroughDOM();
  state.walkthrough = { active: false, step: 0 };
  markWalkthroughSeen(state.memberKey);
}

function restartWalkthrough(state) {
  clearWalkthroughFlag(state.memberKey);
  state.walkthrough = { active: false, step: 0 };
  removeWalkthroughDOM();
  startWalkthrough(state);
}

function handleWalkthroughKey(event, state) {
  if (!state.walkthrough.active) return false;
  if (event.key === 'Escape') { dismissWalkthrough(state); return true; }
  if (event.key === 'ArrowRight') {
    if (state.walkthrough.step >= WALKTHROUGH_STEPS.length - 1) { dismissWalkthrough(state); return true; }
    state.walkthrough.step++;
    positionWalkthrough(state);
    return true;
  }
  if (event.key === 'ArrowLeft') {
    if (state.walkthrough.step <= 0) return true;
    state.walkthrough.step--;
    positionWalkthrough(state);
    return true;
  }
  return false;
}

function handleWalkthroughClick(event, state) {
  if (!state.walkthrough.active) return false;
  // Block all normal clicks during walkthrough
  const tooltipEl = document.getElementById('rwWtTooltip');
  if (tooltipEl && !tooltipEl.contains(event.target)) {
    return true; // consume click outside tooltip
  }
  return false;
}

// ── Header help button bind ──
document.addEventListener('DOMContentLoaded', () => {
  // Add help button to header if workspace becomes active later
  const observer = new MutationObserver(() => {
    const headerRight = document.querySelector('.rw-header-right');
    if (headerRight && !headerRight.querySelector('.rw-wt-help')) {
      const helpBtn = document.createElement('button');
      helpBtn.className = 'rw-wt-help';
      helpBtn.textContent = '?';
      helpBtn.title = 'Tutorial';
      headerRight.prepend(helpBtn);
      helpBtn.addEventListener('click', () => {
        // re-open walkthrough via global state (find the workspace instance)
        const root = document.getElementById('rebrandWorkspace');
        if (!root) return;
        // We need to reach the state object. Use a global ref pattern.
        if (root._walkthroughState) restartWalkthrough(root._walkthroughState);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
