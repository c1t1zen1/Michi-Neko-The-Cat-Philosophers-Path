# Roof Road stage 2 — agility and atmosphere follow-up

The existing downtown checkpoint is already merged in `main` (`955209d`).
It provides the 1,082.05m / 3.21× route, fourteen interlocking streets, eight
under-house tunnels and five short alley pockets. This follow-up deepens that
build in an isolated `feat/rooftops-agility` worktree. The valley and summit
remain outside its scope.

## Further reference dive

These are design observations and adaptations, rather than a literal map of
Kyoto. All new runtime art remains procedural, with maps at most 256px.

- [Hachise's illustrated machiya vocabulary](https://www.hachise.com/kyomachiya/features/features.html):
  lattice varies with the trade; tile drip edges, rain chains, ceramic wiring
  fixtures, folding benches and house-name boards give each threshold a use.
  Translate these into recognizable cat-scale route entrances and silhouette
  detail, rather than identical clutter along every facade.
- [Kyoto City's machiya construction study, especially pages 2–3](https://www.city.kyoto.lg.jp/tokei/cmsfiles/contents/0000260/260189/04_kyoumachiyanochie.pdf):
  deep plots connect street, passage, light well and rear garden. Use changes
  of light, paving and height to signal optional low alley routes that rejoin
  the roofs, including shaded soffits and stepping stones.
- [Machiya Vision, residents and craftspeople](https://kyoto-machisen.jp/machiya-vision/2020/?lang=en):
  daily work and small gardens matter as much as landmark architecture. Laundry
  workers should handle cloth; cooks should handle utensils and serving ware.
- [Nishiki merchants' illustrated map](https://www.kyoto-nishiki.or.jp/wp-content/uploads/2024/02/nishikimap_ura20240116_en.pdf)
  and [shop categories](https://www.kyoto-nishiki.or.jp/en/):
  crossing streets divide an otherwise long arcade. Produce, fish, pickles,
  umbrellas and household goods offer stronger landmarks than a generic stall.
- [Kyoto's official Yoiyama guide](https://kyoto.travel/en/news/yoiyama-procession-guide/):
  the lit floats, music and displayed folding screens suggest warm pockets of
  inhabited street rather than uninterrupted lantern wallpaper.
- [Kyoto Prefecture's Ichi-no-Funairi account](https://www.kyoto-kankou.or.jp/info_search/32):
  the canal transported goods via loading basins. Give boats weathered planks,
  useful ropes, cargo and bank details, and keep the shallow water legible.

## Lab recipes reviewed

- `labs/alley/js/props.js`: slatted boxes, open stave barrels, bicycles, tile
  stacks, tenugui and broom bristles. Adapt locally with the scene's shared
  materials and spatial batches.
- `labs/ground/js/ground.js`: damp stone, moss seams and differences between
  lane and garden paving. Borrow the visual logic without importing its field
  simulation or the workshop UI.
- `labs/greenery/js/kit.js`, `labs/shared/bamboo.js`: tapered leaf silhouettes,
  paired foliage and nodal culms. The existing downtown kit already shares
  the actual bamboo geometry; extend its vine branching and bindings.
- `labs/shared/paperlantern.js`, `labs/machiya/js/machiya.js`: paper ribs,
  mounting hardware, layered drip edges and visible timber joints.
- `labs/shared/water.js`, `labs/water/js/bridges.js`: shallow bed colour, broad
  broken highlights, wet bank edges and current round structures. Retain one
  water shader pass and no scene-reflection render.

## Delivery passes

1. Reference checkpoint, followed by stronger optional alley/agility routes
   and map landmarks. Preserve the proven 3.21× route and forgiving floors.
2. Contextual companion behaviour: vary duration and intent by place, allow
   harmless wrong turns and pauses, react when Michi stops, keep real physics.
   Verify portrait framing on actual rendered views and throughout the run.
3. Scenery and mobile review: distinct alley surfaces, household details,
   working stall tools/laundry, vines, posts, boat and water refinement. Check
   shader errors, reachability, touch controls and finale, then merge and push.

Results and checkpoint commits will be recorded here when measured.

## Pass 1 — chosen alley routes

Six optional curved lanes now enter the actual interiors of blocks: the indigo
court, bamboo lane, tea garden, wash lane, moss court and lantern-maker lane.
They add 178m measured along the route axis (longer on the winding ground),
50 floor/agility surfaces and twelve low, solid entrance/exit soffits. Each
lane has two explicit street portals. Main-road landings cannot silently
switch lanes, and the reach graph cannot invent exits through the middle of
a block. Chidori follows the chosen lane using the real runner.

Validation: 40/40 existing route checks; the new actual-physics alley suite
traverses all six routes in both directions, hops and lands within each lane,
reverses halfway, confirms companion exits and checks lane isolation. Initial
390×844 captures exposed a street prop at two entrances; the entrance cue now
also accepts low crates, so drop still chooses the lane there. Portrait camera
and scenery refinement continue in the following passes.

## Pass 2 — Chidori and framing

Chidori now makes reproducible, place-dependent decisions with varied action
lengths: ropes encourage prowling, nearby small routes invite detours, and
Michi pausing invites a visit. A low-street detour can briefly peek through a
noren and return through the same entrance when ignored. Watching, stretching
and grooming vary the idle pose. The alley view raises its angle and opens a
larger joined architectural cutaway around the cats.

The first full browser run passed portrait but exposed an inadequate desktop
check: it allowed the camera to shrink cats to 3px around a stranded guide.
The guide was aiming just inside a portal while trying to leave it. Portal
exit steering now aims through the boundary, and curiosity only triggers when
Michi is actually nearby at street height. A dedicated desktop physics run
and an ignored-invitation regression were added; the browser suite now tests
all alley entrances in both directions and enforces desktop legibility too.

## Pass 3 — street craft and mobile delivery

- Painted blue-grey kawara, broken timber grain and knots, fine straw fibres,
  woven/seigaiha cloth, washi fibres and ribs, and distinct stall menu boards.
  Every new map is procedural and at most 256px.
- Boat planks, tar bands, fasteners, a coiled haul line and bailer; broad water
  glints, shallow silt colour and restrained caustics in the existing water pass.
- Vines now have branching petioles and tendrils. Utility crossarms have braces,
  ceramic insulator ribs, iron straps, stone feet and notices. Mooring posts
  have rope wraps. Homes gain rain cups, basins, folding benches, parcels,
  brooms and occasional parked bicycles, adapted from the Alley Lab.
- Workers have a proper moving head/face rig and batched rigid body parts;
  stallkeepers handle trays, ladles and turners, while laundry workers lift
  patterned cloth beside pegs, baskets and lines. Wind chimes, serving bowls,
  produce crates and shaped festival masks distinguish the stalls.
- Smoke and steam now originate at the actual chimneys and cooking stalls;
  petals follow the actual cherry boughs, and fireflies occupy the courts and
  festival district. Their old placement had still used the 337m level.
- Fixed scenery-only distance culling: local-space boat/worker batches must
  remain under their moving parents. The previous culler could hide boat hulls
  away from the origin. Foreground foliage and bindings now share the alley
  cutaway so they cannot cover the cats.
- Jump/drop presses persist until a physics tick consumes them. Low-power
  devices request the low-power GPU profile and default to shadows off;
  desktop retains its higher-quality default and wider side framing.

Measured layout: **1,082.05m main run**, **224.91m of optional winding alley
floor** (178m on the route axis), **670 platforms**, **20 tunnel soffits**,
19 festival stalls and 30 residents. The original main run remains 3.21×
the predecessor's ~337m. The new alley raised-route proof holds jump through
futon bounces and lands on every raised surface, as well as testing the safe
floor routes in both directions.

## Validation

- `node tools/rooftop_test.mjs`: **40/40**.
- `node tools/rooftop_companion_test.mjs`: **7 scenario suites** (portrait and
  desktop full physics runs, ignored alley invitations, multiple boat phases,
  stop/drop/reverse, tunnel soffits and canopy vents).
- `node tools/rooftop_alley_test.mjs`: all six lanes, both entry directions,
  hops/landings, raised agility sequences, exits, companion following,
  backtracking and lane isolation.
- `node tools/verify.mjs` and `node tools/labs_check.mjs`: passed.
- Actual Chromium game-loop review: **360×780**, **390×844**, **844×390 touch**
  and **1440×900 desktop**, through the finale. Every configuration also checks
  all twelve alley entry directions, input buffering, local boat/worker
  visibility, two-thumb movement/jump, map, pause and the five-fire panorama.
  No runtime/shader errors. The two portrait runs' minimum measured cat-volume
  heights were **25.6px** and **28.0px**; landscape touch **18.8px**, desktop
  **43.3px**. These are bounds measurements, not device frame-rate results.
- Reviewed portrait and desktop scenery captures at the alley, boat, stall,
  laundry and roof layers, including the default quality profiles. Temporary
  images and reports stay outside the repository in `/tmp/rooftop-agility-review`.

Physical-phone frame rate, thermals and touch feel still require real hardware.
No valley or summit implementation was edited.

## Pushed checkpoints

- [Reference dive — 4503b36](https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/commit/4503b36)
- [Chosen alley routes — fe70ce9](https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/commit/fe70ce9)
- [Contextual chase and framing — 5461e9a](https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/commit/5461e9a)
- [Street craft, mobile input and moving scenery — ffcc084](https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/commit/ffcc084)

All passes were committed and pushed from the isolated
`../michi-wt/rooftops-agility` worktree on `feat/rooftops-agility` before the
final merge into `main`.
