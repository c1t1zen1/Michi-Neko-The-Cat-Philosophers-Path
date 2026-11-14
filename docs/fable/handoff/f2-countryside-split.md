# Handoff: f2-countryside-split

What the Integrator (and every later kit lane) needs from the countryside split.
No hot file outside `src/countryside.js` was edited; nothing here needs a patch
to apply. Read the "For kit lanes" section before promoting a valley asset.

## Integrator

1. **Cache tag.** `src/countryside.js` now imports
   `import { CLASSIC_ASSETS, isAssetInstance, scopeAssets } from './kit/runtime.js?v=20261107a'`
   (covered by the AGENTS.md one-liner). The new page `tools/place_asset_test.js`
   imports `../src/countryside.js?v=20261107a`: add it to the hand-bumped list
   with `tools/footprint_golden.*`.
2. **Golden advisory section.** `node tools/footprint_golden.mjs` is `EQUAL`, but
   prints "builder attribution differs": nested builders are now placed through
   `placeComponent()` instead of `createKoushi()` / `createChochinLantern()` /
   `buildBirdNest()` …, so those methods show `(gone)` in `builders.calls` (not
   part of the verdict). Refreshing that advisory section is a `--write`; this
   lane was not allowed to run it. Decide whether to refresh it at the gate.
3. **New test page** (not in Appendix C yet; suggest adding it to G2):
   `node tools/headless.mjs "/tools/place_asset_test.html?per=1" --wait "window.__placeTest.done" --eval "__placeTest.lines"`
   Part A: each of the 162 classic placements registers exactly its
   `layout.footprint` (479/479 colliders bit-exact). Part B: a valley of fake
   AssetInstances (footprint = layout.footprint) registers what the classic
   valley does; `?per=1` repeats it one id at a time (67/67). About 12 s on Metal.
4. **Inventory / coverage.** No inventory anchor needed changing (every
   countryside anchor is still verbatim). `labs/ASSET_COVERAGE.md` was
   regenerated with `node tools/labs_coverage.mjs --write` (line links only).
5. **Merges.** The branch merged `fable/integration` forward twice (f1-runtime,
   Phase 0) instead of rebasing, so its pushed history was never rewritten.

## The routing contract as built (differences from the guide §3.4 sketch)

- `placeAsset(id, layout, classicFn)` → `assets.build(...)`; classic returns
  `classicFn()` untouched (so every builder still returns what it returned).
  Modular → `placeInstance()`:
  - group transform from the layout: `x, y, z`, `rx, ry, rz`, `scale`
    (Local-space rule: build at the origin, the owner places it);
  - parent: `layout.parent` (a **non-enumerable** Object3D link set by the
    parent, so layouts stay serialisable), `null` = returned to the caller, else
    the scene. Not a name lookup: classic parents are not in the scene yet when
    their components are placed;
  - footprint registered through the classic helpers, in classic order:
    `colliders` (push), `platforms` (Box3 / platform objects → `addPlatform`;
    `{ oriented: [bounds, topY, options] }` → `addOrientedPlatform(group, …)`;
    `{ sloped: [roofY, w, d, ridgeH, overhang, options] }` →
    `addSlopedRoofPlatforms(group, …)`), `exclusions`, `waterRects`, `anchors`
    (assigned; a Vector3 already on the Countryside is copied into), `lists`
    (appended; `'a.b'` reaches `this.a.b`, e.g. `villageHouseColliders.left`);
  - `layout.bind = { field: 'part' }` (or a placeholder object) sets gameplay handles;
  - `layout.components` are then placed into the instance group, in order.
- **Placeholders.** Inside anchors, lists and bind: `{ $part: 'name' }`
  resolves to `instance.parts[name]` or `instance.sockets[name]`; `'.'` is the
  instance group; `'name.prop'` (`'.material'`) a property of it. A placeholder
  may carry `userData` (merged into the object) and `visible: false`. A part
  (or property) the instance lacks resolves to `null` and logs one
  `console.warn('[kit] <id>: the instance has no part …')` per id and part —
  watch the console when you swap an asset in (a null handle can crash
  `update()`, e.g. a missing `thicket_crown_N` in `setShrineThicketOpen`).
- **Components** (F2.4): `{ id, layout, mesh, attach }`, attach `scene`,
  `parent` (the classic mesh method takes the parent group) or `caller` (the
  method returns the object; `placeComponent` sets x/y/z/ry in the parent and
  adds it; a kit instance of a `caller` component is attached and positioned by
  `placeInstance` before its footprint registers). A kit parent gets its
  classic (or kit) components placed into its group after its own footprint —
  the classic registration order (parent first) holds for every builder
  (checked by part B with `?per=1`).
- **Restriction on component footprints.** `{ oriented }` / `{ sloped }`
  descriptors resolve against the placed group's world matrix when they
  register. That is right for top-level assets and for the components of a
  kit parent (placed after the parent is positioned), but a classic house
  places most components before it positions itself, and a standalone
  `createKoushi()` / `createKawaraRoof()` / `createEngawa()` call returns the
  group to its caller unattached. So a component's footprint must be world
  data computed in the layout (Box3s, as `crates` does from the parent's
  frame) or empty — every classic component's is. Use descriptors only on
  top-level assets.
- `addComponentCollider(obj, pad, box)`: the secret house's table and door
  colliders come from their classic meshes, or from the layout's box when kit
  meshes sit anywhere in that subtree (a kit `koushi` inside the classic door).
- F2.5: `this.assetInstances` lists the kit instances placed;
  `_mergeStatics()` treats every object in `instance.live` as protected (not
  merged in pass 1, skipped as a child in pass 2, never merged inside).

## For kit lanes: what a layout gives you and what it expects back

**A kit parent must not build its listed components itself.** `tea-house`,
`residence`, `secret-house`, `street-house`, `shrine-hall`, `crates`, `nest`,
`secret-table`, `secret-door`, `corral`, `roadside-moss`, `village-street`,
`paddies`, `path`, `valley-ground`, `river`, `mountains`, `edge-forest` and
`distant-village` list components in `layout.components`; the Countryside
places every one of them into (or beside) your group after your footprint,
each as its own asset (classic or kit by its own id). Build only the parent's
own body, or the koushi, roofs, lanterns, nest, crates, fences… appear twice.

Every layout carries `index` (instance number, seeds `ctx.rng`), `name` where
the classic object has one, its transform fields, the random choices the
classic builder drew (e.g. `tilts`, `wrap`, `stalks`, `trees`, `houses`,
`sprites`, `bushes`, `patches`, `rocks`, `wallMat`, `w`, `d`), and `footprint`.
Default your instance's footprint to `layout.footprint` (the runtime does).

Part names the layouts bind (name these parts exactly, or gameplay loses the handle):

| Asset | Parts / handles |
|---|---|
| `key` | `.` → `secretKeyMesh` (userData `isSecretKey`, `id: 999`) |
| `wind-chime` | `.` → `windChime`; `clapper` (its `.material` → `chimeClapperMat`) |
| `mist-altar` | `.` → `mistAltar`; `plinth`, `bell`, `flame` (their materials fade: `_altarFadeMats`) |
| `toro` | `halo` (its material joins `lanternHalos`) |
| `shishi` | `rocker` → `shishiRocker` |
| `nest` / `guardian-feather` | `.` → `nestMesh` / `nestFeatherMesh` |
| `secret-door` / `lock-plate` / `secret-fish` | `.` → `secretDoorMesh` / `lockPlate` / `fishMesh` |
| `chochin` | `.` joins `lanterns` (sway; light spots) |
| `yarn`, `offering-bells`, `dango`, `jade-paw` | `.` joins `collectibles` with its userData (`jade-paw` also `corralRewardMesh`, starts hidden) |
| `larry` | `.` is `corralGuardian.mesh` |
| `bamboo-fence` | `.` joins `bambooFences` |
| `water-ripples` / `rain-ripples` | `ring_1` … `ring_24` / `ring_28` |
| `mist-ring` / `dawn-mist` | `mist_1` … `mist_14` / `mist_12` |
| `edge-forest` | `trunks` → `edgeForestTrunks`; `thicket_crown_1…4`, `thicket_branches_1…4` (the shrine thicket re-poses instances by the indices in `shrineThicketTrees`) |
| `edge-undergrowth` | `thicket` (instances re-posed by `shrineThicketBushes`) |
| `street-bushes` | `bushes` (`.material` → `bushMat`, the rustle uniforms) |
| `distant-village` | `windows` (`.material` → `villageWindowMat`, kindles at dusk) |
| `mountains` | `far` (`.material` → `matHazeFar` / `matHazeMid`, tinted by the sky) |
| `river` | `water` (`.material` → `riverMat`) |
| `paddies` | `water_1` … `water_4` (materials → `paddyWaterMaterials`) |
| `valley-ground` | `.` → `groundMesh` |

Other notes:
- `edge-forest` layouts carry a non-enumerable `canopies` (the four
  `buildCanopy` geometries; they consume valley-stream draws, so they are made
  in the layout step). A kit forest may reuse or ignore them; ignored ones are
  never disposed (four small geometry pairs).
- Component layouts are in their parent's frame (`x/y/z` local to the house).
  Where the group's origin sits (build your asset around the same point):

  | Origin | Components |
  |---|---|
  | the parent's origin (pieces laid out in the parent frame) | `timber-frame`, `namako`, `secret-tatami`, `nest-eggs` (nest frame), `lock-plate` (door frame) |
  | base, on the ground or the surface it stands on | `tea-bench` (-2.2, 0, 3.6), `sake-barrel` (0.5, 0, 0.9 in the crates frame), `offering-box` (0, 0.7, 0.95: on the upper dan), `engawa`, `crates`, `shishi`, `secret-table`, `secret-andon`, `secret-door`, `paddy-bunds` (plot centre), `bridge`, `corral-sign`, `larry`, `bamboo-fence`, `toro`, `street-house` |
  | the mesh's own centre | `noren`, `secret-bed` (-1.8, 0.07, -0.8), `shimenawa` (0, 2.42, 0.96), `shrine-bell` (0, 2.05, 0.96; cords hang below), `secret-fish`, `dango`, `jade-paw`, `koushi` and `upper-windows` (lattice centre), `nest` |
  | the hanging point | `chochin` (the lantern hangs below its cap), `wind-chime` |
  | the eave plane at the house centre | `kawara-roof` |
- **Materials the valley animates** (`Countryside.update()`): every
  `ring_N` of `water-ripples` / `rain-ripples` and every `mist_N` sprite needs
  its own material (opacity, scale and visibility are driven per ring and
  sprite); `toro`'s `halo` material opacity follows dusk;
  `villageWindowMat.emissiveIntensity` is set each frame (an emissive standard
  material); `_altarFadeMats` are three transparent materials whose `opacity`
  fades with the mist (index 2 is the flame, a sprite material that also
  breathes) and the altar group's visibility follows the first; `bushMat`
  must carry the foliage sway uniforms `userData.uSwayTime` / `uSwayBoost`
  (`createFoliageMaterial`), or the rustle simply stops; `matHazeFar.color`
  is copied from the sky each frame; a collectible with a `material` gets its
  `emissiveIntensity` pulsed. `riverMat`, `chimeClapperMat` and
  `paddyWaterMaterials` are registered but not read by `update()` today (the
  water shaders share the module's `riverUniforms`).
- Footprints of mesh-derived colliders (boulders, key rock, lamps, shrine hall,
  secret-house walls, table and door, fences, crates) are computed with
  `shapeBox()` / `frameOf()` — the compose/multiply of `updateMatrixWorld` and
  each geometry's own bounding box — and are bit-exact with the classic
  `setFromObject` boxes (part A).
