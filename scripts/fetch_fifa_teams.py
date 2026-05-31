"""Fetch official FIFA World Cup 2026 team list and stats.

Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams

The FIFA teams page is JavaScript-rendered. With Playwright installed, this script
pulls live data from the official page. Without it, use `python scripts/verify_fifa_data.py`
to validate the cached `data/fifa-teams.json`.
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
FIFA_TEAMS_URL = (
    "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams"
)

DRAW_NAME_TO_FIFA = {
    "Bosnia and Herzegovina (Bosnia)": "Bosnia and Herzegovina",
    "Cape Verde": "Cabo Verde",
    "Curacao (Curaçao)": "Curaçao",
    "Czechia (Czech Republic)": "Czechia",
    "DR Congo (Democratic Republic of the Congo)": "Congo DR",
    "Ivory Coast (Côte d'Ivoire)": "Côte d'Ivoire",
    "Iran": "IR Iran",
    "Netherlands (Holland)": "Netherlands",
    "South Korea (Korea Republic)": "Korea Republic",
    "Türkiye (Turkey)": "Türkiye",
    "USA (United States)": "USA",
}

FIFA_CODES = {
    "Canada": "CAN",
    "Mexico": "MEX",
    "USA": "USA",
    "Algeria": "ALG",
    "Argentina": "ARG",
    "Australia": "AUS",
    "Austria": "AUT",
    "Belgium": "BEL",
    "Bosnia and Herzegovina": "BIH",
    "Brazil": "BRA",
    "Cabo Verde": "CPV",
    "Colombia": "COL",
    "Congo DR": "COD",
    "Côte d'Ivoire": "CIV",
    "Croatia": "CRO",
    "Curaçao": "CUW",
    "Czechia": "CZE",
    "Ecuador": "ECU",
    "Egypt": "EGY",
    "England": "ENG",
    "France": "FRA",
    "Germany": "GER",
    "Ghana": "GHA",
    "Haiti": "HAI",
    "IR Iran": "IRN",
    "Iraq": "IRQ",
    "Japan": "JPN",
    "Jordan": "JOR",
    "Korea Republic": "KOR",
    "Morocco": "MAR",
    "Netherlands": "NED",
    "New Zealand": "NZL",
    "Norway": "NOR",
    "Panama": "PAN",
    "Paraguay": "PAR",
    "Portugal": "POR",
    "Qatar": "QAT",
    "Saudi Arabia": "KSA",
    "Scotland": "SCO",
    "Senegal": "SEN",
    "South Africa": "RSA",
    "Spain": "ESP",
    "Sweden": "SWE",
    "Switzerland": "SUI",
    "Tunisia": "TUN",
    "Türkiye": "TUR",
    "Uruguay": "URU",
    "Uzbekistan": "UZB",
}


def parse_teams_from_text(text: str) -> list[dict]:
    pattern = re.compile(
        r"(?:Host country )?"
        r"(?P<name>[A-Za-zÀ-ÖØ-öø-ÿ' .]+?)"
        r"\s+Stage Group (?P<group>[A-L]) "
        r"World Ranking (?P<rank>\d+) "
        r"Participations (?P<participations>\d+)"
    )
    teams = []
    seen: set[str] = set()
    for match in pattern.finditer(text):
        name = match.group("name").strip()
        if name in seen:
            continue
        seen.add(name)
        teams.append(
            {
                "fifa_name": name,
                "fifa_code": FIFA_CODES.get(name),
                "group": match.group("group"),
                "world_ranking": int(match.group("rank")),
                "world_cup_appearances": int(match.group("participations")),
                "is_host": name in {"Canada", "Mexico", "USA"},
            }
        )
    teams.sort(key=lambda item: item["fifa_name"])
    return teams


def fetch_with_playwright() -> str:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(FIFA_TEAMS_URL, wait_until="networkidle", timeout=60000)
        text = page.inner_text("body")
        browser.close()
    return text


def write_fifa_teams(teams: list[dict]) -> None:
    draw_map = dict(DRAW_NAME_TO_FIFA)
    for team in teams:
        draw_map.setdefault(team["fifa_name"], team["fifa_name"])

    payload = {
        "source_url": FIFA_TEAMS_URL,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "team_count": len(teams),
        "draw_name_map": draw_map,
        "teams": teams,
    }
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "fifa-teams.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
    except ImportError:
        print(
            "Playwright not installed. To refresh from FIFA live:\n"
            "  pip install playwright\n"
            "  playwright install chromium\n"
            "  python scripts/fetch_fifa_teams.py\n\n"
            "Using cached data/fifa-teams.json instead.",
            file=sys.stderr,
        )
        cached = DATA / "fifa-teams.json"
        if not cached.exists():
            return 1
        data = json.loads(cached.read_text(encoding="utf-8"))
        print(f"Cached FIFA data: {data['team_count']} teams, fetched {data['fetched_at']}")
        return 0

    try:
        text = fetch_with_playwright()
    except Exception as exc:
        print(f"Failed to fetch FIFA teams page: {exc}", file=sys.stderr)
        return 1

    teams = parse_teams_from_text(text)
    if len(teams) != 48:
        print(f"Expected 48 teams from FIFA page, found {len(teams)}.", file=sys.stderr)
        return 1

    write_fifa_teams(teams)
    print(f"Wrote {DATA / 'fifa-teams.json'} ({len(teams)} teams from official FIFA page)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
