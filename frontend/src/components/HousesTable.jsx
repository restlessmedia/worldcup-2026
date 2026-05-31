import { useState } from "react";
import { formatHouseLabel } from "../lib/format";
import { columns } from "../lib/labels";
import { ColumnHeader } from "./ColumnHeader";
import { TeamFlagRow } from "./TeamFlag";
import { TeamModal } from "./TeamModal";

export function HousesTable({ standings }) {
  const [selectedTeam, setSelectedTeam] = useState(null);

  const houseCards = standings.houses.map((house) => {
    const inPlay =
      standings.tournament_status === "pre_tournament"
        ? house.teams_total
        : house.teams_alive;
    const best = house.best_remaining_rank
      ? `#${house.best_remaining_rank} world ranking`
      : "—";

    return (
      <article key={house.house_id} className="house-card">
        <header className="house-card__head">
          <span className="house-card__id">{formatHouseLabel(house.house_id)}</span>
          <span className="house-card__meta">
            {inPlay}/{house.teams_total} still in · best {best}
          </span>
        </header>
        <TeamFlagRow teams={house.teams} onSelect={setSelectedTeam} showNames />
      </article>
    );
  });

  return (
    <>
      <div className="house-cards">{houseCards}</div>

      <div className="table-wrap houses-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <ColumnHeader {...columns.house} />
              <ColumnHeader {...columns.team} />
              <ColumnHeader {...columns.bestRanking} />
              <ColumnHeader {...columns.stillIn} />
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
