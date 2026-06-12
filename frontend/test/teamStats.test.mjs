import assert from "node:assert/strict";
import test from "node:test";
import { enrichTeamWithStandings } from "../src/lib/teamStats.js";

const standings = {
  houses: [
    {
      house_id: "3",
      teams: [
        {
          draw_name: "Czechia (Czech Republic)",
          display_name: "Czechia",
          fifa_code: "CZE",
          goals_conceded: 2,
        },
      ],
    },
  ],
  wooden_spoon_league: [
    {
      draw_name: "Czechia (Czech Republic)",
      display_name: "Czechia",
      fifa_code: "CZE",
      house_id: "3",
      goals_conceded: 2,
      position: 1,
      fair_play_points: 0,
    },
  ],
};

test("enrichTeamWithStandings fills goals conceded for fixture teams", () => {
  const fixtureTeam = {
    draw_name: "Czechia (Czech Republic)",
    display_name: "Czechia",
    fifa_code: "CZE",
    house_id: "3",
    status: "alive",
  };

  const enriched = enrichTeamWithStandings(fixtureTeam, standings);

  assert.equal(enriched.goals_conceded, 2);
  assert.equal(enriched.position, 1);
});

test("enrichTeamWithStandings adds house id for house table teams", () => {
  const houseTeam = {
    draw_name: "Czechia (Czech Republic)",
    display_name: "Czechia",
    fifa_code: "CZE",
    goals_conceded: 2,
  };

  const enriched = enrichTeamWithStandings(houseTeam, standings);

  assert.equal(enriched.house_id, "3");
});
