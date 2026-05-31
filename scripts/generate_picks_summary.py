"""Generate WhatsApp-friendly house pick summaries from draw + FIFA team data."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUTPUT = ROOT / "output"

NOTABLE: dict[str, str] = {
    "Argentina": "defending champions",
    "France": "2018 World Cup winners",
    "Spain": "Euro 2024 champions",
    "England": "regular quarter-final contenders",
    "Brazil": "five-time winners",
    "Germany": "four-time winners",
    "Portugal": "always in the elite conversation",
    "Netherlands": "perennial knockout side",
    "Belgium": "still a top-ten side",
    "Morocco": "2022 semi-finalists",
    "Croatia": "2022 bronze, 2018 finalists",
    "Japan": "2022 group winners over Germany and Spain",
    "USA": "co-hosts",
    "Mexico": "co-hosts",
    "Canada": "co-hosts",
    "Senegal": "AFCON champions",
    "Ivory Coast": "AFCON 2023 winners",
}


def load_json(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def team_lookup(profiles: list[dict]) -> dict[str, dict]:
    lookup: dict[str, dict] = {}
    for profile in profiles:
        lookup[profile["id"]] = profile
        lookup[profile["display_name"]] = profile
        for alias in profile.get("aliases") or []:
            lookup[alias] = profile
    return lookup


def resolve_team(name: str, lookup: dict[str, dict]) -> dict:
    if name in lookup:
        return lookup[name]
    raise KeyError(f"No profile found for team: {name}")


def short_name(team: dict) -> str:
    name = team.get("fifa_name") or team["display_name"]
    replacements = {
        "Bosnia and Herzegovina": "Bosnia",
        "Côte d'Ivoire": "Ivory Coast",
        "Cabo Verde": "Cape Verde",
        "Korea Republic": "South Korea",
        "IR Iran": "Iran",
        "Congo DR": "DR Congo",
    }
    return replacements.get(name, name)


def describe_team(team: dict) -> str:
    note = NOTABLE.get(team["fifa_name"])
    if note:
        return f"{short_name(team)} ({note}, FIFA #{team['fifa_rank']})"
    return f"{short_name(team)} (FIFA #{team['fifa_rank']})"


def join_names(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return ", ".join(items[:-1]) + f", and {items[-1]}"


def is_spoon_candidate(team: dict) -> bool:
    return team["fifa_rank"] >= 65 or team["world_cup_appearances"] == 0


def main_prize_clause(teams: list[dict]) -> str:
    elite = sorted([t for t in teams if t["fifa_rank"] <= 10], key=lambda t: t["fifa_rank"])
    strong = sorted([t for t in teams if t["fifa_rank"] <= 20], key=lambda t: t["fifa_rank"])
    ranked = sorted(teams, key=lambda t: t["fifa_rank"])
    best = ranked[0]

    if len(ranked) == 2 and not elite:
        a, b = ranked
        return (
            f"{describe_team(a)} is your main hope for prize money; "
            f"{describe_team(b)} is a longer shot but keeps you in the game."
        )

    if len(elite) >= 2:
        names = join_names([describe_team(t) for t in elite[:3]])
        extras = [t for t in ranked if t["fifa_rank"] > 10]
        extra_bit = ""
        if extras:
            extra_bit = f" {describe_team(extras[0])} adds depth."
        return (
            f"{names} — all FIFA top ten, so you've real main-prize potential "
            f"if any of them reach the semis or beyond.{extra_bit}"
        )

    if len(strong) >= 2 and all(t["fifa_rank"] <= 15 for t in strong[:2]):
        names = join_names([describe_team(t) for t in strong[:2]])
        return (
            f"{names} — both ranked FIFA top 15, so a decent shout for main-prize "
            f"money if either goes on a knockout run (neither are nailed-on winners)."
        )

    if len(elite) == 1:
        lead = describe_team(elite[0])
        support = [t for t in strong if t["fifa_name"] != elite[0]["fifa_name"]]
        if support:
            return (
                f"{lead} is your best main-prize bet, with "
                f"{describe_team(support[0])} as backup if they go deep."
            )
        return f"{lead} is your best main-prize bet — capable of a deep run on paper."

    if strong:
        names = join_names([describe_team(t) for t in strong])
        return (
            f"No elite favourites, but {names} are FIFA top 20 — "
            f"outside main-prize hopes rather than no-hopers."
        )

    if best["fifa_rank"] <= 35:
        return (
            f"{describe_team(best)} is probably your best main-prize hope — "
            f"an outsider, but not ridiculous in a 48-team draw."
        )

    return (
        "All rank outside FIFA's top 35 — you'd need a proper shock for any main prize."
    )


def side_prize_clause(teams: list[dict]) -> str:
    spoons = sorted([t for t in teams if is_spoon_candidate(t)], key=lambda t: -t["fifa_rank"])
    if not spoons:
        return ""
    if len(spoons) == 1:
        t = spoons[0]
        return f" Watch {short_name(t)} for the wooden spoon (most goals conceded)."
    names = join_names([short_name(t) for t in spoons[:2]])
    return f" Wooden spoon watch: {names}."


def house_verdict(teams: list[dict]) -> str:
    return (main_prize_clause(teams) + side_prize_clause(teams)).strip()


def render_house(house_id: str, team_names: list[str], lookup: dict[str, dict]) -> str:
    teams = [resolve_team(name, lookup) for name in team_names]
    team_list = ", ".join(short_name(t) for t in teams)
    return f"House {house_id} — {team_list}. {house_verdict(teams)}"


def render_intro(meta: dict) -> str:
    return (
        "World Cup 2026 sweepstake — your teams (draw locked).\n"
        "Based on FIFA world rankings (May 2026). Main prizes = last team standing; "
        "side prizes include most goals conceded. Banter, not betting tips.\n"
    )


def render_footer() -> str:
    return "\n(Source: fifa.com World Cup 2026 teams page.)"


def render_full_message(draw: list[dict], lookup: dict[str, dict], meta: dict) -> str:
    blocks = [render_house(entry["house_id"], entry["teams"], lookup) for entry in draw]
    return render_intro(meta) + "\n\n".join(blocks) + render_footer()


def main() -> None:
    draw = load_json("draw.json")
    teams_payload = load_json("teams.json")
    lookup = team_lookup(teams_payload["teams"])

    OUTPUT.mkdir(parents=True, exist_ok=True)

    full = render_full_message(draw, lookup, teams_payload["meta"])
    (OUTPUT / "picks-summary.txt").write_text(full + "\n", encoding="utf-8")

    per_house_dir = OUTPUT / "houses"
    per_house_dir.mkdir(exist_ok=True)
    for entry in draw:
        text = render_house(entry["house_id"], entry["teams"], lookup)
        filename = f"house-{entry['house_id']}.txt".replace(" ", "-")
        (per_house_dir / filename).write_text(text + "\n", encoding="utf-8")

    print(f"Wrote {OUTPUT / 'picks-summary.txt'}")
    print(f"Wrote {len(draw)} files under {per_house_dir}")


if __name__ == "__main__":
    main()
