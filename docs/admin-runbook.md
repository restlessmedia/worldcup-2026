# Admin runbook — updating the sweepstake site

Step-by-step guide for updating results during the tournament.

**Live site:** https://restlessmedia.github.io/worldcup-2026/

---

## Start here (recommended — auto-sync from FIFA)

```bash
python3 scripts/run_tournament_update.py --skip-build
```

This single command:

1. **Fetches** live fixtures and scores from the [official FIFA calendar API](https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023)
2. **Computes** cumulative goals conceded and eliminations from finished matches
3. **Writes** `data/results.json` only when something changed (**idempotent** — safe to run twice in one day)
4. **Validates** and regenerates `app/data/*.json`
5. **Audits** the run to `output/update-audit/`

Then commit and push. GitHub Actions builds and deploys the site.

| Flag | Effect |
| --- | --- |
| `--dry-run` | Fetch + validate only; no files written |
| `--skip-build` | Skip `npm run build` (CI builds on push) |
| `--skip-publish` | Sync + validate only; do not regenerate `app/data/` |
| `--no-fetch` | Use existing `data/fixtures.json` (offline / replay) |

**Audit log:** see `output/update-audit/audit.log` and timestamped JSON files in the same folder.

**Cloud agent prompt:** *"Run the tournament update from FIFA, review the audit log, commit, and push if validation passes."*

**GitHub Actions:** repo → Actions → **Tournament update** → Run workflow.

Knockout bracket pairings are still manual in `data/knockout.json` — see [Step 3 — knockout](#step-3--edit-dataknockoutjson-when-relevant) below.

---

## Manual walkthrough (desktop fallback)

If FIFA auto-sync is unavailable or you need to override data by hand:

```bash
python3 scripts/update_walkthrough.py
```

This **interviews you step by step**:

1. Shows current state (teams in, eliminations, goals recorded)
2. Opens the FIFA link reminder
3. Asks for **last updated** date
4. Asks for **new eliminations** (comma-separated)
5. Asks for **goals conceded** line by line (`Belgium: 2`)
6. Shows a **review** of what changed
7. Saves `data/results.json` (only if you confirm)
8. Runs **validation** and optionally **publish**

Other options in the same script:

- **2** — validate only (no edits)
- **3** — validate + publish what is already saved

---

## Overview

| What you update | File | What it drives |
| --- | --- | --- |
| Goals conceded, eliminations | `data/results.json` | Houses page, wooden spoon league |
| Knockout fixtures & scores | `data/knockout.json` | Knockout bracket page |
| Fair play (end of tournament) | `data/results.json` → `fair_play_points` | Tie-breakers if needed |

**Do not edit** `app/data/*.json` by hand — those are generated.

**Frozen (never change):** `data/draw.json`, `archive/draw-results.xlsx`

---

## Recommended flow (every update)

```
1. python3 scripts/run_tournament_update.py --skip-build
2. Review output/update-audit/audit.log (and validation report if warnings)
3. Commit + push to main (GitHub Pages redeploys)
```

Manual alternative (if you prefer editing JSON directly):

```
1. Open FIFA match centre
2. Edit data/results.json (and knockout.json if needed)
3. Validate  →  python3 scripts/validate_results.py
4. Read the report in output/update-validation-YYYY-MM-DD.md
5. Fix any errors; review warnings
6. Publish   →  python3 scripts/publish_update.py
7. Preview locally
8. Commit + push to main
```

### Publish only (after manual edits)

```bash
python3 scripts/publish_update.py
```

- **`--dry-run`** — validate only, no publish
- **`--yes`** — skip the confirmation prompt
- **`--skip-build`** — publish JSON only (CI builds on push)

---

## When to update

| Tournament phase | Update | Files |
| --- | --- | --- |
| Group stage (ongoing) | After each round you care about | `results.json` |
| Group stage ends | Fill Round of 32, switch phase | `knockout.json` + `results.json` |
| Knockout rounds | Scores as matches finish | `knockout.json` |
| Semi-finals done | Set 3rd-place play-off teams manually | `knockout.json` (`third-01`) |
| Tournament ends | Fair play points if FIFA publishes them | `results.json` |

Updates are **ad hoc** — no fixed schedule. Even one round per week is fine.

---

## Step 1 — Open the official source

**Primary source (scores, fixtures, eliminations):**

https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures

**Team list / groups (reference only):**

https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams

### How auto-sync works

`scripts/sync_results_from_fifa.py` pulls the same data as the FIFA match centre:

- **Goals conceded** — summed from every finished match (home concedes away goals, and vice versa)
- **Eliminations** — 4th place in a completed group; 3rd place not among the best eight after all groups finish; knockout losers once the knockout stage starts

You do **not** need a second website. Still:

1. Spot-check 2–3 finished matches against FIFA before the first auto-sync publish
2. Run validation (included in `run_tournament_update.py`) — catches typos, unknown team names, and goals going *down*
3. Read the audit log / validation report when warnings appear

---

## Step 2 — Edit `data/results.json`

Open `data/results.json` in your editor.

### Fields

| Field | What to put |
| --- | --- |
| `goals_conceded` | **Total goals conceded** per team so far (cumulative, not per match) |
| `teams_eliminated` | List of teams **out** of the tournament |
| `fair_play_points` | Leave `{}` until FIFA announces final fair play standings |
| `last_updated` | Today's date, e.g. `"2026-06-18"` |
| `source_url` | Keep the FIFA URL unless you used a different reference |

### Team names — use draw names

Keys must match **`data/draw.json`** (what people were assigned at the draw).

Examples:

- `"Netherlands (Holland)"` not `"Netherlands"`
- `"Cape Verde"` not `"Cabo Verde"`
- `"USA (United States)"` not `"USA"`

If you type a FIFA label by mistake, validation may still map it via `data/fifa-teams.json` → `draw_name_map`, but **prefer draw names** to avoid confusion.

### Example after a round

```json
{
  "teams_eliminated": ["New Zealand"],
  "goals_conceded": {
    "Belgium": 2,
    "Iraq": 5,
    "Uruguay": 1,
    "New Zealand": 9
  },
  "fair_play_points": {},
  "last_updated": "2026-06-15",
  "source_url": "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures",
  "source_label": "FIFA match centre (scores & fixtures)"
}
```

### Wooden spoon rules

- Higher **goals conceded** = worse (closer to winning the wooden spoon)
- Eliminated teams stay on the league table with their final total
- Tie-break details: `docs/rules.md`

---

## Step 3 — Edit `data/knockout.json` (when relevant)

Before group stage ends: leave `"phase": "pre_knockout"` and empty slots.

After Round of 32 pairings are known:

1. Set `"phase": "knockout"`
2. Set `"last_updated"` to today's date
3. Fill `home` and `away` on Round of 32 matches using **draw team names**
4. Add `home_score` / `away_score` as matches finish
5. Leave `winner` as `null` unless you need to override — winners advance from scores

**3rd place play-off** (`third-01`): set `home` and `away` manually (semi-final losers).

```json
{
  "phase": "knockout",
  "last_updated": "2026-07-05",
  "rounds": [
    {
      "id": "r32",
      "label": "Round of 32",
      "matches": [
        {
          "id": "r32-01",
          "home": "Belgium",
          "away": "Japan",
          "home_score": 2,
          "away_score": 1,
          "winner": null
        }
      ]
    }
  ]
}
```

---

## Step 4 — Validate

```powershell
python scripts/validate_results.py
```

This writes `output/update-validation-YYYY-MM-DD.md` and prints the same report.

### What validation checks

| Check | Blocks publish? |
| --- | --- |
| Unknown team name | Yes — error |
| Goals conceded decreased vs last publish | Yes — error |
| Missing `last_updated` | Warning |
| Knockout score only half-filled | Warning |
| Knockout tied score (no winner) | Warning |
| Phase still `pre_knockout` but R32 filled | Warning |
| Name mapped from FIFA label to draw name | Warning |

**Fix all errors.** Review warnings — they are often intentional (e.g. first publish).

---

## Step 5 — Publish

```powershell
python scripts/publish_update.py
```

Confirm when prompted. This:

1. Re-runs validation
2. Runs `publish_site_data.py` (regenerates `app/data/*.json`)
3. Runs `npm run build` in `frontend/` (unless `--skip-build`)

---

## Step 6 — Preview locally

```powershell
python -m http.server 8080 --directory app
```

Open:

| Page | URL |
| --- | --- |
| Houses | http://localhost:8080/ |
| Knockout | http://localhost:8080/knockout.html |
| Wooden spoon | http://localhost:8080/spoon.html |
| Prizes & rules | http://localhost:8080/info.html |

Check:

- [ ] House cards show correct “still in” / eliminated state
- [ ] Wooden spoon order looks right
- [ ] Knockout bracket matches FIFA (if updated)
- [ ] “Last updated” date is correct

---

## Step 7 — Deploy

Commit the changed files (`data/results.json`, `data/knockout.json`, generated `app/` output) and push to `main`.

GitHub Actions builds and deploys to GitHub Pages automatically.

---

## Manual fallback (FIFA down or different source)

1. Edit `data/results.json` (and `knockout.json`) by hand from TV, BBC, etc.
2. Change `source_url` and `source_label` to describe what you used, e.g.:

```json
"source_url": "https://www.bbc.co.uk/sport/football/world-cup",
"source_label": "BBC Sport (manual entry — FIFA unavailable)"
```

3. Run validate → publish as usual
4. When FIFA is back, reconcile totals and restore the FIFA `source_url`

You can also add a new mapping in `data/fifa-teams.json` → `draw_name_map` if FIFA uses a label we did not anticipate (rare — initial names came from the draw).

---

## Fair play points

FIFA typically publishes fair play standings **at the end** of the tournament. Until then, keep `"fair_play_points": {}`.

When available, add draw-name keys with numeric points (lower is better for fair play):

```json
"fair_play_points": {
  "Japan": 0,
  "Senegal": -2
}
```

Then validate and publish again.

---

## Quick reference — all 48 draw team names

Copy from `data/draw.json` or use this list (same strings the site expects):

Algeria · Argentina · Australia · Austria · Belgium · Bosnia and Herzegovina (Bosnia) · Brazil · Canada · Cape Verde · Colombia · Croatia · Curacao (Curaçao) · Czechia (Czech Republic) · DR Congo (Democratic Republic of the Congo) · Ecuador · Egypt · England · France · Germany · Ghana · Haiti · Iran · Iraq · Ivory Coast (Côte d'Ivoire) · Japan · Jordan · Mexico · Morocco · Netherlands (Holland) · New Zealand · Norway · Panama · Paraguay · Portugal · Qatar · Saudi Arabia · Scotland · Senegal · South Africa · South Korea (Korea Republic) · Spain · Sweden · Switzerland · Tunisia · Türkiye (Turkey) · Uruguay · USA (United States) · Uzbekistan

---

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Site looks unstyled locally | Use `http://localhost:8080`, not `file://` |
| “Unknown team” validation error | Fix spelling to match draw list above |
| Goals went down error | You corrected a mistake — verify FIFA totals, then fix JSON intentionally |
| Knockout shows TBD | Normal before group stage; fill R32 when FIFA publishes pairings |
| npm build fails | Run `cd frontend; npm install` once, then retry publish |
| CI deploys old data | Ensure you committed both `data/` and `app/` changes |

---

## Automation reference

| Script | Purpose |
| --- | --- |
| `run_tournament_update.py` | Full pipeline: fetch → sync → validate → publish → audit |
| `sync_results_from_fifa.py` | Sync `data/results.json` from FIFA only |
| `fetch_fifa_fixtures.py` | Refresh `data/fixtures.json` only |
| `update_walkthrough.py` | Interactive manual entry |
| `publish_update.py` | Validate + publish after manual edits |

---

## Related docs

- `docs/rules.md` — prizes and tie-breakers
- `docs/deployment.md` — GitHub Pages setup
- `docs/updating-data.md` — short pointer to this runbook
