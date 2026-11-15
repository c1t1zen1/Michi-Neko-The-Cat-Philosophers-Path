# a1-village

- Worker / model:     Claude Opus 5.5
- Claimed:            2026-11-15 00:18 PST
- Branch:             fable/a1-village
- Base commit:        98c3a61 (fable/integration, G-V3 ticked, tag 20261114a)
- State:              ready for review (R66 open: needs the two hot-file patches in the handoff)

Phase 7 area polish for the Kyoto village (valley). Brief:
`.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/a1-village.md` (scope ruling R58;
Integrator additions after G-V3: R66 world build, R62 summit audio, R67).

## Steps
- [x] A.1 Walk it at cat height: three routes, 18 stops, 50 frames + 2 interiors (below)
- [ ] R66 World build: **open**. Lane family changes 1.52/1.73 → 1.43/1.57 ×; with handoff §2a + §2b 1.24/1.22 × (holds); the Integrator applies the hot-file patches and re-measures
- [x] A.5 Sound: the one env.audio sink in `src/main.js` (R50, R62) + family call sites; summit `env.audio` is handoff §1
- [x] Deferred minors (ledger) + G-V3 M1/M2: done or ranked with the reason (table below)
- [x] A.2 Composition
- [x] A.3 Light
- [x] A.4 Life (incl. the wind-motion pixel proof)
- [x] A.6 Performance
- [x] A.7 Comfort
- [x] A.8 Before/after pairs vs Phase 0, remaining issues ranked

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
| r1 | 22, 0.6, 25.5 | 10, 1.0, 28 | on the aze bund of the east paddy (14, 22) and (28, 22), river on the left (re-placed after the first walk: 30, 0.5, 26.5 stood inside a bush) |
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

**Captured** (`a1_walk.sh`, `interior.sh` in michi-wt/_scratch/a1-village;
`game_shot.mjs` 960 × 600, frame 120 of `?shot=1`, quality resolved to high, so
near-band assets are the hero tier; JPG q75, 25–121 KB; load 2.2 to 4.6): all
18 stops at noon and night (36), dawn and dusk at s1, s3, r3 and m4 (8, the
plan's s6/r6 dawn/dusk dropped to keep the folder ≤ 60), rain and snow at noon
at s3, r3, m4 (6), the tea room (`interior_tea_12`, InteriorManager at y 100,
entered as the door does, camera pinned at 1.4, 100.55, 1.6) and the secret
machiya's furnished room in the valley (`interior_secret_12`). Files:
`docs/fable/status/a1-village/<stop>_<hour>[_<weather>].jpg`.

**Frames that break the bar** (by eye; "both" = the classic set shows it too,
checked with a classic frame at the same camera):

| Frame | What breaks | Set | Owner / ranked |
|---|---|---|---|
| s1_6 (dawn, bridge deck) | the dawn river mist is a white wall across the frame with a hard lower edge; the deck below it reads normally | both (classic `s1_6` shows the same) | ranges `dawn-mist` / classic layout; issue 3 |
| interior_secret_12 | meadow grass grows through the tatami and between the mats inside the secret machiya | both | Vegetation exclusions (hot) or a floor under the kit tatami; issue 2 |
| m6_12 (rim forest edge) | past the rim trees the foothills read as low-poly cones and faceted boulders on a flat lawn, a white box house | modular (edge-forest pinned classic, R49) | ranges; issue 4 |
| r6_12 (Moon Pool rim) | the rim rocks at 0.5 m show texture seams (dashed lines along faces) | modular | rocks (`pool-rim`); issue 10 |
| r6_12 | the hero lotus standing leaf now has a wavy rim and stalk but still reads lighter than the pads in sun | modular | hidden; issue 11 |
| s1_12, interior_tea_12 | plank grain bands strongly at grazing angles (bridge deck, tea-room floor strip) | both | issue 12 |
| m4_12_snow | snow caps the boulder and seat; the meadow grass stays green and tall | both | grass (no snow response); issue 13 |
| first r1 frame (30, 0.5, 26.5) | the camera stood inside a bush: re-placed (route table) | camera | none |

Everything else holds at cat height: the street (s2–s6) closes on the torii
and the shrine hall, lanterns line it at night and warm the paving (s3_22),
the corral sign and fence read cleanly (m2), the glade's lanterns and
fireflies carry the night (m4_22), rain wets the river path (r3_12_rain).

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

**The measurement** (the perf_gv3 command per root, `perf_spots.mjs --tiers
medium,high --spots street --boots 2 --rounds 1 --frames 20 --warmup 200
--url-suffix "" --url-suffix "?assets=modular"`, four runs per root, the
three roots interleaved run by run, 8 boots per cell; 01:05–01:19, load
1.9 to 4.6 at run starts; scratch `ab.sh`, `absum.mjs`, raw JSON in
`michi-wt/_scratch/a1-village/ab2/`). *base* = 98c3a61; *lane* = the lane
head's families (fa7f2ac; later commits change no boot work); *lane + hot*
= the lane plus handoff §2a (runtime: families imported side by side) and
§2b (bootstrap: the kit's downloads start with main.js), applied in a scratch
worktree only:

| Root | Tier | Classic build / ready / boot ms (median) | Modular build / ready / boot ms | Build ratio | Ready ratio | Boot Δ | Rule (≤ 1.25 ×, ≤ +1,000 ms) |
|---|---|---|---|---:|---:|---:|---|
| base | medium | 1,414 / 2,034 / 2,809 | 2,152 / 2,871 / 3,564 | 1.52 | 1.41 | +755 | build fails |
| base | high | 1,460 / 2,106 / 2,764 | 2,520 / 3,260 / 3,999 | 1.73 | 1.55 | +1,235 | fails |
| lane | medium | 1,539 / 2,142 / 2,996 | 2,201 / 2,909 / 3,685 | 1.43 | 1.36 | +689 | build fails |
| lane | high | 1,542 / 2,179 / 2,921 | 2,420 / 3,137 / 3,873 | 1.57 | 1.44 | +953 | build fails, boot holds |
| lane + hot | medium | 1,503 / 2,053 / 2,956 | 1,858 / 2,549 / 3,281 | **1.24** | 1.24 | +325 | **holds** |
| lane + hot | high | 1,462 / 2,022 / 2,747 | 1,780 / 2,490 / 3,140 | **1.22** | 1.23 | +392 | **holds** |

Every boot's world build, ms (sorted): base medium modular 1790–2861 (classic
1166–1534); lane medium modular 1867–2338 (1162–1629); lane + hot medium
modular 1606–2093 (1234–1573), high 1625–2308 (1180–1574). Classic is the
same code in all three roots; its spread (up to 1.6 × between boots) is the
machine, which is why only same-run ratios mean anything.

**Reading:** the family changes alone take the high-tier boot total under the
rule (+1,235 → +953 ms) and the build ratio down (1.52/1.73 → 1.43/1.57), not
under 1.25. With the two hot-file patches the rule holds on both tiers on
these medians (medium at 1.24, a hair inside). The prefetch is the larger
lever: the kit's 106 modules (835 kB) then download and evaluate while
main.js does, instead of inside the world build. **To close R66 the
Integrator applies handoff §2a and §2b and re-measures on a quiet machine**;
§2c lists what is left if medium needs more margin (KitMaterials textures
painted at first compile, the summit's kit built after the first frame).

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
| machiya: noren hem band 1.5–4 cm detach | the hem band is a strip inside the swaying cloth mesh (same vertex shader, aSway 1 like the hem), in the panel's darker colour; the static box is gone from the trim | machiya contract 1131/0 |
| v-ground: ~35 MB heap; upload churn after a walk | the first build keeps no 17 MB snapshot (`cachedField`); regrowth-only re-uploads every 4 s instead of every second for the whole regrowth (paws still upload within 0.25 s) | ground contract 433/0; ground_wear_test 14/0 |
| v-ground: palette verbatim copy; duplicated sun path; wearGrassMask mixed interpolation | not done (no cost, no visible effect; ranked issue 15) | |
| G-V3 M1: modular paving lavender at dusk | nobedan stones take the classic street's noon colour ratio (× .81/.70/.55), paving roughness .62 → .8 with half the foot polish, the cool shade tint spares paving | paving mean RGB (cam 1.0,0.45,10 → 0.5,1.1,-22): dusk 74/64/82 → 68/52/54 (classic 63/48/48); noon 190/175/153 → 184/161/126 (classic 169/147/112); `m1-paving-18-modular-before/after.jpg` |
| G-V3 M2: v-trees handoff says tree-trunks/canopies promoted | corrected (deferred, building blocks only) | docs |

## A.2 Composition (from the walk)

- **Sightlines hold.** The street closes on the torii from every stop (s2,
  s3, s5) and the torii frames the shrine hall with its two tōrō (s6); the
  bridge closes the river path (r1, r3); the pagoda rises over the corral
  fence (m2) and now sits at the classic first-roof width.
- **Lantern rhythm.** The street has a lantern every 8 to 10 m, alternating
  sides (s3_22), and the glade a ring (m4_22). The river path west of the
  bridge has none between the bridge and the shrine grove (r4_22, r5_22 read
  near black but for the villagers' eye shine and fireflies): a deliberate
  dark stretch on the way to a hidden place, or one tōrō at the bend; for the
  operator (issue 9).
- **Clutter.** Street edges carry bushes, fences, grass tufts and lanterns
  without crowding the path; the meadow lawns (r5, m1) are sparse by design.
- **What closes each view:** the torii (street), the shrine hall (sandō),
  the bridge (river), the bamboo ring (glade), the rim forest (meadow) where
  the foothills beyond read low-poly (issue 4).

## A.3 Light

- The paving's dusk colour now matches the classic street's warmth (G-V3 M1,
  above); at dusk its stone joints keep the orange sun fringe, which reads as
  thin outlines at cat height (s3_18.5): kept, it is the ground lane's look.
- Lanterns kindle at dusk and light the paving and walls around them (s3_22);
  falloff ends within a few metres, so the street reads in pools of light.
- Wetness and snow respond (r3_12_rain: wet path, dark river; m4_12_snow:
  snow on stone and seat); the grass ignores snow (issue 13, both sets).
- Nothing in the frames ignores fog or the hour: dawn and dusk tint every
  asset; the interiors keep their own light (interior_tea_12).

## A.4 Life

- Something moves in every view: butterflies and sparrows by day (s1, r1),
  villagers on the street and the river path (s3, r4_22), fireflies at night
  (m4_22, s1_22), the river and paddies, noren (the hem band now sways with
  the cloth), the fūrin and the shishi-odoshi, foliage in the wind.
- **Wind-motion pixel proof (v-trees minor):** frame 120 of `?shot=1`
  (time frozen by `hold`), the shared foliage uniform `uWindGlobal` set to 0,
  then to 4, one `composer.render()` each, camera at the river stop r3
  (scratch `wind.sh`): modular `maxDelta 213, meanDelta 4.25, pixelsOver8
  65,977`; classic `209 / 4.15 / 65,178`. The diff covers the trees, the
  sakura and the bushes and nothing else (grass, water and buildings are 0),
  so the kit trees sway with the wind as the classic did.
  `wind-diff-r3-modular.jpg` is the diff view.
- Nothing moves that should not: no popping or sliding seen in the frames.

## A.6 Performance

**Source of truth for frame time: `perf_gv3.md`** (G-V3, same session,
2 boots × 3 rounds): every budgets.md §1 rule holds at the four spots, day and
night; modular is +1.2 to 1.8 ms at street/shrine/meadow (ground ≈ 1 ms GPU,
water ≈ 0.6, fences ≈ 0.6). This lane changes no tier distance and cuts no
detail; its family changes are build-time (R66) and look fixes.

Re-measured at the lane head (`perf_spots.mjs --tiers medium,high --boots 2
--rounds 2 --url-suffix "" --url-suffix "?assets=modular" --shots`, 01:32–01:42,
load 2.1 → 2.0 at the ends, up to 3.1 between; scratch `a6.sh`, raw
`a6/a6.json`). Draw calls and triangles are deterministic and carry over; the
frame and render-only times swung 5 to 27 ms between rounds in this run, so
they are recorded, not judged:

| Spot | Tier | Classic calls / tris (mean) | Modular calls / tris | R52 calls ≤ classic | Modular medium ≤ classic high (calls, tris) | High tris ≤ 1.3 × |
|---|---|---:|---:|---|---|---|
| street | medium | 589 / 6.06 M | 434 / 5.72 M | holds | 434 ≤ 778, 5.72 ≤ 8.17: holds | — |
| street | high | 778 / 8.17 M | 585 / 8.82 M | holds | — | 1.08 × holds |
| shrine | medium | 311 / 5.04 M | 280 / 4.87 M | holds | 280 ≤ 448, 4.87 ≤ 7.04: holds | — |
| shrine | high | 448 / 7.04 M | 414 / 7.69 M | holds | — | 1.09 × holds |
| river | medium | 521 / 5.09 M | 370 / 4.92 M | holds | 370 ≤ 649, 4.92 ≤ 6.94: holds | — |
| river | high | 649 / 6.94 M | 518 / 7.55 M | holds | — | 1.09 × holds |
| meadow | medium | 558 / 5.64 M | 433 / 5.39 M | holds | 433 ≤ 733, 5.39 ≤ 7.53: holds | — |
| meadow | high | 733 / 7.53 M | 579 / 8.24 M | holds | — | 1.09 × holds |

Against G-V3 (perf_gv3.md) the modular counts are unchanged within a few calls
(street medium 434 vs 442, high 585 vs 583; triangles within 0.03 M): the egg
gloss (one small merged material) and the lotus leaf cost nothing visible.

**Cheap frame-time win, proposed, not applied** (issue 16): the ground
material is the largest modular GPU cost and medium builds the whole village
at its mid tier (3-tap hex sampler, macro noise, fringe). Giving medium the
far tier's 2-tap sampler, or dropping the macro noise there, is a one-line
`TIER_DEFINES.mid` change in `src/kit/ground/material.js`; it changes the
medium look, so it needs an L6 pair and the operator's eye, not a polish
lane's guess.

**Budget exceptions (budgets.md §5, families this lane touched).** Three
full contract runs dumping every warm build (scratch `kct_warm.mjs`, 140
assets, 11,897 checks, 0 failed each; load 4.7 → 1.9): `bamboo-fence` warm
hero 0.9–1.0 / mid 0.4–0.5 ms (cap was 14 / 14: the faster bake),
`tea-house` hero 0.5–0.7, `residence` hero 0.5–0.9 (cap was 12). Dropped from
`src/kit/budgets.js` (tightening, R54 in reverse); `bamboo-fence` keeps its
mid triangles 13,000 with the reason. `tea-interior` (3.6–7.0 hero) and
`mountains` (0.1–0.4) are other lanes' families: left as budgets.md §5
proposes. Fences and machiya contracts after the drop: 300/0 and 1131/0,
twice each (load 3.7–3.8).

## A.8 Before / after against Phase 0

The Phase 0 perf captures (`docs/fable/baseline/captures/perf/high-*.jpg`,
classic, 2026-11-13) against the same perf_spots view now on modular
(`a8-perf-high-<spot>-modular.jpg`, from the A.6 run, 960 px):

- **street:** plank fences → lashed takegaki; plain lanterns → carved stone
  tōrō; the cobbles' even cream → warm sandy stones of varied tone with a
  gravel shoulder where the path meets the grass; lawn lips at the edges.
- **shrine, river, meadow:** the same spots with the kit shrine, water,
  bridge and ground; composition and the cat's view are unchanged (same
  camera, same footprint: colliders 518, platforms 65 in the footprint
  golden).

By eye only: the perf shots carry the HUD and the live follow camera, so they
are pairs for looking, not for diffs.

## A.7 Comfort

Four boots (scratch `comfort.sh`): `?assets=classic|modular&shot=1&hour=19`
with saved settings `largeText, highContrast, reduceMotion` and FOV 110 or 30:

```
classic fov110: body "large-text high-contrast reduce-motion", camera fov 90.0, instances 0, errors []
classic fov30:  body "large-text high-contrast reduce-motion", camera fov 40.0, instances 0, errors []
modular fov110: body "large-text high-contrast reduce-motion", camera fov 90.0, instances 261, problems 0, errors []
modular fov30:  body "large-text high-contrast reduce-motion", camera fov 40.0, instances 261, problems 0, errors []
```

(only the optional `/cad-overrides.json` 404 was ignored). Reduce-motion:
the kit weather and the summit pollen damp themselves (body class); the noren
sway (1.5 cm at rest wind) and the fūrin clapper do not read the flag (issue 14).

## Checks run (command → real result)

At the lane head (9d85011 + the budgets/status commit), 2026-11-15 13:02–13:06, load 2.0 to 4.7:

- `node tools/check_syntax.mjs` → `All 171 modules OK`
- `node tools/verify.mjs` → `kit_test: tests 36, pass 36, fail 0`, `All checks passed`
- `node tools/kit_check.mjs` → `All kit checks OK (446 passed)`; `node --test tools/kit_test.mjs` → pass 36, fail 0
- `node tools/labs_check.mjs` → `All labs checks OK` (after `node tools/labs_coverage.mjs --write`: main.js line anchors moved)
- `node tools/cad_overrides_test.mjs` → `27 passed, 0 failed`; `git diff --check` → clean
- `cd cadJS && npm run check` → `server/catalog/agent/asset modules: ok`, `15/15`, `16/16` (R67); `cd catalog && npm test` → pass 50, fail 0
- `node tools/kit_contract_test.mjs` (all families) → `140 assets, 420 asset×tier builds, 11897 checks, 0 failed`; `merge: OK — valley 237 calls; +48 kit meshes → 285; after _mergeInto → 240`; `self-test: OK`
  (per family during the lane: garden 184/0, lanterns, hidden 1232/0, machiya 1131/0, nest 226/0, water, sky 325/0, ground 433/0, alley 153/0, keepsakes 504/0, fences 300/0; pagoda 171 with a warm-build flake on `distant-pagoda` hero 6.3–6.6 / 6 ms in 2 of 4 runs at load 3.3, which the base 98c3a61 shows too, 1 of 3 runs, same load: the budgets.md §5 watch-list item)
- `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`; `--systems` → `EQUAL`; `--query "?assets=modular"` → `DIFFERENT (60 changed, 657 added, 403 removed)` with `518 colliders · 65 platforms · 5 water rects · 4 exclusions · 25 anchors`, `rng valley 49233 draws (probe ok)` (the same as G-V3)
- `node tools/cat_golden.mjs` → `cat golden: EQUAL`; `node tools/summit_golden.mjs` → `summit golden: EQUAL` (9 advisory entries, outside the verdict, as at a2-hilltop); `node tools/summit_kit_parity.mjs` → `EQUAL`
- `node tools/summit_test.mjs` → `83 passed, 0 failed`; `node tools/rooftop_test.mjs` → `40 passed, 0 failed`
- `node tools/ground_wear_test.mjs` → `ground wear: 14 passed, 0 failed`; lab geometry (`tools/labs_geometry_test.html`) → `32/32`
- **Classic byte-identical:** `game_shot` 1280 × 720 frame 120, `?assets=classic`, base 98c3a61 against the lane head: street noon `maxDelta 0, pixelsOver8 0`; glade night `maxDelta 0, pixelsOver8 0`
- **Modular deterministic:** two `?assets=modular` boots at the river stop: `maxDelta 0, pixelsOver8 0`
- Boots: every A.1/A.7 boot ran without page errors (only the optional `/cad-overrides.json` 404); kit `problems: 0`, 261 instances

## Remaining issues, ranked

1. **R66 world build is not closed by this lane alone** (lane: 1.43 × medium,
   1.57 × high; boot +689 / +953 ms). With handoff §2a (runtime: families
   imported side by side) and §2b (bootstrap: the kit's downloads start with
   main.js) it holds on the same run's medians: 1.24 × / 1.22 ×, boot +325 /
   +392 ms. Integrator: apply both, re-measure on a quiet machine; §2c if
   medium needs margin.
2. **Grass grows through the secret machiya's floor** (both sets,
   `interior_secret_12`): meadow tufts inside the room and between the tatami.
   Vegetation's exclusion for the rotated house (hot) or a solid floor under
   the kit tatami.
3. **Dawn mist on the bridge deck is a white wall with a hard lower edge**
   (both sets, `s1_6`). The camera at the cat's eye on the deck sits inside the
   12 mist sprites' band; a near-camera fade in `ranges/mist.js` would fix the
   modular set.
4. **Beyond the rim forest the foothills read low-poly** (cones, faceted
   boulders, a white box house; `m6_12`). Ranges family; edge-forest is pinned
   classic (R49).
5. **Maple crown taller and narrower than the classic** (v-trees minor): the
   fix is a wider primary tilt (1.02 → ~1.18) in both `labs/trees` and
   `src/kit/trees/build.js` SPECIES (the lab drift check compares them), so it
   needs the lab owner.
6. **Summit kit sounds silent at the summit** until handoff §1 (one line in
   `mountaintop.js`) passes `env.audio` (R62).
7. **Glade lantern 3 cm bob** (v-hidden minor) not restored: the paper and its
   rings are in two meshes (one merged), so a bob needs them in one live mesh.
8. **`env.wind` never changes** (`Game.assetEnv()` sets 1 once), so every
   kit wind response (fūrin, noren, foliage via the classic uniform excepted)
   runs at rest wind; main.js `assetEnv` (hot) could pass the sky's wind.
9. **No lantern on the river path between the bridge and the shrine grove**
   (`r4_22`, `r5_22` near black): operator's call (a dark stretch to a hidden
   place, or one tōrō at the bend).
10. **Moon Pool rim rocks show texture seams at cat height** (`r6_12`).
11. **Hero lotus standing leaf still reads lighter than the pads in sun**
    (better shaped now; `r6_12`).
12. **Plank grain bands at grazing angles** (bridge deck `s1_12`, tea-room floor
    strip), both sets.
13. **Grass ignores snow** (`m4_12_snow`), both sets.
14. **Reduce-motion**: the noren sway and the fūrin clapper do not read the
    comfort flag (the kit weather and the summit pollen do).
15. v-ground leftovers with no visible effect: palette copy, duplicated sun
    path, wearGrassMask interpolation.
16. Frame time (A.6): the ground material is the largest modular GPU cost at
    medium; proposal below, not applied.
17. `bamboo-fence` mid triangles exception (R51) kept, with its reason
    (medium builds the whole village at mid and sees it at cat height).

## Notes for the Integrator
