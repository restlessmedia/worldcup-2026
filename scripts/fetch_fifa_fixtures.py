"""Fetch FIFA World Cup 2026 fixtures from the official FIFA calendar API.

Source page: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
API: https://api.fifa.com/api/v3/calendar/matches

Re-run any time schedules change:
  python scripts/fetch_fifa_fixtures.py
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

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


def load_json(name: str) -> dict:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


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


def fetch_matches() -> list[dict]:
    request = urllib.request.Request(
        FIFA_API_URL,
        headers={"User-Agent": "worldcup-sweepstake/1.0"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return payload.get("Results") or []


def convert_match(raw: dict, name_map: dict[str, str]) -> dict:
    stage_label = locale_text(raw.get("StageName")) or "Unknown"
    stage = STAGE_MAP.get(stage_label, stage_label.lower().replace(" ", "_"))
    home = resolve_team_label(raw.get("Home"), raw.get("PlaceHolderA"), name_map)
    away = resolve_team_label(raw.get("Away"), raw.get("PlaceHolderB"), name_map)

    fixture = {
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
    }
    return fixture


def write_fixtures(fixtures: list[dict]) -> Path:
    payload = {
        "source_url": FIFA_FIXTURES_URL,
        "source_api": FIFA_API_URL,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "fixture_count": len(fixtures),
        "fixtures": fixtures,
    }
    DATA.mkdir(parents=True, exist_ok=True)
    path = DATA / "fixtures.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def main() -> int:
    draw = load_json("draw.json")
    fifa = load_json("fifa-teams.json")
    draw_names = {team for entry in draw for team in entry["teams"]}
    name_map = fifa_to_draw_names(fifa, draw_names)

    try:
        raw_matches = fetch_matches()
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"Failed to fetch FIFA fixtures API: {exc}", file=sys.stderr)
        return 1

    if not raw_matches:
        print("FIFA fixtures API returned no matches.", file=sys.stderr)
        return 1

    fixtures = [convert_match(match, name_map) for match in raw_matches]
    fixtures.sort(key=lambda item: (item.get("kickoff_utc") or "", item.get("id") or ""))

    unknown = sorted(
        {
            label
            for fixture in fixtures
            for label in (fixture.get("home"), fixture.get("away"))
            if label and label not in draw_names and not re.fullmatch(r"[0-9A-Z/]+", label)
        }
    )
    if unknown:
        print(f"Warning: {len(unknown)} team labels are not in the draw list:", file=sys.stderr)
        for label in unknown[:10]:
            print(f"  - {label}", file=sys.stderr)

    path = write_fixtures(fixtures)
    print(f"Wrote {path} ({len(fixtures)} fixtures from official FIFA API)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
