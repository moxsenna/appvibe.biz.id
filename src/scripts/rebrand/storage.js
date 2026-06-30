const STORAGE_VERSION = 1;
const PREFIX = 'appvibe:rebrand';

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function keyFor(memberKey, name) {
  return `${PREFIX}:${name}:${memberKey || 'local'}`;
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

export function getRebrandStorageKeys(memberKey) {
  return {
    brandFile: keyFor(memberKey, 'brand-file'),
    project: keyFor(memberKey, 'project'),
    activeStep: keyFor(memberKey, 'active-step'),
    generatedPack: keyFor(memberKey, 'generated-pack'),
  };
}

export function loadRebrandWorkspace(memberKey) {
  const keys = getRebrandStorageKeys(memberKey);
  return {
    brandFile: read(keys.brandFile)?.payload || null,
    project: read(keys.project)?.payload || null,
    activeStep: read(keys.activeStep)?.payload || null,
    generatedPack: read(keys.generatedPack)?.payload || null,
  };
}

export function saveBrandFile(memberKey, brandFile) {
  return write(getRebrandStorageKeys(memberKey).brandFile, brandFile);
}

export function saveProject(memberKey, project) {
  return write(getRebrandStorageKeys(memberKey).project, project);
}

export function saveActiveStep(memberKey, activeStep) {
  return write(getRebrandStorageKeys(memberKey).activeStep, activeStep);
}

export function saveGeneratedPack(memberKey, generatedPack) {
  return write(getRebrandStorageKeys(memberKey).generatedPack, generatedPack);
}

export function clearRebrandWorkspace(memberKey) {
  const keys = getRebrandStorageKeys(memberKey);
  const results = Object.values(keys).map((key) => remove(key));
  return { ok: results.every((result) => result.ok), results };
}
