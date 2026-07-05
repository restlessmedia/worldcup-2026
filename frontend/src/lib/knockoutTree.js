/** World Cup knockout tree layout (left / right pathways → center final). */

/**
 * R32 display order per pathway. Rows are paired for feeder lines into R16.
 * Order follows FIFA 2026 match paths (e.g. M85+M87 → M96), not numeric r32 IDs.
 * @see https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
 */
export const PATHWAY_LEFT = {
  r32: [
    "r32-02", // M74 → M89
    "r32-05", // M77 → M89
    "r32-01", // M73 → M90
    "r32-03", // M75 → M90
    "r32-04", // M76 → M91
    "r32-06", // M78 → M91
    "r32-07", // M79 → M92
    "r32-08", // M80 → M92
  ],
  r16: ["r16-01", "r16-02", "r16-03", "r16-04"],
  qf: ["qf-01", "qf-02"],
  sf: ["sf-01"],
};

export const PATHWAY_RIGHT = {
  r32: [
    "r32-09", // M81 → M94
    "r32-10", // M82 → M94
    "r32-11", // M83 → M93
    "r32-12", // M84 → M93
    "r32-14", // M86 → M95
    "r32-16", // M88 → M95
    "r32-13", // M85 → M96
    "r32-15", // M87 → M96
  ],
  r16: ["r16-05", "r16-06", "r16-07", "r16-08"],
  qf: ["qf-03", "qf-04"],
  sf: ["sf-02"],
};

export const CENTER_MATCHES = {
  final: "final-01",
  third: "third-01",
};

export const PATHWAY_ROUND_ORDER = ["r32", "r16", "qf", "sf"];
export const PATHWAY_ROUND_ORDER_REVERSED = [...PATHWAY_ROUND_ORDER].reverse();

export function indexMatches(knockout) {
  const byId = {};
  for (const round of knockout?.rounds || []) {
    for (const match of round.matches || []) {
      byId[match.id] = match;
    }
  }
  return byId;
}

export function chunkPairs(ids) {
  const pairs = [];
  for (let i = 0; i < ids.length; i += 2) {
    pairs.push(ids.slice(i, i + 2));
  }
  return pairs;
}

export function resolveMatch(byId, id) {
  return byId[id] || { id, home: null, away: null, home_score: null, away_score: null, winner: null };
}

export function roundIdFromMatchId(matchId) {
  return matchId.replace(/-\d+$/, "");
}

const PATHWAY_COLUMNS = {
  left: { r32: 1, r16: 2, qf: 3, sf: 4 },
  right: { r32: 4, r16: 3, qf: 2, sf: 1 },
};

/** Grid row placement so each round lines up with its feeders (8 leaf rows). */
export function pathwayGridPlacements(side) {
  const pathway = side === "left" ? PATHWAY_LEFT : PATHWAY_RIGHT;
  const col = PATHWAY_COLUMNS[side];
  const cells = [];

  pathway.r32.forEach((id, index) => {
    cells.push({ id, roundId: "r32", col: col.r32, row: index + 1, rowSpan: 1 });
  });

  pathway.r16.forEach((id, index) => {
    const row = index * 2 + 1;
    cells.push({ id, roundId: "r16", col: col.r16, row, rowSpan: 2 });
  });

  pathway.qf.forEach((id, index) => {
    const row = index * 4 + 1;
    cells.push({ id, roundId: "qf", col: col.qf, row, rowSpan: 4 });
  });

  pathway.sf.forEach((id) => {
    cells.push({ id, roundId: "sf", col: col.sf, row: 1, rowSpan: 8 });
  });

  return cells;
}

export function pathwayFeederPlacements(side) {
  const pathway = side === "left" ? PATHWAY_LEFT : PATHWAY_RIGHT;
  const col = PATHWAY_COLUMNS[side].r32;
  return chunkPairs(pathway.r32).map((pairIds, index) => ({
    key: pairIds.join("-"),
    col,
    row: index * 2 + 1,
    rowSpan: 2,
  }));
}
