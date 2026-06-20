import { formatHouseLabel } from "../lib/format";

export function FixtureToolbar({
  teams,
  teamFilter,
  onTeamFilterChange,
  houses,
  houseFilter,
  onHouseFilterChange,
}) {
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
      <label className="fixture-toolbar__filter">
        <span className="fixture-toolbar__label">House</span>
        <select
          className="fixture-toolbar__select fixture-toolbar__select--house"
          value={houseFilter || ""}
          onChange={(event) => onHouseFilterChange(event.target.value || null)}
          aria-label="Filter fixtures by house"
        >
          <option value="">All houses</option>
          {houses.map((house) => (
            <option key={house.house_id} value={house.house_id}>
              {formatHouseLabel(house.house_id)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
