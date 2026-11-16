# Lane brief: r6-game-wiring (Phase 5 — the Roof Road into the game; serial, Integrator-delegate; hot files granted below)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/r6-game-wiring   Branch: fable/r6-game-wiring (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/r6-game-wiring-report.md
Read in order: _common.md (this folder); AGENTS.md; BUILD_GUIDE_FABLE.md §12 (R6.1–R6.8 and gate G-R) and §3; the spec
docs/superpowers/specs/2026-10-24-rooftop-road-design.md §8.2 (the wiring table) and §11; docs/fable/decisions.md D3 (ruled: r6 OPEN,
each §11 question takes the spec's own answer, quoted there); the Roof Road docs on main (docs/ROOFTOPS_*_2026-11-13.md);
docs/fable/handoff/r1-roof-split.md; src/mountaintop.js + src/summit/** as the SummitManager pattern; tools/summit_test.mjs and
tools/verify.mjs (summit wiring checks) as the test pattern.

## Binding rulings
- R57 (reversed R6.4): do NOT move the runner modules. `src/rooftops/` RE-EXPORTS them from `rooftops/js/` (one source); the sandbox
  page `kyoto-rooftops.html` and every rooftop test keep working unchanged. Never edit level.js, rail.js, physics.js, reach.js,
  autopilot.js or the companion code (the operator owns the route).
- R69/R70: the Roof Road on integration includes the operator's stage 2 (13 mouths), alleys, crowds; tags are 20261114a.
- KNOWN BASELINE: rooftop_test 38/2 + companion "player reaches finale" fail from stage 2 (17c9cae): the autopilot stalls at
  s≈1232 after the drama school ridge. Not yours to fix. Your gate is NO NEW failure; G-R's play-through-to-finale requirement is
  blocked on the operator's route fix and is NOT part of your done criteria — record it as the open G-R item.
- Classic safety in the VALLEY is absolute: with no unlock, a player on main sees the same valley except the R6.1/R6.2 additions
  (giboshi caps + Shōki on the bridge; the Odoi bank and bamboo thicket). Those additions must not shift the seeded valley:
  never add, remove or reorder a `this.random()` call in countryside.js; the Odoi bank uses its OWN `mulberry32(0x0D01)` stream.
  Footprint golden: expect a difference ONLY from the new objects — prove every pre-existing object is identical (same rng draw
  count 49,233, same colliders except the new ones), then `--write` with the reason in the commit message. Grass: the new
  thicket registers exclusions so the BiomeMask changes only there.
- Save: `worldFlags.rooftopsUnlocked`, `rooftopShoki` (7-bit mask — with 13 mouths now, use the spec's Shōki count as built; if more
  than 7 Shōki exist, widen to a bit mask sized to the built count and say so), `rooftopFinished`. Never save a pocket position.
  A save made on main (08bd3b5) must load unchanged (no new required key).
- No fail states, no timers (design guardrails). A fall puts the cat back on a roof, as the prototype does.

## Granted hot files (this lane only)
src/main.js, src/countryside.js (bridge giboshi/Shōki in `buildRiverAndBridge` kept out of `_mergeStatics` so the glow animates;
the Odoi bank builder), src/vegetation.js (only if exclusions need it), src/settings.js (nothing expected), src/save*.js / the save
module, index.html (the noren veil as a SIBLING element — never touch #summit-transition), src/ui.js only for the journal/XP hooks,
src/rooftops/** (new), tools/verify.mjs (rooftop wiring checks), tools/rooftop_manager_test.mjs (new), AGENTS.md (a Roof Road row
update), labs/ASSET_COVERAGE.md (regenerate). Not src/mountaintop.js.

## Steps (guide R6.1–R6.8)
R6.1 bridge giboshi + Shōki · R6.2 Odoi bank + thicket (own stream; exclusions + colliders; `setOdoiThicketOpen(t)`) ·
R6.3 `src/rooftops/manager.js` RooftopManager shaped like SummitManager (`setUnlocked`, `enter`, `exit`, `setActive`, `update`), pocket
origin (0, −2400, 0) · R6.4 re-exports (R57) · R6.5 save flags · R6.6 journal + XP hooks, `music.setScene('Rooftops')`, post bells ·
R6.7 index.html noren veil · R6.8 tests: verify.mjs wiring checks in the summit style + `tools/rooftop_manager_test.mjs` state machine.
Unlock per D3 (the spec's answer: the Seven Posts railing walk, unless decisions.md quotes otherwise).

## Checks
G1; footprint golden (written as above) + `--systems`; summit_test + summit golden EQUAL (the summit must not notice the Roof Road);
cat golden EQUAL; rooftop_test 38/2 baseline + companion baseline; rooftop_golden classic EQUAL; the new manager test; a full
headless game boot classic + modular (console clean); a scripted drill: unlock → enter the pocket → run a few mouths → exit → save →
reload → flags restored, on both sets; a save from 08bd3b5 loads. Classic valley game_shot pairs vs the base commit at four views:
maxDelta 0 everywhere except frames that include the new bridge caps/Odoi bank (explain each).
Push, PR into fable/integration (title "r6-game-wiring: the Roof Road in the game"), report per _common.md.
