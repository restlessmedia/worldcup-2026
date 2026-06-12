"""Shared group-stage standings helpers."""

from __future__ import annotations

from fifa_source import draw_team_names, load_json


def fifa_group_lookup() -> dict[str, str]:
    fifa = load_json("fifa-teams.json")
    draw_map = fifa.get("draw_name_map") or {}
    fifa_to_draw = {fifa_name: draw_name for draw_name, fifa_name in draw_map.items()}
    lookup: dict[str, str] = {}
    for team in fifa.get("teams") or []:
        draw_name = fifa_to_draw.get(team["fifa_name"], team["fifa_name"])
        lookup[draw_name] = team["group"]
    return lookup


def group_standings(
    fixtures: list[dict], draw_names: set[str], fifa_groups: dict[str, str]
) -> dict[str, list[dict]]:
    by_group: dict[str, dict[str, dict]] = {}

    for draw_name in draw_names:
        group = fifa_groups.get(draw_name)
        if not group:
            continue
        by_group.setdefault(group, {})
        by_group[group].setdefault(
            draw_name,
            {
                "team": draw_name,
                "played": 0,
                "won": 0,
                "drawn": 0,
                "lost": 0,
                "gf": 0,
                "ga": 0,
                "points": 0,
            },
        )

    for fixture in fixtures:
        if fixture.get("stage") != "group" or not fixture.get("finished"):
            continue
        home = fixture.get("home")
        away = fixture.get("away")
        group = fixture.get("group")
        if not group or home not in draw_names or away not in draw_names:
            continue
        home_score = int(fixture["home_score"])
        away_score = int(fixture["away_score"])
        tables = by_group.setdefault(group, {})
        for team in (home, away):
            tables.setdefault(
                team,
                {
                    "team": team,
                    "played": 0,
                    "won": 0,
                    "drawn": 0,
                    "lost": 0,
                    "gf": 0,
                    "ga": 0,
                    "points": 0,
                },
            )
        h, a = tables[home], tables[away]
        h["played"] += 1
        a["played"] += 1
        h["gf"] += home_score
        h["ga"] += away_score
        a["gf"] += away_score
        a["ga"] += home_score
        if home_score > away_score:
            h["won"] += 1
            h["points"] += 3
            a["lost"] += 1
        elif away_score > home_score:
            a["won"] += 1
            a["points"] += 3
            h["lost"] += 1
        else:
            h["drawn"] += 1
            a["drawn"] += 1
            h["points"] += 1
            a["points"] += 1

    ranked: dict[str, list[dict]] = {}
    for group, table in by_group.items():
        rows = list(table.values())
        rows.sort(
            key=lambda row: (
                -row["points"],
                -(row["gf"] - row["ga"]),
                -row["gf"],
                row["team"],
            )
        )
        ranked[group] = rows
    return ranked


def group_is_complete(group: str, standings: dict[str, list[dict]]) -> bool:
    rows = standings.get(group) or []
    if len(rows) != 4:
        return False
    return all(row["played"] == 3 for row in rows)


def all_groups_complete(standings: dict[str, list[dict]]) -> bool:
    return bool(standings) and all(group_is_complete(group, standings) for group in standings)


def third_place_rank_key(row: dict) -> tuple:
    return (-row["points"], -(row["gf"] - row["ga"]), -row["gf"], row["team"])


def qualifying_third_place_teams(standings: dict[str, list[dict]]) -> set[str]:
    if not all_groups_complete(standings):
        return set()
    third_places = [rows[2] for rows in standings.values() if len(rows) >= 3]
    third_places.sort(key=third_place_rank_key)
    return {row["team"] for row in third_places[:8]}


def load_draw_names() -> set[str]:
    draw = load_json("draw.json")
    return draw_team_names(draw)
