"""Publish sanitized JSON into app/data/ for the GitHub Pages dashboard."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from build_fixtures import build_fixtures
from build_knockout import build_knockout
from build_standings import build_standings

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
APP_DATA = ROOT / "app" / "data"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def public_draw(draw: list[dict]) -> list[dict]:
    return [{"house_id": entry["house_id"], "teams": entry["teams"]} for entry in draw]


def public_config(config: dict) -> dict:
    return {
        "tournament": config["tournament"],
        "currency": config["currency"],
        "prizes": [
            {
                "name": p["name"],
                "percent": p.get("percent"),
                "amount_gbp": round(p["amount_gbp"], 2) if p.get("amount_gbp") is not None else None,
            }
            for p in config["prizes"]
        ],
        "scoring_model": config["scoring_model"],
        "notes": config["notes"],
        "side_prize_tie_break": config.get("side_prize_tie_break"),
    }


def public_fifa_teams(fifa: dict) -> dict:
    return {
        "source_url": fifa["source_url"],
        "fetched_at": fifa["fetched_at"],
        "teams": [
            {
                "fifa_name": t["fifa_name"],
                "fifa_code": t["fifa_code"],
                "group": t["group"],
                "world_ranking": t["world_ranking"],
            }
            for t in fifa["teams"]
        ],
    }


def public_results(results: dict) -> dict:
    return {
        "last_updated": results.get("last_updated"),
        "source_url": results.get("source_url"),
        "source_label": results.get("source_label"),
        "teams_eliminated": results.get("teams_eliminated") or [],
        "goals_conceded": results.get("goals_conceded") or {},
    }


def main() -> None:
    standings = build_standings()
    knockout = build_knockout()
    fixtures = build_fixtures()
    draw = load_json(DATA / "draw.json")
    config = load_json(DATA / "config.json")
    fifa = load_json(DATA / "fifa-teams.json")
    provenance = load_json(DATA / "provenance.json")
    results = load_json(DATA / "results.json")

    repo = "https://github.com/restlessmedia/worldcup-2026"
    meta = {
        "published_at": datetime.now(timezone.utc).isoformat(),
        "draw_locked": provenance.get("exported_on"),
        "fifa_data_date": fifa.get("fetched_at"),
        "fifa_source": fifa.get("source_url"),
        "results_source_url": results.get("source_url"),
        "results_source_label": results.get("source_label"),
        "results_updated": results.get("last_updated"),
        "fixtures_fetched": fixtures.get("fetched_at"),
        "fixtures_source": fixtures.get("source_url"),
        "update_guide_url": f"{repo}/blob/main/docs/updating-data.md",
        "results_file_url": f"{repo}/blob/main/data/results.json",
        "site_phase": 1,
    }

    APP_DATA.mkdir(parents=True, exist_ok=True)
    outputs = {
        "draw.json": public_draw(draw),
        "standings.json": standings,
        "config.json": public_config(config),
        "fifa-teams.json": public_fifa_teams(fifa),
        "results.json": public_results(results),
        "knockout.json": knockout,
        "fixtures.json": fixtures,
        "meta.json": meta,
    }

    for name, payload in outputs.items():
        path = APP_DATA / name
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {path}")

    (DATA / "standings.json").write_text(
        json.dumps(standings, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print("Published site data for GitHub Pages.")


if __name__ == "__main__":
    main()
