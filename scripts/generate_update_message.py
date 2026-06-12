"""Generate a WhatsApp-ready tournament update draft.

Output:
  output/whatsapp/latest.txt       — copy-paste draft (overwritten each run)
  output/whatsapp/<timestamp>.txt  — archived copy alongside the audit log
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUTPUT = ROOT / "output" / "whatsapp"
SITE_URL = "https://restlessmedia.github.io/worldcup-2026/"


def load_json(name: str) -> dict | list:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def short_team(name: str) -> str:
    replacements = {
        "Bosnia and Herzegovina (Bosnia)": "Bosnia",
        "Ivory Coast (Côte d'Ivoire)": "Ivory Coast",
        "Cape Verde": "Cape Verde",
        "South Korea (Korea Republic)": "South Korea",
        "DR Congo (Democratic Republic of the Congo)": "DR Congo",
        "Netherlands (Holland)": "Netherlands",
        "USA (United States)": "USA",
        "Czechia (Czech Republic)": "Czechia",
        "Türkiye (Turkey)": "Türkiye",
        "Curacao (Curaçao)": "Curacao",
    }
    return replacements.get(name, name.split(" (")[0])


def houses_summary(draw: list[dict], eliminated: set[str]) -> list[str]:
    lines: list[str] = []
    for entry in draw:
        house_id = str(entry["house_id"])
        teams = entry["teams"]
        alive = [t for t in teams if t not in eliminated]
        if not alive:
            lines.append(f"House {house_id} — out ({', '.join(short_team(t) for t in teams)})")
        elif len(alive) == len(teams):
            lines.append(
                f"House {house_id} — all {len(teams)} still in "
                f"({', '.join(short_team(t) for t in teams)})"
            )
        else:
            lines.append(
                f"House {house_id} — {', '.join(short_team(t) for t in alive)} still in; "
                f"out: {', '.join(short_team(t) for t in teams if t in eliminated)}"
            )
    return lines


def wooden_spoon_lines(results: dict, limit: int = 5) -> list[str]:
    goals = results.get("goals_conceded") or {}
    if not goals:
        return ["No goals conceded recorded yet."]
    ranked = sorted(goals.items(), key=lambda item: (-int(item[1]), item[0]))
    return [f"{short_team(team)} — {total} conceded" for team, total in ranked[:limit]]


def generate_message(
    *,
    previous_results: dict | None = None,
    sync_notes: list[str] | None = None,
) -> str:
    draw = load_json("draw.json")
    results = load_json("results.json")
    eliminated = set(results.get("teams_eliminated") or [])
    last_updated = results.get("last_updated") or "not set"

    prev_eliminated = set((previous_results or {}).get("teams_eliminated") or [])
    new_eliminations = sorted(eliminated - prev_eliminated)

    lines = [
        "World Cup 2026 sweepstake — tournament update",
        f"Updated: {last_updated}. Banter, not betting tips.",
        "",
        f"Live table: {SITE_URL}",
        "",
    ]

    if new_eliminations:
        lines.append("Newly out: " + ", ".join(short_team(t) for t in new_eliminations) + ".")
        lines.append("")
    elif eliminated:
        lines.append(f"{len(eliminated)} teams eliminated so far; no new eliminations this run.")
        lines.append("")
    else:
        lines.append("Nobody knocked out yet.")
        lines.append("")

    alive_houses = sum(
        1 for entry in draw if any(team not in eliminated for team in entry["teams"])
    )
    lines.append(f"Houses still in the running: {alive_houses}/17.")
    lines.append("")
    lines.append("Wooden spoon (most goals conceded):")
    lines.extend(wooden_spoon_lines(results))
    lines.append("")

    if sync_notes:
        lines.append("Changes this sync:")
        for note in sync_notes[:8]:
            lines.append(f"• {note}")
        if len(sync_notes) > 8:
            lines.append(f"• … and {len(sync_notes) - 8} more (see audit log)")
        lines.append("")

    lines.append("(Source: FIFA match centre — restlessmedia.github.io/worldcup-2026)")
    return "\n".join(lines)


def write_message(
    text: str,
    *,
    stamp: datetime | None = None,
) -> tuple[Path, Path]:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    latest = OUTPUT / "latest.txt"
    latest.write_text(text + "\n", encoding="utf-8")

    when = stamp or datetime.now(timezone.utc)
    archive = OUTPUT / f"{when.strftime('%Y-%m-%dT%H%M%SZ')}.txt"
    archive.write_text(text + "\n", encoding="utf-8")
    return latest, archive


def main() -> int:
    text = generate_message()
    latest, archive = write_message(text)
    print(text)
    print(f"\nWrote {latest}")
    print(f"Archive: {archive}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
