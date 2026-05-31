"""Verify data/*.json matches archive/draw-results.xlsx."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

from export_from_workbook import (
    ARCHIVE,
    DATA,
    ROOT,
    export_config,
    export_lists,
    export_responses,
    export_tracking,
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def compare(name: str, expected, actual) -> list[str]:
    if expected == actual:
        return []
    return [f"{name}: JSON on disk does not match a fresh read of the archive workbook."]


def cross_check_draw(draw: list[dict], team_list: list[dict]) -> list[str]:
    issues: list[str] = []
    known_names = {team["display_name"] for team in team_list}
    known_names.update(team["id"] for team in team_list)

    total_teams = sum(len(entry["teams"]) for entry in draw)
    if total_teams != 48:
        issues.append(f"Draw team count is {total_teams}, expected 48 from the workbook.")

    if len(draw) != 17:
        issues.append(f"Draw house count is {len(draw)}, expected 17 from the workbook.")

    for entry in draw:
        for team in entry["teams"]:
            if team not in known_names:
                issues.append(f"House {entry['house_id']}: team '{team}' not found in teams-list.json.")

    return issues


def render_draw_table(draw: list[dict]) -> str:
    lines = ["| House | Teams | Count |", "| --- | --- | ---: |"]
    for entry in draw:
        teams = ", ".join(entry["teams"])
        lines.append(f"| {entry['house_id']} | {teams} | {len(entry['teams'])} |")
    lines.append(f"| **Total** | **48 teams across 17 houses** | **48** |")
    return "\n".join(lines)


def write_report(
    path: Path,
    archive_hash: str,
    draw: list[dict],
    issues: list[str],
    checks: list[tuple[str, bool]],
) -> None:
    status = "PASS" if not issues else "FAIL"
    lines = [
        "# Extraction verification report",
        "",
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"Archive: `{ARCHIVE.relative_to(ROOT)}`",
        f"Archive SHA-256: `{archive_hash}`",
        f"Result: **{status}**",
        "",
        "## Checks",
        "",
    ]
    for label, ok in checks:
        mark = "ok" if ok else "FAILED"
        lines.append(f"- [{mark}] {label}")

    lines.extend(["", "## Draw extracted from archive", "", render_draw_table(draw), ""])

    if issues:
        lines.extend(["## Issues", ""])
        for issue in issues:
            lines.append(f"- {issue}")
    else:
        lines.extend(
            [
                "## Summary",
                "",
                "All structured JSON files match a fresh export from the archive workbook.",
                "You can re-run this check any time with:",
                "",
                "```bash",
                "python scripts/verify_extraction.py",
                "```",
            ]
        )

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    if not ARCHIVE.exists():
        print(f"Missing archive workbook: {ARCHIVE}", file=sys.stderr)
        return 1

    archive_hash = sha256_file(ARCHIVE)
    wb = openpyxl.load_workbook(ARCHIVE, data_only=True)

    expected = {
        "draw.json": export_tracking(wb["Tracking"]),
        "teams-list.json": export_lists(wb["Lists"]),
        "responses.json": export_responses(wb["Responses"]),
        "config.json": export_config(wb["Data"], wb["Rules"]),
    }

    issues: list[str] = []
    checks: list[tuple[str, bool]] = []

    for filename, fresh in expected.items():
        on_disk = load_json(filename)
        file_issues = compare(filename, fresh, on_disk)
        issues.extend(file_issues)
        checks.append((f"`data/{filename}` matches archive", not file_issues))

    draw = expected["draw.json"]
    cross_issues = cross_check_draw(draw, expected["teams-list.json"])
    issues.extend(cross_issues)
    checks.append(("Draw has 17 houses and 48 teams", not any("count" in i for i in cross_issues)))
    checks.append(("Every drawn team exists in teams-list.json", not any("not found" in i for i in cross_issues)))

    provenance_path = DATA / "provenance.json"
    provenance = load_json("provenance.json") if provenance_path.exists() else {}
    provenance["archive_sha256"] = archive_hash
    provenance["verified_at"] = datetime.now(timezone.utc).isoformat()
    provenance_path.write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    checks.append(("`data/provenance.json` updated with archive SHA-256", True))

    report_path = ROOT / "output" / "verification-report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    write_report(report_path, archive_hash, draw, issues, checks)

    print(f"Archive SHA-256: {archive_hash}")
    for label, ok in checks:
        print(f"[{'PASS' if ok else 'FAIL'}] {label}")
    print(f"Report: {report_path}")

    if issues:
        print("\nIssues found:", file=sys.stderr)
        for issue in issues:
            print(f"  - {issue}", file=sys.stderr)
        return 1

    print("\nVerification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
