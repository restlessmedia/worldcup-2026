const DATA_BASE = "data";

export async function loadJson(name) {
  const response = await fetch(`${DATA_BASE}/${name}`);
  if (!response.ok) throw new Error(`Failed to load ${name}`);
  return response.json();
}

export async function loadSiteData() {
  const [standings, config, meta, results] = await Promise.all([
    loadJson("standings.json"),
    loadJson("config.json"),
    loadJson("meta.json"),
    loadJson("results.json"),
  ]);
  return { standings, config, meta, results };
}

export function flagUrl(code) {
  return `https://api.fifa.com/api/v3/picture/flags-sq-4/${code}`;
}
