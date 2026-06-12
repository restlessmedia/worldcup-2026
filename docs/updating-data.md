# Updating sweepstake data

**Start here:** [`docs/admin-runbook.md`](admin-runbook.md) — full step-by-step walkthrough.

## Quick commands

```bash
# Recommended — fetch FIFA, sync results, validate, publish (idempotent)
python3 scripts/run_tournament_update.py --skip-build

# Dry run — see what would change without writing
python3 scripts/run_tournament_update.py --dry-run

# Interactive manual walkthrough (desktop fallback)
python3 scripts/update_walkthrough.py

# Validate only (writes report to output/)
python3 scripts/validate_results.py

# Validate, publish JSON, rebuild frontend
python3 scripts/publish_update.py

# Preview
python3 -m http.server 8080 --directory app
```

After syncing, **commit and push** `data/`, `app/data/`, and `output/update-audit/` — GitHub Actions rebuilds and deploys the site.

## Official source

https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures

Results are **auto-synced** from the FIFA calendar API (`scripts/sync_results_from_fifa.py`). Knockout bracket pairings in **`data/knockout.json`** are still edited manually when needed. Do not hand-edit **`app/data/*.json`**.

## Audit log

Each update run writes:

- `output/update-audit/audit.log` — one-line summary per run
- `output/update-audit/YYYY-MM-DDTHHMMSSZ.json` — full step detail and validation report

Both are committed to git (especially useful with the scheduled sync).

## WhatsApp draft

Each successful update also writes a copy-paste group message:

- `output/whatsapp/latest.txt` — open this, copy, paste into WhatsApp
- `output/whatsapp/YYYY-MM-DDTHHMMSSZ.txt` — archived copy from that run

Tone and format follow `docs/rules.md`.

## Cloud agent / GitHub Actions

- **Cursor cloud agent:** run `python3 scripts/run_tournament_update.py --skip-build`, review `output/update-audit/audit.log` and `output/whatsapp/latest.txt`, commit, and push.
- **GitHub Actions:** runs automatically at **08:00 and 20:00 UTC**, or manually via Actions → **Tournament update** (optional dry run first).
