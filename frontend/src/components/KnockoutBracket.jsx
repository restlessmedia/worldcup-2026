import { useState } from "react";
import { flagUrl } from "../lib/data";
import { formatHouseLabel } from "../lib/format";
import { TeamModal } from "./TeamModal";

function KnockoutSlot({ team, score, isWinner, onSelect }) {
  if (!team) {
    return (
      <div className="knockout-slot knockout-slot--tbd">
        <span className="knockout-slot__tbd">TBD</span>
      </div>
    );
  }

  const eliminated = team.status === "eliminated";

  return (
    <button
      type="button"
      className={`knockout-slot${isWinner ? " knockout-slot--winner" : ""}${eliminated ? " knockout-slot--out" : ""}`}
      onClick={() => onSelect(team)}
    >
      {team.fifa_code ? (
        <img src={flagUrl(team.fifa_code)} alt="" width="22" height="22" loading="lazy" />
      ) : (
        <span className="knockout-slot__placeholder" />
      )}
      <span className="knockout-slot__name">{team.display_name}</span>
      <span className="knockout-slot__house">{formatHouseLabel(team.house_id)}</span>
      {score != null ? <span className="knockout-slot__score">{score}</span> : null}
    </button>
  );
}

export function KnockoutMatch({ match, onSelect }) {
  const homeWinner = match.winner?.draw_name === match.home?.draw_name;
  const awayWinner = match.winner?.draw_name === match.away?.draw_name;

  return (
    <div className={`knockout-match${match.played ? " knockout-match--played" : ""}`}>
      <KnockoutSlot
        team={match.home}
        score={match.home_score}
        isWinner={homeWinner}
        onSelect={onSelect}
      />
      <div className="knockout-match__vs">vs</div>
      <KnockoutSlot
        team={match.away}
        score={match.away_score}
        isWinner={awayWinner}
        onSelect={onSelect}
      />
    </div>
  );
}

export function KnockoutBracket({ knockout }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const preKnockout = knockout.phase === "pre_knockout";

  return (
    <>
      {preKnockout ? (
        <p className="empty-note">
          Group stage in progress — the bracket fills in once Round of 32 teams are confirmed.
          {knockout.summary.houses_alive > 0
            ? ` ${knockout.summary.houses_alive} houses still have teams in the tournament.`
            : null}
        </p>
      ) : (
        <p className="knockout-summary">
          {knockout.summary.teams_in_bracket} sweepstake teams in the knockout
          {knockout.summary.r32_fixtures_set
            ? ` · ${knockout.summary.r32_fixtures_set} of 16 Round of 32 fixtures set`
            : null}
        </p>
      )}

      <div className="knockout-scroll">
        <div className="knockout-bracket">
          {knockout.rounds.map((round) => (
            <section key={round.id} className="knockout-round">
              <header className="knockout-round__head">
                <h3>{round.label}</h3>
                {round.teams_count > 0 ? (
                  <span className="knockout-round__meta">
                    {round.teams_count} teams · {round.houses.length} houses
                  </span>
                ) : null}
              </header>
              <div className="knockout-round__matches">
                {round.matches.map((match) => (
                  <KnockoutMatch key={match.id} match={match} onSelect={setSelectedTeam} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
    </>
  );
}
