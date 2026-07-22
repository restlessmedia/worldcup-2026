import test from "node:test";
import assert from "node:assert/strict";
import { FINAL_RESULTS } from "../src/lib/finalResults.js";

test("final results board has expected winners and amounts", () => {
  const byPlace = Object.fromEntries(FINAL_RESULTS.main.map((row) => [row.place, row]));
  assert.equal(byPlace["1st"].houseId, "Coppice");
  assert.equal(byPlace["1st"].teamName, "Spain");
  assert.equal(byPlace["1st"].amount, "£120");
  assert.equal(byPlace["2nd"].houseId, "12");
  assert.equal(byPlace["2nd"].teamName, "Argentina");
  assert.equal(byPlace["3rd"].houseId, "4");
  assert.equal(byPlace["3rd"].teamName, "England");
  assert.equal(byPlace["4th"].houseId, "21");
  assert.equal(byPlace["4th"].teamName, "France");

  const side = Object.fromEntries(FINAL_RESULTS.side.map((row) => [row.place, row]));
  assert.equal(side["Wooden spoon"].houseId, "1");
  assert.equal(side["Wooden spoon"].teamName, "Iraq");
  assert.equal(side["Wooden spoon"].confirming, true);
  assert.match(side["Wooden spoon"].reason, /goal difference/i);
  assert.equal(side["Fair play"].houseId, "4");
  assert.equal(side["Fair play"].teamName, "Netherlands");
  assert.equal(side["Fair play"].confirming, true);
});

test("final results stay provisional until lock-in", () => {
  assert.equal(FINAL_RESULTS.provisional, true);
  assert.match(FINAL_RESULTS.banner, /confirmation/i);
});
