"""Shared group-stage standings helpers."""

from __future__ import annotations

from copy import deepcopy
from itertools import product

from fifa_source import draw_team_names, load_json


def rank_key(row: dict) -> tuple:
    return (-row["points"], -(row["gf"] - row["ga"]), -row["gf"], row["team"])


def apply_match_result(table: dict[str, dict], home: str, away: str, home_score: int, away_score: int) -> None:
    for team in (home, away):
        table.setdefault(
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
    h, a = table[home], table[away]
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


def rank_group_table(table: dict[str, dict]) -> list[dict]:
    rows = list(table.values())
    rows.sort(key=rank_key)
    return rows


def group_table_from_standings(standings: dict[str, list[dict]], group: str) -> dict[str, dict]:
    return {row["team"]: deepcopy(row) for row in standings.get(group) or []}


def remaining_group_fixtures(fixtures: list[dict], group: str) -> list[dict]:
    return [
        fixture
        for fixture in fixtures
        if fixture.get("stage") == "group"
        and fixture.get("group") == group
        and not fixture.get("finished")
        and fixture.get("home")
        and fixture.get("away")
    ]


def group_has_started(group: str, fixtures: list[dict], draw_names: set[str]) -> bool:
    return any(
        fixture.get("stage") == "group"
        and fixture.get("group") == group
        and fixture.get("finished")
        and fixture.get("home") in draw_names
        and fixture.get("away") in draw_names
        for fixture in fixtures
    )


def can_team_finish_top_n(
    team: str,
    group: str,
    fixtures: list[dict],
    draw_names: set[str],
    fifa_groups: dict[str, str],
    *,
    n: int = 3,
) -> bool:
    """True if the team can still finish in the top n of their group in some outcome."""
    standings = group_standings(fixtures, draw_names, fifa_groups)
    rows = standings.get(group) or []
    if not any(row["team"] == team for row in rows):
        return False

    if group_is_complete(group, standings):
        position = next(i for i, row in enumerate(rows) if row["team"] == team)
        return position < n

    remaining = remaining_group_fixtures(fixtures, group)
    if not remaining:
        # Without unplayed fixtures we cannot prove elimination mid-group.
        return True

    base_table = group_table_from_standings(standings, group)
    for outcome in product((0, 1, 2), repeat=len(remaining)):
        table = deepcopy(base_table)
        for fixture, result in zip(remaining, outcome):
            home = fixture["home"]
            away = fixture["away"]
            if result == 0:
                apply_match_result(table, home, away, 0, 1)
            elif result == 1:
                apply_match_result(table, home, away, 1, 1)
            else:
                apply_match_result(table, home, away, 1, 0)

        ranked = rank_group_table(table)
        position = next(i for i, row in enumerate(ranked) if row["team"] == team)
        if position < n:
            return True
    return False


def mathematically_eliminated_teams(
    fixtures: list[dict],
    draw_names: set[str],
    fifa_groups: dict[str, str],
    *,
    top_n: int = 3,
) -> tuple[list[str], list[str]]:
    """Teams that cannot finish in the top n of their group (cannot reach the Round of 32)."""
    notes: list[str] = []
    eliminated: set[str] = set()
    standings = group_standings(fixtures, draw_names, fifa_groups)

    for group in sorted(standings):
        if group_is_complete(group, standings):
            continue
        if not group_has_started(group, fixtures, draw_names):
            continue
        for row in standings[group]:
            team = row["team"]
            if can_team_finish_top_n(team, group, fixtures, draw_names, fifa_groups, n=top_n):
                continue
            eliminated.add(team)
            notes.append(f"Group {group}: {team} eliminated (mathematically out of top {top_n})")

    return sorted(eliminated), notes


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
        ranked[group] = rank_group_table(table)
    return ranked


def group_is_complete(group: str, standings: dict[str, list[dict]]) -> bool:
    rows = standings.get(group) or []
    if len(rows) != 4:
        return False
    return all(row["played"] == 3 for row in rows)


def all_groups_complete(standings: dict[str, list[dict]]) -> bool:
    return bool(standings) and all(group_is_complete(group, standings) for group in standings)


def third_place_rank_key(row: dict) -> tuple:
    return rank_key(row)


def qualifying_third_place_teams(standings: dict[str, list[dict]]) -> set[str]:
    if not all_groups_complete(standings):
        return set()
    third_places = [rows[2] for rows in standings.values() if len(rows) >= 3]
    third_places.sort(key=third_place_rank_key)
    return {row["team"] for row in third_places[:8]}


def load_draw_names() -> set[str]:
    draw = load_json("draw.json")
    return draw_team_names(draw)
