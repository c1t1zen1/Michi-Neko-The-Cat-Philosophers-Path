# v-critters handoff

## Inventory (labs/asset_inventory.json, hot)
Add `"kit": {"family": "critters"}` to the rows `sparrows`, `koi`, `butterflies` (same pattern as lanterns/rocks/nest). Production adapters (catalog): sparrows, koi, butterflies -> family `critters`.

`guardian-crows` stays classic (no kit asset). Its lab study is now `critters/guardian-crow` (labs/critters/js/recipes.js); replace the row's empty coverage with:
```json
"coverage": [{ "target": "critters/guardian-crow", "level": "direct" }]
```
and drop its "Critters extracts a sparrow, not guardianBirds" note. (Then `node tools/labs_coverage.mjs --write`.)

Lab ids on the assets: `sparrows` -> `critters/flock`, `koi` -> `critters/sanke`, `butterflies` -> `critters/hinge`. If the catalog resolves `lab` strictly, retarget these to `critters/flock`, `critters/sanke`, `critters/hinge`.

## Part names
- `asset:sparrows/body`, `.../wing_l`, `.../wing_r` (wings are meshes with the origin at the shoulder; the game flaps rotation.z)
- `asset:koi/body`, `dorsal` (mid/hero), `tail` (pivot Group, rotation.y), `pectoral_l`, `pectoral_r` (pivot Groups, rotation.z); far has body + tail fin only
- `asset:butterflies/swarm` (one InstancedMesh, 50 instances; flap in the vertex shader)
- Lab study `critters/guardian-crow` (for lane c4-creatures; a rig, not an asset): `body, head, beak, tail, leg_l, leg_r`, shoulder hinges `wing_l / wing_r` (Group, rotation.z flaps; the right hinge is mirrored with scale.x = -1 so it takes the opposite sign: left +theta, right -theta, as the game's guardianBirds update does), `wing_{l,r}_arm` (inner wing mesh), `wing_{l,r}_hand` (wrist hinge Group, rotation.z folds the primaries) and `wing_{l,r}_primaries` (outer feather fan mesh). `crow().pose(t, 'glide'|'flap'|'dive')`. The game's guardianBirds records bind `wing_l` / `wing_r` today, so the shoulder hinge is drop-in; drive `wing_*_hand` for the extra life.

## ambient_life.js (single-writer grant used): 6 added lines
`buildButterflies()` keeps `this._bflyLayout = layout`; `updateButterflies()` for a kit swarm (no classic `this.butterflies`) writes `layout.playerPos` and `layout.sky` each frame so the kit drifts / wraps / fades exactly like classic. Classic path untouched (goldens EQUAL). The layout code, Math.random draws and the records are unchanged.

## Footprint waivers: none (layouts carry the footprints, kit uses them as is).
## Materials / draws
- Merged materials: 0 new. Sparrow body reuses `km.bag({rough:0.9, brush:0.1})` (the nest's material).
- Non-merged (ambient meshes are never merged): wing material 1, koi hides up to 5 variants x 4 pattern seeds (canvas 256), koi fins 5 tints, butterfly material 1. All cached per runtime, flagged `userData.kit` so the contract's private-material check passes; they are never disposed per instance (shared).
- Live meshes: sparrows 3 x 14 = 42 (classic 56); koi 5 x 18 = 90 on hero/mid, 2 x 18 on far (classic 8 x 18 = 144); butterflies 1 draw for all 50 (classic: 1 Points draw).
## Helpers: none to move. koi hide painter and sparrow/butterfly texture code are local to src/kit/critters.
## Cat/behaviour hooks kept: koi ripples (`world.spawnRipple`) and startle (`scatterKoi`) are classic code, untouched.

## Fix round 1
- Koi hero tier has the ink outline back: one inverted hull per fish on one shared MeshBasicMaterial (`critters:ink`), +1 live draw per hero fish (+18 total on high); mid/far have none.
- Material accounting: merged kit materials 0 new; NOT merged (ambient meshes): koi hides (<=20), koi fins 5, ink 1, sparrow wing 1, butterfly 1 (per flutter value). None are in the kit merge set.
- Butterfly wings 0.13 m (was 0.10), emissive 0.5.
