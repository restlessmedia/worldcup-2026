import { useEffect } from "react";
import { flagUrl } from "../lib/data";
import { formatHouseLabel } from "../lib/format";
import { copy } from "../lib/labels";

function DetailRow({ label, value, hint }) {
  if (value == null || value === "") return null;
  return (
    <>
      <dt title={hint || undefined}>{label}</dt>
      <dd title={hint || undefined}>{value}</dd>
    </>
  );
}

export function TeamModal({ team, onClose }) {
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

  if (!team) return null;

  const status =
    team.status === "eliminated"
      ? "Eliminated from the World Cup"
      : team.status === "alive"
        ? "Still in the tournament"
        : team.status;

  return (
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
          <img src={flagUrl(team.fifa_code)} alt="" width="48" height="48" />
          <div>
            <h3 id="team-modal-title">{team.display_name}</h3>
            {team.draw_name && team.draw_name !== team.display_name ? (
              <p className="modal-subtitle">Name in the draw: {team.draw_name}</p>
            ) : null}
          </div>
        </div>

        <dl className="modal-details">
          <DetailRow
            label="World ranking"
            value={copy.worldRankingLong(team.fifa_rank)}
            hint="FIFA world ranking — lower number means a stronger team"
          />
          <DetailRow
            label="World Cup group"
            value={team.group ? `Group ${team.group}` : null}
            hint="Group stage letter in the World Cup"
          />
          <DetailRow
            label="Sweepstake house"
            value={team.house_id ? formatHouseLabel(team.house_id) : null}
          />
          <DetailRow label="Tournament status" value={status} />
          <DetailRow
            label="Goals conceded"
            value={copy.goalsConcededCount(team.goals_conceded ?? 0)}
            hint="Total goals scored against this team so far"
          />
          {team.fair_play_points != null ? (
            <DetailRow
              label="Fair play points"
              value={String(team.fair_play_points)}
              hint="Disciplinary points — used for the fair play side prize"
            />
          ) : null}
          {team.position != null ? (
            <DetailRow
              label="Wooden spoon position"
              value={String(team.position)}
              hint="Position in the most-goals-conceded league table"
            />
          ) : null}
        </dl>
      </div>
    </div>
  );
}
