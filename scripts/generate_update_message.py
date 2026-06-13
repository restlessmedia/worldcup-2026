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


def format_house_label(house_id: str) -> str:
    return house_id if house_id == "Coppice" else f"House {house_id}"


def build_team_house_lookup(draw: list[dict]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for entry in draw:
        house_id = str(entry["house_id"])
        for team in entry["teams"]:
            lookup[team] = house_id
    return lookup


def team_with_house(team_name: str, lookup: dict[str, str]) -> str:
    short = short_team(team_name)
    house_id = lookup.get(team_name)
    if not house_id:
        return short
    return f"{short} ({format_house_label(house_id)})"


def enrich_note(note: str, lookup: dict[str, str]) -> str:
    enriched = note
    for team in sorted(lookup, key=len, reverse=True):
        if team in enriched:
            enriched = enriched.replace(team, team_with_house(team, lookup))
    return enriched


def houses_summary(draw: list[dict], eliminated: set[str]) -> list[str]:
    lines: list[str] = []
    for entry in draw:
        house_id = str(entry["house_id"])
        teams = entry["teams"]
        alive = [t for t in teams if t not in eliminated]
        if not alive:
            lines.append(
                f"{format_house_label(house_id)} — out "
                f"({', '.join(short_team(t) for t in teams)})"
            )
        elif len(alive) == len(teams):
            lines.append(
                f"{format_house_label(house_id)} — all {len(teams)} still in "
                f"({', '.join(short_team(t) for t in teams)})"
            )
        else:
            lines.append(
                f"{format_house_label(house_id)} — "
                f"{', '.join(short_team(t) for t in alive)} still in; "
                f"out: {', '.join(short_team(t) for t in teams if t in eliminated)}"
            )
    return lines


def wooden_spoon_lines(
    results: dict,
    lookup: dict[str, str],
    *,
    limit: int = 5,
) -> list[str]:
    goals = results.get("goals_conceded") or {}
    if not goals:
        return ["No goals conceded yet."]
    ranked = sorted(goals.items(), key=lambda item: (-int(item[1]), item[0]))
    return [
        f"{team_with_house(team, lookup)} — {total} conceded"
        for team, total in ranked[:limit]
    ]


def generate_message(
    *,
    previous_results: dict | None = None,
    sync_notes: list[str] | None = None,
) -> str:
    draw = load_json("draw.json")
    results = load_json("results.json")
    eliminated = set(results.get("teams_eliminated") or [])
    lookup = build_team_house_lookup(draw)

    prev_eliminated = set((previous_results or {}).get("teams_eliminated") or [])
    new_eliminations = sorted(eliminated - prev_eliminated)

    lines = [
        "World Cup Sweepstake update!",
        "",
    ]

    if new_eliminations:
        knocked_out = ", ".join(team_with_house(t, lookup) for t in new_eliminations)
        lines.append(f"Just knocked out: {knocked_out}.")
        lines.append("")
    elif eliminated:
        lines.append(
            f"{len(eliminated)} teams out already — nothing new since last time."
        )
        lines.append("")
    else:
        lines.append("Nobody out yet.")
        lines.append("")

    alive_houses = sum(
        1 for entry in draw if any(team not in eliminated for team in entry["teams"])
    )
    lines.append(f"{alive_houses} of 17 houses still alive.")
    lines.append("")
    lines.append("Wooden spoon watch:")
    lines.extend(wooden_spoon_lines(results, lookup))
    lines.append("")

    if sync_notes:
        lines.append("What changed:")
        for note in sync_notes[:8]:
            lines.append(f"• {enrich_note(note, lookup)}")
        if len(sync_notes) > 8:
            lines.append(f"• … and {len(sync_notes) - 8} more")
        lines.append("")

    return "\n".join(lines).rstrip()


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
