export function FixtureToolbar({ teams, teamFilter, onTeamFilterChange }) {
  return (
    <div className="fixture-toolbar">
      <label className="fixture-toolbar__filter">
        <span className="fixture-toolbar__label">Team</span>
        <select
          className="fixture-toolbar__select"
          value={teamFilter || ""}
          onChange={(event) => onTeamFilterChange(event.target.value || null)}
          aria-label="Filter fixtures by team"
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.fifa_code} value={team.fifa_code}>
              {team.display_name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
