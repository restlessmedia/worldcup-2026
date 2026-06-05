import { flagUrl } from "../lib/data";
import { fixtureMatchupShort, formatMonthYear, sortFixturesByRank } from "../lib/fixtures";
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

  const label = team?.display_name || "TBD";
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

const TOURNAMENT_START = { year: 2026, month: 5 };
const TOURNAMENT_END = { year: 2026, month: 6 };

export function FixtureCalendar({
  year,
  month,
  grid,
  fixturesByDay,
  selectedDay,
  teamFilter,
  showTeams,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}) {
  const atStart = year === TOURNAMENT_START.year && month === TOURNAMENT_START.month;
  const atEnd = year === TOURNAMENT_END.year && month === TOURNAMENT_END.month;
  const todayKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

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

      <div className="fixture-calendar__grid-scroll">
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
          const teamMatches = teamFilter
            ? dayFixtures.filter(
                (fixture) =>
                  fixture.home?.fifa_code === teamFilter || fixture.away?.fifa_code === teamFilter,
              )
            : [];
          const isSelected = selectedDay === cell.key;
          const isToday = cell.key === todayKey;
          const highlightTeam = teamFilter && teamMatches.length > 0;

          let className = "fixture-calendar__day";
          if (!hasMatches) className += " fixture-calendar__day--empty";
          if (isSelected) className += " fixture-calendar__day--selected";
          if (isToday) className += " fixture-calendar__day--today";
          if (highlightTeam) className += " fixture-calendar__day--team";
          if (showTeams && hasMatches) className += " fixture-calendar__day--flags";
          if (!showTeams && hasMatches) className += " fixture-calendar__day--has-matches";

          const matchupSummary = hasMatches
            ? previewFixtures.map((fixture) => fixtureMatchupShort(fixture)).join(", ")
            : "";

          return (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              className={className}
              onClick={() => onSelectDay(cell.key)}
              disabled={!hasMatches}
              aria-pressed={isSelected}
              aria-label={
                hasMatches
                  ? showTeams
                    ? `${cell.day} ${formatMonthYear(year, month)}, ${matchupSummary}`
                    : `${cell.day} ${formatMonthYear(year, month)}, ${dayFixtures.length} match${dayFixtures.length === 1 ? "" : "es"}`
                  : `${cell.day} ${formatMonthYear(year, month)}, no matches`
              }
            >
              <span className="fixture-calendar__day-num">{cell.day}</span>
              {hasMatches && showTeams ? (
                <span className="fixture-calendar__match-flags-list" aria-hidden="true">
                  {previewFixtures.slice(0, MAX_MATCHUPS_IN_CELL).map((fixture) => {
                    const highlighted =
                      teamFilter &&
                      (fixture.home?.fifa_code === teamFilter || fixture.away?.fifa_code === teamFilter);
                    return <CalendarMatchup key={fixture.id} fixture={fixture} highlighted={highlighted} />;
                  })}
                  {dayFixtures.length > MAX_MATCHUPS_IN_CELL ? (
                    <span className="fixture-calendar__match-more">
                      +{dayFixtures.length - MAX_MATCHUPS_IN_CELL} more
                    </span>
                  ) : null}
                </span>
              ) : null}
              {hasMatches && !showTeams ? (
                <span className="fixture-calendar__day-matches" aria-hidden="true">
                  <span className="fixture-calendar__match-count">{dayFixtures.length}</span>
                  <span className="fixture-calendar__match-dots">
                    {previewFixtures.slice(0, 4).map((fixture) => (
                      <span
                        key={fixture.id}
                        className={
                          teamFilter &&
                          (fixture.home?.fifa_code === teamFilter || fixture.away?.fifa_code === teamFilter)
                            ? "fixture-calendar__dot fixture-calendar__dot--team"
                            : "fixture-calendar__dot"
                        }
                      />
                    ))}
                  </span>
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
