# r1-roof-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-14 03:16 PST
- Branch:             fable/r1-roof-split
- Base commit:        8702cc7 (fable/integration; contains main 676506f, Roof Road stage 2)
- State:              in progress

Lane: guide section 12, Phase 5, steps R1.1 to R1.5 under Integrator ruling
R57 (brief `r1-roof-split.md`). Splits `rooftops/js/build.js` into
`rooftops/js/pieces/<type>.js` behind the `buildWorld` facade, routes every
piece through its own `AssetRuntime`, inventories the Roof Road and registers
its lab. No change to `level.js`, `rail.js`, `physics.js`, `reach.js`,
`autopilot.js` or the companion code.

## R57 pre-check (2026-11-14, after `git fetch origin`)

`origin/main` is `414225f`, an ancestor of this branch's base `8702cc7`
(`git merge-base --is-ancestor origin/main HEAD` holds).
`git diff --stat 676506f origin/main -- rooftops` shows only the two cache-tag
lines (`build.js`, `game.js`) already on `fable/integration`. No Roof Road
change on `origin/main` past 676506f: proceed.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none promoted: serial split lane; every Roof Road piece type is routed through `assets.build`, see the handoff) | | | | | |

## Steps
- [x] R1.0 Claim: R57 pre-check, this file (f6ab225)
- [x] R1.4a Rooftop numeric golden written from the unchanged code (772433e)
- [x] R1.2 Split `build.js` into `rooftops/js/pieces/` behind a `PIECES` table (golden EQUAL after each commit) (2cda1e5, 5dd53a9, f32fb47, 92efc80, f4f9725)
- [x] R1.3 Roof Road `AssetRuntime`, every piece through `assets.build` (79fb75d)
- [ ] R1.1 Inventory group "Roof Road", coverage tool and test, swap matrix lanes
- [ ] R1.5 Roof Road lab registered with a shelf of the piece types
- [ ] R1.4 Proof: rooftop tests, companion test, golden, checks
- [ ] Handoff, report, PR

## Checks run (command → real result)

Resumed 2026-11-14 by a second Claude Opus 5.5 session (the first ended
after 79fb75d). Everything below was re-run by the resuming worker before
ticking R1.0 to R1.3.

- Golden written from the unchanged code: `git archive 772433e` (build.js as
  at 8702cc7) into a scratch dir, `node tools/rooftop_golden.mjs` there →
  `rooftop golden: EQUAL … byte-identical to this build`, 441 pieces (573
  adds, 0 empty) · 670 platforms · 172 walls · 20 ceilings · 156 lights ·
  61 root children · 1715 batches (1880448 vertices) · 107 materials. The
  same unchanged tree with HEAD's golden tool → `EQUAL, ROUTING FAILED`
  (exit 1: the routing self-test catches the pre-routing build.js, as it
  should). `git diff --stat 772433e HEAD -- tools/golden/` is empty.
- HEAD 79fb75d: `node tools/rooftop_golden.mjs` → `EQUAL`, byte-identical,
  routing `ok … 7 pieces (legs +x -z -x +z); 27/27 checks`, exit 0.
  `--query "assets=modular"` → EQUAL; `--query
  "swap=roof-machiya:modular,roof-bridge:modular"` → EQUAL.
- Moves, not rewrites: an independent line-multiset check of the 8702cc7
  build.js against build.js + pieces/*.js at 92efc80 (the last pure-move
  commit) loses only 40 lines: the 35 `B.x = (pc, ctx) => {` heads (now
  `export const x = (pc, ctx) => {`), four import lines and one section
  banner. Every body line is present. No piece module refers to `B`.
  PIECES holds 48 types = the 35 original `B.x` builders + the 13
  `installDowntown` builders; house/yatai keep their downtown dressing pass.
- `node tools/rooftop_test.mjs` → `40 passed, 0 failed`.
- `node tools/rooftop_companion_test.mjs` → `7 companion/ceiling checks passed`;
  `node tools/rooftop_alley_test.mjs` → `PASS six alleys …`.
- `git diff --check 8702cc7 HEAD` → clean; every rooftops/js/*.js and
  pieces/*.js passes `node --input-type=module --check`.

## Deferred assets and why

## Footprint waivers requested

## Notes for the Integrator
