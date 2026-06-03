import { copy } from "./labels";

export function formatHouseLabel(houseId) {
  return houseId === "Coppice" ? "Coppice" : houseId;
}

export function formatMoney(amount) {
  if (amount == null) return null;
  return `£${Number(amount).toFixed(0)}`;
}

export function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTimeShort(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Best timestamp for “when was the site data last built/updated”. */
export function resolveSiteUpdatedAt({ meta, standings, knockout } = {}) {
  return (
    standings?.results_updated ||
    meta?.results_updated ||
    knockout?.last_updated ||
    standings?.generated_at ||
    meta?.published_at ||
    null
  );
}

export function potTotal(config) {
  return formatMoney(
    config.prizes?.reduce((sum, prize) => sum + (prize.amount_gbp || 0), 0)
  );
}

export function tournamentStatusLine(standings, config) {
  const pot = potTotal(config);
  const status =
    standings.tournament_status === "pre_tournament"
      ? "Pre-tournament"
      : `${standings.teams_in_play} of ${standings.teams_total} teams still in the tournament`;
  return `${status} · ${standings.houses.length} houses · ${pot} pot · 1st–4th prizes + side prizes`;
}

export function spoonTagline(standings) {
  const leader = standings.wooden_spoon_leader;
  const updated = standings.results_updated
    ? `Results as of ${formatDate(standings.results_updated)}`
    : "Pre-tournament — all teams on 0 goals conceded";

  const leaderText = leader
    ? ` · ${copy.woodenSpoonLeader(leader.display_name, leader.goals_conceded, formatHouseLabel(leader.house_id))}`
    : "";

  return `${updated}${leaderText}`;
}
