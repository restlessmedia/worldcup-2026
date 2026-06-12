"""Shared FIFA World Cup 2026 data source helpers.

Official API used by fifa.com match centre:
https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

FIFA_FIXTURES_URL = (
    "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures"
)
FIFA_API_URL = (
    "https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023"
)

STAGE_MAP = {
    "First Stage": "group",
    "Round of 32": "r32",
    "Round of 16": "r16",
    "Quarter-final": "qf",
    "Semi-final": "sf",
    "Play-off for third place": "third",
    "Final": "final",
}

# FIFA calendar API: MatchStatus 0 + ResultType 1 means the result is final.
FINISHED_MATCH_STATUS = 0
FINISHED_RESULT_TYPE = 1


def load_json(name: str) -> dict | list:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def locale_text(items: list | None) -> str | None:
    if not items:
        return None
    return items[0].get("Description")


def parse_group(group_name: list | None) -> str | None:
    text = locale_text(group_name)
    if not text:
        return None
    match = re.search(r"Group\s+([A-L])", text, re.IGNORECASE)
    return match.group(1).upper() if match else None


def fifa_to_draw_names(fifa: dict, draw_names: set[str]) -> dict[str, str]:
    """Map FIFA team labels to canonical draw names."""
    mapping: dict[str, str] = {}
    draw_map = fifa.get("draw_name_map") or {}
    for draw_name, fifa_name in draw_map.items():
        if draw_name in draw_names:
            mapping[draw_name] = draw_name
            mapping[fifa_name] = draw_name
    for team in fifa.get("teams") or []:
        fifa_name = team["fifa_name"]
        code = team.get("fifa_code")
        draw_name = draw_map.get(fifa_name, fifa_name)
        if draw_name in draw_names:
            mapping[fifa_name] = draw_name
        if code:
            mapping.setdefault(code, draw_name)
    return mapping


def resolve_team_label(
    side: dict | None,
    placeholder: str | None,
    name_map: dict[str, str],
) -> str | None:
    if side:
        fifa_name = locale_text(side.get("TeamName"))
        if fifa_name:
            return name_map.get(fifa_name, fifa_name)
    if placeholder:
        return placeholder
    return None


def venue_label(match: dict) -> str | None:
    stadium = match.get("Stadium") or {}
    return locale_text(stadium.get("CityName")) or locale_text(stadium.get("Name"))


def fetch_raw_matches() -> list[dict]:
    request = urllib.request.Request(
        FIFA_API_URL,
        headers={"User-Agent": "worldcup-sweepstake/1.0"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return payload.get("Results") or []


def is_finished_match(raw: dict) -> bool:
    home_score = raw.get("HomeTeamScore")
    away_score = raw.get("AwayTeamScore")
    if home_score is None or away_score is None:
        return False
    status = raw.get("MatchStatus")
    result_type = raw.get("ResultType")
    if status == FINISHED_MATCH_STATUS and result_type == FINISHED_RESULT_TYPE:
        return True
    # Some finished matches only expose scores without status flags.
    return status in (None, FINISHED_MATCH_STATUS) and result_type in (None, FINISHED_RESULT_TYPE)


def convert_match(raw: dict, name_map: dict[str, str]) -> dict[str, Any]:
    stage_label = locale_text(raw.get("StageName")) or "Unknown"
    stage = STAGE_MAP.get(stage_label, stage_label.lower().replace(" ", "_"))
    home = resolve_team_label(raw.get("Home"), raw.get("PlaceHolderA"), name_map)
    away = resolve_team_label(raw.get("Away"), raw.get("PlaceHolderB"), name_map)

    return {
        "id": f"fifa-{raw['IdMatch']}",
        "fifa_match_id": raw["IdMatch"],
        "stage": stage,
        "stage_label": stage_label,
        "group": parse_group(raw.get("GroupName")),
        "matchday": raw.get("MatchDay"),
        "match_number": raw.get("MatchNumber"),
        "kickoff_utc": raw.get("Date"),
        "home": home,
        "away": away,
        "venue": venue_label(raw),
        "home_score": raw.get("HomeTeamScore"),
        "away_score": raw.get("AwayTeamScore"),
        "finished": is_finished_match(raw),
    }


def draw_team_names(draw: list[dict]) -> set[str]:
    names: set[str] = set()
    for entry in draw:
        for team in entry["teams"]:
            names.add(team)
    return names


def load_name_map() -> tuple[set[str], dict[str, str]]:
    draw = load_json("draw.json")
    fifa = load_json("fifa-teams.json")
    draw_names = draw_team_names(draw)
    return draw_names, fifa_to_draw_names(fifa, draw_names)


def fetch_fixtures() -> tuple[list[dict], str]:
    """Return (fixtures, fetched_at_iso)."""
    draw_names, name_map = load_name_map()
    raw_matches = fetch_raw_matches()
    fixtures = [convert_match(match, name_map) for match in raw_matches]
    fixtures.sort(key=lambda item: (item.get("kickoff_utc") or "", item.get("id") or ""))
    fetched_at = datetime.now(timezone.utc).isoformat()
    return fixtures, fetched_at


def write_fixtures(fixtures: list[dict], fetched_at: str) -> Path:
    payload = {
        "source_url": FIFA_FIXTURES_URL,
        "source_api": FIFA_API_URL,
        "fetched_at": fetched_at,
        "fixture_count": len(fixtures),
        "fixtures": fixtures,
    }
    DATA.mkdir(parents=True, exist_ok=True)
    path = DATA / "fixtures.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def fetch_and_write_fixtures() -> tuple[list[dict], Path]:
    try:
        fixtures, fetched_at = fetch_fixtures()
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Failed to fetch FIFA fixtures API: {exc}") from exc
    if not fixtures:
        raise RuntimeError("FIFA fixtures API returned no matches")
    path = write_fixtures(fixtures, fetched_at)
    return fixtures, path
