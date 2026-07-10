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

function fileVersion(name, payload) {
  if (name === "meta.json") return payload.published_at;
  return payload.generated_at || payload.last_updated || null;
}

function writeCache(name, payload, version) {
  try {
    const cache = readCache();
    cache.versions = cache.versions || {};
    cache.files = cache.files || {};
    if (version) cache.versions[name] = version;
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
        const response = await fetch(`${DATA_BASE}/${name}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed to load ${name}`);
        const payload = await response.json();
        const version = fileVersion(name, payload);
        const cache = readCache();
        if (version && cache.versions?.[name] === version && cache.files?.[name]) {
          return cache.files[name];
        }
        writeCache(name, payload, version);
        return payload;
      })(),
    );
  }
  return loaders.get(name);
}

export async function loadJson(name) {
  return loadJsonCached(name);
}

export async function loadStandingsPageData() {
  const [standings, config, meta, fixtures] = await Promise.all([
    loadJson("standings.json"),
    loadJson("config.json"),
    loadJson("meta.json"),
    loadJson("fixtures.json"),
  ]);
  return { standings, config, meta, fixtures };
}

export async function loadInfoPageData() {
  const [config, meta, standings, draw, fixtures] = await Promise.all([
    loadJson("config.json"),
    loadJson("meta.json"),
    loadJson("standings.json"),
    loadJson("draw.json"),
    loadJson("fixtures.json"),
  ]);
  return { config, meta, standings, draw, fixtures };
}

export async function loadFixturesPageData() {
  const [fixtures, meta] = await Promise.all([loadJson("fixtures.json"), loadJson("meta.json")]);
  return { fixtures, meta };
}

/** @deprecated Use loadStandingsPageData or loadInfoPageData */
export async function loadSiteData() {
  return loadStandingsPageData();
}

export function flagUrl(code) {
  if (!code) return "";
  return `${FLAG_BASE}/${code}.png`;
}
