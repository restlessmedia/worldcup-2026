"""Sync data/knockout.json from FIFA calendar knockout fixtures."""

from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

from build_knockout import ensure_knockout_file  # noqa: E402
from fifa_source import fetch_and_write_fixtures, load_json  # noqa: E402
from knockout_placeholders import (  # noqa: E402
    fifa_match_number_to_bracket_id,
    resolve_placeholder,
)
from tournament_groups import (  # noqa: E402
    all_groups_complete,
    fifa_group_lookup,
    group_standings,
    load_draw_names,
    qualifying_third_place_teams,
)

KNOCKOUT_STAGES = {"r32", "r16", "qf", "sf", "third", "final"}


def is_draw_team(name: str | None, draw_names: set[str]) -> bool:
    return bool(name and name in draw_names)


def knockout_match_outcomes(
    fixtures: list[dict], draw_names: set[str]
) -> tuple[dict[int, str], dict[int, str]]:
    winners: dict[int, str] = {}
    losers: dict[int, str] = {}
    for fixture in fixtures:
        if fixture.get("stage") not in KNOCKOUT_STAGES or not fixture.get("finished"):
            continue
        match_number = fixture.get("match_number")
        home = fixture.get("home")
        away = fixture.get("away")
        if match_number is None or not is_draw_team(home, draw_names) or not is_draw_team(away, draw_names):
            continue
        home_score = fixture.get("home_score")
        away_score = fixture.get("away_score")
        if home_score is None or away_score is None or home_score == away_score:
            continue
        winner = home if home_score > away_score else away
        loser = away if winner == home else home
        winners[int(match_number)] = winner
        losers[int(match_number)] = loser
    return winners, losers


def resolve_side(
    value: str | None,
    *,
    standings: dict[str, list[dict]],
    match_winners: dict[int, str],
    match_losers: dict[int, str],
    draw_names: set[str],
    qualifying_thirds: set[str],
) -> str | None:
    if is_draw_team(value, draw_names):
        return value
    return resolve_placeholder(
        value,
        standings=standings,
        match_winners=match_winners,
        match_losers=match_losers,
        draw_names=draw_names,
        qualifying_thirds=qualifying_thirds,
    )


def sync_knockout_payload(fixtures: list[dict]) -> tuple[dict, dict]:
    draw_names = load_draw_names()
    fifa_groups = fifa_group_lookup()
    standings = group_standings(fixtures, draw_names, fifa_groups)
    qualifying_thirds = qualifying_third_place_teams(standings)
    match_winners, match_losers = knockout_match_outcomes(fixtures, draw_names)

    existing = deepcopy(ensure_knockout_file())
    by_id: dict[str, dict] = {}
    for round_data in existing["rounds"]:
        for match in round_data["matches"]:
            by_id[match["id"]] = match

    notes: list[str] = []
    filled_r32 = 0

    for fixture in fixtures:
        if fixture.get("stage") not in KNOCKOUT_STAGES:
            continue
        match_number = fixture.get("match_number")
        bracket_id = fifa_match_number_to_bracket_id(int(match_number)) if match_number else None
        if not bracket_id or bracket_id not in by_id:
            continue

        target = by_id[bracket_id]
        home = resolve_side(
            fixture.get("home"),
            standings=standings,
            match_winners=match_winners,
            match_losers=match_losers,
            draw_names=draw_names,
            qualifying_thirds=qualifying_thirds,
        )
        away = resolve_side(
            fixture.get("away"),
            standings=standings,
            match_winners=match_winners,
            match_losers=match_losers,
            draw_names=draw_names,
            qualifying_thirds=qualifying_thirds,
        )

        if home and target.get("home") != home:
            notes.append(f"{bracket_id} home: {target.get('home')} → {home}")
            target["home"] = home
        if away and target.get("away") != away:
            notes.append(f"{bracket_id} away: {target.get('away')} → {away}")
            target["away"] = away

        if fixture.get("finished"):
            hs, aw = fixture.get("home_score"), fixture.get("away_score")
            if hs is not None and aw is not None:
                if target.get("home_score") != hs or target.get("away_score") != aw:
                    notes.append(f"{bracket_id} score: {target.get('home_score')}-{target.get('away_score')} → {hs}-{aw}")
                target["home_score"] = hs
                target["away_score"] = aw

        if bracket_id.startswith("r32-") and target.get("home") and target.get("away"):
            filled_r32 += 1

    phase = existing.get("phase") or "pre_knockout"
    if filled_r32 > 0 or any(
        by_id[mid].get("home") and by_id[mid].get("away")
        for mid in by_id
        if not mid.startswith("r32-")
    ):
        phase = "knockout"

    payload = {
        "phase": phase,
        "last_updated": existing.get("last_updated"),
        "notes": existing.get("notes"),
        "rounds": existing["rounds"],
    }
    details = {
        "filled_r32": filled_r32,
        "all_groups_complete": all_groups_complete(standings),
        "notes": notes,
    }
    return payload, details


def knockout_fingerprint(payload: dict) -> str:
    material = {
        "phase": payload.get("phase"),
        "rounds": payload.get("rounds"),
    }
    return json.dumps(material, sort_keys=True, ensure_ascii=False)


def sync_knockout(
    fixtures: list[dict] | None = None,
    *,
    write: bool = True,
    refresh_fixtures: bool = False,
) -> dict[str, Any]:
    if refresh_fixtures:
        fixtures, fixture_path = fetch_and_write_fixtures()
    elif fixtures is None:
        fixtures = load_json("fixtures.json").get("fixtures") or []
        fixture_path = None
    else:
        fixture_path = None

    proposed, details = sync_knockout_payload(fixtures)
    existing = load_json("knockout.json")
    changed = knockout_fingerprint(proposed) != knockout_fingerprint(existing)
    if changed:
        proposed["last_updated"] = date.today().isoformat()

    result: dict[str, Any] = {
        "changed": changed,
        "proposed": proposed,
        "details": details,
        "fixture_path": str(fixture_path) if fixture_path else None,
    }

    if write and changed:
        path = DATA / "knockout.json"
        path.write_text(json.dumps(proposed, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        result["knockout_path"] = str(path)
    elif write:
        result["knockout_path"] = str(DATA / "knockout.json")
        result["skipped_write"] = True

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync knockout.json from FIFA calendar API.")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-fetch", action="store_true")
    args = parser.parse_args()

    try:
        outcome = sync_knockout(
            refresh_fixtures=not args.no_fetch,
            write=not args.dry_run,
        )
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Round of 32 fixtures set: {outcome['details']['filled_r32']}/16")
    print(f"Phase: {outcome['proposed']['phase']}")
    for note in outcome["details"]["notes"]:
        print(f"  {note}")
    if outcome["changed"]:
        print("\nKnockout changed — written to data/knockout.json" if not args.dry_run else "\nKnockout would change (dry run).")
    else:
        print("\nNo changes — knockout.json already up to date.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
