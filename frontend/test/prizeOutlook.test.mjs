import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  computeMainPrizeContenders,
  computePrizeOutlook,
  computeWoodenSpoonOutlook,
  resolveWoodenSpoonTie,
  tournamentStatsFromFixtures,
} from "../src/lib/prizeOutlook.js";

const root = path.resolve(import.meta.dirname, "../..");
const standings = JSON.parse(fs.readFileSync(path.join(root, "data/standings.json"), "utf8"));
const draw = JSON.parse(fs.readFileSync(path.join(root, "data/draw.json"), "utf8"));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, "data/fixtures.json"), "utf8"));
const config = JSON.parse(fs.readFileSync(path.join(root, "data/config.json"), "utf8"));

test("tournamentStatsFromFixtures counts knockout matches for a team", () => {
  const stats = tournamentStatsFromFixtures(fixtures.fixtures, "Germany");
  assert.ok(stats.matchesPlayed >= 4);
  assert.equal(stats.goalsAgainst, 5);
});

test("resolveWoodenSpoonTie picks Iraq over Tunisia on goal difference", () => {
  const candidates = [
    { draw_name: "Iraq", display_name: "Iraq", house_id: "1", goals_conceded: 12 },
    { draw_name: "Tunisia", display_name: "Tunisia", house_id: "8", goals_conceded: 12 },
  ];
  const drawOrder = new Map([
    ["Iraq", 1],
    ["Tunisia", 18],
  ]);

  const result = resolveWoodenSpoonTie(candidates, drawOrder, fixtures.fixtures);

  assert.equal(result.winner.display_name, "Iraq");
  assert.equal(result.tieBreakReason, "worse goal difference (-11 vs -10)");
});

test("computeWoodenSpoonOutlook leads House 1 through Iraq", () => {
  const outlook = computeWoodenSpoonOutlook({ standings, draw, fixtures });

  assert.equal(outlook.status, "leading");
  assert.equal(outlook.houseId, "1");
  assert.equal(outlook.teamName, "Iraq");
  assert.match(outlook.note, /Iraq leads on worse goal difference/);
});

test("computeMainPrizeContenders lists only houses with teams still alive", () => {
  const contenders = computeMainPrizeContenders(standings);

  assert.equal(contenders.length, standings.teams_in_play);
  assert.deepEqual(
    contenders.map((house) => house.houseId).sort(),
    ["1", "11", "12", "13", "21", "4", "Coppice"],
  );
});

test("computePrizeOutlook leaves fair play undecided", () => {
  const outlook = computePrizeOutlook({ standings, draw, fixtures, config });

  assert.equal(outlook.fairPlay.message, "Will be determined at the end of the tournament.");
  assert.equal(outlook.main.length, 4);
  assert.equal(outlook.main[0].contenders.length, standings.teams_in_play);
});
