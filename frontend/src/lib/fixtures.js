import { placeholderLabel } from "./placeholderLabels.js";
import { formatHouseLabel } from "./format.js";

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

export function formatFixtureDateUk(utcValue) {
  if (!utcValue) return null;
  const date = new Date(utcValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    timeZone: UK_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
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

export function fixtureInvolvesAnyTeam(fixture, fifaCodes) {
  const codes = fifaCodes instanceof Set ? fifaCodes : new Set((fifaCodes || []).filter(Boolean));
  if (!codes.size) return true;
  return codes.has(fixture.home?.fifa_code) || codes.has(fixture.away?.fifa_code);
}

export function buildHouseFixtureList(fixtures, teams) {
  const teamCodes = new Set((teams || []).map((team) => team.fifa_code).filter(Boolean));
  if (!teamCodes.size) return [];

  return (fixtures || [])
    .filter((fixture) => fixtureInvolvesAnyTeam(fixture, teamCodes))
    .sort((a, b) => (a.kickoff_utc || "").localeCompare(b.kickoff_utc || ""));
}

export function fixtureInvolvesHouse(fixture, houseId) {
  if (!houseId) return true;
  return fixture.home?.house_id === houseId || fixture.away?.house_id === houseId;
}

function sideShortLabel(team) {
  if (!team) return "tbd";
  if (team.fifa_code) return team.fifa_code.toLowerCase();
  if (team.status === "placeholder") return placeholderLabel(team.draw_name || team.display_name).toLowerCase();
  return (team.display_name || team.draw_name || "tbd").toLowerCase();
}

export function fixtureMatchupShort(fixture) {
  return `${sideShortLabel(fixture.home)} v ${sideShortLabel(fixture.away)}`;
}

export function fixtureSideHouseLabel(team, { compact = false } = {}) {
  if (!team?.house_id) return "TBD";
  if (compact && team.house_id === "Coppice") return "c";
  return formatHouseLabel(team.house_id);
}

export function fixtureHouseMatchupShort(fixture, options) {
  return `${fixtureSideHouseLabel(fixture.home, options)} v ${fixtureSideHouseLabel(fixture.away, options)}`;
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

export function housesFromFixtures(fixtures) {
  const ids = new Set();
  for (const fixture of fixtures) {
    for (const side of [fixture.home, fixture.away]) {
      if (side?.house_id) ids.add(side.house_id);
    }
  }
  return [...ids].sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return String(a).localeCompare(String(b));
  });
}

export function getTeamFilterFromUrl() {
  return new URLSearchParams(window.location.search).get("team");
}

export function getHouseFilterFromUrl() {
  return new URLSearchParams(window.location.search).get("house");
}

export function setTeamFilterInUrl(fifaCode) {
  setFixtureFiltersInUrl({ team: fifaCode, house: null });
}

export function setFixtureFiltersInUrl({ team, house }) {
  const url = new URL(window.location.href);
  if (team) url.searchParams.set("team", team);
  else url.searchParams.delete("team");
  if (house) url.searchParams.set("house", house);
  else url.searchParams.delete("house");
  window.history.replaceState({}, "", url);
}

export function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month: month - 1, day };
}

const TOURNAMENT_START = { year: 2026, month: 5, day: 1 };
const TOURNAMENT_END = { year: 2026, month: 6, day: 31 };

export function todayDateKey() {
  return ukDateKey(new Date().toISOString());
}

/** Unplayed fixtures kicking off later today (UK), sorted by kickoff. */
export function getTodaysUpcomingFixtures(fixtures, { now = new Date() } = {}) {
  const todayKey = ukDateKey(now.toISOString());
  if (!todayKey) return [];

  const nowIso = now.toISOString();

  return (fixtures || [])
    .filter((fixture) => {
      if (fixture.played) return false;
      if (ukDateKey(fixture.kickoff_utc) !== todayKey) return false;
      if (fixture.kickoff_utc && fixture.kickoff_utc < nowIso) return false;
      return true;
    })
    .sort((a, b) => (a.kickoff_utc || "").localeCompare(b.kickoff_utc || ""));
}

function todayParts() {
  const key = todayDateKey();
  if (!key) return { ...TOURNAMENT_START };
  return parseDateKey(key);
}

function clampViewMonth(parts) {
  if (parts.year < TOURNAMENT_START.year) return { ...TOURNAMENT_START };
  if (parts.year > TOURNAMENT_END.year) return { year: TOURNAMENT_END.year, month: TOURNAMENT_END.month, day: 1 };
  if (parts.year === TOURNAMENT_START.year && parts.month < TOURNAMENT_START.month) {
    return { ...TOURNAMENT_START };
  }
  if (parts.year === TOURNAMENT_END.year && parts.month > TOURNAMENT_END.month) {
    return { year: TOURNAMENT_END.year, month: TOURNAMENT_END.month, day: 1 };
  }
  return parts;
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

export function initialViewMonth(fixtures, teamFilter, fixtureFilter) {
  const byDay = groupFixturesByDay(fixtures);
  const todayKey = todayDateKey();
  const keys = [...byDay.keys()].sort();

  if (teamFilter || fixtureFilter) {
    const teamKeys = keys.filter((key) =>
      byDay.get(key).some((fixture) =>
        fixtureFilter ? fixtureFilter(fixture) : fixtureInvolvesTeam(fixture, teamFilter),
      ),
    );
    const upcoming = teamKeys.find((key) => key >= todayKey);
    if (upcoming) return parseDateKey(upcoming);
  }

  return clampViewMonth(todayParts());
}

export function initialSelectedDay(fixtures, teamFilter, viewMonth, fixtureFilter) {
  const byDay = groupFixturesByDay(fixtures);
  const todayKey = todayDateKey();
  const monthPrefix = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}`;

  const monthKeys = [...byDay.keys()]
    .filter((key) => key.startsWith(monthPrefix))
    .sort();

  if (teamFilter || fixtureFilter) {
    const teamKeys = monthKeys.filter((key) =>
      byDay.get(key).some((fixture) =>
        fixtureFilter ? fixtureFilter(fixture) : fixtureInvolvesTeam(fixture, teamFilter),
      ),
    );
    const upcoming = teamKeys.find((key) => key >= todayKey);
    if (upcoming) return upcoming;
    if (teamKeys[0]) return teamKeys[0];
  }

  if (todayKey?.startsWith(monthPrefix)) {
    if (byDay.get(todayKey)?.length) return todayKey;
    const upcoming = monthKeys.find((key) => key >= todayKey);
    if (upcoming) return upcoming;
  }

  return monthKeys[0] || null;
}
