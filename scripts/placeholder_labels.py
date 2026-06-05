"""Turn FIFA bracket placeholder codes into plain English."""

from __future__ import annotations

import re

ORDINALS = ("", "1st", "2nd", "3rd", "4th")

GROUP_POSITION_RE = re.compile(r"^([1-4])([A-L])$")
BEST_THIRD_RE = re.compile(r"^3([A-L]+)$")
ALT_GROUP_RE = re.compile(r"^([A-L])([1-4])$")
WINNER_RE = re.compile(r"^W(\d+)$")
LOSER_RE = re.compile(r"^RU(\d+)$")
LOSER_ALT_RE = re.compile(r"^L(\d+)$")


def _knockout_outcome_label(match_num: int, outcome: str) -> str:
    role = "Winner" if outcome == "winner" else "Loser"
    if 101 <= match_num <= 102:
        return f"{role} of semi-final {match_num - 100}"
    if 97 <= match_num <= 100:
        return f"{role} of quarter-final {match_num - 96}"
    if 89 <= match_num <= 96:
        return f"{role} of Round of 16 (match {match_num})"
    if 73 <= match_num <= 88:
        return f"{role} of Round of 32 (match {match_num})"
    return f"{role} of match {match_num}"


def placeholder_display_name(code: str | None) -> str:
    if not code:
        return "To be decided"

    text = code.strip()
    if not text:
        return "To be decided"

    group_pos = GROUP_POSITION_RE.fullmatch(text)
    if group_pos:
        pos, group = group_pos.groups()
        return f"{ORDINALS[int(pos)]} in Group {group}"

    best_third = BEST_THIRD_RE.fullmatch(text)
    if best_third:
        letters = ", ".join(best_third.group(1))
        return f"Best 3rd-place team (groups {letters})"

    alt_group = ALT_GROUP_RE.fullmatch(text)
    if alt_group:
        group, pos = alt_group.groups()
        return f"{ORDINALS[int(pos)]} in Group {group}"

    winner = WINNER_RE.fullmatch(text)
    if winner:
        return _knockout_outcome_label(int(winner.group(1)), "winner")

    loser = LOSER_RE.fullmatch(text) or LOSER_ALT_RE.fullmatch(text)
    if loser:
        return _knockout_outcome_label(int(loser.group(1)), "loser")

    return text
