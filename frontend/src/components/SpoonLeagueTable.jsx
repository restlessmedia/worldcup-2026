import { useState } from "react";
import { formatHouseLabel, formatMoney } from "../lib/format";
import { columns } from "../lib/labels";
import { splitPrizes } from "../lib/prizes";
import { ColumnHeader } from "./ColumnHeader";
import { TeamFlag } from "./TeamFlag";
import { TeamModal } from "./TeamModal";

function posBadgeClass(row, leader) {
  if (!row.goals_conceded) return "";
  if (leader && row.fifa_code === leader.fifa_code) return " gold";
  if (row.position === 2) return " silver";
  if (row.position === 3) return " bronze";
  return "";
}

export function SpoonLeagueTable({ standings, config, limit, showHeader = true }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const league = standings.wooden_spoon_league || standings.wooden_spoon;
  const rows = limit ? league.slice(0, limit) : league;
  const leader = standings.wooden_spoon_leader;
  const { side } = splitPrizes(config);
  const goalsPrize = side.find((prize) => prize.id === "goals");
  const hasGoals = league.some((row) => row.goals_conceded > 0);

  const table = (
    <table className="league-table league-table--spoon">
      <thead>
        <tr>
          <ColumnHeader {...columns.position} />
          <ColumnHeader {...columns.team} />
          <ColumnHeader {...columns.house} />
          <ColumnHeader {...columns.group} />
          <ColumnHeader {...columns.worldRanking} />
          <ColumnHeader {...columns.goalsConceded} />
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const isLeader = leader && row.fifa_code === leader.fifa_code && row.goals_conceded > 0;
          const pos = row.position || index + 1;

          return (
            <tr
              key={row.fifa_code}
              className={isLeader ? "leader" : row.position <= 3 && row.goals_conceded > 0 ? "podium" : ""}
            >
              <td className="num">
                <span className={`pos-badge${posBadgeClass(row, leader)}`}>{pos}</span>
              </td>
              <td>
                <TeamFlag team={row} onSelect={setSelectedTeam} showName={false} />
              </td>
              <td className="house-label">{formatHouseLabel(row.house_id)}</td>
              <td className="num">{row.group || "—"}</td>
              <td className="num">#{row.fifa_rank}</td>
              <td className="num ga-cell">
                <strong>{row.goals_conceded}</strong>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <>
      {showHeader ? (
        <div className="league-shell">
          <div className="league-shell__header">
            <div>
              <h3>Most goals conceded</h3>
              <p className="league-shell__sub">
                {hasGoals
                  ? "The team with the most goals scored against them wins the wooden spoon side prize"
                  : "Tournament not started — every team is on 0 goals conceded"}
              </p>
            </div>
            <span className="league-shell__prize">
              Prize {formatMoney(goalsPrize?.amount)}
            </span>
          </div>
          <div className="table-wrap table-wrap--flush table-wrap--scroll">
            <p className="scroll-hint scroll-hint--table">Scroll table →</p>
            {table}
          </div>
        </div>
      ) : (
        <div className="table-wrap">{table}</div>
      )}

      <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
    </>
  );
}
