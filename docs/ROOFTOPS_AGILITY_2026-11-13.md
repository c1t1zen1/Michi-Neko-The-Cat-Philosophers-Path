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
54 floor/agility surfaces and twelve low, solid entrance/exit soffits. Each
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
