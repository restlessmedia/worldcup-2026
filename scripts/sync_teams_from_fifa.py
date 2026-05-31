"""Sync sweepstake team profiles from official FIFA data."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def rating_from_rank(rank: int) -> float:
    if rank <= 5:
        return 9.5
    if rank <= 10:
        return 8.5
    if rank <= 20:
        return 7.5
    if rank <= 35:
        return 6.5
    if rank <= 50:
        return 5.5
    if rank <= 70:
        return 4.5
    return 3.5


def wooden_spoon_from_rank(rank: int, appearances: int) -> int:
    score = 1
    if rank >= 80:
        score += 4
    elif rank >= 65:
        score += 3
    elif rank >= 50:
        score += 2
    elif rank >= 40:
        score += 1
    if appearances == 0:
        score += 2
    elif appearances == 1:
        score += 1
    return min(score, 10)


def summary_from_fifa(team: dict) -> str:
    rank = team["world_ranking"]
    apps = team["world_cup_appearances"]

    if apps == 0:
        history = "World Cup debutants"
    elif apps == 1:
        history = "Only one previous World Cup"
    elif apps >= 15:
        history = f"{apps} previous World Cups — seasoned campaigners"
    else:
        history = f"{apps} previous World Cups"

    if rank <= 10:
        tier = "among the tournament favourites"
    elif rank <= 25:
        tier = "solid knockout-stage contenders"
    elif rank <= 50:
        tier = "capable of surprises but unlikely to go deep"
    else:
        tier = "underdogs in a tough 48-team field"

    host = " Co-hosts." if team.get("is_host") else ""
    return f"{history}; {tier}.{host}"


def main() -> None:
    fifa = json.loads((DATA / "fifa-teams.json").read_text(encoding="utf-8"))
    teams_list = json.loads((DATA / "teams-list.json").read_text(encoding="utf-8"))
    draw_map = fifa["draw_name_map"]
    fifa_by_name = {team["fifa_name"]: team for team in fifa["teams"]}

    profiles = []
    for entry in teams_list:
        draw_name = entry["display_name"]
        fifa_name = draw_map.get(draw_name, entry["id"])
        fifa_team = fifa_by_name.get(fifa_name)
        if not fifa_team:
            raise KeyError(f"No FIFA record for draw team: {draw_name} -> {fifa_name}")

        profiles.append(
            {
                "id": entry["id"],
                "display_name": draw_name,
                "fifa_name": fifa_team["fifa_name"],
                "fifa_code": fifa_team["fifa_code"],
                "group": fifa_team["group"],
                "fifa_rank": fifa_team["world_ranking"],
                "world_cup_appearances": fifa_team["world_cup_appearances"],
                "is_host": fifa_team.get("is_host", False),
                "rating": rating_from_rank(fifa_team["world_ranking"]),
                "wooden_spoon_likelihood": wooden_spoon_from_rank(
                    fifa_team["world_ranking"],
                    fifa_team["world_cup_appearances"],
                ),
                "summary": summary_from_fifa(fifa_team),
                "aliases": [draw_name] if draw_name != entry["id"] else [],
            }
        )

    payload = {
        "meta": {
            "sources": [fifa["source_url"]],
            "updated": fifa["fetched_at"][:10],
            "rating_scale": "Derived from official FIFA world ranking (rough /10 indicator)",
            "wooden_spoon_scale": "Likelihood of most goals conceded (1-10), rank/debut based",
        },
        "teams": profiles,
    }

    (DATA / "teams.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Updated {DATA / 'teams.json'} from official FIFA data ({len(profiles)} teams)")


if __name__ == "__main__":
    main()
