"""One-shot tournament update for humans and cloud agents.

Fetches live FIFA data, syncs results, validates, publishes, and writes an audit log.
Safe to run multiple times per day — skips writes when data is unchanged.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output"
AUDIT_DIR = OUTPUT / "update-audit"
AUDIT_LOG = AUDIT_DIR / "audit.log"

from sync_results_from_fifa import sync_results  # noqa: E402
from validate_results import validate_all  # noqa: E402


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def write_audit(record: dict) -> tuple[Path, Path]:
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = utc_now().strftime("%Y-%m-%dT%H%M%SZ")
    detail_path = AUDIT_DIR / f"{stamp}.json"
    detail_path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    summary = record.get("summary") or {}
    line = (
        f"{record.get('started_at')} | status={record.get('status')} | "
        f"changed={summary.get('results_changed')} | "
        f"finished_matches={summary.get('finished_matches')} | "
        f"eliminated={summary.get('teams_eliminated')} | "
        f"published={summary.get('published')} | "
        f"detail={detail_path.name}\n"
    )
    with AUDIT_LOG.open("a", encoding="utf-8") as handle:
        handle.write(line)

    return detail_path, AUDIT_LOG


def run_publish(skip_build: bool) -> None:
    cmd = [sys.executable, "scripts/publish_update.py", "--yes"]
    if skip_build:
        cmd.append("--skip-build")
    subprocess.run(cmd, cwd=ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch FIFA data, sync results, validate, publish, and audit."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch + validate only; do not write results or publish",
    )
    parser.add_argument(
        "--skip-publish",
        action="store_true",
        help="Sync results and validate, but do not publish site data",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Publish JSON only (skip npm build)",
    )
    parser.add_argument(
        "--no-fetch",
        action="store_true",
        help="Use existing data/fixtures.json instead of live FIFA fetch",
    )
    args = parser.parse_args()

    started = utc_now()
    record: dict = {
        "started_at": started.isoformat(),
        "mode": "dry-run" if args.dry_run else "live",
        "steps": [],
        "summary": {},
        "status": "running",
    }

    try:
        sync_outcome = sync_results(
            refresh_fixtures=not args.no_fetch,
            write=not args.dry_run,
        )
        record["steps"].append(
            {
                "name": "sync_results",
                "changed": sync_outcome["changed"],
                "finished_matches": sync_outcome["finished_matches"],
                "teams_eliminated": len(sync_outcome["details"]["teams_eliminated"]),
                "goals_teams": len(sync_outcome["details"]["goals_conceded"]),
                "elimination_notes": sync_outcome["details"]["elimination_notes"],
                "skipped_write": sync_outcome.get("skipped_write", False),
            }
        )

        ok, report, summary = validate_all()
        record["steps"].append({"name": "validate", "ok": ok})
        record["validation_report"] = report

        if not ok:
            record["status"] = "validation_failed"
            record["finished_at"] = utc_now().isoformat()
            record["summary"] = {
                "results_changed": sync_outcome["changed"],
                "finished_matches": sync_outcome["finished_matches"],
                "teams_eliminated": len(sync_outcome["details"]["teams_eliminated"]),
                "published": False,
            }
            detail_path, log_path = write_audit(record)
            print(report)
            print(f"\nValidation failed. Audit: {detail_path}")
            print(f"Audit log: {log_path}")
            return 1

        published = False
        if not args.dry_run and not args.skip_publish:
            run_publish(skip_build=args.skip_build)
            published = True
            record["steps"].append({"name": "publish", "skip_build": args.skip_build})

        record["status"] = "ok"
        record["finished_at"] = utc_now().isoformat()
        record["summary"] = {
            "results_changed": sync_outcome["changed"],
            "finished_matches": sync_outcome["finished_matches"],
            "teams_eliminated": len(sync_outcome["details"]["teams_eliminated"]),
            "teams_still_in": summary.get("teams_still_in"),
            "published": published,
            "idempotent_noop": not sync_outcome["changed"] and not published,
        }
        detail_path, log_path = write_audit(record)

        print(report)
        if sync_outcome["changed"]:
            print("\nResults updated from FIFA.")
        else:
            print("\nResults unchanged (idempotent — no write needed).")
        if published:
            print("Site data published.")
        elif args.dry_run:
            print("Dry run — nothing published.")
        elif args.skip_publish:
            print("Publish skipped.")
        print(f"\nAudit: {detail_path}")
        print(f"Audit log: {log_path}")
        return 0

    except Exception as exc:
        record["status"] = "error"
        record["finished_at"] = utc_now().isoformat()
        record["error"] = str(exc)
        record["traceback"] = traceback.format_exc()
        write_audit(record)
        print(f"Update failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
