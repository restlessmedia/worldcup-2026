# Tournament results page — design

## Goal

With the tournament over, shut down the live tracker UI and show a single, centred results page: place, house, team, winnings, and why — with light celebration.

## Approach

Static prize board (hardcoded). Not derived from live FIFA sync, so overnight updates cannot change winners. Provisional notes stay until human lock-in.

## Prize board (provisional)

| Place | House | Team | Why | Amount | Note |
| --- | --- | --- | --- | --- | --- |
| 1st | Coppice | Spain | Tournament winners | £120 | |
| 2nd | 12 | Argentina | Finalists (lost final) | £48 | |
| 3rd | 4 | England | 3rd-place play-off winners | £28.80 | |
| 4th | 21 | France | 3rd-place play-off losers | £19.20 | |
| Wooden spoon | 1 | Iraq | 12 GA; tie England & Tunisia — England more matches (8 vs 3); Iraq worse GD (−11 vs −10) | £12 | Being confirmed |
| Fair play | 4 | Netherlands | FIFA Fair Play Award (3 yellows, no reds) | £12 | Being confirmed |

Page banner: “Pending final confirmation.”

## Structure

- `index.html` → `ResultsApp` only (no Layout/nav).
- `fixtures.html`, `knockout.html`, `spoon.html`, `info.html` → redirects to `index.html`.
- Centred medal table: trophy cue, place, house, flag + team, winnings, reason.
- Soft night-sky background + restrained CSS fireworks (`prefers-reduced-motion` respected).
- Existing flag PNGs (`ESP`, `ARG`, `ENG`, `FRA`, `IRQ`, `NED`).

## Out of scope

- Live recomputation of winners from fixtures
- Keeping old tracker pages reachable
- Householder names
