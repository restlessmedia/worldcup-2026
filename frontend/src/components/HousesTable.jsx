import { useState } from "react";
import { useDesktopHousesLayout } from "../hooks/useMediaQuery";
import { formatHouseLabel } from "../lib/format";
import { columns } from "../lib/labels";
import { ColumnHeader } from "./ColumnHeader";
import { TeamFlagRow } from "./TeamFlag";
import { TeamModal } from "./TeamModal";

function houseInPlay(standings, house) {
  return standings.tournament_status === "pre_tournament"
    ? house.teams_total
    : house.teams_alive;
}

function houseBestLabel(house, compact) {
  if (!house.best_remaining_rank) return compact ? "—" : "—";
  return compact
    ? `#${house.best_remaining_rank}`
    : `#${house.best_remaining_rank} world ranking`;
}

export function HousesTable({ standings }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const showTable = useDesktopHousesLayout();

  return (
    <>
      {showTable ? (
        <div className="table-wrap houses-table-wrap">
          <table className="data-table motion-stagger-table">
            <thead>
              <tr>
                <ColumnHeader {...columns.house} />
                <ColumnHeader {...columns.team} />
                <ColumnHeader {...columns.bestRanking} />
                <ColumnHeader {...columns.stillIn} />
              </tr>
            </thead>
            <tbody>
              {standings.houses.map((house, houseIndex) => {
                const inPlay = houseInPlay(standings, house);
                const best = houseBestLabel(house, true);
                const flagPriorityStart = houseIndex === 0 ? 0 : 99;

                return (
                  <tr key={house.house_id}>
                    <td className="house-label">{formatHouseLabel(house.house_id)}</td>
                    <td>
                      <TeamFlagRow
                        teams={house.teams}
                        onSelect={setSelectedTeam}
                        showNames
                        priorityStart={flagPriorityStart}
                      />
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
      ) : (
        <div className="house-cards motion-stagger">
          {standings.houses.map((house, houseIndex) => {
            const inPlay = houseInPlay(standings, house);
            const best = houseBestLabel(house, false);
            const flagPriorityStart = houseIndex === 0 ? 0 : 99;

            return (
              <article key={house.house_id} className="house-card">
                <header className="house-card__head">
                  <span className="house-card__id">{formatHouseLabel(house.house_id)}</span>
                  <span className="house-card__meta">
                    {inPlay}/{house.teams_total} still in · best {best}
                  </span>
                </header>
                <TeamFlagRow
                  teams={house.teams}
                  onSelect={setSelectedTeam}
                  showNames
                  priorityStart={flagPriorityStart}
                />
              </article>
            );
          })}
        </div>
      )}

      <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
    </>
  );
}
