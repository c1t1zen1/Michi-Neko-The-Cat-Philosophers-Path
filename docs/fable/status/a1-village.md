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

## R66 World build (modular ≤ 1.25 × classic, boot ≤ classic + 1.0 s)

**State: not closed.** The lane's family changes cut real first-build work
with byte-identical output; the rest of the gap is in hot files (handoff §2)
and in build work that is shared or structural. Numbers below.

**Where the time goes** (one CPU-profiled boot per set, medium, `?assets=modular`
vs none, scratch `bootprof.mjs`: perf_spots' timing hook plus a CDP profile;
load 3.5 to 5.0, so read the shares, not the ms):

- classic world build 1,405 ms, modular 2,169 ms (+764). Of the modular extra:
  the kit preload ~118 ms (`ctor → assembleWorld`: 133 ms against 15 ms on
  classic, 98 ms of it idle waiting on module downloads), and the rest inside
  `assembleWorld`: Countryside +369, Sky +73, HiddenPlaces +49, SummitManager
  +55, Vegetation +41 ms.
- the kit's own first builds summed 863 ms (261 instances), led by
  `valley-ground` 196 (its layer tiles 137 incl. the meadow tile the classic
  ground paints too, terrain 31, field 18), `bamboo-fence` 78 (65 of it the
  culm bake's clones and `mergeGeometries`), `clouds` 59 (the cloud field 54),
  `moon-pool` 53 (the caustic texture 41), `sakura` 44, `kawara-roof` 38,
  `corral-sign` 36 (the same CJK sign painting as classic), `street-bushes` 28,
  `mountains` 22, `moon` 18 (its painting 16); `KitMaterials` texture painting
  (stone, wood, lacquer) 80 ms on first use.

**What the lane changed (families only, same output):**

| Change | Proof of same output | Cost before → after |
|---|---|---|
| `sky/field.js` cloud field: per-field lattice tables, masked wraps, no array per texel | byte-identical `data` on 51 seeds incl. `assetRng('clouds', 0..7)` (scratch `eq_cloud.mjs`) | 62–81 → 23 ms (Node); in-game `clouds` 59 → 30 ms |
| `hidden/pool.js` caustic cells: skip copies beyond f2 before the exact distance | byte-identical on 30 site sets (`eq_caustic.mjs`) | 19 → 5.6 ms (Node); in-game `moon-pool` 53 → 25 ms |
| `fences/culm.js` `bake()`: writes the merged arrays with three's own per-vertex math | equal to clone + applyMatrix4 + mergeGeometries (attributes, index type, userData, groups, bounds) on 36 culm/knot cases (`bake_eq.js`, in the browser) | 80 → 10.5 ms on the cases; in-game `bamboo-fence` 78 → 11 ms |
| `ground/field.js` `cachedField`: the first build keeps no snapshot | contract ground 433/0 (warm build still a copy), wear test 14/0 | one 17 MB copy and 17 MB of heap |
| `sky/night.js` moon painted on its first draw | same pixels; a day boot never paints it (`disc.visible` is false by day) | 16–20 ms on a day boot |

Summed kit first builds, one boot each at load ~3.5: 863 → 796 ms (the
shared textures land on whichever instance asks first, so single instances
move around: `foothill-forest` and `street-bushes` paint the foliage leaf-mass
textures, 63 ms, which classic paints 45 ms of).

## A.5 Sound (rulings R50, R62)

**The sink** (`src/main.js`, the granted t3 block, extended): one sink for every
kit sound event, valley and summit. Gating lives in the sink: silent in a
`?shot=1` capture, on the title or pause screen, in a hidden tab, before the
AudioContext runs (the autoplay lock) and when the master or the event's bus
(sfx; ambient for the fūrin and the water) is at 0. Distance from the cat
fades each event (range per event, gain × (1 − d/range)²; the summit sits
1.2 km below the valley, so neither hears the other). Lantern kindles at most
one per 0.15 s across lanterns; every other event one per 0.06 s. The shrine
bell and the nest purr play today's game sounds (`playBell`, `playPurr`);
every other event plays from the dawCAT kit pack, `src/kit/sfx_pack.js` (beside `src/kit/audio.js`),
generated by dawCAT's `kitPackModule()` (no audio files, no Math.random),
imported on the first event that passes the gate, so the classic set (no kit
instances, no events) never downloads it. `env.audio.listener` (a read-only
getter for the cat's position) lets kit code find proximity edges without
reading the player.

**Call sites** (edge-triggered only; never per frame):

| Event | Family, file | Edge |
|---|---|---|
| `garden.shishi.clack` | garden, `build.js` | the existing clack edge (onClack); the tube's world position |
| `garden.chime.ring` | garden, `build.js` (valley fūrin and the summit's `summit-furin`) | the clapper turns after a swing of more than 0.1 (the gap to the glass), 0.8 s cooldown; at the game's rest wind (env.wind 1) one ring every ~2.2 s (0.9 to 3.3 s), none in a calm; gain from the swing |
| `lantern.kindle` | lanterns, `light.js` `lampUpdate` (toro, street lamps, chōchin, andon, courtyard and pool tōrō, the summit toro); hidden, `glade.js` (each glade lantern) | kindle rises through 0.08 once per dusk; never on the first update (a boot at night is silent) |
| `water.stones.flow` | water, `river.js` | while the cat is within 7 m of a bridge post standing in the river, the nearest is heard every 2.2 to 3.4 s (golden-ratio stagger) |
| `machiya.noren.brush` | machiya, `screens.js` | the cat's body enters 0.35 m of the cloth plane, within its width and between hem − 0.3 m and the pole; 1 s cooldown (a cat walking under a street noren is silent: the hem is 1.6 m up) |
| `nest.settle` | nest, `build.js` (feather) | the quest hides the feather (the cat takes it): one purr |
| `shrine.bell.ring` | none | the game's `ContextActionManager.ringBell()` already plays `playBell()` on both sets; a kit call would double it |
| `keepsake.collect` | none | `main.js` plays `playCollect` on pickup |

**Summit (R62):** the summit's fūrin and toro use the garden and lanterns
code above, so they emit the same events; the summit's own
`SummitManager.assetEnv()` has no `audio` field, so the one line that passes
it is a hot-file patch in `docs/fable/handoff/a1-village.md` §1.

**Proof** (scratch `audio_check.mjs`, one modular boot, the real instances'
`update()` with a recording env, then the real sink):

```
families: shishi (standalone cycle) 0 in 20 s — the game rocks the tube; live run below; chimeWind1 27 in 60 s; chimeCalm 0;
  lamps chochin/toro/street-lamps: kindles over 17→21 h 23, while lit 0; flowNear10s 4, flowFar10s 0;
  noren 10/10 brushed at hem height, 0 walking on the ground; nestSettle 1
sink: AudioContext running → a clack 2 m away: pack loaded, 3 Web Audio nodes; a kindle 300 m away: 0 nodes;
  ctx suspended 0; menu paused 0 (control 0); sfx volume 0 → 0; restored 3
live (20 s of real frames at the residence garden): garden.chime.ring 20, garden.shishi.clack 1
```

The live count is two fūrin: `main.js` updates every runtime instance in the
valley, the summit's `summit-furin` too (its events land 1.2 km below the cat,
so the sink drops them), so 20 rings in 20 s is the valley chime's ~1 per 2.2 s
plus the summit's.

## Deferred minors (ledger) and G-V3 review items

| Minor | Done | Proof |
|---|---|---|
| alley: corner-post tops coplanar with the lid (z-fight); hidden far core box | posts stop 4 mm under the lid; far builds no core box | alley contract 153/0 |
| nest: eggs lost MAT.birdEgg gloss; lining saturated at noon; dead code | eggs on `km.bag({ rough: 0.4, metal: 0.1 })` (the classic gloss, speckles kept; one small merged draw, as classic's own egg material); lining 0x3c4a22 → 0x48482e; three dead expressions removed | nest contract 226/0; `nest_before/after` |
| pagoda: valley first roof still too wide | valley preset overhang 0.42 → 0.32: first-roof span W1·(1 + 2·ov) = 3.80 × 1.64 = 6.2 m against the classic's (4.55 + 0.72) × 1.232 = 6.5 m (x), 5.8 m (z); 0.42 gave 7.0 m | pagoda contract 171/0 (warm-build flake at load 3.3, also on the base, below) |
| hidden: lotus leaf a pale disc on a thin stalk | blue-green leaf, pale navel, eleven-wave rim, 4 × 33 grid, stalk 12–16 mm (same rng draws) | hidden contract 1232/0; `lotus_after` |
| hidden: glade lantern 3 cm bob dropped | **not done** (ranked issue 7): the paper, rings and string are in two meshes, one merged; a bob needs both in one live mesh | |
| keepsakes: glint texture never disposed; dango larger than the classic charm | glint texture per KitMaterials set (the kit's shared-texture convention); dango `size` default 1 → 0.8 (the three dumplings 0.28 m, the classic charm's height; the tassel clears the ground) | keepsakes contract 504/0 |
| garden: washi texture not disposed; dead expression | strip texture marked `userData.kit` (shared per kit set, the convention); `rotateZ(-atan2(..) * 0 + 0)` removed | garden contract 184/0 |
| fences: mid tier 12.66k on 11 m runs (R51 exception) | **exception kept, with the reason**: on medium every near-band instance (the whole village, r < 39 m) is built at the mid tier and seen at cat height, so the mid fence is the medium player's close-up fence; dropping knots or nodes there is a visible loss. The bake is now ~7x faster (below), so its `buildMs` part of the exception can go: see A.6 | |
| trees: maple taller/narrower | **not done** (ranked issue 5): the fix is a wider primary tilt (1.02 → ~1.18), but `SPECIES.maple.canopy` must stay equal to the lab's table (`labs/trees/drift_check.mjs` failed when I changed only the kit), and labs/trees is not this lane's | |
| trees: wind-motion pixel proof | see A.4 | |
| critters: butterflies too bright at night | already fixed by a2-hilltop (`cb48fe8`: wing glow follows the sun, 0.1 at night) | read the code |
| greenery: medium peak-call margin thin | no longer thin at G-V3: medium shadow-refresh frames 557–570 calls against classic high 763 (perf_gv3.md) | |
| machiya: noren hem band 1.5–4 cm detach | **not done** (ranked issue 8) | |
| v-ground: ~35 MB heap; upload churn after a walk | the first build keeps no 17 MB snapshot (`cachedField`); regrowth-only re-uploads every 4 s instead of every second for the whole regrowth (paws still upload within 0.25 s) | ground contract 433/0; ground_wear_test 14/0 |
| v-ground: palette verbatim copy; duplicated sun path; wearGrassMask mixed interpolation | not done (no cost, no visible effect; ranked issue 9) | |
| G-V3 M1: modular paving lavender at dusk | nobedan stones take the classic street's noon colour ratio (× .81/.70/.55), paving roughness .62 → .8 with half the foot polish, the cool shade tint spares paving | paving mean RGB (cam 1.0,0.45,10 → 0.5,1.1,-22): dusk 74/64/82 → 68/52/54 (classic 63/48/48); noon 190/175/153 → 184/161/126 (classic 169/147/112); `m1-paving-18-modular-before/after.jpg` |
| G-V3 M2: v-trees handoff says tree-trunks/canopies promoted | corrected (deferred, building blocks only) | docs |

## Checks run (command → real result)

## Remaining issues, ranked

## Notes for the Integrator
