import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useStandingsLookup } from "../hooks/useStandingsLookup";
import { flagUrl } from "../lib/data";
import { formatHouseLabel } from "../lib/format";
import { copy } from "../lib/labels";
import { enrichTeamWithStandings } from "../lib/teamStats";

function DetailRow({ label, value, hint }) {
  if (value == null || value === "") return null;
  return (
    <>
      <dt title={hint || undefined}>{label}</dt>
      <dd title={hint || undefined}>{value}</dd>
    </>
  );
}

export function TeamModal({ team, standings: standingsProp, onClose }) {
  const loadedStandings = useStandingsLookup();
  const standings = standingsProp ?? loadedStandings;
  const enrichedTeam = useMemo(
    () => enrichTeamWithStandings(team, standings),
    [team, standings],
  );

  useEffect(() => {
    if (!team) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [team, onClose]);

  if (!enrichedTeam) return null;

  const status =
    enrichedTeam.status === "eliminated"
      ? "Eliminated from the World Cup"
      : enrichedTeam.status === "alive"
        ? "Still in the tournament"
        : enrichedTeam.status;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="modal-header">
          <img
            src={flagUrl(enrichedTeam.fifa_code)}
            alt=""
            width="48"
            height="48"
            fetchPriority="high"
          />
          <div>
            <h3 id="team-modal-title">{enrichedTeam.display_name}</h3>
            {enrichedTeam.draw_name && enrichedTeam.draw_name !== enrichedTeam.display_name ? (
              <p className="modal-subtitle">Name in the draw: {enrichedTeam.draw_name}</p>
            ) : null}
          </div>
        </div>

        <dl className="modal-details">
          <DetailRow
            label="World ranking"
            value={copy.worldRankingLong(enrichedTeam.fifa_rank)}
            hint="FIFA world ranking — lower number means a stronger team"
          />
          <DetailRow
            label="World Cup group"
            value={enrichedTeam.group ? `Group ${enrichedTeam.group}` : null}
            hint="Group stage letter in the World Cup"
          />
          <DetailRow
            label="Sweepstake house"
            value={enrichedTeam.house_id ? formatHouseLabel(enrichedTeam.house_id) : null}
          />
          <DetailRow label="Tournament status" value={status} />
          <DetailRow
            label="Goals conceded"
            value={copy.goalsConcededCount(enrichedTeam.goals_conceded ?? 0)}
            hint="Total goals scored against this team so far"
          />
          {enrichedTeam.fair_play_points != null ? (
            <DetailRow
              label="Fair play points"
              value={String(enrichedTeam.fair_play_points)}
              hint="Disciplinary points — used for the fair play side prize"
            />
          ) : null}
          {enrichedTeam.position != null ? (
            <DetailRow
              label="Wooden spoon position"
              value={String(enrichedTeam.position)}
              hint="Position in the most-goals-conceded league table"
            />
          ) : null}
        </dl>

        {enrichedTeam.fifa_code ? (
          <p className="modal-actions">
            <a
              href={
                enrichedTeam.house_id
                  ? `fixtures.html?house=${encodeURIComponent(enrichedTeam.house_id)}`
                  : "fixtures.html"
              }
            >
              View fixtures
            </a>
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
