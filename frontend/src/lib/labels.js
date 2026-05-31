/** Plain-language labels — avoid unexplained acronyms across the site. */

export const columns = {
  position: {
    label: "Position",
    hint: "League place in the wooden spoon table",
  },
  team: { label: "Team", hint: null },
  house: {
    label: "House",
    hint: "Which sweepstake house holds this team",
  },
  group: {
    label: "Group",
    hint: "World Cup group stage letter (A–L)",
  },
  worldRanking: {
    label: "World ranking",
    hint: "FIFA world ranking — lower number means a stronger team",
  },
  goalsConceded: {
    label: "Goals conceded",
    hint: "Goals scored against this team in the tournament",
  },
  bestRanking: {
    label: "Best ranking",
    hint: "Best FIFA world ranking among this house's remaining teams",
  },
  stillIn: {
    label: "Still in",
    hint: "Teams not yet eliminated from the World Cup",
  },
};

export const copy = {
  toBeDecided: "To be decided",
  goalsConcededCount: (count) =>
    `${count} goal${count === 1 ? "" : "s"} conceded`,
  worldRankingShort: (rank) => `#${rank}`,
  worldRankingLong: (rank) => `#${rank} in the FIFA world rankings`,
  rankingsSource: "World rankings from fifa.com — for context only, not predictions",
  teamDataSource: (date) =>
    `Team rankings and groups from fifa.com${date ? ` (${date})` : ""}`,
  woodenSpoonLeader: (name, goals, house) =>
    `Leader: ${name} (${goals} goal${goals === 1 ? "" : "s"} conceded, house ${house})`,
  sidePrizeSpoon: "Spoon",
  sidePrizeFairPlay: "Fair play",
};

export const roundLabels = {
  r32: { label: "Round of 32", hint: "First knockout round" },
  r16: { label: "Round of 16", hint: "16 teams left" },
  qf: { label: "Quarter-finals", hint: "8 teams left" },
  sf: { label: "Semi-finals", hint: "4 teams left" },
  third: { label: "3rd place play-off", hint: "Third-place match" },
  final: { label: "Final", hint: "World Cup final" },
};
