import { flagUrl } from "../lib/data";
import { copy } from "../lib/labels";
import { isTeamEliminated } from "../lib/teamStats";
import { EliminatedBadge } from "./EliminatedBadge";

export function TeamFlag({ team, onSelect, size = 28, showName = true, fetchPriority, showEliminatedStyle = true }) {
  const eliminated = showEliminatedStyle && isTeamEliminated(team);

  return (
    <button
      type="button"
      className={`flag-btn${showName ? " flag-btn--with-name" : ""}${eliminated ? " flag-btn--out" : ""}`}
      onClick={() => onSelect(team)}
      aria-label={
        eliminated
          ? `${team.display_name}, eliminated, ${copy.worldRankingLong(team.fifa_rank)}`
          : `${team.display_name}, ${copy.worldRankingLong(team.fifa_rank)}`
      }
      title={showName ? undefined : team.display_name}
    >
      <img
        src={flagUrl(team.fifa_code)}
        alt=""
        width={size}
        height={size}
        loading={fetchPriority === "high" ? "eager" : "lazy"}
        fetchPriority={fetchPriority}
      />
      {showName ? <span className="flag-btn__name">{team.display_name}</span> : null}
      {eliminated ? <EliminatedBadge compact={!showName} /> : null}
    </button>
  );
}

export function TeamFlagRow({ teams, onSelect, showNames = true, priorityStart = 99 }) {
  return (
    <div className={`flag-row${showNames ? " flag-row--named" : ""}`}>
      {teams.map((team, index) => {
        const globalIndex = priorityStart + index;
        const fetchPriority = globalIndex < 4 ? "high" : undefined;
        return (
          <TeamFlag
            key={team.fifa_code}
            team={team}
            onSelect={onSelect}
            showName={showNames}
            fetchPriority={fetchPriority}
          />
        );
      })}
    </div>
  );
}
