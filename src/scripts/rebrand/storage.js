const STORAGE_VERSION = 2;
const PREFIX = 'appvibe:rebrand';

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    // Support v1 envelope: { version, payload, savedAt }
    if (parsed && typeof parsed === 'object' && 'payload' in parsed) {
      return parsed.payload ?? fallback;
    }
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function keyFor(memberKey, name) {
  return `${PREFIX}:${name}:${memberKey || 'local'}`;
}

function keyForApp(memberKey, name, appId) {
  return `${PREFIX}:${name}:${appId}:${memberKey || 'local'}`;
}

function read(key, fallback = null) {
  try {
    return safeParse(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

function write(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, payload, savedAt: new Date().toISOString() }));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/** Get all storage keys for v2 multi-project model */
export function getRebrandStorageKeys(memberKey) {
  return {
    brandFile: keyFor(memberKey, 'brand-file'),
    brandUpdatedAt: keyFor(memberKey, 'brand-updated-at'),
    activeStep: keyFor(memberKey, 'active-step'),
    walkthroughSeen: keyFor(memberKey, 'walkthrough-seen'),
  };
}

/** Get per-app storage keys */
export function getAppStorageKeys(memberKey, appId) {
  return {
    project: keyForApp(memberKey, 'project', appId),
    generatedPack: keyForApp(memberKey, 'project-pack', appId),
  };
}

/** Find all app IDs that have project data stored */
export function listStoredAppIds(memberKey) {
  const prefix = `${PREFIX}:project:`;
  const suffix = `:${memberKey || 'local'}`;
  const appIds = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix) && key.endsWith(suffix)) {
        const appId = key.slice(prefix.length, -suffix.length);
        if (appId) appIds.push(appId);
      }
    }
  } catch {
    // localStorage unavailable
  }
  return appIds;
}

// ── Brand File (global, one per member) ──

export function loadBrandFile(memberKey) {
  return read(getRebrandStorageKeys(memberKey).brandFile) || null;
}

export function saveBrandFile(memberKey, brandFile) {
  const result = write(getRebrandStorageKeys(memberKey).brandFile, brandFile);
  if (result.ok && brandFile?.updatedAt) {
    try {
      localStorage.setItem(
        getRebrandStorageKeys(memberKey).brandUpdatedAt,
        JSON.stringify({ ts: brandFile.updatedAt }),
      );
    } catch { /* non-critical */ }
  }
  return result;
}

export function getBrandUpdatedAt(memberKey) {
  const entry = read(getRebrandStorageKeys(memberKey).brandUpdatedAt);
  return entry?.ts || null;
}

// ── Active Step ──

export function loadActiveStep(memberKey) {
  return read(getRebrandStorageKeys(memberKey).activeStep) || null;
}

export function saveActiveStep(memberKey, activeStep) {
  return write(getRebrandStorageKeys(memberKey).activeStep, activeStep);
}

// ── Walkthrough ──

export function isWalkthroughSeen(memberKey) {
  try {
    return localStorage.getItem(getRebrandStorageKeys(memberKey).walkthroughSeen) === '1';
  } catch { return false; }
}

export function markWalkthroughSeen(memberKey) {
  try {
    localStorage.setItem(getRebrandStorageKeys(memberKey).walkthroughSeen, '1');
  } catch { /* non-critical */ }
}

export function clearWalkthroughFlag(memberKey) {
  try {
    localStorage.removeItem(getRebrandStorageKeys(memberKey).walkthroughSeen);
  } catch { /* non-critical */ }
}

// ── Project (per app) ──

export function loadProject(memberKey, appId) {
  return read(getAppStorageKeys(memberKey, appId).project) || null;
}

export function loadAllProjects(memberKey) {
  const appIds = listStoredAppIds(memberKey);
  const projects = {};
  for (const appId of appIds) {
    const project = loadProject(memberKey, appId);
    if (project) projects[appId] = project;
  }
  return projects;
}

export function saveProject(memberKey, appId, project) {
  return write(getAppStorageKeys(memberKey, appId).project, project);
}

// ── Generated Pack (per app) ──

export function loadGeneratedPack(memberKey, appId) {
  return read(getAppStorageKeys(memberKey, appId).generatedPack) || null;
}

export function loadAllPacks(memberKey) {
  const appIds = listStoredAppIds(memberKey);
  const packs = {};
  for (const appId of appIds) {
    const pack = loadGeneratedPack(memberKey, appId);
    if (pack) packs[appId] = pack;
  }
  return packs;
}

export function saveGeneratedPack(memberKey, appId, generatedPack) {
  return write(getAppStorageKeys(memberKey, appId).generatedPack, generatedPack);
}

// ── Stale Detection ──

/**
 * Detect which app packs are stale (brand file changed after pack was generated).
 * Returns an object: { [appId]: true } for stale packs.
 */
export function detectStalePacks(memberKey) {
  const brandUpdatedAt = getBrandUpdatedAt(memberKey);
  if (!brandUpdatedAt) return {};

  const appIds = listStoredAppIds(memberKey);
  const stale = {};
  for (const appId of appIds) {
    const pack = loadGeneratedPack(memberKey, appId);
    if (pack && pack.generatedAt && brandUpdatedAt > pack.generatedAt) {
      stale[appId] = true;
    }
  }
  return stale;
}

// ── Legacy load (backward compat with v1 single-project model) ──

/** Load workspace in v2 format, migrating from v1 if needed */
export function loadRebrandWorkspace(memberKey) {
  const brandFile = loadBrandFile(memberKey);
  const activeStep = loadActiveStep(memberKey);

  // Try v2 multi-project first
  const allProjects = loadAllProjects(memberKey);
  if (Object.keys(allProjects).length > 0) {
    return { brandFile, activeStep, projects: allProjects };
  }

  // Fallback: check v1 single-project keys
  const v1ProjectKey = keyFor(memberKey, 'project');
  const v1PackKey = keyFor(memberKey, 'generated-pack');
  const v1Project = read(v1ProjectKey);
  const v1Pack = read(v1PackKey);

  if (v1Project) {
    // Migrate v1 → v2: move single project to per-app key
    const appId = v1Project.appId;
    if (appId) {
      saveProject(memberKey, appId, v1Project);
      if (v1Pack) {
        saveGeneratedPack(memberKey, appId, v1Pack);
        remove(v1PackKey);
      }
      remove(v1ProjectKey);
      return { brandFile, activeStep, projects: { [appId]: v1Project } };
    }
    // Can't migrate without appId — return as-is
    return { brandFile, activeStep, projects: {}, legacyProject: v1Project, legacyPack: v1Pack };
  }

  return { brandFile, activeStep, projects: {} };
}

// ── Clear ──

export function clearRebrandWorkspace(memberKey) {
  const keys = getRebrandStorageKeys(memberKey);
  const results = [remove(keys.brandFile), remove(keys.brandUpdatedAt), remove(keys.activeStep)];

  // Remove all per-app keys
  const appIds = listStoredAppIds(memberKey);
  for (const appId of appIds) {
    const appKeys = getAppStorageKeys(memberKey, appId);
    results.push(remove(appKeys.project), remove(appKeys.generatedPack));
  }

  // Also remove v1 legacy keys if they exist
  results.push(remove(keyFor(memberKey, 'project')));
  results.push(remove(keyFor(memberKey, 'generated-pack')));

  return { ok: results.every((r) => r.ok) };
}
