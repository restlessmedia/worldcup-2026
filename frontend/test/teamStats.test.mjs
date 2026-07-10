import assert from "node:assert/strict";
import test from "node:test";
import { copy } from "../src/lib/labels.js";
import { enrichTeamWithStandings, goalsConcededBreakdown } from "../src/lib/teamStats.js";

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
          group: "A",
          group_stage: {
            position: 1,
            played: 3,
            won: 2,
            drawn: 1,
            lost: 0,
            points: 7,
            gf: 5,
            ga: 2,
            gd: 3,
            complete: true,
          },
          goals_conceded_breakdown: {
            group: 2,
            knockout: 0,
            total: 2,
          },
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
      group: "A",
      group_stage: {
        position: 1,
        played: 3,
        won: 2,
        drawn: 1,
        lost: 0,
        points: 7,
        gf: 5,
        ga: 2,
        gd: 3,
        complete: true,
      },
      goals_conceded_breakdown: {
        group: 2,
        knockout: 0,
        total: 2,
      },
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

test("enrichTeamWithStandings fills group stage stats from standings", () => {
  const fixtureTeam = {
    draw_name: "Czechia (Czech Republic)",
    display_name: "Czechia",
    fifa_code: "CZE",
    status: "alive",
  };

  const enriched = enrichTeamWithStandings(fixtureTeam, standings);

  assert.equal(enriched.group, "A");
  assert.equal(enriched.group_stage.position, 1);
  assert.equal(enriched.group_stage.points, 7);
});

test("groupStageSummary formats completed group stage finish", () => {
  const summary = copy.groupStageSummary({
    group: "B",
    group_stage: {
      position: 1,
      won: 2,
      drawn: 1,
      lost: 0,
      points: 7,
      gd: 4,
      complete: true,
    },
  });

  assert.equal(summary, "1st in Group B · 7 pts · W2 D1 L0 · GD +4");
});

test("goalsConcededBreakdown splits group and knockout totals", () => {
  const breakdown = goalsConcededBreakdown({
    goals_conceded: 5,
    group_stage: { ga: 4 },
  });

  assert.deepEqual(breakdown, { group: 4, knockout: 1, total: 5 });
  assert.equal(
    copy.goalsConcededBreakdown(breakdown),
    "4 in the group stage · 1 in knockout",
  );
});

test("enrichTeamWithStandings prefers standings goals over stale team totals", () => {
  const fixtureTeam = {
    draw_name: "Czechia (Czech Republic)",
    display_name: "Czechia",
    fifa_code: "CZE",
    goals_conceded: 1,
    group_stage: { ga: 1 },
  };

  const enriched = enrichTeamWithStandings(fixtureTeam, standings);

  assert.equal(enriched.goals_conceded, 2);
  assert.deepEqual(enriched.goals_conceded_breakdown, {
    group: 2,
    knockout: 0,
    total: 2,
  });
});
