import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.resolve(__dirname, "../src/styles/global.css");

async function globalCss() {
  return readFile(cssPath, "utf8");
}

function mobileRules(css) {
  const start = css.indexOf("@media (max-width: 640px)");
  const end = css.indexOf("@media (min-width: 641px)");

  assert.notEqual(start, -1, "mobile breakpoint should exist");
  assert.notEqual(end, -1, "desktop breakpoint should follow mobile breakpoint");

  return css.slice(start, end);
}

test("mobile fixture calendar scrolls horizontally instead of shrinking country icons", async () => {
  const css = await globalCss();
  const mobileCss = mobileRules(css);

  assert.match(
    mobileCss,
    /\.fixture-calendar__grid-scroll\s*\{[^}]*overflow-x:\s*auto;/s,
    "mobile calendar should keep horizontal scrolling enabled",
  );
  assert.match(
    mobileCss,
    /\.fixture-calendar__weekdays,\s*\.fixture-calendar__grid\s*\{[^}]*min-width:\s*40\.25rem;/s,
    "mobile calendar grid should remain wider than narrow screens so cells do not compress",
  );
  assert.doesNotMatch(
    mobileCss,
    /\.fixture-calendar__flag,\s*\.fixture-calendar__flag-placeholder\s*\{[^}]*width:\s*14px/s,
    "mobile calendar should not shrink country icons below the base 26px size",
  );
});
