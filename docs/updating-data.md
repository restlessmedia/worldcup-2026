# Updating sweepstake data

**Start here:** [`docs/admin-runbook.md`](admin-runbook.md) — full step-by-step walkthrough (validate → review → publish → deploy).

## Quick commands

```powershell
# Interactive walkthrough (start here)
python scripts/update_walkthrough.py

# Validate only (writes report to output/)
python scripts/validate_results.py

# Validate, publish JSON, rebuild frontend
python scripts/publish_update.py

# Preview
python -m http.server 8080 --directory app
```

## Official source

https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures

Edit **`data/results.json`** and **`data/knockout.json`** using draw team names from **`data/draw.json`**. Do not hand-edit **`app/data/*.json`**.
