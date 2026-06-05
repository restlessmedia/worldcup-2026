"""Build enriched fixtures snapshot for the public site."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from build_knockout import enrich_team
from build_standings import fifa_lookup, load_json, short_name
from placeholder_labels import placeholder_display_name

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

PLACEHOLDER_RE = re.compile(r"^[0-9A-Z]+(/[0-9A-Z]+)*$|^W[0-9]+$|^RU[0-9]+$|^L[0-9]+$")


def is_placeholder(name: str | None) -> bool:
    if not name:
        return True
    return bool(PLACEHOLDER_RE.fullmatch(name.replace(" ", "")))


def enrich_side(
    draw_name: str | None,
    lookup: dict,
    eliminated: set[str],
    draw_to_house: dict,
) -> dict | None:
    if not draw_name:
        return None
    if is_placeholder(draw_name):
        return {
            "draw_name": draw_name,
            "display_name": placeholder_display_name(draw_name),
            "fifa_code": None,
            "house_id": None,
            "group": None,
            "fifa_rank": None,
            "status": "placeholder",
        }
    return enrich_team(draw_name, lookup, eliminated, draw_to_house)


def build_fixtures() -> dict:
    raw_path = DATA / "fixtures.json"
    if not raw_path.exists():
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_url": None,
            "fetched_at": None,
            "fixture_count": 0,
            "fixtures": [],
            "notes": "Run python scripts/fetch_fifa_fixtures.py to populate fixtures.",
        }

    raw = load_json("fixtures.json")
    draw = load_json("draw.json")
    results = load_json("results.json")
    fifa = load_json("fifa-teams.json")
    lookup = fifa_lookup(fifa)
    eliminated = set(results.get("teams_eliminated") or [])

    draw_to_house = {}
    for entry in draw:
        for team_name in entry["teams"]:
            draw_to_house[team_name] = str(entry["house_id"])

    enriched = []
    for fixture in raw.get("fixtures") or []:
        home = enrich_side(fixture.get("home"), lookup, eliminated, draw_to_house)
        away = enrich_side(fixture.get("away"), lookup, eliminated, draw_to_house)
        played = fixture.get("home_score") is not None and fixture.get("away_score") is not None
        enriched.append(
            {
                "id": fixture["id"],
                "stage": fixture.get("stage"),
                "stage_label": fixture.get("stage_label"),
                "group": fixture.get("group"),
                "matchday": fixture.get("matchday"),
                "match_number": fixture.get("match_number"),
                "kickoff_utc": fixture.get("kickoff_utc"),
                "venue": fixture.get("venue"),
                "home": home,
                "away": away,
                "home_score": fixture.get("home_score"),
                "away_score": fixture.get("away_score"),
                "played": played,
            }
        )

    dates = [item["kickoff_utc"] for item in enriched if item.get("kickoff_utc")]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_url": raw.get("source_url"),
        "fetched_at": raw.get("fetched_at"),
        "fixture_count": len(enriched),
        "date_range": {
            "first": min(dates) if dates else None,
            "last": max(dates) if dates else None,
        },
        "fixtures": enriched,
    }


def main() -> None:
    payload = build_fixtures()
    out = DATA / "fixtures-view.json"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({payload['fixture_count']} fixtures)")


if __name__ == "__main__":
    main()
