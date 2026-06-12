export function buildTeamStatsLookup(standings) {
  if (!standings) return null;

  const byFifaCode = new Map();
  const byDrawName = new Map();

  for (const row of standings.wooden_spoon_league || []) {
    if (row.fifa_code) byFifaCode.set(row.fifa_code, row);
    if (row.draw_name) byDrawName.set(row.draw_name, row);
  }

  for (const house of standings.houses || []) {
    for (const team of house.teams || []) {
      const withHouse = { ...team, house_id: team.house_id || house.house_id };

      if (team.fifa_code) {
        const existing = byFifaCode.get(team.fifa_code);
        byFifaCode.set(team.fifa_code, existing ? { ...existing, ...withHouse } : withHouse);
      }
      if (team.draw_name) {
        const existing = byDrawName.get(team.draw_name);
        byDrawName.set(team.draw_name, existing ? { ...existing, ...withHouse } : withHouse);
      }
    }
  }

  return { byFifaCode, byDrawName };
}

export function enrichTeamWithStandings(team, standings) {
  if (!team || !standings) return team;

  const lookup = buildTeamStatsLookup(standings);
  if (!lookup) return team;

  const stats =
    (team.fifa_code && lookup.byFifaCode.get(team.fifa_code)) ||
    (team.draw_name && lookup.byDrawName.get(team.draw_name));

  if (!stats) return team;

  return {
    ...team,
    goals_conceded: team.goals_conceded ?? stats.goals_conceded,
    fair_play_points: team.fair_play_points ?? stats.fair_play_points,
    position: team.position ?? stats.position,
    house_id: team.house_id ?? stats.house_id,
    wooden_spoon_likelihood: team.wooden_spoon_likelihood ?? stats.wooden_spoon_likelihood,
  };
}
