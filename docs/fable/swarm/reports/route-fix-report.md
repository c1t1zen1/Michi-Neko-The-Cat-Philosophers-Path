# Roof Road stage 2: route fix (proposal)

For: the operator. Base: `fable/integration` a63ff9e (its `level.js` is the same as `main`'s; both patches apply cleanly to either). Nothing is pushed or merged. The work is two local commits in the scratch worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/route-fix/wt` (detached).

- `route-fix.patch` (307134c): `rooftops/js/level.js` only.
- `route-fix-companion-budget.patch` (95adf63): `tools/rooftop_companion_test.mjs`, two loop lengths. This is a separate proposal; see below.

## Cause

1. **Pieces off the legs.** Leg 13's temple wall, street props and porches were written to run "to `rail.length`". When leg 13 was the last leg, that meant the end of the route. Stage 2 added legs 14 to 21, so they now run 627 m further, over all eight new corners. The wall became one straight 665 m box. Separately, the transition balconies and the castle keep were placed across the corner fillets. A straight piece is drawn along the tangent at its midpoint, so it cuts across the turn diagonally. Leg 14 is 79 m between its fillets, not 84 m, so the castle keep stood wholly on corner 14.
2. **Autopilot stop at 1232.** No jump there is out of reach: every route link passes the strict 80 % check, with gaps of 0.9 to 1.2 m against a budget of 2.37 to 2.41 m. The cause is a tie. `theater 2` (`house(g15.s0+52.6, g15.s1-2.8)`) still ran to the end of leg 15 underneath the six houses added after it, and its 4.5 m ridge equals the `dressing room` ridge. On a tie the runner stands on whichever platform was built first, which is theater 2. So it is never on `dressing room`, and the autopilot waits at that ridge's midpoint (s=1232.2, y=4.50) until its time budget runs out. **This is not a soft-lock.** A player can run on along theater 2, and the reach graph confirms the perch is reachable from every platform. The stall also hid three problems further along:
   - The same tie at legs 16 to 20: there the balconies sit at 4.5 m inside the 4.5 m ridges of the long houses. Fixing only theater 2 moves the stall to s=1321.
   - `fPerch` is listed in `route()` twice, which leaves a gap in the route numbers. The autopilot then counts itself "done" on the stage ridge at s=1641.7, one platform before the final perch, so `?auto=1` never reaches the finale.
   - The climb-back check only passed because the leg-13 props ran to the end of the route.

## What changed (22 numbers, plus 9 lines that are not numbers)

| Piece | Field | Old | New | Why |
|---|---|---|---|---|
| temple sujibei wall (tsuiji) | s1 | `rail.length - 0.6` (1708.9) | `g13.s1 - 0.6` (1079.0) | Was one straight 665 m wall across corners 13 to 20 |
| leg-13 tail `streetProps` | end | `rail.length - 1.5` | `g13.s1 - 1.5` | Put 75 props on legs 14 to 21; 7 of them sat on corners |
| temple garden porch loop | end | `rail.length - 3.5` | `g13.s1 - 3.5` | Put 66 porches on legs 14 to 21; 6 of them crossed corners |
| transition balcony loop (5.5 m) | end | `g14.s0 - 4.0` | `g14.s0 - 8.0` | Drops the one balcony that sat on corner 13 (1079.0 to 1082.5) |
| castle moat bridge | s1 | `g14.s0 + 78.7` | `g14.s0 + 74.8` | Makes room for the keep on leg 14 |
| castle keep | s0, s1 | `+79.6`, `+83.0` | `+75.3`, `+78.7` | Moved off corner 14 onto leg 14; same 3.4 m width |
| theater 2 | s1 | `g15.s1 - 2.8` (1258.6) | `g15.s0 + 54.4` (1220.8) | Ended the 4.5 m ridge tie with the six houses on top of it (the stall) |
| leg-16 to leg-20 balcony loops | end | `g(n+1).s0 + 2.0` | `g(n).s1 - 2.2` (×5) | Their last 2 or 3 balconies crossed the corner |
| leg-16 to leg-20 balconies | y | 4.5 | 4.1 (×5) | Each lies inside a 4.5 m ridge (textiles, office building, temple gate, bar, temple gate); the same tie. At 4.1 they are a drop of 0.4 m, more than the 0.3 m step |
| legs 17, 18, 19, 21 `streetProps` | step | 8.5 | 5.5 (×4) | Keeps a climb-back within 12 m now that the leg-13 props stop at leg 13. Under the long 2.4 m-hisashi houses only crates can climb. Of the steps tried, 5.5 is the widest single value that passes on all four legs without a prop standing in a villager or the tōrō |

These 9 lines are not numbers. They are needed because only a `corner` piece can follow a turn: corners 1 to 12 all use one, and the 4.3 m jump across a fillet is beyond the 2.4 m route budget, so no numbers-only fix exists.

- `finalTrans = K13`: routes your already-built Nijō corner deck (4.6 m) in place of the balcony on the fillet.
- `legTrans14` / `legTrans15` = `corner(14|15, 4.5, 'leg transition')`: replaces the straight 7.4 m balconies, at your 4.5 m.
- `legTransN.push(corner(N, 4.1, 'leg transition'))` for N = 16 to 20: placed after each loop, level with its balconies. At 4.5 m the deck's slab sat 0.4 m over the last balcony and blocked the camera at s=1560.
- `route(fPerch, ...)` becomes `route(...)`: closes the gap in the route numbers.

Unchanged: the 13 mouths and their ranges; every district, house and theme; pickups, checkpoints, perches, alleys and ceilings.

Kept: every transition balcony that sat on a straight leg. On leg 13 that is 11 of 12, all unchanged. On legs 16 to 20 it is 62 of 81, lowered to 4.1 m; the other 19 crossed a corner.

## Tests (patch applied)

| Check | Before (a63ff9e) | After |
|---|---|---|
| `node tools/rooftop_test.mjs` | 38 passed, 2 failed | **40 passed, 0 failed**, including the climb-back within 12 m and route links within 80 % checks |
| straight-leg check | FAIL: 34 pieces (tsuiji@1044.2 … balcony@1615.0) | PASS |
| autopilot reaches the perch | FAIL: stopped after drama school ridge@1221.6 (226/342), s=1232.17 | PASS: final perch at t=508 s, street never touched |
| `node tools/rooftop_alley_test.mjs` | PASS | PASS |
| `node tools/rooftop_companion_test.mjs` | FAIL "player reaches finale" | level patch alone: FAIL on time only; **with the budget patch: 7 of 7 pass** |
| `?qa=1&auto=1`, `advanceForReview(450)` ×2 | s=1232.17, finale false | s=1494.7 after 450 s, then **finale true, s=1673.08 on "final perch"**, no page errors |
| `node tools/rooftop_golden.mjs` (not `--write`) | EQUAL | DIFFERENT, as expected; see below |

**Companion budget (separate proposal).** That test's two finale runs last 370 s and 400 s. Those lengths were set for the 1,082 m route, whose finale came at 310 to 324 s. The 1,709 m route reaches its finale at 506 to 520 s, and even running flat out at 4.5 m/s the extra 627 m takes 140 s. No level numbers can close that without shortening your districts. The proposal is 570 s and 600 s, which keeps the same 60 to 75 s of headroom, and the assertions are unchanged. `tools/rooftop_browser_test.mjs` has the same problem: one `advanceForReview(400)`, and the call is capped at 450 s. Neither change is made in `route-fix.patch`.

**Golden (compared by content, not by index).**
- Nothing changes before s=1044.15, the temple wall on leg 13.
- The temple wall now ends at 1078.95 instead of running 665 m.
- Leg 13's 78 props and 66 porches are gone from legs 14 to 21. Street props on legs 14 to 21 go from 150 to 89, because legs 17, 18, 19 and 21 now use the 5.5 m step.
- Removed: the two balconies on corner 13, and all 83 "leg transition" platforms at 4.5 m.
- Added: 7 corner decks (14 and 15 at 4.5 m; 16 to 20 at 4.1 m) and 62 balconies at 4.1 m.
- The castle moat bridge, castle keep and theater 2 move to their new spans.
- 4 walls move with those houses.
- Route numbers shift by −1 on 65 platforms after the float. The float top goes back to 191, its number before stage 2.
- Pickups, checkpoints, mouths, perches, alleys and ceilings are identical.

## Captures (`kyoto-rooftops.html?at=<s>&cat=0&shot=1&nohud=1&hour=0.45`, 960×600)

- Corner 13, s=1081.5: `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/route-fix/shots/c13-before.jpg` and `…/c13-after.jpg`. Before, two balconies lie diagonally across the Nijō deck; after, the deck is clear.
- Corner 14, s=1164.4: `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/route-fix/shots/c14-before.jpg` and `…/c14-after.jpg`. Before, a 7.4 m balcony cuts across the corner over the castle keep; after, a corner deck.
- Corner 16, s=1334.3: `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/route-fix/shots/c16-before.jpg` and `…/c16-after.jpg`. Before, the balconies and a porch twist across the turn; after, a corner deck.
- Finale, reached by the autopilot: `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/route-fix/shots/finale-after.jpg`

## Seen but not in this patch (your call)

- **The new legs run through older ones.** Leg 21 runs 2 m from leg 13 for about 96 m, leg 19 runs 4 m from leg 11, and leg 20 runs 10 m from leg 12. Leg 18 crosses both leg 13 and leg 21. Their houses overlap, and these are the only camera-boom failures in the full run:
  - s≈1010: the leg-21 "stage" eave passes through the leg-13 chōchin shop. This was already there in the base run.
  - s≈1424: leg 18 passes under leg 13's 5.5 m balconies.
  - s≈1558: leg 19 passes through a leg-11 roof.

  Fixing this means moving `RAIL_POINTS`, which is a layout decision for you. `rooftop_browser_test`'s check that the camera is clear will flag these spots.
- Mouth 12 (Yasaka) has zero length: `M[11].s0 = M[11].s1 = rail.length`.
- `game.js` (lines 651 and 951) and `build.js` (line 293) still treat `mouths[6]` as the finale mouth, which is now Nijō-jō.
- Leg 13's cobble street still runs to `rail.length`, underneath legs 14 to 21's own streets. The check that the street runs the whole rail currently relies on it at corners 13 to 20.
