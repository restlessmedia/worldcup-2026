"""Download FIFA flag images into frontend/public/assets/flags for local serving."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIFA_TEAMS = ROOT / "data" / "fifa-teams.json"
FLAGS_DIR = ROOT / "frontend" / "public" / "flags"
FLAG_API = "https://api.fifa.com/api/v3/picture/flags-sq-4/{code}"


def load_codes() -> list[str]:
    data = json.loads(FIFA_TEAMS.read_text(encoding="utf-8"))
    codes = sorted({team["fifa_code"] for team in data["teams"] if team.get("fifa_code")})
    if not codes:
        raise SystemExit(f"No fifa_code entries in {FIFA_TEAMS}")
    return codes


def download_flag(code: str) -> Path | None:
    url = FLAG_API.format(code=code)
    request = urllib.request.Request(url, headers={"User-Agent": "worldcup-sweepstake/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
    except urllib.error.HTTPError as err:
        print(f"  skip {code}: HTTP {err.code}")
        return None
    except urllib.error.URLError as err:
        print(f"  skip {code}: {err.reason}")
        return None

    path = FLAGS_DIR / f"{code}.png"
    path.write_bytes(body)
    return path


def main() -> None:
    codes = load_codes()
    FLAGS_DIR.mkdir(parents=True, exist_ok=True)

    written = 0
    for code in codes:
        path = download_flag(code)
        if path:
            written += 1
            print(f"  {path.name}")

    print(f"Synced {written}/{len(codes)} flags to {FLAGS_DIR}")


if __name__ == "__main__":
    main()
