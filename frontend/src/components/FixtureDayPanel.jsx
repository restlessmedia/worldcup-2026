import { fixtureSideHouseLabel, formatKickoffUk } from "../lib/fixtures";
import { teamDisplayName } from "../lib/placeholderLabels";
import { roundLabels } from "../lib/labels";
import { TeamFlag } from "./TeamFlag";

function stageLabel(fixture) {
  if (fixture.stage === "group" && fixture.group) {
    return `Group ${fixture.group}`;
  }
  return roundLabels[fixture.stage]?.label || fixture.stage_label || fixture.stage;
}

function scoreLine(fixture) {
  if (!fixture.played) return null;
  return `${fixture.home_score} – ${fixture.away_score}`;
}

function FixtureSide({ team, onSelectTeam, highlighted, highlightLabel, displayMode, away = false }) {
  const name = teamDisplayName(team);
  const showHouse = displayMode === "houses";
  const houseLabel = showHouse ? fixtureSideHouseLabel(team) : null;
  const className = `fixture-row__side${away ? " fixture-row__side--away" : ""}${
    highlighted ? " fixture-row__side--highlight" : ""
  }${showHouse ? " fixture-row__side--house" : ""}`;
  const ariaLabel = !showHouse && highlighted && highlightLabel
    ? `${name} (${highlightLabel})`
      : undefined;

  return (
    <div className={className} aria-label={ariaLabel}>
      {showHouse ? (
        <span className="fixture-row__house-badge">
          {houseLabel}
        </span>
      ) : team?.fifa_code ? (
        <TeamFlag team={team} onSelect={onSelectTeam} size={24} showName={false} />
      ) : (
        <span className="fixture-row__placeholder" aria-hidden="true" />
      )}
      <span className="fixture-row__name">
        {highlighted ? <span className="fixture-row__highlight-dot" aria-hidden="true" /> : null}
        <span>{name}</span>
      </span>
    </div>
  );
}

function FixtureRow({ fixture, onSelectTeam, highlightCode, highlightCodes, highlightLabel, displayMode }) {
  const kickoff = formatKickoffUk(fixture.kickoff_utc);
  const score = scoreLine(fixture);
  const highlightHome = highlightCodes?.size
    ? highlightCodes.has(fixture.home?.fifa_code)
    : highlightCode && fixture.home?.fifa_code === highlightCode;
  const highlightAway = highlightCodes?.size
    ? highlightCodes.has(fixture.away?.fifa_code)
    : highlightCode && fixture.away?.fifa_code === highlightCode;

  return (
    <article className="fixture-row">
      <div className="fixture-row__meta">
        <time className="fixture-row__time" dateTime={fixture.kickoff_utc}>
          {kickoff}
        </time>
        <span className="fixture-row__stage">{stageLabel(fixture)}</span>
        {fixture.venue ? <span className="fixture-row__venue">{fixture.venue}</span> : null}
      </div>

      <div className="fixture-row__matchup">
        <FixtureSide
          team={fixture.home}
          onSelectTeam={onSelectTeam}
          highlighted={highlightHome}
          highlightLabel={highlightLabel}
          displayMode={displayMode}
        />

        <span className="fixture-row__score" aria-label={score ? `Score ${score}` : "Kick-off time"}>
          {score || kickoff}
        </span>

        <FixtureSide
          team={fixture.away}
          onSelectTeam={onSelectTeam}
          highlighted={highlightAway}
          highlightLabel={highlightLabel}
          displayMode={displayMode}
          away
        />
      </div>
    </article>
  );
}

export function FixtureDayPanel({
  dayKey,
  fixtures,
  teamFilter,
  highlightCodes,
  highlightLabel,
  displayMode = "teams",
  onSelectTeam,
}) {
  if (!dayKey) {
    return <p className="empty-note">Select a day with matches to see kick-off times.</p>;
  }

  if (!fixtures.length) {
    return <p className="empty-note">No matches on this day.</p>;
  }

  const [year, month, day] = dayKey.split("-").map(Number);
  const heading = new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const highlightCodeSet = new Set(
    highlightCodes?.length ? highlightCodes : teamFilter ? [teamFilter] : [],
  );
  const currentDisplayMode = displayMode === "houses" ? "houses" : "teams";

  return (
    <section className="fixture-day-panel" aria-labelledby="fixture-day-title">
      <h3 id="fixture-day-title" className="fixture-day-panel__title">
        {heading}
        <span className="fixture-day-panel__tz">UK time</span>
      </h3>
      <div className="fixture-day-panel__list">
        {fixtures.map((fixture) => (
          <FixtureRow
            key={fixture.id}
            fixture={fixture}
            onSelectTeam={onSelectTeam}
            highlightCode={teamFilter}
            highlightCodes={highlightCodeSet}
            highlightLabel={highlightLabel}
            displayMode={currentDisplayMode}
          />
        ))}
      </div>
    </section>
  );
}
