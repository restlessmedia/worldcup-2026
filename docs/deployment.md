# GitHub Pages deployment

Public dashboard for the house sweepstake (house numbers only, no names).

**Live URL (after setup):** https://restlessmedia.github.io/worldcup-2026/

## One-time GitHub setup

1. Push this repo to `github.com/restlessmedia/worldcup-2026`
2. Open **Settings → Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions**
4. Push to `main` (or run the **Deploy GitHub Pages** workflow manually)

The site deploys automatically on every push to `main`.

## Local preview

Build the React frontend, publish fresh data, then serve the `app/` folder:

```powershell
cd c:\Users\phill\OneDrive\Desktop\worldcup\frontend
npm install
npm run build
cd ..
python scripts/publish_site_data.py
python -m http.server 8080 --directory app
```

For live reload while editing UI:

```powershell
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 (runs `publish_site_data` data sync automatically).

Open http://localhost:8080 (houses), http://localhost:8080/spoon.html (wooden spoon), and http://localhost:8080/info.html (prizes & rules) after the production build above.

## Updating during the tournament

See **[docs/updating-data.md](updating-data.md)** for the full workflow, including the FIFA match centre link to use when entering scores.

Quick version:

1. Edit `data/results.json`:
   - `goals_conceded`: `{ "Belgium": 3, ... }` (draw team names as keys)
   - `teams_eliminated`: draw team names as they go out
   - `last_updated`: date string (e.g. `"2026-06-15"`)
   - `source_url`: link shown on the site (defaults to FIFA match centre)
2. Rebuild and publish:

```powershell
python scripts/publish_site_data.py
```

3. Commit `app/data/` (and optionally `data/standings.json`) and push to `main`

The GitHub Action also runs `publish_site_data.py` on deploy, so pushing `data/results.json` alone is enough if CI builds the rest.

## What gets published

| Public file | Source |
| --- | --- |
| `app/data/standings.json` | Generated from draw + results + FIFA data |
| `app/data/draw.json` | House → teams (no payment/names) |
| `app/data/config.json` | Prize rules only |
| `app/data/fifa-teams.json` | Rankings, groups, flag codes |
| `app/data/meta.json` | Publish timestamp |

Private data (`responses.json`, archive workbook) is **never** copied to the site.

## Project layout

```
frontend/             ← React source (Vite)
  src/
    components/       ← TeamFlag, TeamModal, tables, layout
    HousesApp.jsx
    SpoonApp.jsx
app/                  ← built site (deploy this)
  index.html
  spoon.html
  assets/             ← bundled JS/CSS from Vite
  data/               ← generated JSON, safe to commit
```

Tap any flag icon to open a modal with FIFA ranking, group, house, status, and goals conceded. Design: flat, light, scannable — see `docs/rules.md` for tone.
