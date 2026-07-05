"""Build enriched knockout bracket view for the public site."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

from build_standings import fifa_lookup, load_json, short_name

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

ROUND_SPECS = [
    ("r32", "Round of 32", 16),
    ("r16", "Round of 16", 8),
    ("qf", "Quarter-finals", 4),
    ("sf", "Semi-finals", 2),
    ("third", "3rd place play-off", 1),
    ("final", "Final", 1),
]

# FIFA 2026 R32 → R16 paths (winner of match N feeds listed R16 slot).
ADVANCEMENT = {
    "r32-02": ("r16-01", "home"),  # M74
    "r32-05": ("r16-01", "away"),  # M77
    "r32-01": ("r16-02", "home"),  # M73
    "r32-03": ("r16-02", "away"),  # M75
    "r32-04": ("r16-03", "home"),  # M76
    "r32-06": ("r16-03", "away"),  # M78
    "r32-07": ("r16-04", "home"),  # M79
    "r32-08": ("r16-04", "away"),  # M80
    "r32-11": ("r16-05", "home"),  # M83
    "r32-12": ("r16-05", "away"),  # M84
    "r32-09": ("r16-06", "home"),  # M81
    "r32-10": ("r16-06", "away"),  # M82
    "r32-14": ("r16-07", "home"),  # M86
    "r32-16": ("r16-07", "away"),  # M88
    "r32-13": ("r16-08", "home"),  # M85
    "r32-15": ("r16-08", "away"),  # M87
    "r16-01": ("qf-01", "home"),
    "r16-02": ("qf-01", "away"),
    "r16-03": ("qf-02", "home"),
    "r16-04": ("qf-02", "away"),
    "r16-05": ("qf-03", "home"),
    "r16-06": ("qf-03", "away"),
    "r16-07": ("qf-04", "home"),
    "r16-08": ("qf-04", "away"),
    "qf-01": ("sf-01", "home"),
    "qf-02": ("sf-01", "away"),
    "qf-03": ("sf-02", "home"),
    "qf-04": ("sf-02", "away"),
    "sf-01": ("final-01", "home"),
    "sf-02": ("final-01", "away"),
}


def default_knockout() -> dict:
    rounds = []
    for round_id, label, count in ROUND_SPECS:
        matches = []
        for index in range(1, count + 1):
            match_id = f"{round_id}-{index:02d}"
            matches.append(
                {
                    "id": match_id,
                    "home": None,
                    "away": None,
                    "home_score": None,
                    "away_score": None,
                    "winner": None,
                }
            )
        rounds.append({"id": round_id, "label": label, "matches": matches})
    return {
        "phase": "pre_knockout",
        "last_updated": None,
        "notes": "Set phase to 'knockout' and fill Round of 32 teams once group stage ends.",
        "rounds": rounds,
    }


def ensure_knockout_file() -> dict:
    path = DATA / "knockout.json"
    if not path.exists():
        payload = default_knockout()
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return payload
    return load_json("knockout.json")


def match_index(bracket: dict) -> dict[str, dict]:
    lookup: dict[str, dict] = {}
    for round_data in bracket["rounds"]:
        for match in round_data["matches"]:
            lookup[match["id"]] = match
    return lookup


def resolve_winner(match: dict) -> str | None:
    if match.get("winner"):
        return match["winner"]
    home_score = match.get("home_score")
    away_score = match.get("away_score")
    if home_score is None or away_score is None:
        return None
    if home_score == away_score:
        return None
    return match["home"] if home_score > away_score else match["away"]


def apply_advancement(bracket: dict) -> None:
    by_id = match_index(bracket)
    for match_id, (target_id, slot) in ADVANCEMENT.items():
        source = by_id.get(match_id)
        target = by_id.get(target_id)
        if not source or not target:
            continue
        winner = resolve_winner(source)
        if not winner:
            continue
        if target.get(slot) is None:
            target[slot] = winner


def enrich_team(
    draw_name: str | None, lookup: dict, eliminated: set[str], draw_to_house: dict
) -> dict | None:
    if not draw_name:
        return None
    info = lookup.get(draw_name)
    if not info:
        return {
            "draw_name": draw_name,
            "display_name": draw_name,
            "fifa_code": None,
            "house_id": draw_to_house.get(draw_name),
            "status": "unknown",
        }
    canonical_draw_name = info.get("draw_name") or draw_name
    status = "eliminated" if canonical_draw_name in eliminated else "alive"
    return {
        "draw_name": canonical_draw_name,
        "display_name": short_name(info["fifa_name"]),
        "fifa_code": info["fifa_code"],
        "house_id": draw_to_house.get(canonical_draw_name, draw_to_house.get(draw_name)),
        "group": info.get("group"),
        "fifa_rank": info.get("world_ranking"),
        "status": status,
    }


def enrich_match(match: dict, lookup: dict, eliminated: set[str], draw_to_house: dict) -> dict:
    winner_name = resolve_winner(match)
    home = enrich_team(match.get("home"), lookup, eliminated, draw_to_house)
    away = enrich_team(match.get("away"), lookup, eliminated, draw_to_house)
    winner = enrich_team(winner_name, lookup, eliminated, draw_to_house) if winner_name else None

    return {
        "id": match["id"],
        "home": home,
        "away": away,
        "home_score": match.get("home_score"),
        "away_score": match.get("away_score"),
        "winner": winner,
        "played": match.get("home_score") is not None and match.get("away_score") is not None,
    }


def houses_in_round(round_matches: list[dict]) -> list[str]:
    houses: set[str] = set()
    for match in round_matches:
        for side in ("home", "away"):
            team = match.get(side)
            if team and team.get("house_id"):
                houses.add(str(team["house_id"]))
    return sorted(houses, key=lambda h: (not h.isdigit(), int(h) if h.isdigit() else h.lower()))


def teams_in_round(round_matches: list[dict]) -> set[str]:
    teams: set[str] = set()
    for match in round_matches:
        for side in ("home", "away"):
            team = match.get(side)
            if team and team.get("draw_name"):
                teams.add(team["draw_name"])
    return teams


def build_knockout() -> dict:
    raw = deepcopy(ensure_knockout_file())
    draw = load_json("draw.json")
    results = load_json("results.json")
    fifa = load_json("fifa-teams.json")
    lookup = fifa_lookup(fifa)
    eliminated = set(results.get("teams_eliminated") or [])

    draw_to_house = {}
    for entry in draw:
        for team_name in entry["teams"]:
            draw_to_house[team_name] = str(entry["house_id"])

    working = deepcopy(raw)
    apply_advancement(working)

    enriched_rounds = []
    for round_data in working["rounds"]:
        enriched_matches = [
            enrich_match(match, lookup, eliminated, draw_to_house) for match in round_data["matches"]
        ]
        enriched_rounds.append(
            {
                "id": round_data["id"],
                "label": round_data["label"],
                "matches": enriched_matches,
                "houses": houses_in_round(enriched_matches),
                "teams_count": len(teams_in_round(enriched_matches)),
            }
        )

    alive_houses = set()
    for entry in draw:
        if any(team not in eliminated for team in entry["teams"]):
            alive_houses.add(str(entry["house_id"]))

    phase = raw.get("phase") or "pre_knockout"
    r32 = next((r for r in enriched_rounds if r["id"] == "r32"), None)
    r32_teams = r32["teams_count"] if r32 else 0

    return {
        "phase": phase,
        "last_updated": raw.get("last_updated"),
        "notes": raw.get("notes"),
        "summary": {
            "houses_alive": len(alive_houses),
            "teams_in_bracket": r32_teams if phase == "knockout" else 0,
            "r32_fixtures_set": sum(
                1
                for match in (r32["matches"] if r32 else [])
                if match.get("home") and match.get("away")
            ),
        },
        "rounds": enriched_rounds,
    }


def main() -> None:
    payload = build_knockout()
    out = DATA / "knockout-view.json"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out} (phase={payload['phase']})")


if __name__ == "__main__":
    main()
