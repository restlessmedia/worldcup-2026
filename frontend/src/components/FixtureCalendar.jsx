import { useEffect, useRef } from "react";
import { flagUrl } from "../lib/data";
import {
  fixtureHouseMatchupShort,
  fixtureInvolvesAnyTeam,
  fixtureMatchupShort,
  fixtureSideHouseLabel,
  formatMonthYear,
  sortFixturesByRank,
  todayDateKey,
} from "../lib/fixtures";
import { placeholderLabel } from "../lib/placeholderLabels";
import { FlagPlaceholder } from "./FlagPlaceholder";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAL_FLAG_SIZE = 26;
const MAX_MATCHUPS_IN_CELL = 2;

function CalendarSideFlag({ team }) {
  if (team?.fifa_code) {
    return (
      <img
        src={flagUrl(team.fifa_code)}
        alt=""
        className="fixture-calendar__flag"
        width={CAL_FLAG_SIZE}
        height={CAL_FLAG_SIZE}
        loading="lazy"
      />
    );
  }

  const label = placeholderLabel(team?.draw_name || team?.display_name);
  return <FlagPlaceholder size={CAL_FLAG_SIZE} label={label} className="fixture-calendar__flag-placeholder" />;
}

function CalendarMatchup({ fixture, highlighted }) {
  return (
    <span
      className={
        highlighted
          ? "fixture-calendar__match-flags fixture-calendar__match-flags--team"
          : "fixture-calendar__match-flags"
      }
    >
      <CalendarSideFlag team={fixture.home} />
      <span className="fixture-calendar__vs" aria-hidden="true">
        v
      </span>
      <CalendarSideFlag team={fixture.away} />
    </span>
  );
}

function CalendarHouseBadge({ team }) {
  const label = fixtureSideHouseLabel(team);
  const compactLabel = fixtureSideHouseLabel(team, { compact: true });

  if (label === compactLabel) {
    return <span className="fixture-calendar__house-badge">{label}</span>;
  }

  return (
    <span className="fixture-calendar__house-badge" title={label}>
      <span className="fixture-calendar__house-label fixture-calendar__house-label--full">{label}</span>
      <span className="fixture-calendar__house-label fixture-calendar__house-label--compact">{compactLabel}</span>
    </span>
  );
}

function CalendarHouseMatchup({ fixture, highlighted }) {
  return (
    <span
      className={
        highlighted
          ? "fixture-calendar__match-houses fixture-calendar__match-houses--team"
          : "fixture-calendar__match-houses"
      }
    >
      <CalendarHouseBadge team={fixture.home} />
      <span className="fixture-calendar__vs" aria-hidden="true">
        v
      </span>
      <CalendarHouseBadge team={fixture.away} />
    </span>
  );
}

const TOURNAMENT_START = { year: 2026, month: 5 };
const TOURNAMENT_END = { year: 2026, month: 6 };

export function FixtureCalendar({
  year,
  month,
  grid,
  fixturesByDay,
  selectedDay,
  teamFilter,
  highlightCodes,
  displayMode = "teams",
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}) {
  const atStart = year === TOURNAMENT_START.year && month === TOURNAMENT_START.month;
  const atEnd = year === TOURNAMENT_END.year && month === TOURNAMENT_END.month;
  const todayKey = todayDateKey();
  const currentDisplayMode = displayMode === "houses" ? "houses" : "teams";
  const scrollRef = useRef(null);
  const selectedDayRef = useRef(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const dayEl = selectedDayRef.current;
    if (!selectedDay || !scrollEl || !dayEl) return;

    const targetLeft = dayEl.offsetLeft - (scrollEl.clientWidth - dayEl.offsetWidth) / 2;
    scrollEl.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  }, [selectedDay, year, month]);

  return (
    <div className="fixture-calendar">
      <div className="fixture-calendar__nav">
        <button
          type="button"
          className="fixture-calendar__nav-btn"
          onClick={onPrevMonth}
          disabled={atStart}
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="fixture-calendar__month">{formatMonthYear(year, month)}</h3>
        <button
          type="button"
          className="fixture-calendar__nav-btn"
          onClick={onNextMonth}
          disabled={atEnd}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="fixture-calendar__grid-scroll" ref={scrollRef}>
        <div className="fixture-calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((label) => (
            <span key={label} className="fixture-calendar__weekday">
              {label}
            </span>
          ))}
        </div>

        <div className="fixture-calendar__grid" role="grid" aria-label={`Fixtures for ${formatMonthYear(year, month)}`}>
          {grid.map((cell) => {
            if (cell.type === "pad") {
              return <div key={cell.key} className="fixture-calendar__pad" role="presentation" />;
            }

            const dayFixtures = fixturesByDay.get(cell.key) || [];
            const previewFixtures = sortFixturesByRank(dayFixtures);
            const hasMatches = dayFixtures.length > 0;
            const highlightCodeSet = new Set(
              highlightCodes?.length ? highlightCodes : teamFilter ? [teamFilter] : [],
            );
            const highlightedMatches = highlightCodeSet.size
              ? dayFixtures.filter((fixture) => fixtureInvolvesAnyTeam(fixture, highlightCodeSet))
              : [];
            const isSelected = selectedDay === cell.key;
            const isToday = cell.key === todayKey;
            const highlightTeam = highlightedMatches.length > 0;

            let className = "fixture-calendar__day";
            if (!hasMatches) className += " fixture-calendar__day--empty";
            if (isSelected) className += " fixture-calendar__day--selected";
            if (isToday) className += " fixture-calendar__day--today";
            if (highlightTeam) className += " fixture-calendar__day--team";
            if (currentDisplayMode === "teams" && hasMatches) className += " fixture-calendar__day--flags";
            if (currentDisplayMode === "houses" && hasMatches) className += " fixture-calendar__day--houses";

            const matchupSummary = hasMatches
              ? previewFixtures
                  .map((fixture) =>
                    currentDisplayMode === "houses"
                      ? fixtureHouseMatchupShort(fixture)
                      : fixtureMatchupShort(fixture),
                  )
                  .join(", ")
              : "";

            return (
              <button
                key={cell.key}
                type="button"
                role="gridcell"
                ref={isSelected ? selectedDayRef : undefined}
                className={className}
                onClick={() => onSelectDay(cell.key)}
                disabled={!hasMatches}
                aria-pressed={isSelected}
                aria-label={
                  hasMatches
                    ? `${cell.day} ${formatMonthYear(year, month)}, ${matchupSummary}`
                    : `${cell.day} ${formatMonthYear(year, month)}, no matches`
                }
              >
                <span className="fixture-calendar__day-num">{cell.day}</span>
                {hasMatches && currentDisplayMode === "teams" ? (
                  <span className="fixture-calendar__match-flags-list" aria-hidden="true">
                    {previewFixtures.slice(0, MAX_MATCHUPS_IN_CELL).map((fixture) => {
                      const highlighted =
                        highlightCodeSet.size > 0 && fixtureInvolvesAnyTeam(fixture, highlightCodeSet);
                      return <CalendarMatchup key={fixture.id} fixture={fixture} highlighted={highlighted} />;
                    })}
                    {dayFixtures.length > MAX_MATCHUPS_IN_CELL ? (
                      <span className="fixture-calendar__match-more">
                        +{dayFixtures.length - MAX_MATCHUPS_IN_CELL} more
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {hasMatches && currentDisplayMode === "houses" ? (
                  <span className="fixture-calendar__match-houses-list" aria-hidden="true">
                    {previewFixtures.slice(0, MAX_MATCHUPS_IN_CELL).map((fixture) => {
                      const highlighted =
                        highlightCodeSet.size > 0 && fixtureInvolvesAnyTeam(fixture, highlightCodeSet);
                      return <CalendarHouseMatchup key={fixture.id} fixture={fixture} highlighted={highlighted} />;
                    })}
                    {dayFixtures.length > MAX_MATCHUPS_IN_CELL ? (
                      <span className="fixture-calendar__match-more">
                        +{dayFixtures.length - MAX_MATCHUPS_IN_CELL} more
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
