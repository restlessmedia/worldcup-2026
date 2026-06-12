import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from knockout_placeholders import (  # noqa: E402
    fifa_match_number_to_bracket_id,
    resolve_placeholder,
)
from sync_knockout_from_fifa import knockout_fingerprint, sync_knockout_payload  # noqa: E402


class KnockoutSyncTest(unittest.TestCase):
    def test_fifa_match_number_mapping(self):
        self.assertEqual(fifa_match_number_to_bracket_id(73), "r32-01")
        self.assertEqual(fifa_match_number_to_bracket_id(89), "r16-01")
        self.assertEqual(fifa_match_number_to_bracket_id(97), "qf-01")
        self.assertEqual(fifa_match_number_to_bracket_id(101), "sf-01")
        self.assertEqual(fifa_match_number_to_bracket_id(103), "third-01")
        self.assertEqual(fifa_match_number_to_bracket_id(104), "final-01")

    def test_resolve_group_position_when_group_complete(self):
        standings = {
            "A": [
                {"team": "Mexico", "played": 3, "points": 7, "gf": 5, "ga": 2},
                {"team": "South Korea (Korea Republic)", "played": 3, "points": 4, "gf": 4, "ga": 3},
                {"team": "Czechia (Czech Republic)", "played": 3, "points": 3, "gf": 3, "ga": 4},
                {"team": "South Africa", "played": 3, "points": 1, "gf": 2, "ga": 5},
            ]
        }
        team = resolve_placeholder(
            "2A",
            standings=standings,
            match_winners={},
            match_losers={},
            draw_names={"South Korea (Korea Republic)"},
            qualifying_thirds=set(),
        )
        self.assertEqual(team, "South Korea (Korea Republic)")

    def test_knockout_fingerprint_is_stable(self):
        payload = {
            "phase": "pre_knockout",
            "rounds": [{"id": "r32", "matches": [{"id": "r32-01", "home": None, "away": None}]}],
        }
        self.assertEqual(knockout_fingerprint(payload), knockout_fingerprint(payload))

    def test_sync_leaves_pre_knockout_when_only_placeholders(self):
        fixtures = [
            {
                "stage": "r32",
                "match_number": 73,
                "home": "2A",
                "away": "2B",
                "home_score": None,
                "away_score": None,
                "finished": False,
            }
        ]
        payload, details = sync_knockout_payload(fixtures)
        self.assertEqual(payload["phase"], "pre_knockout")
        self.assertEqual(details["filled_r32"], 0)


if __name__ == "__main__":
    unittest.main()
