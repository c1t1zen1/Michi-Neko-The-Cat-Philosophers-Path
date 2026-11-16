# r6-game-wiring

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-15 17:02 PST
- Branch:             fable/r6-game-wiring
- Base commit:        a63ff9e (fable/integration: four Roof Road kit families, Chidori, a1-village); merged 6016e11 (r3b, r4b-festival) at 9b6d648
- State:              ready for review (G-R's play-through to the finale stays open: the operator's stage-2 route, not this lane)

Lane: guide section 12, Phase 5, steps R6.1 to R6.8 (the spec's section 8.2
table) under rulings D3 (Seven Posts unlock, one continuous run, Chidori stays
on the Roof Road, the finale's sky follows the run), R57 (src/rooftops/
re-exports the runner modules from rooftops/js/, nothing moves), R69/R70
(13 mouths, tag 20261114a). Known baseline: rooftop_test 38 passed / 2 failed
and the companion test's "player reaches finale" (operator's stage-2 route,
17c9cae); the play-through-to-finale part of G-R is blocked on the operator's
route fix and is not this lane's gate.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: a wiring lane, no kit family) | | | | | |

New classic-only valley props, not yet inventoried (handoff 2.2): the Seven
Posts (14 giboshi, the bridge Shōki) and the Odoi (bank, bamboo, thicket,
noren gate), in `src/rooftops/valley.js`.

## Steps
- [x] R6.1 Giboshi caps + Shōki on the valley bridge (3ff1ee0)
- [x] R6.2 Odoi bank + bamboo thicket, own mulberry32(0x0D01) stream (3ff1ee0)
- [x] R6.3 RooftopManager (`src/rooftops/manager.js`) + the run as a pocket scene (`pocket.js`) (750e8fe, c063173)
- [x] R6.4 Re-exports (R57) (8cf6f78)
- [x] R6.5 Save flags (750e8fe; return spot 5916a99)
- [x] R6.6 Journal / XP / music / bells (750e8fe)
- [x] R6.7 index.html noren veil (abc60c7)
- [x] R6.8 Tests: `tools/rooftop_manager_test.mjs` + verify.mjs wiring checks (28a1616)

## Checks run (command → real result)
Final pass 2026-11-15 17:45–17:52 PST (`uptime` load ≈ 2.4–3.4), Metal.
- `node tools/check_syntax.mjs` → All 189 modules OK
- `node tools/verify.mjs` → All checks passed (189 modules, 8 summit, 9 src/rooftops; summit_test 83/0; rooftop_manager_test 59/0; kit 517; kit_test 36/36; a1_village_test 6/6)
- `node tools/kit_check.mjs` → All kit checks OK (517 passed); `node --test tools/kit_test.mjs` → 36 pass 0 fail
- `node tools/cad_overrides_test.mjs` → 27 passed, 0 failed
- `node tools/labs_check.mjs` → All labs checks OK (after `labs_coverage.mjs --write`); `node --test tools/labs_coverage_test.mjs` → 17 pass 0 fail
- `git -c core.whitespace=cr-at-eol diff --check origin/fable/integration...HEAD` → clean (plain `--check`: 55 hits, all index.html CRLF endings)
- `node tools/rooftop_test.mjs` → 38 passed, 2 failed: the baseline names and details ("every piece sits on one straight leg" tsuiji@1044.2 …; "autopilot reaches the perch" stopped after drama school ridge@1221.6, s=1232.17)
- `node tools/rooftop_companion_test.mjs` → baseline AssertionError "player reaches finale"
- `node tools/rooftop_manager_test.mjs` → 59 passed, 0 failed
- `node tools/rooftop_golden.mjs` → EQUAL (classic)
- `node tools/footprint_golden.mjs` → EQUAL after the write; before it: DIFFERENT (5 changed, 26 added, 0 removed): rng valley 49233 draws (probe ok), hidden 7810, Math.random 92 unchanged; +3 colliders (indices 479–481), +1 exclusion, +20 objects, +2 aggregates; the 5 changed are counts
- `node tools/footprint_golden.mjs --systems` → EQUAL after the write; before: vegetation 249867 draws unchanged, only the meadow mask texture and the exclusion list; scratch proof: 167/65536 mask texels differ, all in x -11.8…11.0, z 35.3…41.8
- `node tools/summit_golden.mjs` → EQUAL; `node tools/summit_kit_parity.mjs` → EQUAL
- `node tools/cat_golden.mjs` → EQUAL
- Headless boot `/index.html?assets=classic|modular` (autostart new, frame 244): errors only the pre-existing `/cad-overrides.json` 404 (also on the base), no warnings
- Scripted drill (scratch `drill.mjs`, both sets, 20/20 each, page errors [] warnings []): partial walk 3 posts → step off resets; mid-rail start lights nothing; full walk unlocks (journal); thicket open after 3 s; walk into the gap → veil → in the pocket (cat under the run, camera at y < -2000, rooftop-mode); a save there writes the ramp; autopilot 30 s to s ≈ 108 (mouth 2); Shōki 1 greeted → mask bit 0 + keepsake; perch → finale (quiet moment, rooftopFinished), five fires, lantern, D key → home; second entry reuses the pocket; walk back off the route's start (A key) → home, camera far 700 restored; save → reload (continue) → unlock, mask, Odoi open restored
- A save made on main 08bd3b5 (exported tree, headless) loads in the lane on classic and modular: position (6, 0, 4), score, journal kept; rooftops locked, mask 0, Odoi closed
- Classic `game_shot` pairs, lane vs 6016e11 (integration, merged): shrine maxDelta 0; village maxDelta 132 (4119 px: bamboo tops of the new Odoi above the edge-forest canopy, far south-east); bridge maxDelta 210 (the 14 giboshi, the Shōki, the Odoi bank and bamboo, and the east caps' shadows on the bank at hour 16); wide maxDelta 66 (94 px: the east end of the Odoi bank). Every difference is a new object or its shadow.

## Deferred assets and why
- The page's HUD (title card, mouth strip, Shōki counter, neighbourhood map, alley hint) is not ported: the game's toasts carry the mouths' titles, Shōki and the finale card (guidance stays soft).
- The page's procedural soundscape (river and roof-wind layers, chirps, festival drum) is not ported: the run uses the game's footsteps/splash and small chimes and drums on the sfx bus; a 'Rooftops' music mood is a music.js patch (handoff 2.1).
- No touch "drop" button: drop is the stick pulled down, S or ↓.

## Footprint waivers requested
None: the footprint and systems goldens were rewritten for additions only (see the checks and 3ff1ee0's message).

## Notes for the Integrator
See `docs/fable/handoff/r6-game-wiring.md`: the music.js mood (2.1), the
inventory rows and a `src/rooftops/` scan for labs_coverage (2.2), the catalog
link note (2.3), the board (2.4), the CRLF `diff --check` note and the stale
R64 sentence in AGENTS.md (3).
