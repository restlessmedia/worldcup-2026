"""Fetch FIFA World Cup 2026 fixtures from the official FIFA calendar API.

Source page: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
API: https://api.fifa.com/api/v3/calendar/matches

Re-run any time schedules change:
  python scripts/fetch_fifa_fixtures.py
"""

from __future__ import annotations

import re
import sys

from fifa_source import draw_team_names, fetch_and_write_fixtures, load_json


def main() -> int:
    draw = load_json("draw.json")
    draw_names = draw_team_names(draw)

    try:
        fixtures, path = fetch_and_write_fixtures()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

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

    print(f"Wrote {path} ({len(fixtures)} fixtures from official FIFA API)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
