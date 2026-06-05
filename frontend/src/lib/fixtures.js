const UK_TZ = "Europe/London";

export function ukDateKey(utcValue) {
  if (!utcValue) return null;
  const date = new Date(utcValue);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function formatKickoffUk(utcValue) {
  if (!utcValue) return null;
  const date = new Date(utcValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    timeZone: UK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatMonthYear(year, monthIndex) {
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function groupFixturesByDay(fixtures) {
  const byDay = new Map();
  for (const fixture of fixtures) {
    const key = ukDateKey(fixture.kickoff_utc);
    if (!key) continue;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(fixture);
  }
  for (const dayFixtures of byDay.values()) {
    dayFixtures.sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
  }
  return byDay;
}

export function fixtureInvolvesTeam(fixture, fifaCode) {
  if (!fifaCode) return true;
  return fixture.home?.fifa_code === fifaCode || fixture.away?.fifa_code === fifaCode;
}

function sideShortLabel(team) {
  if (!team) return "tbd";
  if (team.fifa_code) return team.fifa_code.toLowerCase();
  return (team.display_name || team.draw_name || "tbd").toLowerCase();
}

export function fixtureMatchupShort(fixture) {
  return `${sideShortLabel(fixture.home)} v ${sideShortLabel(fixture.away)}`;
}

function teamRank(team) {
  const rank = team?.fifa_rank;
  return typeof rank === "number" ? rank : 9999;
}

function fixtureRankSortKey(fixture) {
  const homeRank = teamRank(fixture.home);
  const awayRank = teamRank(fixture.away);
  return [Math.min(homeRank, awayRank), Math.max(homeRank, awayRank)];
}

/** Highest-profile matches first — best (lowest) FIFA rank in the fixture wins. */
export function sortFixturesByRank(fixtures) {
  return [...fixtures].sort((a, b) => {
    const keyA = fixtureRankSortKey(a);
    const keyB = fixtureRankSortKey(b);
    for (let index = 0; index < keyA.length; index += 1) {
      if (keyA[index] !== keyB[index]) return keyA[index] - keyB[index];
    }
    return (a.kickoff_utc || "").localeCompare(b.kickoff_utc || "");
  });
}

export function teamsFromFixtures(fixtures) {
  const byCode = new Map();
  for (const fixture of fixtures) {
    for (const side of [fixture.home, fixture.away]) {
      if (side?.fifa_code) byCode.set(side.fifa_code, side);
    }
  }
  return [...byCode.values()].sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export function getTeamFilterFromUrl() {
  return new URLSearchParams(window.location.search).get("team");
}

export function setTeamFilterInUrl(fifaCode) {
  const url = new URL(window.location.href);
  if (fifaCode) url.searchParams.set("team", fifaCode);
  else url.searchParams.delete("team");
  window.history.replaceState({}, "", url);
}

export function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month: month - 1, day };
}

export function buildMonthGrid(year, monthIndex) {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ type: "pad", key: `pad-start-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ type: "day", day, key });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ type: "pad", key: `pad-end-${cells.length}` });
  }
  return cells;
}

export function initialViewMonth(fixtures, teamFilter) {
  const byDay = groupFixturesByDay(fixtures);
  const todayKey = ukDateKey(new Date().toISOString());
  const keys = [...byDay.keys()].sort();

  if (teamFilter) {
    const teamKeys = keys.filter((key) =>
      byDay.get(key).some((fixture) => fixtureInvolvesTeam(fixture, teamFilter)),
    );
    const upcoming = teamKeys.find((key) => key >= todayKey);
    const chosen = upcoming || teamKeys[0];
    if (chosen) return parseDateKey(chosen);
  }

  if (todayKey && keys.includes(todayKey)) {
    return parseDateKey(todayKey);
  }
  if (keys.length) return parseDateKey(keys[0]);
  return { year: 2026, month: 5, day: 1 };
}

export function initialSelectedDay(fixtures, teamFilter, viewMonth) {
  const byDay = groupFixturesByDay(fixtures);
  const todayKey = ukDateKey(new Date().toISOString());
  const monthPrefix = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}`;

  const monthKeys = [...byDay.keys()]
    .filter((key) => key.startsWith(monthPrefix))
    .sort();

  if (teamFilter) {
    const teamKeys = monthKeys.filter((key) =>
      byDay.get(key).some((fixture) => fixtureInvolvesTeam(fixture, teamFilter)),
    );
    const upcoming = teamKeys.find((key) => key >= todayKey);
    return upcoming || teamKeys[0] || monthKeys[0] || null;
  }

  if (todayKey?.startsWith(monthPrefix) && byDay.has(todayKey)) return todayKey;
  return monthKeys[0] || null;
}
