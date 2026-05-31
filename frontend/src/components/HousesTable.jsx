import { useState } from "react";
import { formatHouseLabel } from "../lib/format";
import { TeamFlagRow } from "./TeamFlag";
import { TeamModal } from "./TeamModal";

export function HousesTable({ standings }) {
  const [selectedTeam, setSelectedTeam] = useState(null);

  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">House</th>
              <th scope="col">Teams</th>
              <th scope="col">Best rank</th>
              <th scope="col">In play</th>
            </tr>
          </thead>
          <tbody>
            {standings.houses.map((house) => {
              const inPlay =
                standings.tournament_status === "pre_tournament"
                  ? house.teams_total
                  : house.teams_alive;
              const best = house.best_remaining_rank
                ? `#${house.best_remaining_rank}`
                : "—";

              return (
                <tr key={house.house_id}>
                  <td className="house-label">{formatHouseLabel(house.house_id)}</td>
                  <td>
                    <TeamFlagRow teams={house.teams} onSelect={setSelectedTeam} showNames />
                  </td>
                  <td className="num">
                    <strong>{best}</strong>
                  </td>
                  <td className="num">
                    {inPlay}/{house.teams_total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
    </>
  );
}
