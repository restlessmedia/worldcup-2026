import { useEffect, useMemo, useState } from "react";
import { FixtureCalendar } from "./components/FixtureCalendar";
import { FixtureDayPanel } from "./components/FixtureDayPanel";
import { FixtureToolbar } from "./components/FixtureToolbar";
import { TeamModal } from "./components/TeamModal";
import { Card, ErrorMessage, Layout, LoadingMessage } from "./components/Layout";
import { loadJson } from "./lib/data";
import { resolveSiteUpdatedAt } from "./lib/format";
import {
  buildMonthGrid,
  buildHouseFixtureList,
  fixtureInvolvesAnyTeam,
  getHouseFilterFromUrl,
  adjacentMatchDayKey,
  groupFixturesByDay,
  initialSelectedDay,
  initialViewMonth,
  parseDateKey,
  setHouseFilterInUrl,
} from "./lib/fixtures";

const FIXTURE_DISPLAY_MODES = [
  { value: "teams", label: "Teams" },
  { value: "houses", label: "House" },
  { value: "counts", label: "Matches" },
];

function FixtureDisplayControl({ value, onChange }) {
  return (
    <label className="fixture-display-control">
      <span className="fixture-display-control__label">Show</span>
      <select
        className="fixture-display-control__select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {FIXTURE_DISPLAY_MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FixturesApp() {
  const [fixturesData, setFixturesData] = useState(null);
  const [standings, setStandings] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [houseFilter, setHouseFilter] = useState(() => getHouseFilterFromUrl());
  const [fixtureDisplayMode, setFixtureDisplayMode] = useState("teams");
  const [selectedTeam, setSelectedTeam] = useState(null);

  const fixtures = fixturesData?.fixtures || [];
  const houses = standings?.houses || [];
  const selectedHouse = houses.find((house) => house.house_id === houseFilter) || null;
  const selectedHouseTeamCodes = useMemo(
    () => (selectedHouse ? selectedHouse.teams.map((team) => team.fifa_code).filter(Boolean) : []),
    [selectedHouse],
  );
  const activeFixtureFilter = useMemo(() => {
    if (!selectedHouseTeamCodes.length) return null;
    const codeSet = new Set(selectedHouseTeamCodes);
    return (fixture) => fixtureInvolvesAnyTeam(fixture, codeSet);
  }, [selectedHouseTeamCodes]);
  const fixturesByDay = useMemo(() => groupFixturesByDay(fixtures), [fixtures]);

  const [viewMonth, setViewMonth] = useState(() => initialViewMonth(fixtures));
  const [selectedDay, setSelectedDay] = useState(() => {
    const month = initialViewMonth([]);
    return initialSelectedDay([], month);
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [fixturesPayload, standingsPayload, metaPayload] = await Promise.all([
          loadJson("fixtures.json"),
          loadJson("standings.json"),
          loadJson("meta.json"),
        ]);
        if (cancelled) return;
        setFixturesData(fixturesPayload);
        setStandings(standingsPayload);
        setMeta(metaPayload);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fixtures.length) return;
    const month = initialViewMonth(fixtures, activeFixtureFilter);
    setViewMonth(month);
    setSelectedDay(initialSelectedDay(fixtures, month, activeFixtureFilter));
  }, [fixtures, activeFixtureFilter]);

  useEffect(() => {
    function onPopState() {
      setHouseFilter(getHouseFilterFromUrl());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const filteredFixtures = useMemo(() => {
    if (selectedHouse) return buildHouseFixtureList(fixtures, selectedHouse.teams);
    return fixtures;
  }, [fixtures, selectedHouse]);

  const filteredByDay = useMemo(() => groupFixturesByDay(filteredFixtures), [filteredFixtures]);

  const grid = useMemo(
    () => buildMonthGrid(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month],
  );

  const highlightCodes = selectedHouseTeamCodes;
  const highlightLabel = selectedHouse ? "house team" : null;

  function applyHouseFilter(houseId) {
    setHouseFilter(houseId);
    setHouseFilterInUrl(houseId);
  }

  function shiftMonth(delta) {
    setViewMonth((current) => {
      const nextMonth = current.month + delta;
      const next = {
        year: current.year + (nextMonth < 0 ? -1 : nextMonth > 11 ? 1 : 0),
        month: ((nextMonth % 12) + 12) % 12,
        day: 1,
      };
      setSelectedDay(initialSelectedDay(fixtures, next, activeFixtureFilter));
      return next;
    });
  }

  const dayNavigationByDay = selectedHouse ? filteredByDay : fixturesByDay;
  const prevDayKey = adjacentMatchDayKey(dayNavigationByDay, selectedDay, -1);
  const nextDayKey = adjacentMatchDayKey(dayNavigationByDay, selectedDay, 1);

  function selectDay(dayKey) {
    if (!dayKey) return;
    setSelectedDay(dayKey);
    const parts = parseDateKey(dayKey);
    setViewMonth((current) => {
      if (current.year === parts.year && current.month === parts.month) return current;
      return { year: parts.year, month: parts.month, day: parts.day };
    });
  }

  const dayFixtures = selectedDay
    ? (selectedHouse ? filteredByDay : fixturesByDay).get(selectedDay) || []
    : [];

  if (loading) {
    return (
      <Layout title="World Cup 2026 sweepstake" activeNav="fixtures">
        <LoadingMessage />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="World Cup 2026 sweepstake" activeNav="fixtures">
        <ErrorMessage message={error} />
      </Layout>
    );
  }

  return (
    <Layout
      title="World Cup 2026 sweepstake"
      tagline={`${fixturesData.fixture_count} matches · times shown in UK (GMT/BST)`}
      updatedAt={resolveSiteUpdatedAt({ meta, standings: fixturesData })}
      activeNav="fixtures"
      footer={
        <p>
          Fixtures from{" "}
          <a href={fixturesData.source_url} target="_blank" rel="noopener noreferrer">
            fifa.com
          </a>
          . Re-fetch with <code>python scripts/fetch_fifa_fixtures.py</code> if schedules change.
        </p>
      }
    >
      <Card className="card--fixtures">
        <div className="fixture-card__head">
          <h2>Fixture calendar</h2>
          <div className="fixture-card__controls">
            <FixtureToolbar
              houses={houses}
              houseFilter={houseFilter}
              onHouseFilterChange={applyHouseFilter}
            />
            <FixtureDisplayControl
              value={fixtureDisplayMode}
              onChange={setFixtureDisplayMode}
            />
          </div>
        </div>

        <FixtureCalendar
          year={viewMonth.year}
          month={viewMonth.month}
          grid={grid}
          fixturesByDay={filteredByDay}
          selectedDay={selectedDay}
          highlightCodes={highlightCodes}
          displayMode={fixtureDisplayMode}
          onSelectDay={selectDay}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
        />

        <FixtureDayPanel
          dayKey={selectedDay}
          fixtures={dayFixtures}
          highlightCodes={highlightCodes}
          highlightLabel={highlightLabel}
          displayMode={fixtureDisplayMode}
          prevDayKey={prevDayKey}
          nextDayKey={nextDayKey}
          onPrevDay={() => selectDay(prevDayKey)}
          onNextDay={() => selectDay(nextDayKey)}
          onSelectTeam={setSelectedTeam}
        />
      </Card>

      <TeamModal
        team={selectedTeam}
        standings={standings}
        onClose={() => setSelectedTeam(null)}
      />
    </Layout>
  );
}
