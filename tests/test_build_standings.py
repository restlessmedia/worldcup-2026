import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from build_standings import build_standings  # noqa: E402


class BuildStandingsTest(unittest.TestCase):
    def test_switzerland_group_b_stage_is_first_with_seven_points(self):
        standings = build_standings()
        switzerland = next(
            team
            for house in standings["houses"]
            for team in house["teams"]
            if team["fifa_code"] == "SUI"
        )
        stage = switzerland["group_stage"]

        self.assertEqual(switzerland["group"], "B")
        self.assertEqual(stage["position"], 1)
        self.assertEqual(stage["points"], 7)
        self.assertEqual(stage["won"], 2)
        self.assertEqual(stage["drawn"], 1)
        self.assertEqual(stage["lost"], 0)
        self.assertEqual(stage["gd"], 4)
        self.assertTrue(stage["complete"])

    def test_canada_group_b_stage_is_second_despite_better_goal_difference(self):
        standings = build_standings()
        canada = next(
            team
            for house in standings["houses"]
            for team in house["teams"]
            if team["fifa_code"] == "CAN"
        )
        stage = canada["group_stage"]

        self.assertEqual(stage["position"], 2)
        self.assertEqual(stage["points"], 4)
        self.assertEqual(stage["gd"], 5)
        self.assertTrue(stage["complete"])

    def test_germany_goals_breakdown_includes_knockout(self):
        standings = build_standings()
        germany = next(
            team
            for house in standings["houses"]
            for team in house["teams"]
            if team["fifa_code"] == "GER"
        )

        breakdown = germany["goals_conceded_breakdown"]
        self.assertEqual(germany["goals_conceded"], 5)
        self.assertEqual(germany["group_stage"]["ga"], 4)
        self.assertEqual(breakdown["group"], 4)
        self.assertEqual(breakdown["knockout"], 1)
        self.assertEqual(breakdown["total"], 5)


if __name__ == "__main__":
    unittest.main()
