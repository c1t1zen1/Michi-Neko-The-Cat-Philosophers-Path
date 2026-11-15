# a1-village

- Worker / model:     Claude Opus 5.5
- Claimed:            2026-11-15 00:18 PST
- Branch:             fable/a1-village
- Base commit:        98c3a61 (fable/integration, G-V3 ticked, tag 20261114a)
- State:              in progress

Phase 7 area polish for the Kyoto village (valley). Brief:
`.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/a1-village.md` (scope ruling R58;
Integrator additions after G-V3: R66 world build, R62 summit audio, R67).

## Steps
- [ ] A.1 Walk it at cat height: routes written down (below); captures pending
- [ ] R66 World build: modular ≤ 1.25 × classic build and boot ≤ classic + 1.0 s (medium, high)
- [ ] A.5 Sound: env.audio sink in `src/main.js` (R50, R62) + family call sites
- [ ] Deferred minors (ledger)
- [ ] A.2 Composition
- [ ] A.3 Light
- [ ] A.4 Life
- [ ] A.6 Performance
- [ ] A.7 Comfort
- [ ] A.8 Before/after pairs vs Phase 0, remaining issues ranked

## A.1 Routes (camera paths, written before any capture)

World coordinates (the valley floor is flat, y = 0, inside r = 55;
`Countryside.terrainHeight`). Every stop is one `?cam=px,py,pz,tx,ty,tz,60`
boot of `tools/game_shot.mjs` with `nohud=1&shot=1&assets=modular`, eye at cat
height (0.5 m above what it stands on), looking ~12 m ahead. Stops are ~10 m
apart along each route. Files: `docs/fable/status/a1-village/<stop>_<hour>[_<weather>].jpg`.

Times: dawn `hour=6` (sunrise phase), noon `hour=12`, dusk `hour=18.5`
(sunset into dusk), night `hour=22` (perf_gv3's night hour). Weather where the
valley supports it: `weather=rain`, `weather=snow` (noon).

**R1 Main street: bridge → tea house → shrine sandō** (heading −z)

| Stop | Eye (px, py, pz) | Looks at (tx, ty, tz) | What is in view |
|---|---|---|---|
| s1 | -1, 1.58, 33 | -1, 1.4, 21 | from the bridge deck (deck y 1.08) down the street |
| s2 | -1.5, 0.5, 22 | 0.5, 1.2, 10 | street foot, first houses |
| s3 | 0.8, 0.5, 13 | 1.0, 1.2, 1 | the perf_spots `street` spot (W3/E4 houses) |
| s4 | 0.5, 0.5, 3 | -12, 1.8, -5 | the turn to the tea house (-14, -6) |
| s5 | -0.5, 0.5, -8 | 0, 2.0, -22 | up the lane to the torii |
| s6 | 0, 0.5, -19 | 0, 2.5, -32 | the sandō through the torii to the shrine hall |

**R2 River path: paddies → bridge → Moon Pool** (heading −x, then to the pool)

| Stop | Eye | Looks at | What is in view |
|---|---|---|---|
| r1 | 30, 0.5, 26.5 | 18, 1.0, 27.5 | east paddies (28, 22) on the left, river on the right |
| r2 | 19, 0.5, 27.2 | 7, 1.0, 28.5 | paddy (14, 22), river bank |
| r3 | 9, 0.5, 28.2 | -1, 1.2, 30.5 | the perf_spots `river` spot: water and the bridge |
| r4 | -10, 0.5, 26.5 | -22, 1.0, 27 | west of the bridge, the west paddy (-26, 22) |
| r5 | -17, 0.5, -17 | -20, 0.6, -27 | the way into the shrine grove to the Moon Pool (-20, -27) |
| r6 | -17.5, 0.5, -23.5 | -20, 0.3, -27.5 | at the Moon Pool's rim |

(r4 → r5 crosses the west meadow, which R3 covers.)

**R3 Meadow: corral → glade → rim forest** (heading −z, then west)

| Stop | Eye | Looks at | What is in view |
|---|---|---|---|
| m1 | -12, 0.5, 12 | -24, 1.0, 9.5 | the perf_spots `meadow` spot, looking at the corral (-31, 9) |
| m2 | -31, 0.6, 3 | -31, 0.8, 9 | the corral's sign side and fence runs |
| m3 | -30, 0.5, -1 | -31, 1.5, -10 | from the corral to the Lantern Glade (-31, -10) |
| m4 | -28, 0.5, -7 | -33, 1.5, -12 | inside the glade ring |
| m5 | -34, 0.5, -12 | -44, 2.5, -16 | from the glade to the rim forest (r ≈ 39 +) |
| m6 | -37, 0.5, -20 | -47, 3.0, -26 | the rim forest edge |

**Capture plan (≤ 60 images, each ≤ 150 KB):** all 18 stops at noon and at
night (36); dawn and dusk at s1, s3, s6, r3, r6, m4 (12); rain and snow at
noon at s3, r3, m4 (6); one interior frame each in the tea house and the
secret house (2); A.8 "after" frames for the Phase 0 pairs (≤ 4).

## Checks run (command → real result)

## Remaining issues, ranked

## Notes for the Integrator
