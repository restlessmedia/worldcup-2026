import { useMemo, useState } from "react";
import { flagUrl } from "../lib/data";
import { formatHouseLabel } from "../lib/format";
import {
  CENTER_MATCHES,
  PATHWAY_LEFT,
  PATHWAY_RIGHT,
  PATHWAY_ROUND_ORDER,
  PATHWAY_ROUND_ORDER_REVERSED,
  indexMatches,
  pathwayFeederPlacements,
  pathwayGridPlacements,
  resolveMatch,
} from "../lib/knockoutTree";
import { copy, roundLabels } from "../lib/labels";
import { isTeamEliminated } from "../lib/teamStats";
import { EliminatedBadge } from "./EliminatedBadge";
import { FlagPlaceholder } from "./FlagPlaceholder";
import { TeamModal } from "./TeamModal";

function KnockoutSlot({ team, score, isWinner, onSelect, compact = false, fetchPriority }) {
  const flagClass = compact
    ? "knockout-slot__flag-icon"
    : "knockout-slot__flag-icon knockout-slot__flag-icon--lg";

  if (!team) {
    return (
      <div className="knockout-slot knockout-slot--tbd" aria-label={copy.toBeDecided}>
        <FlagPlaceholder
          size={compact ? undefined : 22}
          className={`knockout-slot__placeholder ${flagClass}`}
        />
      </div>
    );
  }

  const eliminated = isTeamEliminated(team);

  return (
    <button
      type="button"
      className={`knockout-slot${compact ? " knockout-slot--compact" : ""}${isWinner ? " knockout-slot--winner" : ""}${eliminated ? " knockout-slot--out" : ""}`}
      onClick={() => onSelect(team)}
    >
      {team.fifa_code ? (
        <img
          src={flagUrl(team.fifa_code)}
          alt=""
          className={flagClass}
          width={compact ? undefined : 22}
          height={compact ? undefined : 22}
          loading={fetchPriority === "high" ? "eager" : "lazy"}
          fetchPriority={fetchPriority}
        />
      ) : (
        <FlagPlaceholder
          size={compact ? undefined : 22}
          className={`knockout-slot__placeholder ${flagClass}`}
        />
      )}
      <span className="knockout-slot__name">
        <span className="knockout-slot__name-text">{team.display_name}</span>
        {eliminated ? <EliminatedBadge compact className="knockout-slot__out-badge" /> : null}
      </span>
      {!compact && team.house_id ? (
        <span className="knockout-slot__house">{formatHouseLabel(team.house_id)}</span>
      ) : null}
      {score != null ? <span className="knockout-slot__score">{score}</span> : null}
    </button>
  );
}

export function KnockoutMatch({ match, onSelect, compact = false }) {
  const homeWinner = match.winner?.draw_name === match.home?.draw_name;
  const awayWinner = match.winner?.draw_name === match.away?.draw_name;

  return (
    <div className={`knockout-match${match.played ? " knockout-match--played" : ""}${compact ? " knockout-match--compact" : ""}`}>
      <KnockoutSlot
        team={match.home}
        score={match.home_score}
        isWinner={homeWinner}
        onSelect={onSelect}
        compact={compact}
      />
      <div className="knockout-match__vs">vs</div>
      <KnockoutSlot
        team={match.away}
        score={match.away_score}
        isWinner={awayWinner}
        onSelect={onSelect}
        compact={compact}
      />
    </div>
  );
}

function KnockoutMatchNode({ match, onSelect, compact = false }) {
  return (
    <div className="knockout-grid-cell__match">
      <KnockoutMatch match={match} onSelect={onSelect} compact={compact} />
    </div>
  );
}

function gridRowStyle(row, rowSpan) {
  return rowSpan > 1 ? `${row} / ${row + rowSpan}` : String(row);
}

function KnockoutPathway({ side, pathway, matchesById, onSelect }) {
  const placements = pathwayGridPlacements(side);
  const feeders = pathwayFeederPlacements(side);
  const headerOrder = side === "left" ? PATHWAY_ROUND_ORDER : PATHWAY_ROUND_ORDER_REVERSED;

  return (
    <div className={`knockout-pathway-grid knockout-pathway-grid--${side}`}>
      <div className="knockout-pathway-grid__headers">
        {headerOrder.map((roundId) => (
          <header key={roundId} className="knockout-tree__col-head">
            {roundLabels[roundId]?.label || roundId}
          </header>
        ))}
      </div>
      <div className="knockout-pathway-grid__body">
        {feeders.map((feeder) => (
          <div
            key={feeder.key}
            className="knockout-grid-feeder"
            style={{ gridColumn: feeder.col, gridRow: gridRowStyle(feeder.row, feeder.rowSpan) }}
            aria-hidden="true"
          />
        ))}
        {placements.map((cell) => (
          <div
            key={cell.id}
            className={`knockout-grid-cell knockout-grid-cell--${cell.roundId}`}
            style={{ gridColumn: cell.col, gridRow: gridRowStyle(cell.row, cell.rowSpan) }}
          >
            <KnockoutMatchNode
              match={resolveMatch(matchesById, cell.id)}
              onSelect={onSelect}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KnockoutBracket({ knockout, standings }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const preKnockout = knockout.phase === "pre_knockout";
  const matchesById = useMemo(
    () => (preKnockout ? {} : indexMatches(knockout)),
    [knockout, preKnockout],
  );

  const finalMatch = preKnockout
    ? null
    : resolveMatch(matchesById, CENTER_MATCHES.final);
  const thirdMatch = preKnockout
    ? null
    : resolveMatch(matchesById, CENTER_MATCHES.third);

  return (
    <div className="knockout-bracket-shell enter-item">
      {preKnockout ? (
        <p className="empty-note empty-note--knockout">
          Group stage in progress — the bracket fills in once the first knockout round is set (32 teams).
          {knockout.summary.houses_alive > 0
            ? ` ${knockout.summary.houses_alive} houses still have teams in the tournament.`
            : null}
        </p>
      ) : (
        <p className="knockout-summary">
          {knockout.summary.teams_in_bracket} sweepstake teams in the knockout stage
          {knockout.summary.r32_fixtures_set
            ? ` · ${knockout.summary.r32_fixtures_set} of 16 first-round fixtures filled in`
            : null}
        </p>
      )}

      {!preKnockout ? (
        <div className="knockout-tree-viewport">
          <div className="knockout-tree">
            <KnockoutPathway
              side="left"
              pathway={PATHWAY_LEFT}
              matchesById={matchesById}
              onSelect={setSelectedTeam}
            />

            <div className="knockout-tree__center">
              <div className="knockout-tree__col knockout-tree__col--center" data-round="final">
                <header className="knockout-tree__col-head">{roundLabels.final.label}</header>
                <div className="knockout-tree__col-body">
                  <KnockoutMatchNode match={finalMatch} onSelect={setSelectedTeam} />
                </div>
              </div>
              <div className="knockout-tree__col knockout-tree__col--center" data-round="third">
                <header className="knockout-tree__col-head">{roundLabels.third.label}</header>
                <div className="knockout-tree__col-body">
                  <KnockoutMatchNode match={thirdMatch} onSelect={setSelectedTeam} compact />
                </div>
              </div>
            </div>

            <KnockoutPathway
              side="right"
              pathway={PATHWAY_RIGHT}
              matchesById={matchesById}
              onSelect={setSelectedTeam}
            />
          </div>
        </div>
      ) : null}

      <TeamModal team={selectedTeam} standings={standings} onClose={() => setSelectedTeam(null)} />
    </div>
  );
}
