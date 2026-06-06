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
<<<<<<< HEAD
      <label className="fixture-toolbar__filter">
        <span className="fixture-toolbar__label">House</span>
        <select
          className="fixture-toolbar__select"
=======

      <label className="fixture-toolbar__filter">
        <span className="fixture-toolbar__label">House</span>
        <select
          className="fixture-toolbar__select fixture-toolbar__select--house"
>>>>>>> 9809950 (Update HTML files to reference new asset files, including updated scripts and styles for improved performance. Remove deprecated scripts and enhance the layout styles across all pages. Ensure consistent asset references and improve mobile support with updated preconnect links for font loading.)
          value={houseFilter || ""}
          onChange={(event) => onHouseFilterChange(event.target.value || null)}
          aria-label="Filter fixtures by house"
        >
          <option value="">All houses</option>
<<<<<<< HEAD
          {houses.map((house) => (
            <option key={house.house_id} value={house.house_id}>
              {formatHouseLabel(house.house_id)}
=======
          {houses.map((houseId) => (
            <option key={houseId} value={houseId}>
              {formatHouseLabel(houseId)}
>>>>>>> 9809950 (Update HTML files to reference new asset files, including updated scripts and styles for improved performance. Remove deprecated scripts and enhance the layout styles across all pages. Ensure consistent asset references and improve mobile support with updated preconnect links for font loading.)
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
