import { formatKickoffUk } from "../lib/fixtures";
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

function FixtureRow({ fixture, onSelectTeam, highlightCode }) {
  const kickoff = formatKickoffUk(fixture.kickoff_utc);
  const score = scoreLine(fixture);

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
        <div
          className={`fixture-row__side${highlightCode && fixture.home?.fifa_code === highlightCode ? " fixture-row__side--highlight" : ""}`}
        >
          {fixture.home?.fifa_code ? (
            <TeamFlag team={fixture.home} onSelect={onSelectTeam} size={24} showName={false} />
          ) : (
            <span className="fixture-row__placeholder" aria-hidden="true" />
          )}
          <span className="fixture-row__name">{teamDisplayName(fixture.home)}</span>
        </div>

        <span className="fixture-row__score" aria-label={score ? `Score ${score}` : "Kick-off time"}>
          {score || kickoff}
        </span>

        <div
          className={`fixture-row__side fixture-row__side--away${highlightCode && fixture.away?.fifa_code === highlightCode ? " fixture-row__side--highlight" : ""}`}
        >
          {fixture.away?.fifa_code ? (
            <TeamFlag team={fixture.away} onSelect={onSelectTeam} size={24} showName={false} />
          ) : (
            <span className="fixture-row__placeholder" aria-hidden="true" />
          )}
          <span className="fixture-row__name">{teamDisplayName(fixture.away)}</span>
        </div>
      </div>
    </article>
  );
}

export function FixtureDayPanel({ dayKey, fixtures, teamFilter, onSelectTeam }) {
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
          />
        ))}
      </div>
    </section>
  );
}
