# Draw provenance

The sweepstake draw is **frozen** as of the export date recorded in `data/provenance.json`.

| Item | Location |
|------|----------|
| Original workbook (do not edit) | `archive/draw-results.xlsx` |
| Structured draw | `data/draw.json` |
| Team display names | `data/teams-list.json` |
| Official FIFA stats | `data/fifa-teams.json` |
| Team profiles & ratings | `data/teams.json` (synced from FIFA) |
| Sign-up responses (archive) | `data/responses.json` |
| Prize rules | `data/config.json` |
| **Rules & comms tone** | **`docs/rules.md`** |

## Workflow

1. **Draw** — locked. Cite the archive file if anyone questions the draw.
2. **Picks summary** — run the pipeline below → `output/picks-summary.txt`
3. **Tournament results** — add to `data/results.json` (placeholder ready for match data)
4. **Weekly updates** — planned script reading `data/results.json`
5. **Public app** — static site in `app/` reading anonymised standings (planned)

## Official FIFA team data

Team rankings, groups, and World Cup appearances come from the [official FIFA World Cup 2026 teams page](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams).

```bash
# Refresh from FIFA (optional; needs Playwright + Chromium)
python scripts/fetch_fifa_teams.py

# Sync FIFA stats into sweepstake profiles
python scripts/sync_teams_from_fifa.py

# Verify every drawn team maps to FIFA data
python scripts/verify_fifa_data.py

# Generate group message
python scripts/generate_picks_summary.py
```

Reports: `output/fifa-verification-report.md`

## Public dashboard (GitHub Pages)

See [deployment.md](deployment.md). Phase 1 live at `app/` — run `python scripts/publish_site_data.py` then push to `main`.

## Re-export from workbook

Only if you need to re-snapshot the archive (should not be necessary):

```bash
python scripts/export_from_workbook.py
python scripts/verify_extraction.py
```

The verification script re-reads `archive/draw-results.xlsx`, compares every exported JSON file byte-for-byte (via structured equality), and writes `output/verification-report.md`. It also stores the archive **SHA-256** in `data/provenance.json` so you can confirm the source file has not changed.

## Data sources for live tournament tracking (planned)

- **Match results & goals conceded**: FIFA match centre, or APIs such as [football-data.org](https://www.football-data.org/) (free tier)
- **Weekly admin flow**: update `data/results.json` → regenerate standings → copy text from `output/`
