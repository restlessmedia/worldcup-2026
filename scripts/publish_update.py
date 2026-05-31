"""Validate update data, publish site JSON, and rebuild the frontend."""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

from validate_results import validate_all  # noqa: E402


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print(f"\n> {' '.join(cmd)}")
    subprocess.run(cmd, cwd=cwd or ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate tournament data and publish the public site."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate only — do not publish or build",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Publish JSON only (CI will build on push, or build locally later)",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip confirmation prompt",
    )
    args = parser.parse_args()

    ok, report, summary = validate_all()
    print(report)

    if not ok:
        print("\nPublishing blocked — fix errors above first.")
        return 1

    if args.dry_run:
        print("\nDry run complete. No files were published.")
        return 0

    if not args.yes:
        print(
            f"\nReady to publish: {summary.get('teams_still_in')} teams still in, "
            f"{summary.get('teams_eliminated')} eliminated."
        )
        answer = input("Publish to app/data and rebuild site? [y/N] ").strip().lower()
        if answer not in {"y", "yes"}:
            print("Cancelled.")
            return 0

    run([sys.executable, "scripts/publish_site_data.py"])

    if not args.skip_build and (FRONTEND / "package.json").exists():
        npm = "npm.cmd" if sys.platform == "win32" else "npm"
        run([npm, "run", "build"], cwd=FRONTEND)

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    print(f"\nDone at {stamp}.")
    print("Next: preview locally (python -m http.server 8080 --directory app), then commit and push.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
