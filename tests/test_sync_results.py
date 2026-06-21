import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from sync_results_from_fifa import (  # noqa: E402
    canonical_results_payload,
    compute_results,
    goals_conceded_from_fixtures,
    results_fingerprint,
)


class SyncResultsTest(unittest.TestCase):
    def test_mathematically_eliminated_after_two_losses(self):
        """Teams with two losses and no path to top 3 are eliminated before MD3 ends."""
        fixtures = [
            {
                "stage": "group",
                "group": "C",
                "finished": True,
                "home": "Haiti",
                "away": "Scotland",
                "home_score": 0,
                "away_score": 1,
            },
            {
                "stage": "group",
                "group": "C",
                "finished": True,
                "home": "Brazil",
                "away": "Haiti",
                "home_score": 3,
                "away_score": 0,
            },
            {
                "stage": "group",
                "group": "C",
                "finished": True,
                "home": "Brazil",
                "away": "Morocco",
                "home_score": 1,
                "away_score": 1,
            },
            {
                "stage": "group",
                "group": "C",
                "finished": True,
                "home": "Scotland",
                "away": "Morocco",
                "home_score": 0,
                "away_score": 1,
            },
            {
                "stage": "group",
                "group": "C",
                "finished": False,
                "home": "Morocco",
                "away": "Haiti",
                "home_score": None,
                "away_score": None,
            },
            {
                "stage": "group",
                "group": "C",
                "finished": False,
                "home": "Scotland",
                "away": "Brazil",
                "home_score": None,
                "away_score": None,
            },
        ]
        _, _, eliminated = compute_results(fixtures)
        self.assertIn("Haiti", eliminated)

    def test_goals_conceded_from_finished_matches(self):
        draw_names = {
            "Mexico",
            "South Africa",
            "South Korea (Korea Republic)",
            "Czechia (Czech Republic)",
        }
        fixtures = [
            {
                "finished": True,
                "home": "Mexico",
                "away": "South Africa",
                "home_score": 2,
                "away_score": 0,
            },
            {
                "finished": True,
                "home": "South Korea (Korea Republic)",
                "away": "Czechia (Czech Republic)",
                "home_score": 2,
                "away_score": 1,
            },
            {
                "finished": False,
                "home": "Canada",
                "away": "Belgium",
                "home_score": None,
                "away_score": None,
            },
        ]
        goals = goals_conceded_from_fixtures(fixtures, draw_names)
        self.assertEqual(
            goals,
            {
                "Mexico": 0,
                "South Africa": 2,
                "South Korea (Korea Republic)": 1,
                "Czechia (Czech Republic)": 2,
            },
        )

    def test_idempotent_fingerprint_ignores_last_updated(self):
        first = canonical_results_payload(
            {"Belgium": 2},
            ["Ghana"],
            last_updated="2026-06-12",
        )
        second = canonical_results_payload(
            {"Belgium": 2},
            ["Ghana"],
            last_updated="2026-06-13",
        )
        self.assertEqual(results_fingerprint(first), results_fingerprint(second))

    def test_compute_results_no_eliminations_early_group_stage(self):
        fixtures = [
            {
                "stage": "group",
                "group": "A",
                "finished": True,
                "home": "Mexico",
                "away": "South Africa",
                "home_score": 2,
                "away_score": 0,
            }
        ]
        details, goals, eliminated = compute_results(fixtures)
        self.assertEqual(goals["South Africa"], 2)
        self.assertEqual(eliminated, [])


if __name__ == "__main__":
    unittest.main()
