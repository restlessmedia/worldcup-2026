# World Cup 2026 sweepstake — rules & communication guide

This file is the reference for **how the sweepstake works** and **how we talk about it** in the group (WhatsApp, updates, public app copy).

---

## Sweepstake rules

### How it works

- **17 houses**, **48 teams** — each house holds 1–4 teams from the locked draw (`archive/draw-results.xlsx`).
- **Main prizes** go to the house whose **last remaining team** reaches each stage (last team standing wins the pot share for that place).
- **Side prizes**: most goals conceded (“wooden spoon”) and fair play award.

### Prize pot (£240 total)

| Prize | Share | Amount |
| --- | ---: | ---: |
| 1st — overall winner | 50% | £120 |
| 2nd — final loser | 20% | £48 |
| 3rd — semi-final play-off winner | 12% | £28.80 |
| 4th — semi-final play-off loser | 8% | £19.20 |
| Most goals conceded | 5% | £12 |
| Fair play award | 5% | £12 |

### Wooden spoon tie-breakers

If tied on most goals conceded:

1. Most goals conceded (already tied)
2. Most matches played (same goals conceded across more games loses)
3. Worst goal difference
4. Fewest goals scored
5. Earliest team drawn in the sweepstake (or coin toss)

Structured rules also live in `data/config.json`.

---

## Communication tone

**Goal:** friendly, informed banter for a close — not a tipping service, not corporate, not over-confident.

### Do

- **Plain sentences** — one house, one line of teams, one sentence on prize potential.
- **Tie claims to credible sources** — primarily [FIFA World Cup 2026 teams](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams) (rankings, groups, appearances).
- **Talk about sweepstake prizes**, not World Cup winners — e.g. “decent shout for main-prize money if they reach the semis”, not “8.5/10 to win”.
- **Use well-known facts** sparingly where they help — e.g. Morocco 2022 semi-finalists, Croatia’s recent runs, co-hosts.
- **Name the wooden spoon** when a house has a very weak rank or debutant — it’s part of the fun.
- **Keep disclaimers light** — e.g. “banter, not betting tips” once in the intro, not every line.

### Don’t

- **No odds-style ratings** — no “8.5/10”, no “60% chance”, no implied win probabilities.
- **No bullet dumps per team** — avoid long lists of stats; one verdict sentence is enough.
- **Don’t sound like Morocco (or anyone) are favourites to win the tournament** unless you’re clearly talking about FIFA rank context and sweepstake depth.
- **Don’t invent stats** — if it’s not from FIFA or a clear public record, leave it out.
- **No householder names in public copy** unless you deliberately want them (use house numbers only for the app).

### Voice checklist

Before posting, ask:

1. Would this make sense to someone who only knows “last team standing wins”?
2. Could anyone read this as a betting tip? If yes, soften it.
3. Is every factual claim traceable to FIFA or obvious tournament history?

---

## Message format (WhatsApp)

### Picks summary (pre-tournament)

```
World Cup 2026 sweepstake — your teams (draw locked).
Based on FIFA world rankings (May 2026). Main prizes = last team standing; side prizes include most goals conceded. Banter, not betting tips.

House 19 — Morocco, Croatia. Morocco (2022 semi-finalists, FIFA #8) and Croatia (2022 bronze, 2018 finalists, FIFA #11) — both ranked FIFA top 15, so a decent shout for main-prize money if either goes on a knockout run (neither are nailed-on winners).

…

(Source: fifa.com World Cup 2026 teams page.)
```

**Pattern per house:** `House X — Team A, Team B, …. <one sentence on main prize + optional wooden spoon>.`

### Weekly updates (during tournament)

Same tone. Focus on:

- Who’s still alive per house
- Who’s gone out (and what that means for the pot)
- Wooden spoon / fair play leaderboard movement
- Short — a few sentences, not an essay

---

## Data & scripts

| Task | Command |
| --- | --- |
| Regenerate picks summary | `python scripts/generate_picks_summary.py` |
| Refresh FIFA team data | `python scripts/fetch_fifa_teams.py` then `sync_teams_from_fifa.py` |
| Verify draw extraction | `python scripts/verify_extraction.py` |
| Verify FIFA mapping | `python scripts/verify_fifa_data.py` |

Generated copy: `output/picks-summary.txt`  
Per-house snippets: `output/houses/`

The generator (`scripts/generate_picks_summary.py`) follows this document — change the rules here first, then adjust the script if needed.

---

## Sources

- **Draw (frozen):** `archive/draw-results.xlsx`
- **Team list, rankings, groups:** [fifa.com — World Cup 2026 teams](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams)
- **Match results / goals conceded (future):** FIFA match centre or official stats feeds — update `data/results.json` when wired up

Always note the date when rankings were last synced (`data/fifa-teams.json` → `fetched_at`).
