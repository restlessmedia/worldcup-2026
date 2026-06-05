import { useEffect, useMemo, useState } from "react";
import { FixtureCalendar } from "./components/FixtureCalendar";
import { FixtureDayPanel } from "./components/FixtureDayPanel";
import { FixtureToolbar } from "./components/FixtureToolbar";
import { ToggleSwitch } from "./components/ToggleSwitch";
import { TeamModal } from "./components/TeamModal";
import { Card, ErrorMessage, Layout, LoadingMessage } from "./components/Layout";
import { loadJson } from "./lib/data";
import { resolveSiteUpdatedAt } from "./lib/format";
import {
  buildMonthGrid,
  fixtureInvolvesTeam,
  getTeamFilterFromUrl,
  groupFixturesByDay,
  initialSelectedDay,
  initialViewMonth,
  setTeamFilterInUrl,
  teamsFromFixtures,
} from "./lib/fixtures";

export function FixturesApp() {
  const [fixturesData, setFixturesData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState(() => getTeamFilterFromUrl());
  const [showTeams, setShowTeams] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const fixtures = fixturesData?.fixtures || [];
  const fixturesByDay = useMemo(() => groupFixturesByDay(fixtures), [fixtures]);

  const [viewMonth, setViewMonth] = useState(() => initialViewMonth(fixtures, teamFilter));
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [fixturesPayload, metaPayload] = await Promise.all([
          loadJson("fixtures.json"),
          loadJson("meta.json"),
        ]);
        if (cancelled) return;
        setFixturesData(fixturesPayload);
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
    const month = initialViewMonth(fixtures, teamFilter);
    setViewMonth(month);
    setSelectedDay(initialSelectedDay(fixtures, teamFilter, month));
  }, [fixtures, teamFilter]);

  useEffect(() => {
    function onPopState() {
      setTeamFilter(getTeamFilterFromUrl());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const filteredFixtures = useMemo(() => {
    if (!teamFilter) return fixtures;
    return fixtures.filter((fixture) => fixtureInvolvesTeam(fixture, teamFilter));
  }, [fixtures, teamFilter]);

  const filteredByDay = useMemo(() => groupFixturesByDay(filteredFixtures), [filteredFixtures]);

  const grid = useMemo(
    () => buildMonthGrid(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month],
  );

  const teams = useMemo(() => teamsFromFixtures(fixtures), [fixtures]);

  function applyTeamFilter(fifaCode) {
    setTeamFilter(fifaCode);
    setTeamFilterInUrl(fifaCode);
  }

  function shiftMonth(delta) {
    setViewMonth((current) => {
      const nextMonth = current.month + delta;
      const next = {
        year: current.year + (nextMonth < 0 ? -1 : nextMonth > 11 ? 1 : 0),
        month: ((nextMonth % 12) + 12) % 12,
        day: 1,
      };
      setSelectedDay(initialSelectedDay(fixtures, teamFilter, next));
      return next;
    });
  }

  const dayFixtures = selectedDay ? fixturesByDay.get(selectedDay) || [] : [];

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
              teams={teams}
              teamFilter={teamFilter}
              onTeamFilterChange={applyTeamFilter}
            />
            <ToggleSwitch
              id="fixture-show-teams"
              label="Show teams"
              checked={showTeams}
              onChange={setShowTeams}
            />
          </div>
        </div>

        <FixtureCalendar
          year={viewMonth.year}
          month={viewMonth.month}
          grid={grid}
          fixturesByDay={filteredByDay}
          selectedDay={selectedDay}
          teamFilter={teamFilter}
          showTeams={showTeams}
          onSelectDay={setSelectedDay}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
        />

        <FixtureDayPanel
          dayKey={selectedDay}
          fixtures={dayFixtures}
          teamFilter={teamFilter}
          onSelectTeam={setSelectedTeam}
        />
      </Card>

      <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
    </Layout>
  );
}
