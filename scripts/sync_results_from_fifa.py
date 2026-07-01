"""Derive tournament results from the official FIFA calendar API.

Computes cumulative goals conceded and eliminations from finished matches.
Idempotent: re-running with unchanged FIFA data produces no file write.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from copy import deepcopy
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

from fifa_source import (  # noqa: E402
    FIFA_FIXTURES_URL,
    fetch_and_write_fixtures,
    load_json,
)
from tournament_groups import (  # noqa: E402
    all_groups_complete,
    fifa_group_lookup,
    group_is_complete,
    group_standings,
    load_draw_names,
    mathematically_eliminated_teams,
    third_place_rank_key,
)

PLACEHOLDER_RE = re.compile(r"^[0-9A-Z]+(/[0-9A-Z]+)*$|^W[0-9]+$|^RU[0-9]+$|^L[0-9]+$")

KNOCKOUT_STAGES = frozenset({"r32", "r16", "qf", "sf", "third", "final"})
LATER_KNOCKOUT_STAGES = frozenset({"r16", "qf", "sf", "third", "final"})


def is_draw_team(name: str | None, draw_names: set[str]) -> bool:
    return bool(name and name in draw_names)


def is_placeholder(name: str | None) -> bool:
    if not name:
        return True
    return bool(PLACEHOLDER_RE.fullmatch(name.replace(" ", "")))


def teams_in_later_knockout_rounds(fixtures: list[dict], draw_names: set[str]) -> set[str]:
    """Teams FIFA has already placed in R16 or beyond."""
    teams: set[str] = set()
    for fixture in fixtures:
        if fixture.get("stage") not in LATER_KNOCKOUT_STAGES:
            continue
        for side in (fixture.get("home"), fixture.get("away")):
            if is_draw_team(side, draw_names):
                teams.add(side)
    return teams


def knockout_match_decided(
    fixture: dict,
    draw_names: set[str],
    later_teams: set[str],
) -> bool:
    """True when a knockout tie is settled (finished or winner placed in a later round)."""
    if fixture.get("finished"):
        return True
    if fixture.get("stage") not in KNOCKOUT_STAGES:
        return False
    home = fixture.get("home")
    away = fixture.get("away")
    if not is_draw_team(home, draw_names) or not is_draw_team(away, draw_names):
        return False
    home_score = fixture.get("home_score")
    away_score = fixture.get("away_score")
    if home_score is None or away_score is None:
        return False
    home_later = home in later_teams
    away_later = away in later_teams
    return home_later != away_later


def goals_conceded_from_fixtures(fixtures: list[dict], draw_names: set[str]) -> dict[str, int]:
    later_teams = teams_in_later_knockout_rounds(fixtures, draw_names)
    totals: dict[str, int] = {}
    for fixture in fixtures:
        if not fixture.get("finished") and not knockout_match_decided(
            fixture, draw_names, later_teams
        ):
            continue
        home = fixture.get("home")
        away = fixture.get("away")
        home_score = fixture.get("home_score")
        away_score = fixture.get("away_score")
        if home_score is None or away_score is None:
            continue
        if is_draw_team(home, draw_names) and not is_placeholder(away):
            totals[home] = totals.get(home, 0) + int(away_score)
        if is_draw_team(away, draw_names) and not is_placeholder(home):
            totals[away] = totals.get(away, 0) + int(home_score)
    return totals


def eliminations_from_groups(
    fixtures: list[dict], draw_names: set[str], fifa_groups: dict[str, str]
) -> tuple[list[str], list[str]]:
    """Return (eliminated teams, notes)."""
    notes: list[str] = []
    standings = group_standings(fixtures, draw_names, fifa_groups)
    eliminated: set[str] = set()

    for group, rows in sorted(standings.items()):
        if not group_is_complete(group, standings):
            continue
        fourth = rows[3]["team"]
        eliminated.add(fourth)
        notes.append(f"Group {group}: {fourth} eliminated (4th place)")

    if not all_groups_complete(standings):
        return sorted(eliminated), notes

    third_places = [rows[2] for rows in standings.values() if len(rows) >= 3]
    third_places.sort(key=third_place_rank_key)
    qualifying_thirds = {row["team"] for row in third_places[:8]}
    for row in third_places:
        if row["team"] not in qualifying_thirds:
            eliminated.add(row["team"])
            notes.append(f"{row['team']} eliminated (3rd place, not among best 8)")

    return sorted(eliminated), notes


def eliminations_from_bracket_progression(
    fixtures: list[dict], draw_names: set[str]
) -> tuple[list[str], list[str]]:
    """Infer losers when FIFA advances a winner but leaves the match unfinished or tied.

  Common after penalty shootouts: scores stay level and finished=false while the
  winner already appears in a later-round fixture.
    """
    later_teams = teams_in_later_knockout_rounds(fixtures, draw_names)
    notes: list[str] = []
    eliminated: set[str] = set()

    for fixture in fixtures:
        if fixture.get("stage") not in KNOCKOUT_STAGES or fixture.get("stage") == "final":
            continue
        home = fixture.get("home")
        away = fixture.get("away")
        if not is_draw_team(home, draw_names) or not is_draw_team(away, draw_names):
            continue
        home_later = home in later_teams
        away_later = away in later_teams
        if home_later == away_later:
            continue
        home_score = fixture.get("home_score")
        away_score = fixture.get("away_score")
        if home_score is None or away_score is None:
            continue
        loser = away if home_later else home
        winner = home if home_later else away
        eliminated.add(loser)
        notes.append(
            f"{fixture.get('stage_label') or fixture.get('stage')}: {loser} eliminated "
            f"({home} {home_score}-{away_score} {away}; {winner} advanced in bracket)"
        )

    return sorted(eliminated), notes


def eliminations_from_knockout(fixtures: list[dict], draw_names: set[str]) -> tuple[list[str], list[str]]:
    notes: list[str] = []
    eliminated: set[str] = set()
    for fixture in fixtures:
        if fixture.get("stage") == "group" or not fixture.get("finished"):
            continue
        home = fixture.get("home")
        away = fixture.get("away")
        if not is_draw_team(home, draw_names) or not is_draw_team(away, draw_names):
            continue
        home_score = int(fixture["home_score"])
        away_score = int(fixture["away_score"])
        if home_score == away_score:
            continue
        loser = away if home_score > away_score else home
        eliminated.add(loser)
        notes.append(
            f"{fixture.get('stage_label')}: {loser} eliminated "
            f"({home} {home_score}-{away_score} {away})"
        )
    return sorted(eliminated), notes


def canonical_results_payload(
    goals_conceded: dict[str, int],
    teams_eliminated: list[str],
    *,
    last_updated: str | None,
    existing: dict | None = None,
) -> dict[str, Any]:
    base = deepcopy(existing) if existing else {}
    payload = {
        "matches": base.get("matches") or [],
        "teams_eliminated": sorted(teams_eliminated),
        "goals_conceded": dict(sorted(goals_conceded.items())),
        "fair_play_points": base.get("fair_play_points") or {},
        "last_updated": last_updated,
        "source_url": FIFA_FIXTURES_URL,
        "source_label": "FIFA match centre (auto-synced from calendar API)",
        "notes": base.get("notes"),
    }
    return payload


def results_fingerprint(payload: dict) -> str:
    """Stable hash input for idempotency checks."""
    material = {
        "teams_eliminated": payload.get("teams_eliminated") or [],
        "goals_conceded": payload.get("goals_conceded") or {},
        "fair_play_points": payload.get("fair_play_points") or {},
        "source_url": payload.get("source_url"),
        "source_label": payload.get("source_label"),
    }
    return json.dumps(material, sort_keys=True, ensure_ascii=False)


def compute_results(fixtures: list[dict]) -> tuple[dict, dict[str, int], list[str]]:
    draw_names = load_draw_names()
    fifa_groups = fifa_group_lookup()

    goals = goals_conceded_from_fixtures(fixtures, draw_names)
    group_elim, group_notes = eliminations_from_groups(fixtures, draw_names, fifa_groups)
    math_elim, math_notes = mathematically_eliminated_teams(fixtures, draw_names, fifa_groups)
    ko_elim, ko_notes = eliminations_from_knockout(fixtures, draw_names)
    bracket_elim, bracket_notes = eliminations_from_bracket_progression(fixtures, draw_names)
    eliminated = sorted(set(group_elim) | set(math_elim) | set(ko_elim) | set(bracket_elim))

    finished = [f for f in fixtures if f.get("finished")]
    details = {
        "finished_matches": len(finished),
        "goals_teams": len(goals),
        "eliminated_teams": len(eliminated),
        "elimination_notes": group_notes + math_notes + ko_notes + bracket_notes,
        "goals_conceded": goals,
        "teams_eliminated": eliminated,
    }
    return details, goals, eliminated


def sync_results(
    fixtures: list[dict] | None = None,
    *,
    write: bool = True,
    refresh_fixtures: bool = True,
) -> dict[str, Any]:
    fixture_path = None
    if refresh_fixtures:
        fixtures, fixture_path = fetch_and_write_fixtures()
    elif fixtures is None:
        fixtures = (load_json("fixtures.json").get("fixtures") or [])

    details, goals, eliminated = compute_results(fixtures)
    existing = load_json("results.json")
    proposed = canonical_results_payload(
        goals,
        eliminated,
        last_updated=existing.get("last_updated"),
        existing=existing,
    )

    changed = results_fingerprint(proposed) != results_fingerprint(existing)
    if changed:
        proposed["last_updated"] = date.today().isoformat()

    result: dict[str, Any] = {
        "changed": changed,
        "proposed": proposed,
        "previous": existing,
        "details": details,
        "fixture_path": str(fixture_path) if fixture_path else None,
        "finished_matches": details["finished_matches"],
    }

    if write and changed:
        path = DATA / "results.json"
        path.write_text(json.dumps(proposed, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        result["results_path"] = str(path)
    elif write:
        result["results_path"] = str(DATA / "results.json")
        result["skipped_write"] = True

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync results.json from FIFA calendar API.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute and print summary without writing results.json",
    )
    parser.add_argument(
        "--no-fetch",
        action="store_true",
        help="Use existing data/fixtures.json instead of fetching FIFA",
    )
    args = parser.parse_args()

    try:
        outcome = sync_results(refresh_fixtures=not args.no_fetch, write=not args.dry_run)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Finished matches: {outcome['finished_matches']}")
    print(f"Goals recorded:   {len(outcome['details']['goals_conceded'])} teams")
    print(f"Eliminated:       {len(outcome['details']['teams_eliminated'])} teams")
    if outcome["details"]["goals_conceded"]:
        print("Goals conceded:")
        for team, total in sorted(
            outcome["details"]["goals_conceded"].items(),
            key=lambda item: (-item[1], item[0]),
        ):
            print(f"  {team}: {total}")
    if outcome["details"]["elimination_notes"]:
        print("Eliminations:")
        for note in outcome["details"]["elimination_notes"]:
            print(f"  {note}")

    if outcome["changed"]:
        print("\nResults changed — written to data/results.json" if not args.dry_run else "\nResults would change (dry run).")
    else:
        print("\nNo changes — results.json already up to date (idempotent).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
