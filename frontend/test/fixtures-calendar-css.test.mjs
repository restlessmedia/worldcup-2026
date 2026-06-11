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

test("fixture calendar active states are stronger than inactive match states", async () => {
  const css = await globalCss();

  assert.match(
    css,
    /\.fixture-calendar__day--flags:not\(\.fixture-calendar__day--selected\),\s*\.fixture-calendar__day--houses:not\(\.fixture-calendar__day--selected\),\s*\.fixture-calendar__day--has-matches:not\(\.fixture-calendar__day--selected\)\s*\{[^}]*border-color:\s*var\(--line-strong\);/s,
    "inactive match days should keep a neutral stronger-than-empty border",
  );
  assert.match(
    css,
    /\.fixture-calendar__day--selected\s*\{[^}]*border-color:\s*var\(--accent\);[^}]*box-shadow:\s*inset 0 0 0 2px var\(--accent\)/s,
    "selected calendar day should use the strong accent, not the muted accent border",
  );
  assert.match(
    css,
    /\.fixture-calendar__day:not\(\.fixture-calendar__day--selected\):hover:not\(:disabled\)\s*\{/s,
    "generic hover styles should not override selected calendar days",
  );
  assert.match(
    css,
    /\.fixture-row__side--highlight \.fixture-row__name\s*\{[^}]*border:\s*1px solid var\(--accent\);/s,
    "highlighted countries in the revealed fixture list should use the strong accent border",
  );
  assert.match(
    css,
    /\.fixture-row__side--highlight \.fixture-row__house-badge\s*\{[^}]*border-color:\s*var\(--accent\);/s,
    "highlighted houses in the revealed fixture list should use the strong accent border",
  );
});
