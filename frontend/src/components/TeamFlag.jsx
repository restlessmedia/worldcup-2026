import { flagUrl } from "../lib/data";

export function TeamFlag({ team, onSelect, size = 28, showName = true }) {
  const eliminated = team.status === "eliminated";

  return (
    <button
      type="button"
      className={`flag-btn${showName ? " flag-btn--with-name" : ""}${eliminated ? " flag-btn--out" : ""}`}
      onClick={() => onSelect(team)}
      aria-label={`${team.display_name}, FIFA rank ${team.fifa_rank}`}
      title={showName ? undefined : team.display_name}
    >
      <img
        src={flagUrl(team.fifa_code)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
      />
      {showName ? <span className="flag-btn__name">{team.display_name}</span> : null}
    </button>
  );
}

export function TeamFlagRow({ teams, onSelect, showNames = true }) {
  return (
    <div className={`flag-row${showNames ? " flag-row--named" : ""}`}>
      {teams.map((team) => (
        <TeamFlag key={team.fifa_code} team={team} onSelect={onSelect} showName={showNames} />
      ))}
    </div>
  );
}
