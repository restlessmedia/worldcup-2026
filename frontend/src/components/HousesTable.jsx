import { useRef, useState } from "react";
import { useDesktopHousesLayout } from "../hooks/useMediaQuery";
import { formatHouseLabel } from "../lib/format";
import { columns } from "../lib/labels";
import { ColumnHeader } from "./ColumnHeader";
import { TeamFlagRow } from "./TeamFlag";
import { HouseFixturesModal } from "./HouseFixturesModal";
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

function HouseFixtureLink({ house, onSelect }) {
  return (
    <button
      type="button"
      className="house-fixtures-link"
      onClick={(event) => onSelect(house, event)}
      aria-label={`View fixtures for ${formatHouseLabel(house.house_id)}`}
    >
      Fixtures
    </button>
  );
}

export function HousesTable({ standings, fixtures = [] }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const houseFixtureTriggerRef = useRef(null);
  const showTable = useDesktopHousesLayout();

  function openHouseFixtures(house, event) {
    houseFixtureTriggerRef.current = event.currentTarget;
    setSelectedHouse(house);
  }

  function closeHouseFixtures() {
    setSelectedHouse(null);
    houseFixtureTriggerRef.current?.focus();
  }

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
                    <td className="house-label">
                      <span className="house-label__content">
                        <span>{formatHouseLabel(house.house_id)}</span>
                        <HouseFixtureLink house={house} onSelect={openHouseFixtures} />
                      </span>
                    </td>
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
                  <span className="house-card__title">
                    <span className="house-card__id">{formatHouseLabel(house.house_id)}</span>
                    <HouseFixtureLink house={house} onSelect={openHouseFixtures} />
                  </span>
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
      <HouseFixturesModal
        house={selectedHouse}
        fixtures={fixtures}
        onClose={closeHouseFixtures}
      />
    </>
  );
}
