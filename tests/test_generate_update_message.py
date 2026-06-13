import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from generate_update_message import (  # noqa: E402
    enrich_note,
    format_house_label,
    generate_message,
    team_with_house,
    wooden_spoon_closer,
    wooden_spoon_lines,
    wooden_spoon_ranking,
)


class GenerateUpdateMessageTest(unittest.TestCase):
    def test_format_house_label(self):
        self.assertEqual(format_house_label("16"), "House 16")
        self.assertEqual(format_house_label("Coppice"), "Coppice")

    def test_team_with_house(self):
        lookup = {"Paraguay": "16", "Canada": "Coppice"}
        self.assertEqual(team_with_house("Paraguay", lookup), "Paraguay (House 16)")
        self.assertEqual(team_with_house("Canada", lookup), "Canada (Coppice)")

    def test_enrich_note_adds_house_to_team_names(self):
        lookup = {"Paraguay": "16"}
        note = "Group D: Paraguay eliminated (4th place)"
        self.assertEqual(
            enrich_note(note, lookup),
            "Group D: Paraguay (House 16) eliminated (4th place)",
        )

    def test_wooden_spoon_lines_include_houses_and_bullets(self):
        lookup = {"Paraguay": "16", "Czechia (Czech Republic)": "3"}
        results = {
            "goals_conceded": {
                "Paraguay": 4,
                "Czechia (Czech Republic)": 2,
            }
        }
        lines = wooden_spoon_lines(results, lookup, limit=2)
        self.assertEqual(lines[0], "* Paraguay (House 16) — 4 conceded 😬")
        self.assertEqual(lines[1], "* Czechia (House 3) — 2 conceded")

    def test_wooden_spoon_closer_calls_out_leader(self):
        ranked = [("Paraguay (House 16)", 4), ("Czechia (House 3)", 2)]
        self.assertEqual(
            wooden_spoon_closer(ranked),
            "Plenty of football left, but Paraguay have an early grip on the spoon. 👀",
        )

    def test_generate_message_matches_casual_format(self):
        text = generate_message()
        self.assertIn("Nobody's heading home yet…", text)
        self.assertIn("🥄 Wooden Spoon Watch", text)
        self.assertIn("* Paraguay (House 16) — 4 conceded 😬", text)
        self.assertIn(
            "Plenty of football left, but Paraguay have an early grip on the spoon. 👀",
            text,
        )
        self.assertNotIn("Source:", text)
        self.assertNotIn("Live table:", text)
        self.assertNotIn("Banter, not betting tips", text)


if __name__ == "__main__":
    unittest.main()
