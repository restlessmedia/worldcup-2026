import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  buildHouseFixtureList,
  formatFixtureDateUk,
  formatKickoffUk,
} from "../lib/fixtures";
import { formatHouseLabel } from "../lib/format";
import { roundLabels } from "../lib/labels";
import { teamDisplayName } from "../lib/placeholderLabels";

function stageLabel(fixture) {
  if (fixture.stage === "group" && fixture.group) {
    return `Group ${fixture.group}`;
  }
  return roundLabels[fixture.stage]?.label || fixture.stage_label || fixture.stage || "Fixture";
}

function scoreLine(fixture) {
  if (!fixture.played) return null;
  return `${fixture.home_score} - ${fixture.away_score}`;
}

function teamCodes(teams) {
  return new Set((teams || []).map((team) => team.fifa_code).filter(Boolean));
}

function groupByDate(fixtures) {
  const groups = [];
  for (const fixture of fixtures) {
    const label = formatFixtureDateUk(fixture.kickoff_utc) || "Date to be confirmed";
    const current = groups[groups.length - 1];
    if (current?.label === label) {
      current.fixtures.push(fixture);
    } else {
      groups.push({ label, fixtures: [fixture] });
    }
  }
  return groups;
}

function MatchSide({ team, highlighted }) {
  const name = teamDisplayName(team);

  return (
    <span
      className={highlighted ? "house-fixture__team house-fixture__team--house" : "house-fixture__team"}
      aria-label={highlighted ? `${name} (house team)` : undefined}
    >
      {highlighted ? <span className="house-fixture__house-dot" aria-hidden="true" /> : null}
      <span>{name}</span>
    </span>
  );
}

function FixtureItem({ fixture, houseTeamCodes }) {
  const kickoff = formatKickoffUk(fixture.kickoff_utc) || "Time TBC";
  const score = scoreLine(fixture);

  return (
    <article className="house-fixture">
      <div className="house-fixture__time">
        <time dateTime={fixture.kickoff_utc}>{kickoff}</time>
        <span>{stageLabel(fixture)}</span>
      </div>
      <div className="house-fixture__match">
        <MatchSide team={fixture.home} highlighted={houseTeamCodes.has(fixture.home?.fifa_code)} />
        <span className="house-fixture__vs">{score || "vs"}</span>
        <MatchSide team={fixture.away} highlighted={houseTeamCodes.has(fixture.away?.fifa_code)} />
      </div>
      {fixture.venue ? <p className="house-fixture__venue">{fixture.venue}</p> : null}
    </article>
  );
}

export function HouseFixturesModal({ house, fixtures, onClose }) {
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!house) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [house, onClose]);

  const houseFixtures = useMemo(
    () => buildHouseFixtureList(fixtures, house?.teams),
    [fixtures, house],
  );
  const groupedFixtures = useMemo(() => groupByDate(houseFixtures), [houseFixtures]);
  const houseCodes = useMemo(() => teamCodes(house?.teams), [house]);

  if (!house) return null;

  const houseLabel = formatHouseLabel(house.house_id);
  const teamNames = house.teams.map((team) => team.display_name).join(", ");

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="modal modal--house-fixtures"
        role="dialog"
        aria-modal="true"
        aria-labelledby="house-fixtures-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="modal-header modal-header--stacked">
          <div>
            <h3 id="house-fixtures-modal-title">{houseLabel} fixtures</h3>
            <p className="modal-subtitle">UK kick-off times for {teamNames}</p>
          </div>
        </div>

        {groupedFixtures.length ? (
          <div className="house-fixture-groups">
            {groupedFixtures.map((group) => (
              <section key={group.label} className="house-fixture-group">
                <h4>{group.label}</h4>
                <div className="house-fixture-group__list">
                  {group.fixtures.map((fixture) => (
                    <FixtureItem
                      key={fixture.id}
                      fixture={fixture}
                      houseTeamCodes={houseCodes}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="empty-note">No fixtures found for these teams yet.</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
