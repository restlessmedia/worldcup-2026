import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from generate_update_message import (  # noqa: E402
    enrich_note,
    elimination_lines,
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

    def test_elimination_lines_include_house_and_note(self):
        lookup = {"Haiti": "12", "Tunisia": "8"}
        lines = elimination_lines(
            {"Haiti", "Tunisia"},
            lookup,
            new_eliminations={"Haiti"},
            elimination_notes=["Group C: Haiti eliminated (mathematically out of top 3)"],
        )
        self.assertTrue(any("🆕 Haiti" in line for line in lines))
        self.assertTrue(any("Tunisia (House 8)" in line for line in lines))
        self.assertTrue(any("mathematically out of top 3" in line for line in lines))

    def test_generate_message_matches_casual_format(self):
        text = generate_message(previous_results={"teams_eliminated": []})
        if "Nobody's heading home yet" in text:
            self.assertIn("🚫 Eliminations", text)
            self.assertIn("* Nobody out yet.", text)
        self.assertIn("🥄 Wooden Spoon Watch", text)
        self.assertNotIn("Source:", text)
        self.assertNotIn("Live table:", text)
        self.assertNotIn("Banter, not betting tips", text)

    def test_generate_message_includes_new_eliminations(self):
        text = generate_message(
            previous_results={"teams_eliminated": []},
            elimination_notes=[
                "Group C: Haiti eliminated (mathematically out of top 3)",
                "Group F: Tunisia eliminated (mathematically out of top 3)",
            ],
        )
        if "Haiti" in (Path(ROOT / "data" / "results.json").read_text(encoding="utf-8")):
            self.assertIn("Heading home this round:", text)
            self.assertIn("🚫 Eliminations", text)
            self.assertIn("46 of 48 teams still in", text)


if __name__ == "__main__":
    unittest.main()
