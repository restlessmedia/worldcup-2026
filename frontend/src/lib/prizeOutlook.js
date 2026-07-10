import { formatHouseLabel } from "./format.js";
import { splitPrizes } from "./prizes.js";

const KNOCKOUT_STAGES = new Set(["r32", "r16", "qf", "sf", "third", "final"]);

function buildDrawOrder(draw) {
  const order = new Map();
  let index = 0;
  for (const entry of draw || []) {
    for (const team of entry.teams || []) {
      order.set(team, index);
      index += 1;
    }
  }
  return order;
}

function isDecidedFixture(fixture) {
  const homeScore = fixture.home_score;
  const awayScore = fixture.away_score;
  if (homeScore == null || awayScore == null) return false;
  return Boolean(fixture.finished) || KNOCKOUT_STAGES.has(fixture.stage);
}

export function tournamentStatsFromFixtures(fixtures, drawName) {
  let matchesPlayed = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const fixture of fixtures || []) {
    if (!isDecidedFixture(fixture)) continue;

    const home = fixture.home;
    const away = fixture.away;
    const homeScore = Number(fixture.home_score);
    const awayScore = Number(fixture.away_score);

    if (home === drawName) {
      matchesPlayed += 1;
      goalsFor += homeScore;
      goalsAgainst += awayScore;
    } else if (away === drawName) {
      matchesPlayed += 1;
      goalsFor += awayScore;
      goalsAgainst += homeScore;
    }
  }

  return {
    matchesPlayed,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
  };
}

function teamLookupFromStandings(standings) {
  const byFifaCode = new Map();
  for (const house of standings?.houses || []) {
    for (const team of house.teams || []) {
      byFifaCode.set(team.fifa_code, {
        ...team,
        house_id: team.house_id || house.house_id,
      });
    }
  }
  return byFifaCode;
}

function woodenSpoonCandidates(standings) {
  const league = standings?.wooden_spoon_league || standings?.wooden_spoon || [];
  const lookup = teamLookupFromStandings(standings);
  const withGoals = league.filter((row) => (row.goals_conceded ?? 0) > 0);
  if (!withGoals.length) return [];

  const maxGoals = Math.max(...withGoals.map((row) => row.goals_conceded));
  return withGoals
    .filter((row) => row.goals_conceded === maxGoals)
    .map((row) => {
      const details = lookup.get(row.fifa_code) || row;
      return {
        draw_name: details.draw_name,
        display_name: row.display_name || details.display_name,
        house_id: row.house_id || details.house_id,
        goals_conceded: row.goals_conceded,
      };
    });
}

function minBy(candidates, selector) {
  return Math.min(...candidates.map(selector));
}

function maxBy(candidates, selector) {
  return Math.max(...candidates.map(selector));
}

function narrowToMin(candidates, selector) {
  const min = minBy(candidates, selector);
  return candidates.filter((candidate) => selector(candidate) === min);
}

function narrowToMax(candidates, selector) {
  const max = maxBy(candidates, selector);
  return candidates.filter((candidate) => selector(candidate) === max);
}

const TIE_BREAK_STEPS = [
  {
    id: "matches_played",
    apply(candidates) {
      const maxMatches = maxBy(candidates, (candidate) => candidate.matchesPlayed);
      const minMatches = minBy(candidates, (candidate) => candidate.matchesPlayed);
      if (maxMatches === minMatches) return { candidates, resolved: false };
      return {
        candidates: narrowToMin(candidates, (candidate) => candidate.matchesPlayed),
        resolved: true,
      };
    },
    reason(winner, losers) {
      const loser = losers[0];
      return `fewer matches played (${winner.matchesPlayed} vs ${loser.matchesPlayed})`;
    },
  },
  {
    id: "goal_difference",
    apply(candidates) {
      const minGd = minBy(candidates, (candidate) => candidate.goalDifference);
      const maxGd = maxBy(candidates, (candidate) => candidate.goalDifference);
      if (minGd === maxGd) return { candidates, resolved: false };
      return {
        candidates: narrowToMin(candidates, (candidate) => candidate.goalDifference),
        resolved: true,
      };
    },
    reason(winner, losers) {
      const loser = losers[0];
      return `worse goal difference (${winner.goalDifference} vs ${loser.goalDifference})`;
    },
  },
  {
    id: "goals_scored",
    apply(candidates) {
      const minGf = minBy(candidates, (candidate) => candidate.goalsFor);
      const maxGf = maxBy(candidates, (candidate) => candidate.goalsFor);
      if (minGf === maxGf) return { candidates, resolved: false };
      return {
        candidates: narrowToMin(candidates, (candidate) => candidate.goalsFor),
        resolved: true,
      };
    },
    reason(winner, losers) {
      const loser = losers[0];
      return `fewer goals scored (${winner.goalsFor} vs ${loser.goalsFor})`;
    },
  },
  {
    id: "draw_order",
    apply(candidates) {
      const minDraw = minBy(candidates, (candidate) => candidate.drawOrder);
      const maxDraw = maxBy(candidates, (candidate) => candidate.drawOrder);
      if (minDraw === maxDraw) return { candidates, resolved: false };
      return {
        candidates: narrowToMin(candidates, (candidate) => candidate.drawOrder),
        resolved: true,
      };
    },
    reason() {
      return "earlier in the sweepstake draw";
    },
  },
];

export function resolveWoodenSpoonTie(candidates, drawOrder, fixtures) {
  if (!candidates.length) return null;
  if (candidates.length === 1) {
    return {
      winner: candidates[0],
      tiedCount: 1,
      tieBreakReason: null,
    };
  }

  let enriched = candidates.map((candidate) => {
    const stats = tournamentStatsFromFixtures(fixtures, candidate.draw_name);
    return {
      ...candidate,
      ...stats,
      drawOrder: drawOrder.get(candidate.draw_name) ?? Number.MAX_SAFE_INTEGER,
    };
  });

  let tieBreakReason = null;
  for (const step of TIE_BREAK_STEPS) {
    if (enriched.length === 1) break;
    const { candidates: next, resolved } = step.apply(enriched);
    if (resolved) {
      const losers = enriched.filter((candidate) => !next.includes(candidate));
      tieBreakReason = step.reason(next[0], losers);
    }
    enriched = next;
  }

  return {
    winner: enriched[0],
    tiedCount: candidates.length,
    tieBreakReason,
    unresolved: enriched.length > 1,
  };
}

export function computeWoodenSpoonOutlook({ standings, draw, fixtures }) {
  const candidates = woodenSpoonCandidates(standings);
  if (!candidates.length) {
    return {
      status: "pending",
      message: "No goals conceded yet — wooden spoon standings will appear once matches finish.",
    };
  }

  const drawOrder = buildDrawOrder(draw);
  const result = resolveWoodenSpoonTie(candidates, drawOrder, fixtures?.fixtures || fixtures);
  if (!result?.winner) {
    return { status: "pending", message: "Wooden spoon leader not available yet." };
  }

  const { winner, tiedCount, tieBreakReason, unresolved } = result;
  const tiedTeams = candidates.map((candidate) => candidate.display_name);

  return {
    status: "leading",
    houseId: winner.house_id,
    houseLabel: formatHouseLabel(winner.house_id),
    teamName: winner.display_name,
    goalsConceded: winner.goals_conceded,
    tiedCount,
    tiedTeams,
    tieBreakReason,
    unresolved,
    note:
      tiedCount > 1 && tieBreakReason
        ? `Tied on ${winner.goals_conceded} goals conceded with ${tiedTeams.join(", ")} — ${winner.display_name} leads on ${tieBreakReason}.`
        : null,
  };
}

function houseSortKey(houseId) {
  if (houseId === "Coppice") return [1, "Coppice"];
  if (/^\d+$/.test(houseId)) return [0, Number(houseId)];
  return [2, houseId.toLowerCase()];
}

export function computeMainPrizeContenders(standings) {
  return (standings?.houses || [])
    .filter((house) => house.teams_alive > 0)
    .map((house) => ({
      houseId: house.house_id,
      houseLabel: formatHouseLabel(house.house_id),
      teamsAlive: house.teams
        .filter((team) => team.status === "alive")
        .map((team) => team.display_name),
      bestRank: house.best_remaining_rank,
    }))
    .sort((left, right) => {
      const rankDiff = (left.bestRank ?? 999) - (right.bestRank ?? 999);
      if (rankDiff !== 0) return rankDiff;
      const [leftKind, leftValue] = houseSortKey(left.houseId);
      const [rightKind, rightValue] = houseSortKey(right.houseId);
      if (leftKind !== rightKind) return leftKind - rightKind;
      if (leftValue < rightValue) return -1;
      if (leftValue > rightValue) return 1;
      return 0;
    });
}

export function computePrizeOutlook({ standings, draw, fixtures, config }) {
  const { main, side } = splitPrizes(config);
  const contenders = computeMainPrizeContenders(standings);
  const woodenSpoon = computeWoodenSpoonOutlook({ standings, draw, fixtures });
  const goalsPrize = side.find((prize) => prize.id === "goals");
  const fairPlayPrize = side.find((prize) => prize.id === "fair-play");

  return {
    main: main.map((prize) => ({
      ...prize,
      contenders,
      emptyMessage:
        contenders.length === 0
          ? "No houses still have a team in the World Cup."
          : null,
    })),
    woodenSpoon: {
      prize: goalsPrize,
      outlook: woodenSpoon,
    },
    fairPlay: {
      prize: fairPlayPrize,
      message: "Will be determined at the end of the tournament.",
    },
  };
}
