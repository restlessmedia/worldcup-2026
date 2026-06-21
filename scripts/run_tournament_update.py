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

from fifa_source import fetch_and_write_fixtures  # noqa: E402
from generate_update_message import generate_message, write_message  # noqa: E402
from sync_knockout_from_fifa import sync_knockout  # noqa: E402
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
    eliminations = record.get("eliminations") or {}
    line = (
        f"{record.get('started_at')} | status={record.get('status')} | "
        f"changed={summary.get('data_changed')} | "
        f"finished_matches={summary.get('finished_matches')} | "
        f"eliminated={summary.get('teams_eliminated')} | "
        f"new_eliminated={len(eliminations.get('new_this_run') or [])} | "
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


def build_eliminations_audit(previous_results: dict, sync_outcome: dict) -> dict:
    prev_eliminated = set(previous_results.get("teams_eliminated") or [])
    teams_eliminated = list(sync_outcome["details"]["teams_eliminated"])
    current = set(teams_eliminated)
    return {
        "total": len(current),
        "teams": teams_eliminated,
        "new_this_run": sorted(current - prev_eliminated),
        "notes": sync_outcome["details"]["elimination_notes"],
    }


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
    parser.add_argument(
        "--skip-whatsapp",
        action="store_true",
        help="Do not write output/whatsapp/ draft message",
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
        fixtures = None
        if not args.no_fetch and not args.dry_run:
            fixtures, _ = fetch_and_write_fixtures()
        elif not args.no_fetch:
            fixtures, _ = fetch_and_write_fixtures()
        elif not args.dry_run:
            fixtures = json.loads((ROOT / "data" / "fixtures.json").read_text(encoding="utf-8")).get(
                "fixtures"
            )

        previous_results = json.loads((ROOT / "data" / "results.json").read_text(encoding="utf-8"))

        sync_outcome = sync_results(
            fixtures=fixtures,
            write=not args.dry_run,
            refresh_fixtures=False,
        )
        eliminations_audit = build_eliminations_audit(previous_results, sync_outcome)
        record["eliminations"] = eliminations_audit
        record["steps"].append(
            {
                "name": "sync_results",
                "changed": sync_outcome["changed"],
                "finished_matches": sync_outcome["finished_matches"],
                "teams_eliminated": eliminations_audit["total"],
                "teams_eliminated_list": eliminations_audit["teams"],
                "new_eliminations": eliminations_audit["new_this_run"],
                "goals_teams": len(sync_outcome["details"]["goals_conceded"]),
                "elimination_notes": eliminations_audit["notes"],
                "skipped_write": sync_outcome.get("skipped_write", False),
            }
        )

        knockout_outcome = sync_knockout(
            fixtures=fixtures,
            write=not args.dry_run,
            refresh_fixtures=False,
        )
        record["steps"].append(
            {
                "name": "sync_knockout",
                "changed": knockout_outcome["changed"],
                "filled_r32": knockout_outcome["details"]["filled_r32"],
                "notes": knockout_outcome["details"]["notes"],
                "skipped_write": knockout_outcome.get("skipped_write", False),
            }
        )

        ok, report, summary = validate_all()
        record["steps"].append({"name": "validate", "ok": ok})
        record["validation_report"] = report

        if not ok:
            record["status"] = "validation_failed"
            record["finished_at"] = utc_now().isoformat()
            record["summary"] = {
                "data_changed": sync_outcome["changed"] or knockout_outcome["changed"],
                "finished_matches": sync_outcome["finished_matches"],
                "teams_eliminated": eliminations_audit["total"],
                "teams_eliminated_list": eliminations_audit["teams"],
                "new_eliminations": eliminations_audit["new_this_run"],
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

        whatsapp_paths: list[str] = []
        if not args.dry_run and not args.skip_whatsapp:
            sync_notes = (
                sync_outcome["details"]["elimination_notes"] + knockout_outcome["details"]["notes"]
            )
            message = generate_message(
                previous_results=previous_results,
                sync_notes=sync_notes,
                elimination_notes=eliminations_audit["notes"],
            )
            latest, archive = write_message(message, stamp=started)
            whatsapp_paths = [str(latest), str(archive)]
            record["steps"].append({"name": "whatsapp_draft", "paths": whatsapp_paths})

        data_changed = sync_outcome["changed"] or knockout_outcome["changed"]
        record["status"] = "ok"
        record["finished_at"] = utc_now().isoformat()
        record["summary"] = {
            "data_changed": data_changed,
            "results_changed": sync_outcome["changed"],
            "knockout_changed": knockout_outcome["changed"],
            "finished_matches": sync_outcome["finished_matches"],
            "teams_eliminated": eliminations_audit["total"],
            "teams_eliminated_list": eliminations_audit["teams"],
            "new_eliminations": eliminations_audit["new_this_run"],
            "elimination_notes": eliminations_audit["notes"],
            "teams_still_in": summary.get("teams_still_in"),
            "published": published,
            "whatsapp_draft": whatsapp_paths[0] if whatsapp_paths else None,
            "idempotent_noop": not data_changed and not published,
        }
        detail_path, log_path = write_audit(record)

        print(report)
        if data_changed:
            print("\nTournament data updated from FIFA.")
        else:
            print("\nTournament data unchanged (idempotent — results/knockout not rewritten).")
        if published:
            print("Site data published to app/data/.")
            if not data_changed:
                print(
                    "Note: live site updates when Deploy GitHub Pages runs "
                    "(auto after tournament sync commits)."
                )
        elif args.dry_run:
            print("Dry run — nothing published.")
        elif args.skip_publish:
            print("Publish skipped.")
        if whatsapp_paths:
            print(f"WhatsApp draft: {whatsapp_paths[0]}")
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
