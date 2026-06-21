import { flagUrl } from "../lib/data";
import { copy } from "../lib/labels";
import { isTeamEliminated } from "../lib/teamStats";

export function TeamFlag({ team, onSelect, size = 28, showName = true, fetchPriority }) {
  const eliminated = isTeamEliminated(team);

  return (
    <button
      type="button"
      className={`flag-btn${showName ? " flag-btn--with-name" : ""}${eliminated ? " flag-btn--out" : ""}`}
      onClick={() => onSelect(team)}
      aria-label={`${team.display_name}, ${copy.worldRankingLong(team.fifa_rank)}`}
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
