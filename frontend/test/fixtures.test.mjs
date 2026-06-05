import assert from "node:assert/strict";
import test from "node:test";
import * as fixtures from "../src/lib/fixtures.js";

const houseTeams = [
  { display_name: "Belgium", fifa_code: "BEL" },
  { display_name: "Uruguay", fifa_code: "URU" },
];

test("buildHouseFixtureList returns unique sorted fixtures involving any house team", () => {
  assert.equal(typeof fixtures.buildHouseFixtureList, "function");

  const allFixtures = [
    {
      id: "later",
      kickoff_utc: "2026-06-18T19:00:00Z",
      home: { display_name: "Belgium", fifa_code: "BEL" },
      away: { display_name: "Egypt", fifa_code: "EGY" },
    },
    {
      id: "knockout-placeholder",
      kickoff_utc: "2026-07-04T19:00:00Z",
      home: { display_name: "Winner of match 1", status: "placeholder" },
      away: { display_name: "Winner of match 2", status: "placeholder" },
    },
    {
      id: "house-derby",
      kickoff_utc: "2026-06-14T16:00:00Z",
      home: { display_name: "Uruguay", fifa_code: "URU" },
      away: { display_name: "Belgium", fifa_code: "BEL" },
    },
  ];

  const result = fixtures.buildHouseFixtureList(allFixtures, houseTeams);

  assert.deepEqual(
    result.map((fixture) => fixture.id),
    ["house-derby", "later"],
  );
});

test("formatFixtureDateUk presents a long UK fixture date", () => {
  assert.equal(typeof fixtures.formatFixtureDateUk, "function");
  assert.equal(fixtures.formatFixtureDateUk("2026-06-14T16:00:00Z"), "Sunday, 14 June 2026");
});

test("fixtureInvolvesAnyTeam matches any code in a house", () => {
  assert.equal(typeof fixtures.fixtureInvolvesAnyTeam, "function");

  const fixture = {
    home: { display_name: "Belgium", fifa_code: "BEL" },
    away: { display_name: "Egypt", fifa_code: "EGY" },
  };

  assert.equal(fixtures.fixtureInvolvesAnyTeam(fixture, ["URU", "BEL"]), true);
  assert.equal(fixtures.fixtureInvolvesAnyTeam(fixture, ["URU", "NZL"]), false);
});

test("initialSelectedDay can select the next fixture matching a house filter", () => {
  const filter = (fixture) => fixtures.fixtureInvolvesAnyTeam(fixture, ["BEL", "URU"]);
  const allFixtures = [
    {
      id: "other",
      kickoff_utc: "2026-06-11T19:00:00Z",
      home: { fifa_code: "MEX" },
      away: { fifa_code: "RSA" },
    },
    {
      id: "house",
      kickoff_utc: "2026-06-14T16:00:00Z",
      home: { fifa_code: "URU" },
      away: { fifa_code: "BEL" },
    },
  ];

  assert.equal(
    fixtures.initialSelectedDay(allFixtures, null, { year: 2026, month: 5 }, filter),
    "2026-06-14",
  );
});
