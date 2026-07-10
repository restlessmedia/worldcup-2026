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

export function isTeamEliminated(team) {
  return team?.status === "eliminated";
}

export function goalsConcededBreakdown(team) {
  if (!team) return null;

  const stored = team.goals_conceded_breakdown;
  if (stored && stored.total != null) {
    return {
      group: stored.group ?? 0,
      knockout: stored.knockout ?? 0,
      total: stored.total,
    };
  }

  const total = team.goals_conceded ?? 0;
  const groupGa = team.group_stage?.ga;
  if (groupGa == null) return { group: null, knockout: null, total };

  const group = Number(groupGa);
  return {
    group,
    knockout: Math.max(0, total - group),
    total,
  };
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
    status: team.status ?? stats.status,
    goals_conceded: stats.goals_conceded ?? team.goals_conceded,
    goals_conceded_breakdown: stats.goals_conceded_breakdown ?? team.goals_conceded_breakdown,
    fair_play_points: team.fair_play_points ?? stats.fair_play_points,
    position: team.position ?? stats.position,
    house_id: team.house_id ?? stats.house_id,
    group: team.group ?? stats.group,
    group_stage: team.group_stage ?? stats.group_stage,
    wooden_spoon_likelihood: team.wooden_spoon_likelihood ?? stats.wooden_spoon_likelihood,
  };
}
