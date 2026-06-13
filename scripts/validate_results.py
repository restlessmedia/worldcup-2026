"""Validate tournament update data before publishing to the public site."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUTPUT = ROOT / "output"


def load_json(name: str) -> dict | list:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def draw_team_names(draw: list[dict]) -> set[str]:
    names: set[str] = set()
    for entry in draw:
        for team in entry["teams"]:
            names.add(team)
    return names


def fifa_aliases(fifa: dict) -> dict[str, str]:
    """Map any known label (draw or FIFA) back to canonical draw name."""
    aliases: dict[str, str] = {}
    draw_map = fifa.get("draw_name_map") or {}
    for draw_name, fifa_name in draw_map.items():
        aliases[draw_name] = draw_name
        aliases[fifa_name] = draw_name
    for team in fifa.get("teams") or []:
        fifa_name = team["fifa_name"]
        aliases.setdefault(fifa_name, draw_map.get(fifa_name, fifa_name))
    return aliases


def resolve_draw_name(name: str, aliases: dict[str, str], draw_names: set[str]) -> str | None:
    if name in draw_names:
        return name
    if name in aliases and aliases[name] in draw_names:
        return aliases[name]
    return None


def previous_public_results() -> dict | None:
    path = ROOT / "app" / "data" / "results.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def validate_results(draw_names: set[str], aliases: dict[str, str], results: dict) -> tuple[list[str], list[str], dict]:
    errors: list[str] = []
    warnings: list[str] = []

    goals = results.get("goals_conceded") or {}
    eliminated = results.get("teams_eliminated") or []
    fair_play = results.get("fair_play_points") or {}

    normalized_goals: dict[str, int] = {}
    for raw_name, value in goals.items():
        draw_name = resolve_draw_name(raw_name, aliases, draw_names)
        if not draw_name:
            errors.append(f"goals_conceded: unknown team '{raw_name}' (use a draw name from data/draw.json)")
            continue
        if raw_name != draw_name:
            warnings.append(f"goals_conceded: '{raw_name}' mapped to draw name '{draw_name}'")
        try:
            normalized_goals[draw_name] = int(value)
        except (TypeError, ValueError):
            errors.append(f"goals_conceded: '{raw_name}' must be a whole number, got {value!r}")

    if len(normalized_goals) > 48:
        warnings.append(f"goals_conceded has {len(normalized_goals)} teams — sweepstake only has 48")

    normalized_eliminated: list[str] = []
    for raw_name in eliminated:
        draw_name = resolve_draw_name(raw_name, aliases, draw_names)
        if not draw_name:
            errors.append(f"teams_eliminated: unknown team '{raw_name}'")
            continue
        if raw_name != draw_name:
            warnings.append(f"teams_eliminated: '{raw_name}' mapped to draw name '{draw_name}'")
        normalized_eliminated.append(draw_name)

    for raw_name in fair_play:
        if resolve_draw_name(raw_name, aliases, draw_names) is None:
            errors.append(f"fair_play_points: unknown team '{raw_name}'")

    if not results.get("last_updated"):
        warnings.append("last_updated is not set — add today's date before publishing")

    prev = previous_public_results()
    if prev:
        prev_goals = prev.get("goals_conceded") or {}
        for team, total in normalized_goals.items():
            old = int(prev_goals.get(team, 0) or 0)
            if total < old:
                errors.append(
                    f"goals_conceded for '{team}' decreased ({old} → {total}). "
                    "Goals conceded should only go up unless you corrected an error."
                )
            elif total > old:
                warnings.append(f"goals_conceded: '{team}' {old} → {total}")

        prev_elim = set(prev.get("teams_eliminated") or [])
        removed = prev_elim - set(normalized_eliminated)
        if removed:
            warnings.append(
                f"teams_eliminated: these teams were eliminated before but are no longer listed: "
                f"{', '.join(sorted(removed))}"
            )

    still_in = draw_names - set(normalized_eliminated)
    summary = {
        "teams_with_goals": len(normalized_goals),
        "teams_eliminated": len(normalized_eliminated),
        "teams_still_in": len(still_in),
        "top_spoon": sorted(
            normalized_goals.items(), key=lambda item: (-item[1], item[0])
        )[:5],
    }
    return errors, warnings, summary


def validate_knockout(draw_names: set[str], aliases: dict[str, str], knockout: dict) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    phase = knockout.get("phase") or "pre_knockout"
    if phase not in {"pre_knockout", "knockout"}:
        errors.append(f"knockout phase must be 'pre_knockout' or 'knockout', got '{phase}'")

    filled_r32 = 0
    for round_data in knockout.get("rounds") or []:
        for match in round_data.get("matches") or []:
            home = match.get("home")
            away = match.get("away")
            for slot, label in ((home, "home"), (away, "away")):
                if slot is None:
                    continue
                if resolve_draw_name(slot, aliases, draw_names) is None:
                    errors.append(f"{match['id']} {label}: unknown team '{slot}'")
            if round_data.get("id") == "r32" and home and away:
                filled_r32 += 1

            hs = match.get("home_score")
            aw = match.get("away_score")
            if (hs is None) ^ (aw is None):
                warnings.append(f"{match['id']}: set both home_score and away_score, or leave both empty")
            if hs is not None and aw is not None and hs == aw:
                warnings.append(f"{match['id']}: tied score ({hs}-{aw}) — knockout needs a winner")

    if phase == "knockout" and filled_r32 == 0:
        warnings.append("knockout phase is active but no Round of 32 fixtures are filled in yet")

    if phase == "pre_knockout" and filled_r32 > 0:
        warnings.append(
            f"phase is still 'pre_knockout' but {filled_r32} Round of 32 fixtures have teams — "
            "consider setting phase to 'knockout' after group stage"
        )

    return errors, warnings


def render_report(
    results: dict,
    knockout: dict,
    result_errors: list[str],
    result_warnings: list[str],
    result_summary: dict,
    knockout_errors: list[str],
    knockout_warnings: list[str],
) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# Update validation report",
        "",
        f"Generated: {now}",
        "",
        f"**Source URL in data:** {results.get('source_url') or '(not set)'}",
        f"**Results date:** {results.get('last_updated') or '(not set)'}",
        f"**Knockout phase:** {knockout.get('phase')}",
        "",
    ]

    def section(title: str, errors: list[str], warnings: list[str]) -> None:
        lines.append(f"## {title}")
        lines.append("")
        if errors:
            lines.append("### Errors (fix before publishing)")
            for item in errors:
                lines.append(f"- {item}")
            lines.append("")
        if warnings:
            lines.append("### Warnings (review)")
            for item in warnings:
                lines.append(f"- {item}")
            lines.append("")
        if not errors and not warnings:
            lines.append("No issues found.")
            lines.append("")

    section("Results (houses + wooden spoon)", result_errors, result_warnings)

    if result_summary.get("top_spoon"):
        lines.append("### Wooden spoon preview (top 5)")
        for team, goals in result_summary["top_spoon"]:
            lines.append(f"- {team}: {goals} goals conceded")
        lines.append("")

    lines.append(
        f"**Summary:** {result_summary.get('teams_still_in', '?')} teams still in · "
        f"{result_summary.get('teams_eliminated', '?')} eliminated · "
        f"{result_summary.get('teams_with_goals', '?')} teams with goals recorded"
    )
    lines.append("")

    section("Knockout bracket", knockout_errors, knockout_warnings)

    all_errors = result_errors + knockout_errors
    all_warnings = result_warnings + knockout_warnings
    lines.append("## Verdict")
    lines.append("")
    if all_errors:
        lines.append("**Do not publish** until errors are fixed.")
    elif all_warnings:
        lines.append(
            "**Ready to publish** — warnings are informational only; "
            "no approval step. Fix retrospectively if anything looks wrong."
        )
    else:
        lines.append("**Ready to publish.**")
    lines.append("")

    return "\n".join(lines)


def validate_all() -> tuple[bool, str, dict]:
    draw = load_json("draw.json")
    results = load_json("results.json")
    knockout = load_json("knockout.json")
    fifa = load_json("fifa-teams.json")

    draw_names = draw_team_names(draw)
    aliases = fifa_aliases(fifa)

    re_errors, re_warnings, summary = validate_results(draw_names, aliases, results)
    ko_errors, ko_warnings = validate_knockout(draw_names, aliases, knockout)

    report = render_report(
        results, knockout, re_errors, re_warnings, summary, ko_errors, ko_warnings
    )
    ok = not (re_errors or ko_errors)
    return ok, report, summary


def main() -> int:
    ok, report, _ = validate_all()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    report_path = OUTPUT / f"update-validation-{stamp}.md"
    report_path.write_text(report, encoding="utf-8")

    print(report)
    print(f"\nReport saved to {report_path}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
