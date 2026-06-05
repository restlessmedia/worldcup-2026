const PREFETCH_BY_PAGE = {
  "index.html": ["standings.json", "config.json", "meta.json"],
  "knockout.html": ["knockout.json", "meta.json"],
  "fixtures.html": ["fixtures.json", "meta.json"],
  "spoon.html": ["standings.json", "config.json", "meta.json"],
  "info.html": ["config.json", "meta.json"],
};

const prefetched = new Set();

export function prefetchPageData(href) {
  const page = href.split("/").pop() || href;
  const files = PREFETCH_BY_PAGE[page];
  if (!files) return;

  for (const file of files) {
    const url = `data/${file}`;
    if (prefetched.has(url)) continue;
    prefetched.add(url);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "fetch";
    link.href = url;
    document.head.appendChild(link);
  }
}
