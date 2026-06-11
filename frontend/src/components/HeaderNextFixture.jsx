import { useEffect, useMemo, useState } from "react";
import { flagUrl } from "../lib/data";
import { formatKickoffUk, getTodaysUpcomingFixtures } from "../lib/fixtures";
import { teamDisplayName } from "../lib/placeholderLabels";
import { FlagPlaceholder } from "./FlagPlaceholder";

const DISPLAY_MS = 5500;
const TRANSITION_MS = 520;
const FLAG_SIZE = 16;

function TeamSide({ team }) {
  const name = teamDisplayName(team);

  return (
    <span className="topbar-next-fixture__team">
      {team?.fifa_code ? (
        <img
          src={flagUrl(team.fifa_code)}
          alt=""
          className="topbar-next-fixture__flag"
          width={FLAG_SIZE}
          height={FLAG_SIZE}
          loading="lazy"
        />
      ) : (
        <FlagPlaceholder
          size={FLAG_SIZE}
          label={name}
          className="topbar-next-fixture__flag-placeholder"
        />
      )}
      <span className="topbar-next-fixture__team-name">{name}</span>
    </span>
  );
}

function FixtureLine({ fixture }) {
  const kickoff = formatKickoffUk(fixture.kickoff_utc);

  return (
    <>
      <span className="topbar-next-fixture__label">Next</span>
      <time className="topbar-next-fixture__time" dateTime={fixture.kickoff_utc}>
        {kickoff}
      </time>
      <span className="topbar-next-fixture__sep" aria-hidden="true">
        ·
      </span>
      <span className="topbar-next-fixture__matchup">
        <TeamSide team={fixture.home} />
        <span className="topbar-next-fixture__vs" aria-hidden="true">
          v
        </span>
        <TeamSide team={fixture.away} />
      </span>
    </>
  );
}

export function HeaderNextFixture({ fixtures }) {
  const upcoming = useMemo(() => getTodaysUpcomingFixtures(fixtures), [fixtures]);
  const upcomingKey = useMemo(
    () => upcoming.map((fixture) => fixture.id).join(","),
    [upcoming],
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    setIndex(0);
    setPhase("idle");
  }, [upcomingKey]);

  useEffect(() => {
    if (upcoming.length <= 1) return undefined;

    let displayTimer;
    let exitTimer;
    let enterTimer;

    const scheduleNext = () => {
      displayTimer = window.setTimeout(() => {
        setPhase("exit");
        exitTimer = window.setTimeout(() => {
          setIndex((current) => (current + 1) % upcoming.length);
          setPhase("enter");
          enterTimer = window.setTimeout(() => {
            setPhase("idle");
            scheduleNext();
          }, TRANSITION_MS);
        }, TRANSITION_MS);
      }, DISPLAY_MS);
    };

    scheduleNext();

    return () => {
      window.clearTimeout(displayTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(enterTimer);
    };
  }, [upcomingKey, upcoming.length]);

  if (!upcoming.length) return null;

  const fixture = upcoming[index] ?? upcoming[0];
  const phaseClass = phase === "idle" ? "" : ` topbar-next-fixture__item--${phase}`;

  return (
    <p className="topbar-next-fixture" aria-live="polite">
      <span className="topbar-next-fixture__viewport">
        <span
          key={fixture.id}
          className={`topbar-next-fixture__item${phaseClass}`}
        >
          <FixtureLine fixture={fixture} />
        </span>
      </span>
    </p>
  );
}
