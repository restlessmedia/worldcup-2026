"""Build public standings snapshot from draw, results, and FIFA team data."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def load_json(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def short_name(fifa_name: str) -> str:
    replacements = {
        "Bosnia and Herzegovina": "Bosnia",
        "Côte d'Ivoire": "Ivory Coast",
        "Cabo Verde": "Cape Verde",
        "Korea Republic": "South Korea",
        "IR Iran": "Iran",
        "Congo DR": "DR Congo",
    }
    return replacements.get(fifa_name, fifa_name)


def house_sort_key(house_id: str) -> tuple:
    if house_id.isdigit():
        return (0, int(house_id))
    return (1, house_id.lower())


def spoon_likelihood_lookup(teams_payload: dict) -> dict[str, int]:
    by_code: dict[str, int] = {}
    for team in teams_payload.get("teams") or []:
        score = int(team.get("wooden_spoon_likelihood") or 0)
        code = team.get("fifa_code")
        if code:
            by_code[code] = score
    return by_code


def wooden_spoon_sort_key(team: dict, *, pre_tournament: bool) -> tuple:
    if pre_tournament:
        return (
            -team.get("wooden_spoon_likelihood", 0),
            -team["fifa_rank"],
            team["display_name"],
        )
    return (-team["goals_conceded"], team["display_name"])


def fifa_lookup(fifa_payload: dict) -> dict[str, dict]:
    by_name = {team["fifa_name"]: team for team in fifa_payload["teams"]}
    draw_map = fifa_payload["draw_name_map"]
    lookup: dict[str, dict] = {}
    for draw_name, fifa_name in draw_map.items():
        if fifa_name in by_name:
            lookup[draw_name] = {**by_name[fifa_name], "draw_name": draw_name}
    for team in fifa_payload["teams"]:
        lookup.setdefault(team["fifa_name"], {**team, "draw_name": team["fifa_name"]})
    return lookup


def build_standings() -> dict:
    draw = load_json("draw.json")
    results = load_json("results.json")
    fifa = load_json("fifa-teams.json")
    teams_meta = load_json("teams.json")
    lookup = fifa_lookup(fifa)
    spoon_likelihood = spoon_likelihood_lookup(teams_meta)

    eliminated = set(results.get("teams_eliminated") or [])
    goals_conceded = results.get("goals_conceded") or {}
    fair_play = results.get("fair_play_points") or {}

    houses = []
    all_teams = []

    for entry in draw:
        team_rows = []
        alive = 0
        best_rank = None
        best_team = None

        for draw_name in entry["teams"]:
            info = lookup.get(draw_name)
            if not info:
                raise KeyError(f"No FIFA mapping for draw team: {draw_name}")

            status = "eliminated" if draw_name in eliminated else "alive"
            if status == "alive":
                alive += 1

            rank = info["world_ranking"]
            if status == "alive" and (best_rank is None or rank < best_rank):
                best_rank = rank
                best_team = short_name(info["fifa_name"])

            conceded = int(goals_conceded.get(draw_name, goals_conceded.get(info["fifa_name"], 0)) or 0)
            row = {
                "draw_name": draw_name,
                "display_name": short_name(info["fifa_name"]),
                "fifa_code": info["fifa_code"],
                "group": info["group"],
                "fifa_rank": rank,
                "status": status,
                "goals_conceded": conceded,
                "wooden_spoon_likelihood": spoon_likelihood.get(info["fifa_code"], 0),
                "fair_play_points": int(fair_play.get(draw_name, fair_play.get(info["fifa_name"], 0)) or 0),
            }
            team_rows.append(row)
            all_teams.append({**row, "house_id": str(entry["house_id"])})

        team_rows.sort(key=lambda t: t["fifa_rank"])
        houses.append(
            {
                "house_id": str(entry["house_id"]),
                "teams_total": len(team_rows),
                "teams_alive": alive,
                "best_remaining_rank": best_rank,
                "best_remaining_team": best_team,
                "teams": team_rows,
            }
        )

    houses.sort(key=lambda h: house_sort_key(h["house_id"]))

    spoon_rows = [
        {
            "house_id": t["house_id"],
            "display_name": t["display_name"],
            "fifa_code": t["fifa_code"],
            "goals_conceded": t["goals_conceded"],
            "wooden_spoon_likelihood": t["wooden_spoon_likelihood"],
            "fifa_rank": t["fifa_rank"],
            "group": t["group"],
            "status": t["status"],
        }
        for t in all_teams
    ]
    pre_tournament_spoon = all(t["goals_conceded"] == 0 for t in spoon_rows)
    wooden_spoon = sorted(
        spoon_rows,
        key=lambda t: wooden_spoon_sort_key(t, pre_tournament=pre_tournament_spoon),
    )

    league = []
    position = 0
    last_goals = None
    for index, team in enumerate(wooden_spoon):
        if team["goals_conceded"] != last_goals:
            position = index + 1
            last_goals = team["goals_conceded"]
        league.append({"position": position, **team})

    leader = league[0] if league and league[0]["goals_conceded"] > 0 else None

    total_alive = sum(h["teams_alive"] for h in houses)
    if results.get("last_updated"):
        status = "in_progress"
    elif total_alive == len(all_teams):
        status = "pre_tournament"
    else:
        status = "in_progress"

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tournament_status": status,
        "results_updated": results.get("last_updated"),
        "teams_in_play": total_alive,
        "teams_total": len(all_teams),
        "houses": houses,
        "wooden_spoon": wooden_spoon,
        "wooden_spoon_league": league,
        "wooden_spoon_leader": leader,
        "results_source_url": results.get("source_url"),
    }


def main() -> None:
    standings = build_standings()
    out = DATA / "standings.json"
    out.write_text(json.dumps(standings, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({standings['teams_in_play']}/{standings['teams_total']} teams alive)")


if __name__ == "__main__":
    main()
