"""Resolve FIFA bracket placeholder codes to draw team names."""

from __future__ import annotations

import re

GROUP_POSITION_RE = re.compile(r"^([1-4])([A-L])$")
BEST_THIRD_RE = re.compile(r"^3([A-L]+)$")
WINNER_RE = re.compile(r"^W(\d+)$")
LOSER_RE = re.compile(r"^RU(\d+)$")


def team_at_group_position(
    standings: dict[str, list[dict]], position: int, group: str
) -> str | None:
    rows = standings.get(group) or []
    index = position - 1
    if len(rows) <= index:
        return None
    row = rows[index]
    if row["played"] < 3 and position <= 3:
        return None
    return row["team"]


def resolve_placeholder(
    code: str | None,
    *,
    standings: dict[str, list[dict]],
    match_winners: dict[int, str],
    match_losers: dict[int, str],
    draw_names: set[str],
    qualifying_thirds: set[str],
) -> str | None:
    if not code:
        return None
    if code in draw_names:
        return code

    text = code.strip()
    group_pos = GROUP_POSITION_RE.fullmatch(text)
    if group_pos:
        pos, group = group_pos.groups()
        return team_at_group_position(standings, int(pos), group)

    best_third = BEST_THIRD_RE.fullmatch(text)
    if best_third:
        letters = best_third.group(1)
        for group in letters:
            team = team_at_group_position(standings, 3, group)
            if team and team in qualifying_thirds:
                return team
        return None

    winner = WINNER_RE.fullmatch(text)
    if winner:
        return match_winners.get(int(winner.group(1)))

    loser = LOSER_RE.fullmatch(text)
    if loser:
        return match_losers.get(int(loser.group(1)))

    return None


def fifa_match_number_to_bracket_id(match_number: int) -> str | None:
    if 73 <= match_number <= 88:
        return f"r32-{match_number - 72:02d}"
    if 89 <= match_number <= 96:
        return f"r16-{match_number - 88:02d}"
    if match_number == 97:
        return "qf-01"
    if match_number == 98:
        return "qf-03"
    if match_number == 99:
        return "qf-02"
    if match_number == 100:
        return "qf-04"
    if match_number == 101:
        return "sf-01"
    if match_number == 102:
        return "sf-02"
    if match_number == 103:
        return "third-01"
    if match_number == 104:
        return "final-01"
    return None
