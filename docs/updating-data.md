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

## Knockout bracket (`data/knockout.json`)

After the group stage, edit **`data/knockout.json`** to fill the bracket. The site shows a horizontal knockout view with **team, flag, and house** on each slot.

1. Set `"phase": "knockout"`
2. Fill Round of 32 fixtures using **draw team names** for `home` and `away`
3. Add scores — winners advance automatically to the next round

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

- Leave `winner` null — it is inferred from scores, or set explicitly to force a result
- Later rounds fill in automatically from winners unless you override `home`/`away` manually
- **3rd place play-off** (`third-01`) must be set manually (semi-final losers)

On first publish, `data/knockout.json` is created automatically with empty TBD slots if missing.

## Wooden spoon tie-breakers

If two teams tie on goals conceded, the site shows the same league position. Final tie-break rules are in `docs/rules.md` (matches played, goal difference, etc.).

## Links to share

| Page | Local | Live (after deploy) |
| --- | --- | --- |
| Houses | http://localhost:8080/ | https://restlessmedia.github.io/worldcup-2026/ |
| Knockout | http://localhost:8080/knockout.html | https://restlessmedia.github.io/worldcup-2026/knockout.html |
| Wooden spoon | http://localhost:8080/spoon.html | https://restlessmedia.github.io/worldcup-2026/spoon.html |
| Prizes & rules | http://localhost:8080/info.html | https://restlessmedia.github.io/worldcup-2026/info.html |

## Local preview

```powershell
python scripts/publish_site_data.py
python -m http.server 8080 --directory app
```
