"""Interactive walkthrough — prompts for tournament data, saves JSON, validates, optionally publishes."""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

FIFA_URL = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures"


def load_json(name: str) -> dict | list:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def save_json(name: str, payload: dict | list) -> None:
    (DATA / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def draw_team_names(draw: list[dict]) -> list[str]:
    names: set[str] = set()
    for entry in draw:
        for team in entry["teams"]:
            names.add(team)
    return sorted(names)


def resolve_team(raw: str, draw_names: list[str], aliases: dict[str, str]) -> str | None:
    key = raw.strip()
    if not key:
        return None
    if key in draw_names:
        return key
    if key in aliases and aliases[key] in draw_names:
        return aliases[key]
    lower = key.lower()
    matches = [name for name in draw_names if name.lower() == lower]
    if len(matches) == 1:
        return matches[0]
    partial = [name for name in draw_names if lower in name.lower()]
    if len(partial) == 1:
        return partial[0]
    return None


def fifa_aliases(fifa: dict) -> dict[str, str]:
    aliases: dict[str, str] = {}
    draw_map = fifa.get("draw_name_map") or {}
    for draw_name, fifa_name in draw_map.items():
        aliases[draw_name] = draw_name
        aliases[fifa_name] = draw_name
    return aliases


def prompt(text: str, default: str | None = None) -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{text}{suffix}: ").strip()
    if not value and default is not None:
        return default
    return value


def confirm(text: str, default_no: bool = True) -> bool:
    hint = "[y/N]" if default_no else "[Y/n]"
    answer = input(f"{text} {hint} ").strip().lower()
    if not answer:
        return not default_no
    return answer in {"y", "yes"}


def parse_team_list(raw: str, draw_names: list[str], aliases: dict[str, str]) -> tuple[list[str], list[str]]:
    if not raw.strip():
        return [], []
    resolved: list[str] = []
    unknown: list[str] = []
    for part in raw.split(","):
        name = resolve_team(part, draw_names, aliases)
        if name:
            if name not in resolved:
                resolved.append(name)
        else:
            unknown.append(part.strip())
    return resolved, unknown


def parse_goals_line(raw: str, draw_names: list[str], aliases: dict[str, str]) -> tuple[str | None, int | None, str | None]:
    if ":" not in raw:
        return None, None, "Use format: Team name: goals (e.g. Belgium: 2)"
    team_part, goals_part = raw.split(":", 1)
    team = resolve_team(team_part, draw_names, aliases)
    if not team:
        return None, None, f"Unknown team: {team_part.strip()}"
    try:
        goals = int(goals_part.strip())
    except ValueError:
        return None, None, f"Goals must be a whole number, got {goals_part.strip()!r}"
    if goals < 0:
        return None, None, "Goals cannot be negative"
    return team, goals, None


def print_header() -> None:
    print()
    print("=" * 60)
    print("  World Cup 2026 sweepstake — update walkthrough")
    print("=" * 60)
    print()
    print(f"Official source: {FIFA_URL}")
    print("Full guide: docs/admin-runbook.md")
    print()


def print_current_state(results: dict, draw_names: list[str]) -> None:
    eliminated = set(results.get("teams_eliminated") or [])
    goals = results.get("goals_conceded") or {}
    still_in = len(draw_names) - len(eliminated)
    print("Current data")
    print("-" * 40)
    print(f"  Last updated:     {results.get('last_updated') or '(not set)'}")
    print(f"  Teams still in:   {still_in} / {len(draw_names)}")
    print(f"  Eliminated:       {len(eliminated)}")
    print(f"  Goals recorded:   {len(goals)} teams")
    if eliminated:
        print(f"  Out:              {', '.join(sorted(eliminated))}")
    print()


def interview_results(results: dict, draw_names: list[str], aliases: dict[str, str]) -> dict:
    updated = json.loads(json.dumps(results))
    eliminated = list(updated.get("teams_eliminated") or [])
    goals = dict(updated.get("goals_conceded") or {})

    print("Step 1 — Date")
    print("Set the date shown on the site after this update.")
    today = date.today().isoformat()
    updated["last_updated"] = prompt("Last updated (YYYY-MM-DD)", updated.get("last_updated") or today)
    print()

    print("Step 2 — Eliminations")
    print("Teams knocked out since your last update.")
    print("Enter comma-separated draw names, or press Enter to skip.")
    print("Example: New Zealand, Ghana")
    raw_elim = input("New eliminations: ").strip()
    if raw_elim:
        new_teams, unknown = parse_team_list(raw_elim, draw_names, aliases)
        for name in unknown:
            print(f"  ! Could not match: {name!r} — check docs/admin-runbook.md for draw names")
        for team in new_teams:
            if team not in eliminated:
                eliminated.append(team)
                print(f"  + Marked eliminated: {team}")
            else:
                print(f"  · Already eliminated: {team}")
    print()

    print("Step 3 — Goals conceded (wooden spoon)")
    print("Enter cumulative totals from FIFA — one team per line.")
    print("Format: Team name: total goals   (blank line when done)")
    if goals:
        print("Current totals (for reference):")
        for team, total in sorted(goals.items(), key=lambda item: (-int(item[1]), item[0]))[:8]:
            print(f"  {team}: {total}")
        if len(goals) > 8:
            print(f"  … and {len(goals) - 8} more")
    while True:
        line = input("Goals update: ").strip()
        if not line:
            break
        team, total, err = parse_goals_line(line, draw_names, aliases)
        if err:
            print(f"  ! {err}")
            continue
        old = goals.get(team)
        goals[team] = total
        if old is None:
            print(f"  + {team}: {total}")
        elif old != total:
            print(f"  ~ {team}: {old} → {total}")
        else:
            print(f"  · {team}: unchanged at {total}")
    print()

    updated["teams_eliminated"] = sorted(eliminated)
    updated["goals_conceded"] = goals
    return updated


def print_review(before: dict, after: dict) -> None:
    print("Step 4 — Review")
    print("-" * 40)
    print(f"  Date:         {after.get('last_updated')}")

    before_elim = set(before.get("teams_eliminated") or [])
    after_elim = set(after.get("teams_eliminated") or [])
    added_elim = after_elim - before_elim
    if added_elim:
        print(f"  Eliminated:   + {', '.join(sorted(added_elim))}")
    else:
        print("  Eliminated:   (no change)")

    before_goals = before.get("goals_conceded") or {}
    after_goals = after.get("goals_conceded") or {}
    goal_changes = []
    for team in sorted(set(before_goals) | set(after_goals)):
        old = before_goals.get(team)
        new = after_goals.get(team)
        if old != new:
            goal_changes.append(f"{team}: {old or 0} → {new}")
    if goal_changes:
        print("  Goals:")
        for line in goal_changes:
            print(f"    {line}")
    else:
        print("  Goals:        (no change)")
    print()


def run_validation() -> int:
    print("Running validation…")
    result = subprocess.run([sys.executable, "scripts/validate_results.py"], cwd=ROOT)
    return result.returncode


def run_publish(skip_build: bool = False) -> int:
    cmd = [sys.executable, "scripts/publish_update.py", "--yes"]
    if skip_build:
        cmd.append("--skip-build")
    result = subprocess.run(cmd, cwd=ROOT)
    return result.returncode


def main() -> int:
    print_header()

    draw = load_json("draw.json")
    fifa = load_json("fifa-teams.json")
    results = load_json("results.json")
    draw_names = draw_team_names(draw)
    aliases = fifa_aliases(fifa)

    print_current_state(results, draw_names)

    print("What would you like to do?")
    print("  1 — Update goals & eliminations (results.json)")
    print("  2 — Validate current data only (no edits)")
    print("  3 — Validate + publish current data (no edits)")
    print("  q — Quit")
    choice = input("Choice [1]: ").strip().lower() or "1"

    if choice in {"q", "quit", "exit"}:
        print("Cancelled.")
        return 0

    if choice == "2":
        return run_validation()

    if choice == "3":
        code = run_validation()
        if code != 0:
            return code
        if confirm("Publish to the site?", default_no=True):
            return run_publish()
        print("Validation complete. Publish skipped.")
        return 0

    if choice != "1":
        print("Unknown choice. Re-run and pick 1, 2, 3, or q.")
        return 1

    print("Open FIFA in your browser if you have not already:")
    print(f"  {FIFA_URL}")
    print()

    before = json.loads(json.dumps(results))
    after = interview_results(results, draw_names, aliases)
    print_review(before, after)

    if not confirm("Save these changes to data/results.json?", default_no=True):
        print("Not saved.")
        return 0

    save_json("results.json", after)
    print("Saved data/results.json")
    print()

    code = run_validation()
    if code != 0:
        print("Fix validation errors, then run: python scripts/publish_update.py")
        return code

    if confirm("Publish to the site now?", default_no=True):
        return run_publish()

    print()
    print("Done. When ready:")
    print("  python scripts/publish_update.py")
    print("  python -m http.server 8080 --directory app")
    print("  commit + push to deploy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
