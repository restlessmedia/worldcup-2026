const DATA_BASE = "data";
const FLAG_BASE = `${import.meta.env.BASE_URL}flags`;
const CACHE_STORAGE_KEY = "wc-sweep-data-cache";

const loaders = new Map();

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { version: null, files: {} };
  } catch {
    return { version: null, files: {} };
  }
}

function writeCache(name, payload, version) {
  try {
    const cache = readCache();
    if (cache.version && cache.version !== version) {
      cache.files = {};
    }
    cache.version = version;
    cache.files[name] = payload;
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* sessionStorage unavailable */
  }
}

async function loadJsonCached(name) {
  if (!loaders.has(name)) {
    loaders.set(
      name,
      (async () => {
        const response = await fetch(`${DATA_BASE}/${name}`);
        if (!response.ok) throw new Error(`Failed to load ${name}`);
        const payload = await response.json();
        const version =
          name === "meta.json"
            ? payload.published_at
            : payload.generated_at || payload.last_updated || readCache().version;
        if (version) writeCache(name, payload, version);
        return payload;
      })(),
    );
  }
  return loaders.get(name);
}

export async function loadJson(name) {
  const cache = readCache();
  if (cache.files[name]) {
    loadJsonCached(name).catch(() => {});
    return cache.files[name];
  }
  return loadJsonCached(name);
}

export async function loadStandingsPageData() {
  const [standings, config, meta] = await Promise.all([
    loadJson("standings.json"),
    loadJson("config.json"),
    loadJson("meta.json"),
  ]);
  return { standings, config, meta };
}

export async function loadInfoPageData() {
  const [config, meta] = await Promise.all([loadJson("config.json"), loadJson("meta.json")]);
  return { config, meta };
}

/** @deprecated Use loadStandingsPageData or loadInfoPageData */
export async function loadSiteData() {
  return loadStandingsPageData();
}

export function flagUrl(code) {
  if (!code) return "";
  return `${FLAG_BASE}/${code}.png`;
}
