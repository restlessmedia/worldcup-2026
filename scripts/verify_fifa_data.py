"""Verify draw teams are covered by official FIFA team data."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUTPUT = ROOT / "output"


def main() -> int:
    draw = json.loads((DATA / "draw.json").read_text(encoding="utf-8"))
    fifa = json.loads((DATA / "fifa-teams.json").read_text(encoding="utf-8"))
    draw_map = fifa["draw_name_map"]
    fifa_names = {team["fifa_name"] for team in fifa["teams"]}

    issues = []
    rows = []
    for entry in draw:
        for team_name in entry["teams"]:
            fifa_name = draw_map.get(team_name, team_name)
            ok = fifa_name in fifa_names
            if not ok:
                issues.append(f"House {entry['house_id']}: '{team_name}' has no FIFA mapping")
            fifa_team = next((t for t in fifa["teams"] if t["fifa_name"] == fifa_name), {})
            rows.append(
                {
                    "house_id": entry["house_id"],
                    "draw_name": team_name,
                    "fifa_name": fifa_name,
                    "group": fifa_team.get("group"),
                    "world_ranking": fifa_team.get("world_ranking"),
                    "matched": ok,
                }
            )

    unique_draw_teams = {name for entry in draw for name in entry["teams"]}
    report = [
        "# FIFA data verification",
        "",
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"FIFA source: {fifa['source_url']}",
        f"FIFA data fetched: {fifa['fetched_at']}",
        f"Result: **{'PASS' if not issues else 'FAIL'}**",
        "",
        f"- Draw teams: {len(unique_draw_teams)}",
        f"- FIFA teams: {fifa['team_count']}",
        f"- Unmapped: {len(issues)}",
        "",
        "## Draw team mapping",
        "",
        "| House | Draw name | FIFA name | Group | Rank |",
        "| --- | --- | --- | --- | ---: |",
    ]
    for row in rows:
        report.append(
            f"| {row['house_id']} | {row['draw_name']} | {row['fifa_name']} | "
            f"{row.get('group', '?')} | {row.get('world_ranking', '?')} |"
        )

    if issues:
        report.extend(["", "## Issues", ""])
        report.extend(f"- {issue}" for issue in issues)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / "fifa-verification-report.md"
    path.write_text("\n".join(report) + "\n", encoding="utf-8")

    print(f"Report: {path}")
    if issues:
        for issue in issues:
            print(f"  - {issue}", file=sys.stderr)
        return 1

    print("All draw teams mapped to official FIFA data.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
