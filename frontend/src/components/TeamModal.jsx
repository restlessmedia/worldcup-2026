import { useEffect } from "react";
import { flagUrl } from "../lib/data";
import { formatHouseLabel } from "../lib/format";

function DetailRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
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
    team.status === "eliminated" ? "Eliminated" : team.status === "alive" ? "In play" : team.status;

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
              <p className="modal-subtitle">Draw name: {team.draw_name}</p>
            ) : null}
          </div>
        </div>

        <dl className="modal-details">
          <DetailRow label="FIFA ranking" value={`#${team.fifa_rank}`} />
          <DetailRow label="Group" value={team.group} />
          <DetailRow label="House" value={team.house_id ? formatHouseLabel(team.house_id) : null} />
          <DetailRow label="Status" value={status} />
          <DetailRow label="Goals conceded" value={String(team.goals_conceded ?? 0)} />
          {team.fair_play_points != null ? (
            <DetailRow label="Fair play points" value={String(team.fair_play_points)} />
          ) : null}
          {team.position != null ? (
            <DetailRow label="Wooden spoon position" value={String(team.position)} />
          ) : null}
        </dl>
      </div>
    </div>
  );
}
