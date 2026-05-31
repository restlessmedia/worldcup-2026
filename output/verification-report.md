# Extraction verification report

Generated: 2026-05-31 20:08 UTC
Archive: `archive\draw-results.xlsx`
Archive SHA-256: `40a9f1a479853401c88256d362bc53a18dd07d5a8eb4bb81e16b15377459fd05`
Result: **PASS**

## Checks

- [ok] `data/draw.json` matches archive
- [ok] `data/teams-list.json` matches archive
- [ok] `data/responses.json` matches archive
- [ok] `data/config.json` matches archive
- [ok] Draw has 17 houses and 48 teams
- [ok] Every drawn team exists in teams-list.json
- [ok] `data/provenance.json` updated with archive SHA-256

## Draw extracted from archive

| House | Teams | Count |
| --- | --- | ---: |
| 1 | Belgium, Iraq, Uruguay, New Zealand | 4 |
| 2 | Austria, Japan | 2 |
| 3 | Czechia (Czech Republic), Ecuador | 2 |
| 4 | Mexico, Netherlands (Holland), England | 3 |
| 5 | Ghana, USA (United States), Türkiye (Turkey) | 3 |
| 6 | Brazil, Senegal, Uzbekistan, Ivory Coast (Côte d'Ivoire) | 4 |
| 8 | Tunisia, Australia, Jordan | 3 |
| 11 | Haiti, Norway, Saudi Arabia, Curacao (Curaçao) | 4 |
| 12 | Argentina, Algeria | 2 |
| 13 | Bosnia and Herzegovina (Bosnia), Panama, Egypt, Switzerland | 4 |
| 16 | Paraguay, South Korea (Korea Republic) | 2 |
| 18 | Cape Verde, Qatar | 2 |
| 19 | Morocco, Croatia | 2 |
| 20 | Sweden, Germany | 2 |
| 21 | Iran, France, Portugal | 3 |
| 22 | DR Congo (Democratic Republic of the Congo), Scotland, South Africa | 3 |
| Coppice | Colombia, Spain, Canada | 3 |
| **Total** | **48 teams across 17 houses** | **48** |

## Summary

All structured JSON files match a fresh export from the archive workbook.
You can re-run this check any time with:

```bash
python scripts/verify_extraction.py
```
