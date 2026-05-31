# Updating sweepstake data

How to keep the [dashboard](../app/index.html) and [wooden spoon league](../app/spoon.html) in sync during the tournament.

## Quick workflow

1. Check scores on the official source (link below)
2. Edit **`data/results.json`** in this repo
3. Run:

```powershell
python scripts/publish_site_data.py
cd frontend
npm run build
```

4. Commit and push to `main` — GitHub Pages redeploys automatically (CI runs the build for you)

## Official results source

Use the FIFA match centre when entering goals conceded and eliminations:

**https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures**

Team rankings/groups (pre-tournament) come from:

**https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams**

## What to edit in `data/results.json`

| Field | Purpose | Example |
| --- | --- | --- |
| `goals_conceded` | Wooden spoon league — use **draw team names** as keys | `{ "Belgium": 3, "New Zealand": 7 }` |
| `teams_eliminated` | Teams out of the tournament | `["Belgium", "Ghana"]` |
| `last_updated` | Shown on the site | `"2026-06-15"` |
| `source_url` | Link shown on site (change if you use a different reference) | FIFA match centre URL |

Use the exact team names from the draw (e.g. `"Netherlands (Holland)"`, `"Cape Verde"`) — same as `data/draw.json`.

### Example after a round of games

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

Then run `python scripts/publish_site_data.py` and push.

## Files the site reads

| File | Role |
| --- | --- |
| `data/results.json` | **You edit this** — live results |
| `data/draw.json` | Frozen draw (do not change) |
| `app/data/*.json` | Generated public copy — do not edit by hand |

The publish script rebuilds `app/data/standings.json` (houses + wooden spoon league) from `results.json` + the draw.

## Wooden spoon tie-breakers

If two teams tie on goals conceded, the site shows the same league position. Final tie-break rules are in `docs/rules.md` (matches played, goal difference, etc.).

## Links to share

| Page | Local | Live (after deploy) |
| --- | --- | --- |
| Houses | http://localhost:8080/ | https://restlessmedia.github.io/worldcup-2026/ |
| Wooden spoon | http://localhost:8080/spoon.html | https://restlessmedia.github.io/worldcup-2026/spoon.html |
| Prizes & rules | http://localhost:8080/info.html | https://restlessmedia.github.io/worldcup-2026/info.html |

## Local preview

```powershell
python scripts/publish_site_data.py
python -m http.server 8080 --directory app
```
