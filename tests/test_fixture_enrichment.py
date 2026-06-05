import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from build_fixtures import enrich_side  # noqa: E402
from build_standings import fifa_lookup, load_json  # noqa: E402
from fetch_fifa_fixtures import fifa_to_draw_names  # noqa: E402


class FixtureEnrichmentTest(unittest.TestCase):
    def test_usa_is_enriched_as_draw_team_not_placeholder(self):
        fifa = load_json("fifa-teams.json")
        lookup = fifa_lookup(fifa)
        draw_to_house = {"USA (United States)": "5"}

        side = enrich_side("USA", lookup, set(), draw_to_house)

        self.assertEqual(side["status"], "alive")
        self.assertEqual(side["draw_name"], "USA (United States)")
        self.assertEqual(side["display_name"], "USA")
        self.assertEqual(side["fifa_code"], "USA")
        self.assertEqual(side["house_id"], "5")

    def test_fixture_fetch_mapping_keeps_draw_name_for_usa_code(self):
        fifa = load_json("fifa-teams.json")
        mapping = fifa_to_draw_names(fifa, {"USA (United States)"})

        self.assertEqual(mapping["USA"], "USA (United States)")


if __name__ == "__main__":
    unittest.main()
