# Game asset inventory and lab coverage

Reviewed 2026-11-10. Generated from [asset_inventory.json](asset_inventory.json) by [labs_coverage.mjs](../tools/labs_coverage.mjs).

[Open the interactive Asset Library](../catalog/) — searchable originals, lab specimens, production notes, cadJS editing and AI plans.

## What can be claimed

The inventory accounts for **37 core source modules** and **112 build/create construction methods**. It records **186 active asset types and assemblies**, plus **4 inactive entries**. **94 of 186 (50.5%) have a focused lab study.** Full individual specimen coverage is incomplete.

Authored visual asset types in the core src/ game, including valley, tea-house interior, summit, characters, physical items and visible effects. Assemblies and separately recognizable parts are separate rows; procedural instances are not.

The source inventory is manually reviewed, with an automated construction-method ledger and evidence-link checks. It is not a runtime scene census or proof that each mapped specimen renders correctly. Direct means a focused study exists, not that its result has shipped to the game.

Assemblies and recognizable subcomponents overlap by design. The denominator counts catalog rows, not unique meshes or every object instance. A variant count (including the 381 shelf captures in the construction review) cannot establish an asset coverage percentage.

## Coverage rules

| Level | Evidence required |
|---|---|
| Focused lab study (`direct`) | A named specimen, room recipe or explicit bench studies this asset type. The study may be a redesign; mappings state important differences. |
| Review sheet (`review`) | A real game preview/review page can inspect the asset. Whole-scene summit reviews are identified as such and have no individual lab specimen. |
| Embedded (`embedded`) | Returned inside another named specimen with rendering enabled; no focused study is claimed. Camera framing and occlusion still require visual review. |
| Related (`related`) | Similar technique, different source object, hidden reference object or interaction only. This does not close the coverage gap. |
| Missing (`missing`) | No mapped evidence. |

Each active row is counted once at its strongest evidence level, in the order above. Review-only rows are outside the focused-lab total. A builder being loaded or constructing an invisible mesh is insufficient evidence of visible coverage.

| Strongest evidence | Active rows | Share |
|---|---:|---:|
| Focused lab study | 94 | 50.5% |
| Review sheet | 41 | 22.0% |
| Embedded in a specimen | 25 | 13.4% |
| Related evidence only | 18 | 9.7% |
| No mapped evidence | 8 | 4.3% |

## Coverage by area

| Area | Active rows | Focused | Review | Embedded | Related | Missing |
|---|---:|---:|---:|---:|---:|---:|
| Characters | 9 | 6 | 1 | 1 | 0 | 1 |
| Cat components | 5 | 0 | 3 | 1 | 0 | 1 |
| Ground and water | 13 | 12 | 0 | 1 | 0 | 0 |
| Landscape | 7 | 3 | 0 | 1 | 3 | 0 |
| Buildings | 5 | 4 | 0 | 0 | 1 | 0 |
| Building components | 10 | 6 | 0 | 4 | 0 | 0 |
| Props | 12 | 12 | 0 | 0 | 0 | 0 |
| Shrine | 7 | 6 | 0 | 1 | 0 | 0 |
| Items | 8 | 8 | 0 | 0 | 0 | 0 |
| Vegetation | 22 | 15 | 6 | 0 | 1 | 0 |
| Effects | 2 | 1 | 0 | 0 | 1 | 0 |
| Hidden places | 16 | 8 | 0 | 4 | 3 | 1 |
| Interiors | 19 | 6 | 0 | 10 | 2 | 1 |
| Sky and effects | 19 | 6 | 0 | 2 | 7 | 4 |
| Summit | 32 | 1 | 31 | 0 | 0 | 0 |

## Gaps requiring focused specimens

This list includes every active row without a focused study, including review-only and embedded references. Related mappings are leads for future work, not proof of asset coverage.

| Asset | Current evidence | Limitation |
|---|---|---|
| [Michi (player cat)](#michi) | Review sheet | The sleep specimen uses Michi’s coat/build; it is a pose study rather than a dedicated player-model lab. |
| [Larry the turtle](#larry) | Embedded in a specimen | The complete original corral includes Larry; there is no isolated turtle or patrol study. |
| [Nest guardian crows](#guardian-crows) | No mapped evidence | Critters extracts a sparrow, not guardianBirds; constructing AmbientLife alone does not put the crows on a specimen. |
| [Cat body, fur and tabby coats](#cat-coat) | Review sheet | No individual focused specimen is mapped. |
| [Cat nose, muzzle, whiskers, ears and painted eyes](#cat-face) | Review sheet | No individual focused specimen is mapped. |
| [Braided collar, bow and brass bell](#cat-collar) | Review sheet | No individual focused specimen is mapped. |
| [Master Cat gold and twin bells](#master-bells) | No mapped evidence | The ordinary collar is reviewed; no specimen explicitly enables setMasterCat(). |
| [Cat contact-shadow blob](#cat-shadow) | Embedded in a specimen | Visible with the complete cat; no isolated shadow study. |
| [Paddy beds and raised banks](#paddy-bunds) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Foothill cedars and broadleaf crowns](#foothill-forest) | Embedded in a specimen | The hero valley includes the foothill carpet; there is no separate shelf specimen. |
| [Distant valley village houses and hearth windows](#distant-village) | Related evidence only | The street-house builder differs from buildVillage() distant silhouettes. |
| [Valley mist ring](#mist-ring) | Related evidence only | Aerial perspective bench; it does not extract the original mist-ring mesh. |
| [River dawn mist ribbons](#dawn-mist) | Related evidence only | General haze study; no dawn-river specimen or time envelope. |
| [Village street assembly](#village-street) | Related evidence only | Individual house references, not a specimen of the complete original street layout. |
| [Namako skirt walls](#namako) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Tea-house bench and mosen cushion](#tea-bench) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Secret sliding door](#secret-door) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Antique brass padlock emblem](#lock-plate) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Saisen-bako offering box](#offering-box) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Sakura trees](#sakura) | Review sheet | No individual focused specimen is mapped. |
| [Maple trees](#maples) | Review sheet | No individual focused specimen is mapped. |
| [Garden pines](#pines) | Review sheet | No individual focused specimen is mapped. |
| [Rim sakura, maple and pine leaf masses](#rim-trees) | Review sheet | No individual focused specimen is mapped. |
| [Tree trunks and limbs](#tree-trunks) | Review sheet | No individual focused specimen is mapped. |
| [Leaf sprays and clumped/mass canopy families](#tree-canopies) | Review sheet | No individual focused specimen is mapped. |
| [Roadside moss patches](#roadside-moss) | Related evidence only | The grass moss pillow differs from the roadside instanced tufts. |
| [River-bank grass fireflies](#grass-fireflies) | Related evidence only | Related hotaru study; not the GrassSystem particle shader. |
| [Moon Pool mossy apron](#pool-apron) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Pool rim stones](#pool-rim) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Pool sitting stone](#pool-seat) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Moon Pool stone toro](#pool-toro) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Lantern Glade complete clearing](#lantern-glade) | Related evidence only | The original tile extracts a lantern, not the complete clearing. |
| [Glade leaf-litter ground](#glade-floor) | No mapped evidence | No specimen extracts this leaf-litter texture or clearing floor. |
| [Glade bamboo ring and drooping leaves](#glade-bamboo) | Related evidence only | Vegetation.buildBambooGrove differs from the hidden-place bamboo. |
| [Glade seat and mossy central boulder](#glade-seat) | Related evidence only | Related stone finish, without the glade objects. |
| [Interior walls, timber posts and ceiling beams](#interior-frame) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Tokonoma alcove](#tokonoma) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Kakejiku hanging scroll](#scroll) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Tokonoma bonsai pine](#bonsai) | No mapped evidence | No original bonsai specimen; the lab alcove uses other decorations. |
| [Chabudai low table](#chabudai) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Zabuton nap bed and embroidered tassels](#zabuton) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Courtyard stone lantern](#courtyard-toro) | Related evidence only | Different source builder; no courtyard lantern extraction. |
| [Courtyard boundary timber wall](#courtyard-wall) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Three tabletop knockables (white cup, blue bowl, white sphere)](#knockables) | Related evidence only | Vessel geometry is studied; these three original items are not specimens. Lab physics supports batting lab vessels; original item geometry and physics differ. |
| [Secret-house tatami](#secret-tatami) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Secret-house table and teaware](#secret-table) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Secret-house nap cushion](#secret-bed) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Secret-house andon](#secret-andon) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Twinkling stars](#stars) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Crescent moon](#moon) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Sun, hemisphere, fill and bounce lighting](#sky-light) | Related evidence only | The baseline adapter hides the original lights; labs use their own rig. |
| [Valley god-ray cards](#god-rays) | Related evidence only | Sky-space rays are a different implementation from the game’s ground cards. |
| [Ambient valley fireflies](#fireflies) | Related evidence only | Related firefly study; not Particles.buildFireflies(). |
| [Ambient dust motes](#dust-motes) | Related evidence only | Moon Pool motes are a separate system. |
| [Scent-trail glowing particles](#scent) | No mapped evidence | No scent-trail specimen or interaction study. |
| [Player water-entry splash droplets](#splash) | Related evidence only | Rain impacts do not exercise the player water-entry splash. |
| [Landing dust puffs](#landing-dust) | No mapped evidence | No specimen exercises this pooled landing effect. |
| [Screen-space ambient occlusion](#ao) | No mapped evidence | Sky’s air-game baseline explicitly excludes the full game post-processing pipeline. |
| [Screen-space distance and height atmosphere](#atmosphere) | Related evidence only | Layered haze cards are not the game’s depth-buffer atmosphere pass. |
| [Painterly colour grading, vignette, grain and fringe](#grade) | Related evidence only | Related finish study; Kuwahara is not the game grade/grain/fringe pipeline. |
| [Summit meadow clearing](#summit-meadow) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit approach steps, landing and entrance torii](#summit-entry) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit trees, back brush and brow stones](#summit-trees) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Meditation stone, enso and approach stones](#meditation-stone) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Meditation sun pool, motes and furin](#meditation-atmosphere) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Torii approach earthen shoulder](#summit-shoulder) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Lower stone path, stones and lanterns](#summit-path) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit flanks and basin landform](#summit-terrain) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Vista Yodo River and road ribbons](#vista-terrain) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Higashiyama pagoda and evening lanterns](#summit-pagoda) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. buildKyotoCity() calls buildKyotoPagoda(); the tower is inside the original city tile. Its evening-light material starts at zero opacity. |
| [Bay water, coastline and sun glints](#summit-bay) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Harbour skyline, islands, bridge and Ferris wheel](#harbour) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit horizon mountain ranges](#horizon) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit slope forest species](#slope-forest) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit cumulus and storm cloud banks](#summit-clouds) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit snowfall](#summit-snow) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit rainfall](#summit-rain) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit pollen](#summit-pollen) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit sakura petals](#summit-petals) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit butterflies and fly-by birds](#summit-wildlife) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Valley-to-summit shrine beacon rays](#shrine-rays) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Supplementary summit sky and rim lights](#summit-light) | Review sheet | No individual focused specimen is mapped. |
| [Summit biome grass field](#summit-grass) | Review sheet | Same GrassSystem recipes, but no specimen of the summit’s field layout. |
| [Layered Kyoto Bay vista assembly](#summit-vista) | Review sheet | No individual focused specimen is mapped. |
| [Optional summit transition video](#summit-transition) | No mapped evidence | Optional runtime transition media, outside the lab specimen set; availability is not checked. |
| [Optional Blender Kyoto roofscape GLB](#blender-roofscape) | Review sheet | Optional runtime asset with fallback; availability is not verified by this source audit. |
| [Weathered enso marking](#summit-enso) | Review sheet | No individual focused specimen is mapped. |
| [Summit meditation furin](#summit-furin) | Review sheet | No individual focused specimen is mapped. |
| [Bay bridge](#bay-bridge) | Review sheet | No individual focused specimen is mapped. |
| [Harbour Ferris wheel](#ferris-wheel) | Review sheet | No individual focused specimen is mapped. |
| [Summit butterfly visitors](#summit-butterflies) | Review sheet | No individual focused specimen is mapped. |
| [Summit fly-by bird palette variants](#summit-birds) | Review sheet | No individual focused specimen is mapped. |

## Inventory and individual evidence

Source links resolve to declarations or recognizable construction anchors. Evidence links resolve to the actual specimen definition, bench or review code. Dynamic specimen IDs (for example `original-secret` and `orig-tower`) link to their generating definitions.

### Characters

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="michi"></a>`michi` — Michi (player cat) | [src/player.js:this.mesh.name = 'Player Character (Michi)'](../src/player.js#L32)<br>[src/cat.js:buildCoat(](../src/cat.js#L88) | [cat / anatomy](../tools/cat_preview.js#L128) (review)<br>[villagers / sleep](../labs/villagers/js/recipes.js#L60) (embedded) — The sleep specimen uses Michi’s coat/build; it is a pose study rather than a dedicated player-model lab. |  |
| <a id="luna"></a>`luna` — Luna | [src/main.js:'Luna',](../src/main.js#L267)<br>[src/npc.js:export class NPC](../src/npc.js#L28) | [villagers / luna](../labs/villagers/js/recipes.js#L39) (direct) |  |
| <a id="mochi"></a>`mochi` — Mochi | [src/main.js:'Mochi',](../src/main.js#L291)<br>[src/npc.js:export class NPC](../src/npc.js#L28) | [villagers / mochi](../labs/villagers/js/recipes.js#L43) (direct) |  |
| <a id="kuro"></a>`kuro` — Kuro | [src/main.js:'Kuro',](../src/main.js#L306)<br>[src/npc.js:export class NPC](../src/npc.js#L28) | [villagers / kuro](../labs/villagers/js/recipes.js#L47) (direct) |  |
| <a id="larry"></a>`larry` — Larry the turtle | [src/countryside.js:turtle.name = 'Turtle Guardian (Larry)'](../src/countryside.js#L3451) | [fences / corral](../labs/fences/js/recipes.js#L71) (embedded) — The complete original corral includes Larry; there is no isolated turtle or patrol study. |  |
| <a id="guardian-crows"></a>`guardian-crows` — Nest guardian crows | [src/ambient_life.js:buildGuardianBirds(](../src/ambient_life.js#L221) | **No mapped evidence** | Critters extracts a sparrow, not guardianBirds; constructing AmbientLife alone does not put the crows on a specimen. |
| <a id="sparrows"></a>`sparrows` — Valley sparrows | [src/ambient_life.js:buildBirds(](../src/ambient_life.js#L160) | [critters / game-bird](../labs/critters/js/recipes.js#L42) (direct)<br>[critters / flock](../labs/critters/js/recipes.js#L46) (direct) |  |
| <a id="koi"></a>`koi` — River koi (procedural coat variants) | [src/ambient_life.js:buildKoi(](../src/ambient_life.js#L636) | [critters / game-koi](../labs/critters/js/recipes.js#L32) (direct) | Repeated koi and randomized markings are instances of this type, not additional inventory rows. |
| <a id="butterflies"></a>`butterflies` — Valley butterflies | [src/ambient_life.js:buildButterflies(](../src/ambient_life.js#L415) | [critters / game-flutter](../labs/critters/js/recipes.js#L50) (direct)<br>[critters / hinge](../labs/critters/js/recipes.js#L54) (direct) |  |

### Cat components

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="cat-coat"></a>`cat-coat` — Cat body, fur and tabby coats | [src/cat.js:buildCoat(](../src/cat.js#L88)<br>[src/cat_anatomy.js:export function getCatAnatomy](../src/cat_anatomy.js#L515)<br>[src/cat_shading.js:export function furMaterial](../src/cat_shading.js#L340) | [cat / coat](../tools/cat_preview.js#L163) (review) |  |
| <a id="cat-face"></a>`cat-face` — Cat nose, muzzle, whiskers, ears and painted eyes | [src/cat.js:buildFace(](../src/cat.js#L92) | [cat / face](../tools/cat_preview.js#L137) (review) |  |
| <a id="cat-collar"></a>`cat-collar` — Braided collar, bow and brass bell | [src/cat.js:buildCollar(](../src/cat.js#L96) | [cat / closeup](../tools/cat_preview.js#L180) (review) |  |
| <a id="master-bells"></a>`master-bells` — Master Cat gold and twin bells | [src/cat.js:setMasterCat(](../src/cat.js#L229) | **No mapped evidence** | The ordinary collar is reviewed; no specimen explicitly enables setMasterCat(). |
| <a id="cat-shadow"></a>`cat-shadow` — Cat contact-shadow blob | [src/cat.js:buildShadowBlob(](../src/cat.js#L101) | [cat / anatomy](../tools/cat_preview.js#L128) (embedded) — Visible with the complete cat; no isolated shadow study. |  |

### Ground and water

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="valley-ground"></a>`valley-ground` — Valley ground and terrain | [src/countryside.js:buildGround(](../src/countryside.js#L719) | [ground / today](../labs/ground/js/variants.js#L39) (direct)<br>[ground / height](../labs/ground/js/variants.js#L53) (direct) |  |
| <a id="path"></a>`path` — Cobbled valley path | [src/countryside.js:buildPath(](../src/countryside.js#L1176) | [ground / setts](../labs/ground/js/variants.js#L113) (direct)<br>[ground / pom](../labs/ground/js/variants.js#L120) (direct) |  |
| <a id="path-shoulders"></a>`path-shoulders` — Earthen path shoulders | [src/countryside.js:buildPathShoulders(](../src/countryside.js#L820) | [ground / today](../labs/ground/js/variants.js#L39) (direct)<br>[ground / height](../labs/ground/js/variants.js#L53) (direct) |  |
| <a id="path-slabs"></a>`path-slabs` — Walkway stone slabs | [src/countryside.js:buildWalkwaySlabs(](../src/countryside.js#L1269) | [ground / slabs](../labs/ground/js/variants.js#L127) (direct) |  |
| <a id="path-boulders"></a>`path-boulders` — Path boulders | [src/countryside.js:buildPathBoulders(](../src/countryside.js#L1315) | [rocks / game-boulder](../labs/rocks/js/recipes.js#L33) (direct) |  |
| <a id="key-rock"></a>`key-rock` — Key-hiding rock and companion stones | [src/countryside.js:buildKeyHidingRock(](../src/countryside.js#L2822) | [rocks / game-rock](../labs/rocks/js/recipes.js#L37) (direct) |  |
| <a id="river"></a>`river` — River water surface and bed | [src/countryside.js:buildRiverAndBridge(](../src/countryside.js#L1388)<br>[src/countryside.js:createRiverWaterMaterial(](../src/countryside.js#L1723) | [water / game](../labs/water/js/variants.js#L155) (direct)<br>[water / kyoto](../labs/water/js/variants.js#L165) (direct) |  |
| <a id="bridge"></a>`bridge` — Kiyomizu bridge, ramps and walkable rails | [src/countryside.js:bridge.name = 'Kiyomizu Bridge'](../src/countryside.js#L1492) | [water / b-game](../labs/water/js/variants.js#L232) (direct) |  |
| <a id="paddies"></a>`paddies` — Rice-paddy water | [src/countryside.js:buildPaddies(](../src/countryside.js#L1072)<br>[src/countryside.js:createPaddyWaterMaterial(](../src/countryside.js#L1612) | [water / p-game](../labs/water/js/variants.js#L312) (direct)<br>[water / p-mirror](../labs/water/js/variants.js#L321) (direct) |  |
| <a id="paddy-bunds"></a>`paddy-bunds` — Paddy beds and raised banks | [src/countryside.js:Paddy Ridge](../src/countryside.js#L1149) | [water / p-game](../labs/water/js/variants.js#L312) (embedded) |  |
| <a id="rice"></a>`rice` — Rice stalks | [src/countryside.js:rice.name = 'Rice Stalks'](../src/countryside.js#L1173) | [water / p-summer](../labs/water/js/variants.js#L340) (direct)<br>[water / p-autumn](../labs/water/js/variants.js#L350) (direct) |  |
| <a id="water-ripples"></a>`water-ripples` — Cat and koi ripple rings | [src/countryside.js:buildRipplePool(](../src/countryside.js#L893) | [water / ripple](../labs/water/js/variants.js#L120) (direct) — Technique study; not a replay of the game ripple-pool logic. |  |
| <a id="rain-ripples"></a>`rain-ripples` — Separate raindrop ripple pool | [src/countryside.js:buildRainRipplePool(](../src/countryside.js#L930) | [weather / splash](../labs/weather/js/recipes.js#L41) (direct) — Rain impact study; original pool eviction behavior is not tested. |  |

### Landscape

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="mountains"></a>`mountains` — Valley mountain terrain and ridges | [src/countryside.js:buildMountains(](../src/countryside.js#L4043) | [ranges / stack](../labs/ranges/js/main.js#L144) (direct) |  |
| <a id="edge-forest"></a>`edge-forest` — Edge-forest broadleaf tree wall | [src/countryside.js:buildEdgeForest(](../src/countryside.js#L4256) | [ranges / wall-mass](../labs/ranges/js/main.js#L157) (direct) |  |
| <a id="edge-undergrowth"></a>`edge-undergrowth` — Edge shrubs and shrine corridor thicket | [src/countryside.js:buildEdgeUndergrowth(](../src/countryside.js#L4428) | [ranges / edge](../labs/ranges/js/main.js#L193) (direct) |  |
| <a id="foothill-forest"></a>`foothill-forest` — Foothill cedars and broadleaf crowns | [src/countryside.js:buildFoothillForest(](../src/countryside.js#L4661) | [ranges / foothills](../labs/ranges/js/main.js#L31) (embedded) — The hero valley includes the foothill carpet; there is no separate shelf specimen. |  |
| <a id="distant-village"></a>`distant-village` — Distant valley village houses and hearth windows | [src/countryside.js:buildVillage(](../src/countryside.js#L4576) | [machiya / original-village](../labs/machiya/js/variants.js#L63) (related) — The street-house builder differs from buildVillage() distant silhouettes. |  |
| <a id="mist-ring"></a>`mist-ring` — Valley mist ring | [src/countryside.js:buildMistRing(](../src/countryside.js#L4757) | [ranges / air](../labs/ranges/js/main.js#L211) (related) — Aerial perspective bench; it does not extract the original mist-ring mesh. |  |
| <a id="dawn-mist"></a>`dawn-mist` — River dawn mist ribbons | [src/countryside.js:buildDawnMist(](../src/countryside.js#L4800) | [ranges / air](../labs/ranges/js/main.js#L211) (related) — General haze study; no dawn-river specimen or time envelope. |  |

### Buildings

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="tea-house"></a>`tea-house` — Machiya tea house | [src/countryside.js:buildMachiyaTeaHouse(](../src/countryside.js#L2148) | [machiya / original-tea](../labs/machiya/js/variants.js#L63) (direct) |  |
| <a id="residence"></a>`residence` — Craftsman residence | [src/countryside.js:buildMachiyaResidence(](../src/countryside.js#L2298) | [machiya / original-residence](../labs/machiya/js/variants.js#L63) (direct) |  |
| <a id="secret-house"></a>`secret-house` — Hisomu-an secret machiya | [src/countryside.js:buildSecretMachiya(](../src/countryside.js#L2388) | [machiya / original-secret](../labs/machiya/js/variants.js#L63) (direct) |  |
| <a id="street-house"></a>`street-house` — Village street house | [src/countryside.js:buildVillageHouse(](../src/countryside.js#L2963) | [machiya / original-village](../labs/machiya/js/variants.js#L63) (direct) |  |
| <a id="village-street"></a>`village-street` — Village street assembly | [src/countryside.js:buildVillageStreet(](../src/countryside.js#L2936) | [machiya / original-village](../labs/machiya/js/variants.js#L63) (related) — Individual house references, not a specimen of the complete original street layout. |  |

### Building components

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="kawara-roof"></a>`kawara-roof` — Kawara roof slopes, end tiles, ridge and onigawara | [src/countryside.js:createKawaraRoof(](../src/countryside.js#L1890)<br>[src/countryside.js:createCurvedSlope(](../src/countryside.js#L1873) | [machiya / roof-original](../labs/machiya/js/variants.js#L76) (direct) |  |
| <a id="koushi"></a>`koushi` — Koushi lattice and framing | [src/countryside.js:createKoushi(](../src/countryside.js#L1837) | [machiya / lattice-original](../labs/machiya/js/variants.js#L85) (direct) |  |
| <a id="engawa"></a>`engawa` — Engawa deck, plinths and stepping stone | [src/countryside.js:createEngawa(](../src/countryside.js#L1996) | [machiya / deck-original](../labs/machiya/js/variants.js#L91) (direct) |  |
| <a id="timber-frame"></a>`timber-frame` — Timber posts, sills and eave beams | [src/countryside.js:// Dark timber foundation sill](../src/countryside.js#L2279) | [machiya / frame-original](../labs/machiya/js/variants.js#L79) (direct) |  |
| <a id="upper-windows"></a>`upper-windows` — Upper-storey timber lattice windows | [src/countryside.js:// Upper fine vertical lattice windows](../src/countryside.js#L2231) | [machiya / window-original](../labs/machiya/js/variants.js#L88) (direct) |  |
| <a id="noren"></a>`noren` — Noren shop curtains | [src/countryside.js:// Front Facade: Lattice](../src/countryside.js#L2199) | [machiya / cloth-original](../labs/machiya/js/variants.js#L97) (direct) |  |
| <a id="namako"></a>`namako` — Namako skirt walls | [src/countryside.js:// Namako-kabe skirt](../src/countryside.js#L98) | [machiya / original-village](../labs/machiya/js/variants.js#L63) (embedded) |  |
| <a id="tea-bench"></a>`tea-bench` — Tea-house bench and mosen cushion | [src/countryside.js:// Front Chamise Tea Bench](../src/countryside.js#L2290) | [machiya / original-tea](../labs/machiya/js/variants.js#L63) (embedded) |  |
| <a id="secret-door"></a>`secret-door` — Secret sliding door | [src/countryside.js:slidingDoor.name = 'Secret Sliding Door'](../src/countryside.js#L2663) | [machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |
| <a id="lock-plate"></a>`lock-plate` — Antique brass padlock emblem | [src/countryside.js:this.lockPlate.name = 'Brass Lock Plate'](../src/countryside.js#L2679) | [machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |

### Props

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="crates"></a>`crates` — Climbable crate stacks | [src/countryside.js:createClimbCrates(](../src/countryside.js#L2062) | [alley / game-crates](../labs/alley/js/recipes.js#L26) (direct)<br>[alley / crate](../labs/alley/js/recipes.js#L30) (direct) |  |
| <a id="sake-barrel"></a>`sake-barrel` — Climb-route sake barrel | [src/countryside.js:// Bottom step: 2 heavy wooden crates + 1 sake barrel](../src/countryside.js#L2098) | [alley / komodaru](../labs/alley/js/props.js#L23) (direct) — Generated as its own specimen by the PROPS map in recipes.js. |  |
| <a id="nest"></a>`nest` — Rooftop bird nest | [src/countryside.js:buildBirdNest(](../src/countryside.js#L2700) | [nest / game-nest](../labs/nest/js/recipes.js#L28) (direct)<br>[nest / lined](../labs/nest/js/recipes.js#L44) (direct) |  |
| <a id="nest-eggs"></a>`nest-eggs` — Three speckled nest eggs | [src/countryside.js:// Twig nest bowl](../src/countryside.js#L2731) | [nest / eggs](../labs/nest/js/recipes.js#L48) (direct) |  |
| <a id="toro"></a>`toro` — Stone toro lanterns and halos | [src/countryside.js:buildToroLantern(](../src/countryside.js#L3567) | [lanterns / game-toro](../labs/lanterns/js/recipes.js#L34) (direct) |  |
| <a id="chochin"></a>`chochin` — Hanging chochin lanterns | [src/countryside.js:createChochinLantern(](../src/countryside.js#L2023) | [lanterns / game-chochin](../labs/lanterns/js/recipes.js#L63) (direct) |  |
| <a id="street-lamps"></a>`street-lamps` — Street lamp posts | [src/countryside.js:buildLanterns(](../src/countryside.js#L3999) | [lanterns / game-street](../labs/lanterns/js/recipes.js#L88) (direct) |  |
| <a id="bamboo-fence"></a>`bamboo-fence` — Bamboo fence runs | [src/countryside.js:buildBambooFence(](../src/countryside.js#L3243) | [fences / game-fence](../labs/fences/js/recipes.js#L33) (direct) |  |
| <a id="corral"></a>`corral` — Bamboo corral assembly | [src/countryside.js:buildBambooCorral(](../src/countryside.js#L3324) | [fences / corral](../labs/fences/js/recipes.js#L71) (direct) |  |
| <a id="corral-sign"></a>`corral-sign` — Corral warning sign | [src/countryside.js:marker.name = 'Corral Warning Sign'](../src/countryside.js#L3412) | [fences / corral-sign](../labs/fences/js/recipes.js#L75) (direct) |  |
| <a id="shishi"></a>`shishi` — Shishi-odoshi feeder, rocker, pivot and basin | [src/countryside.js:buildShishiOdoshi(](../src/countryside.js#L2871) | [garden / game-shishi](../labs/garden/js/recipes.js#L31) (direct)<br>[garden / shishi](../labs/garden/js/recipes.js#L35) (direct) |  |
| <a id="wind-chime"></a>`wind-chime` — Furin wind chime | [src/countryside.js:buildWindChime(](../src/countryside.js#L3709) | [garden / game-chime](../labs/garden/js/recipes.js#L44) (direct)<br>[garden / glass](../labs/garden/js/recipes.js#L48) (direct) |  |

### Shrine

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="torii"></a>`torii` — Valley torii gate and climbing joinery | [src/countryside.js:buildTorii(](../src/countryside.js#L3812) | [shrine / game-torii](../labs/shrine/js/recipes.js#L165) (direct) |  |
| <a id="shrine-hall"></a>`shrine-hall` — Shrine hall, steps and roof | [src/countryside.js:buildShrine(](../src/countryside.js#L3889) | [shrine / game-hall](../labs/shrine/js/recipes.js#L368) (direct) |  |
| <a id="shimenawa"></a>`shimenawa` — Sacred shimenawa rope and shide | [src/countryside.js:// Sacred Shimenawa](../src/countryside.js#L3963) | [shrine / game-rope](../labs/shrine/js/recipes.js#L264) (direct) |  |
| <a id="shrine-bell"></a>`shrine-bell` — Shrine hanging bell and cords | [src/countryside.js:// Sacred Buddha / Shrine Spiritual Bell](../src/countryside.js#L3973) | [shrine / suzu](../labs/shrine/js/recipes.js#L400) (direct) |  |
| <a id="offering-box"></a>`offering-box` — Saisen-bako offering box | [src/countryside.js:// Saisen-bako wooden offering box](../src/countryside.js#L3993) | [shrine / game-hall](../labs/shrine/js/recipes.js#L368) (embedded) |  |
| <a id="mist-altar"></a>`mist-altar` — Mist altar plinth, bell, spirit flame and ring | [src/countryside.js:buildMistAltar(](../src/countryside.js#L3632) | [shrine / game-altar](../labs/shrine/js/recipes.js#L418) (direct) |  |
| <a id="distant-pagoda"></a>`distant-pagoda` — Valley distant pagoda | [src/countryside.js:buildDistantPagoda(](../src/countryside.js#L4124) | [pagoda / orig-tower](../labs/pagoda/js/variants.js#L62) (direct) |  |

### Items

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="yarn"></a>`yarn` — Yarn balls | [src/countryside.js:buildYarn(](../src/countryside.js#L4865) | [keepsakes / game-yarn](../labs/keepsakes/js/recipes.js#L31) (direct)<br>[keepsakes / wound](../labs/keepsakes/js/recipes.js#L35) (direct) |  |
| <a id="key"></a>`key` — Antique secret-house key | [src/countryside.js:buildSecretKey(](../src/countryside.js#L2780) | [keepsakes / game-key](../labs/keepsakes/js/recipes.js#L52) (direct) |  |
| <a id="guardian-feather"></a>`guardian-feather` — Guardian’s Feather trophy | [src/countryside.js:feather.name = "Guardian's Feather"](../src/countryside.js#L2766) | [nest / feather](../labs/nest/js/recipes.js#L52) (direct) |  |
| <a id="offering-bells"></a>`offering-bells` — Five collectible offering bells | [src/countryside.js:buildOfferingBells(](../src/countryside.js#L3759) | [shrine / game-bell](../labs/shrine/js/recipes.js#L433) (direct) |  |
| <a id="dango"></a>`dango` — Golden Dango / River-Spirit Charm | [src/countryside.js:charm.name = 'River-Spirit Charm'](../src/countryside.js#L1576) | [keepsakes / dango](../labs/keepsakes/js/treats.js#L10) (direct) |  |
| <a id="jade-paw"></a>`jade-paw` — Jade Paw corral reward | [src/countryside.js:reward.name = 'Jade Paw Reward'](../src/countryside.js#L3428) | [keepsakes / jade-paw](../labs/keepsakes/js/treats.js#L14) (direct)<br>[fences / corral](../labs/fences/js/recipes.js#L71) (related) — The original builder creates this reward with visible=false. The corral tile does not reveal it; construction is not visible coverage. |  |
| <a id="secret-fish"></a>`secret-fish` — Secret-house grilled fish treat | [src/countryside.js:fish.name = 'Grilled Fish Treat'](../src/countryside.js#L2619) | [keepsakes / secret-fish](../labs/keepsakes/js/treats.js#L18) (direct)<br>[machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) — Fish remains inside the furnished original secret-house reference. |  |
| <a id="interior-fish"></a>`interior-fish` — Tea-house grilled sea-bream platter | [src/interior.js:fish.name = 'Grilled Sea Bream'](../src/interior.js#L589) | [keepsakes / interior-fish](../labs/keepsakes/js/treats.js#L22) (direct) |  |

### Vegetation

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="sakura"></a>`sakura` — Sakura trees | [src/vegetation.js:sakuraTree(](../src/vegetation.js#L348) | [tree / hero](../tools/tree_preview.js#L97) (review) |  |
| <a id="maples"></a>`maples` — Maple trees | [src/vegetation.js:mapleTree(](../src/vegetation.js#L699)<br>[src/vegetation.js:buildMaplesAndPines(](../src/vegetation.js#L728) | [tree / hero](../tools/tree_preview.js#L97) (review) |  |
| <a id="pines"></a>`pines` — Garden pines | [src/vegetation.js:pineTree(](../src/vegetation.js#L713) | [tree / hero](../tools/tree_preview.js#L97) (review) |  |
| <a id="rim-trees"></a>`rim-trees` — Rim sakura, maple and pine leaf masses | [src/vegetation.js:treeStyle(](../src/vegetation.js#L184)<br>[src/vegetation.js:canopyTree(](../src/vegetation.js#L211) | [tree / rim](../tools/tree_preview.js#L104) (review) |  |
| <a id="tree-trunks"></a>`tree-trunks` — Tree trunks and limbs | [src/vegetation.js:trunkMesh(](../src/vegetation.js#L325) | [tree / detail](../tools/tree_preview.js#L128) (review) |  |
| <a id="tree-canopies"></a>`tree-canopies` — Leaf sprays and clumped/mass canopy families | [src/foliage.js:export function buildCanopy](../src/foliage.js#L1172) | [tree / compare](../tools/tree_preview.js#L118) (review) |  |
| <a id="bamboo-groves"></a>`bamboo-groves` — Bamboo groves, culms and leaves | [src/vegetation.js:buildBambooGrove(](../src/vegetation.js#L458) | [greenery / game-grove](../labs/greenery/js/recipes.js#L54) (direct)<br>[greenery / nodes](../labs/greenery/js/recipes.js#L33) (direct)<br>[greenery / leaves](../labs/greenery/js/recipes.js#L58) (direct) |  |
| <a id="street-bushes"></a>`street-bushes` — Street bushes | [src/countryside.js:buildStreetBushes(](../src/countryside.js#L3070) | [greenery / game-bush](../labs/greenery/js/recipes.js#L75) (direct) |  |
| <a id="roadside-moss"></a>`roadside-moss` — Roadside moss patches | [src/countryside.js:buildStreetGreenery(](../src/countryside.js#L3153) | [grass / moss](../labs/grass/js/types_wild.js#L375) (related) — The grass moss pillow differs from the roadside instanced tufts. |  |
| <a id="meadow-system"></a>`meadow-system` — Valley biome layout and grass LOD rings | [src/vegetation.js:buildMeadow(](../src/vegetation.js#L749)<br>[src/grass.js:addRing(](../src/grass.js#L1523)<br>[src/grass.js:addZone(](../src/grass.js#L1532) | [grass / ring-lod](../labs/grass/js/types_field.js#L273) (direct) | The meadow’s collider-derived biome layout has no isolated original specimen; Ring LOD studies the shared layout technique. |
| <a id="grass-near"></a>`grass-near` — Near meadow blades and tufts | [src/grass.js:near: {](../src/grass.js#L881) | [grass / bezier](../labs/grass/js/types_field.js#L25) (direct) |  |
| <a id="grass-mid"></a>`grass-mid` — Mid-distance tri-quad clumps | [src/grass.js:mid: {](../src/grass.js#L898) | [grass / triquad](../labs/grass/js/types_field.js#L59) (direct) |  |
| <a id="grass-far"></a>`grass-far` — Far painted tuft cards | [src/grass.js:far: {](../src/grass.js#L914) | [grass / meadow-painted](../labs/grass/js/types_ours.js#L245) (direct) |  |
| <a id="grass-thicket"></a>`grass-thicket` — Edge thicket grass | [src/grass.js:thicket: {](../src/grass.js#L930) | [grass / meadow-thicket](../labs/grass/js/types_ours.js#L224) (direct) |  |
| <a id="grass-flowers"></a>`grass-flowers` — Wildflower stems and bloom atlas | [src/grass.js:flowers: {](../src/grass.js#L957) | [grass / wildflowers](../labs/grass/js/types_mixed.js#L201) (direct) |  |
| <a id="grass-susuki"></a>`grass-susuki` — Susuki plumes | [src/grass.js:susuki: {](../src/grass.js#L991) | [grass / susuki](../labs/grass/js/types_wild.js#L122) (direct) |  |
| <a id="grass-mown"></a>`grass-mown` — Mown lawn stripes | [src/grass.js:mown: {](../src/grass.js#L1020) | [grass / mown](../labs/grass/js/types_mixed.js#L155) (direct) |  |
| <a id="grass-lantern"></a>`grass-lantern` — Lantern Glade luminous fibres | [src/grass.js:lantern: {](../src/grass.js#L1041) | [grass / lantern](../labs/grass/js/types_wild.js#L11) (direct) |  |
| <a id="grass-sumi"></a>`grass-sumi` — Sumi ink-stroke grass | [src/grass.js:sumi: {](../src/grass.js#L1068) | [grass / sumi](../labs/grass/js/types_wild.js#L154) (direct) |  |
| <a id="grass-yarn"></a>`grass-yarn` — Corral yarn-curl grass | [src/grass.js:yarn: {](../src/grass.js#L1089) | [grass / yarn](../labs/grass/js/types_wild.js#L180) (direct) |  |
| <a id="grass-shell"></a>`grass-shell` — Short shell-turf carpet | [src/grass.js:addShell(](../src/grass.js#L1543) | [grass / carpet-blades](../labs/grass/js/types_mixed.js#L17) (direct) |  |
| <a id="grass-moss"></a>`grass-moss` — Moss pillows at roots and stones | [src/grass.js:addMoss(](../src/grass.js#L1568) | [grass / moss](../labs/grass/js/types_wild.js#L375) (direct) |  |

### Effects

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="grass-fireflies"></a>`grass-fireflies` — River-bank grass fireflies | [src/grass.js:addFireflies(](../src/grass.js#L1607) | [moonpool / fireflies](../labs/moonpool/js/recipes.js#L267) (related) — Related hotaru study; not the GrassSystem particle shader. |  |
| <a id="dappled-light"></a>`dappled-light` — Projected dappled light pools | [src/vegetation.js:buildDappledLight(](../src/vegetation.js#L373) | [komorebi / game-dapple](../labs/komorebi/js/recipes.js#L35) (direct) |  |

### Hidden places

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="moon-pool"></a>`moon-pool` — Moon Pool assembly | [src/hidden_places.js:buildMoonPool(](../src/hidden_places.js#L157) | [moonpool / game-water](../labs/moonpool/js/recipes.js#L177) (direct) |  |
| <a id="pool-apron"></a>`pool-apron` — Moon Pool mossy apron | [src/hidden_places.js:// Mossy ground apron](../src/hidden_places.js#L296) | [moonpool / game-water](../labs/moonpool/js/recipes.js#L177) (embedded) |  |
| <a id="pool-water"></a>`pool-water` — Moon Pool water and caustic layer | [src/hidden_places.js:// The water: a deep](../src/hidden_places.js#L324) | [moonpool / game-water](../labs/moonpool/js/recipes.js#L177) (direct) |  |
| <a id="pool-moon"></a>`pool-moon` — Moon reflection disc | [src/hidden_places.js:// Moon pooled on the water](../src/hidden_places.js#L364) | [moonpool / game-moon](../labs/moonpool/js/recipes.js#L217) (direct) |  |
| <a id="pool-rim"></a>`pool-rim` — Pool rim stones | [src/hidden_places.js:// Rim stones](../src/hidden_places.js#L379) | [moonpool / game-water](../labs/moonpool/js/recipes.js#L177) (embedded) |  |
| <a id="lily-pads"></a>`lily-pads` — Lily pads | [src/hidden_places.js:// Lily pads](../src/hidden_places.js#L254) | [moonpool / game-pad](../labs/moonpool/js/recipes.js#L231) (direct) |  |
| <a id="lotus"></a>`lotus` — Lotus blossoms | [src/hidden_places.js:// Lily pads](../src/hidden_places.js#L254) | [moonpool / lotus](../labs/moonpool/js/recipes.js#L239) (direct) |  |
| <a id="pool-seat"></a>`pool-seat` — Pool sitting stone | [src/hidden_places.js:// Flat sitting stone](../src/hidden_places.js#L412) | [moonpool / game-water](../labs/moonpool/js/recipes.js#L177) (embedded) |  |
| <a id="pool-toro"></a>`pool-toro` — Moon Pool stone toro | [src/hidden_places.js:// A little stone toro](../src/hidden_places.js#L425) | [moonpool / game-water](../labs/moonpool/js/recipes.js#L177) (embedded) |  |
| <a id="pool-motes"></a>`pool-motes` — Moon Pool rising motes | [src/hidden_places.js:// Motes lifting off](../src/hidden_places.js#L451) | [moonpool / game-motes](../labs/moonpool/js/recipes.js#L263) (direct) |  |
| <a id="lantern-glade"></a>`lantern-glade` — Lantern Glade complete clearing | [src/hidden_places.js:buildLanternGlade(](../src/hidden_places.js#L486) | [moonpool / game-lamp](../labs/moonpool/js/recipes.js#L245) (related) — The original tile extracts a lantern, not the complete clearing. |  |
| <a id="glade-floor"></a>`glade-floor` — Glade leaf-litter ground | [src/hidden_places.js:// Leaf-litter floor](../src/hidden_places.js#L617) | **No mapped evidence** | No specimen extracts this leaf-litter texture or clearing floor. |
| <a id="glade-bamboo"></a>`glade-bamboo` — Glade bamboo ring and drooping leaves | [src/hidden_places.js:stalks.name = 'Glade Bamboo'](../src/hidden_places.js#L663) | [greenery / game-grove](../labs/greenery/js/recipes.js#L54) (related) — Vegetation.buildBambooGrove differs from the hidden-place bamboo. |  |
| <a id="glade-lanterns"></a>`glade-lanterns` — Glade paper lanterns and glow | [src/hidden_places.js:// Paper lanterns strung](../src/hidden_places.js#L599) | [moonpool / game-lamp](../labs/moonpool/js/recipes.js#L245) (direct) |  |
| <a id="glade-seat"></a>`glade-seat` — Glade seat and mossy central boulder | [src/hidden_places.js:// A flat sitting stone](../src/hidden_places.js#L737) | [rocks / moss-old](../labs/rocks/js/recipes.js#L67) (related) — Related stone finish, without the glade objects. |  |
| <a id="glade-fireflies"></a>`glade-fireflies` — Glade fireflies | [src/hidden_places.js:// Fireflies that gather](../src/hidden_places.js#L759) | [moonpool / fireflies](../labs/moonpool/js/recipes.js#L267) (direct) |  |

### Interiors

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="tea-interior"></a>`tea-interior` — Tea-house interior assembly | [src/interior.js:buildInterior(](../src/interior.js#L321) | [interiors / garden](../labs/interiors/js/data.js#L24) (direct) — A redesigned room study, not the original InteriorManager builder. |  |
| <a id="tatami"></a>`tatami` — Eight-mat tatami floor and borders | [src/interior.js:floor.name = 'Tatami Floor'](../src/interior.js#L474) | [interiors / tatami](../labs/interiors/js/craft.js#L5) (direct) |  |
| <a id="interior-frame"></a>`interior-frame` — Interior walls, timber posts and ceiling beams | [src/interior.js:// Ceiling beams & panel](../src/interior.js#L503) | [interiors / garden](../labs/interiors/js/data.js#L24) (embedded) |  |
| <a id="shoji-doors"></a>`shoji-doors` — Entrance and exit shoji doors | [src/interior.js:exitDoor.name = 'Exit Door'](../src/interior.js#L661) | [interiors / shoji](../labs/interiors/js/craft.js#L6) (direct) |  |
| <a id="tokonoma"></a>`tokonoma` — Tokonoma alcove | [src/interior.js:toko.name = 'Tokonoma Alcove'](../src/interior.js#L411) | [interiors / garden](../labs/interiors/js/data.js#L24) (embedded) |  |
| <a id="scroll"></a>`scroll` — Kakejiku hanging scroll | [src/interior.js:// Hanging Scroll](../src/interior.js#L519) | [interiors / garden](../labs/interiors/js/data.js#L24) (embedded) |  |
| <a id="bonsai"></a>`bonsai` — Tokonoma bonsai pine | [src/interior.js:// Mini Bonsai Pine](../src/interior.js#L527) | **No mapped evidence** | No original bonsai specimen; the lab alcove uses other decorations. |
| <a id="chabudai"></a>`chabudai` — Chabudai low table | [src/interior.js:table.name = 'Chabudai Table'](../src/interior.js#L422) | [interiors / garden](../labs/interiors/js/data.js#L24) (embedded) |  |
| <a id="teaware"></a>`teaware` — Ceramic teapot and yunomi cups | [src/interior.js:// Ceramic Teapot & Yunomi Cups](../src/interior.js#L571) | [interiors / pottery](../labs/interiors/js/craft.js#L7) (direct) |  |
| <a id="zabuton"></a>`zabuton` — Zabuton nap bed and embroidered tassels | [src/interior.js:bed.name = 'Zabuton Nap Bed'](../src/interior.js#L605) | [interiors / garden](../labs/interiors/js/data.js#L24) (embedded) |  |
| <a id="andon"></a>`andon` — Andon paper floor lantern | [src/interior.js:andon.name = 'Andon Lantern'](../src/interior.js#L621) | [lanterns / andon](../labs/lanterns/js/recipes.js#L92) (direct) |  |
| <a id="courtyard-gravel"></a>`courtyard-gravel` — Courtyard rock-garden gravel | [src/interior.js:// Courtyard rock garden gravel](../src/interior.js#L631) | [rocks / rake](../labs/rocks/js/recipes.js#L71) (direct) |  |
| <a id="courtyard-toro"></a>`courtyard-toro` — Courtyard stone lantern | [src/interior.js:toro.name = 'Courtyard Toro Lantern'](../src/interior.js#L640) | [lanterns / game-toro](../labs/lanterns/js/recipes.js#L34) (related) — Different source builder; no courtyard lantern extraction. |  |
| <a id="courtyard-wall"></a>`courtyard-wall` — Courtyard boundary timber wall | [src/interior.js:// Courtyard outer timber wall](../src/interior.js#L651) | [interiors / garden](../labs/interiors/js/data.js#L24) (embedded) |  |
| <a id="knockables"></a>`knockables` — Three tabletop knockables (white cup, blue bowl, white sphere) | [src/interior.js:buildKnockables(](../src/interior.js#L219) | [interiors / pottery](../labs/interiors/js/craft.js#L7) (related) — Vessel geometry is studied; these three original items are not specimens.<br>[interiors / bat-cup](../labs/interiors/js/cat.js#L53) (related) — Lab physics supports batting lab vessels; original item geometry and physics differ. |  |
| <a id="secret-tatami"></a>`secret-tatami` — Secret-house tatami | [src/countryside.js:tatamiFloor.name = 'Tatami Floor'](../src/countryside.js#L2568) | [machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |
| <a id="secret-table"></a>`secret-table` — Secret-house table and teaware | [src/countryside.js:table.name = 'Chabudai Table'](../src/countryside.js#L2589) | [machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |
| <a id="secret-bed"></a>`secret-bed` — Secret-house nap cushion | [src/countryside.js:// Gold embroidery tassels](../src/countryside.js#L2638) | [machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |
| <a id="secret-andon"></a>`secret-andon` — Secret-house andon | [src/countryside.js:andon.name = 'Andon Lantern'](../src/countryside.js#L2650) | [machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |

### Sky and effects

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="sky-dome"></a>`sky-dome` — Sky dome and day/night palette | [src/sky.js:buildDome(](../src/sky.js#L221) | [sky / sky-game](../labs/sky/js/data.js#L33) (direct) |  |
| <a id="clouds"></a>`clouds` — Painted cloud sprites | [src/sky.js:buildClouds(](../src/sky.js#L272)<br>[src/sky.js:buildCloudTexture(](../src/sky.js#L232) | [sky / cloud-game](../labs/sky/js/data.js#L40) (direct) |  |
| <a id="stars"></a>`stars` — Twinkling stars | [src/sky.js:buildStars(](../src/sky.js#L314) | [sky / sky-night](../labs/sky/js/data.js#L37) (embedded) |  |
| <a id="moon"></a>`moon` — Crescent moon | [src/sky.js:buildMoon(](../src/sky.js#L373) | [sky / sky-night](../labs/sky/js/data.js#L37) (embedded) |  |
| <a id="sky-light"></a>`sky-light` — Sun, hemisphere, fill and bounce lighting | [src/sky.js:buildLights(](../src/sky.js#L402)<br>[src/sky.js:buildPalettes(](../src/sky.js#L444) | [sky / sky-game](../labs/sky/js/data.js#L33) (related) — The baseline adapter hides the original lights; labs use their own rig. |  |
| <a id="god-rays"></a>`god-rays` — Valley god-ray cards | [src/particles.js:buildGodRays(](../src/particles.js#L113) | [sky / air-rays](../labs/sky/js/data.js#L60) (related) — Sky-space rays are a different implementation from the game’s ground cards. |  |
| <a id="rain"></a>`rain` — Valley rain streaks | [src/particles.js:buildRain(](../src/particles.js#L201) | [weather / game-rain](../labs/weather/js/recipes.js#L33) (direct) |  |
| <a id="river-petals"></a>`river-petals` — River petal rafts | [src/particles.js:buildRiverPetals(](../src/particles.js#L288) | [water / hanaikada](../labs/water/js/variants.js#L198) (direct) |  |
| <a id="falling-petals"></a>`falling-petals` — Falling sakura petals | [src/particles.js:buildPetals(](../src/particles.js#L357) | [weather / game-petal](../labs/weather/js/recipes.js#L59) (direct) |  |
| <a id="fireflies"></a>`fireflies` — Ambient valley fireflies | [src/particles.js:buildFireflies(](../src/particles.js#L397) | [moonpool / fireflies](../labs/moonpool/js/recipes.js#L267) (related) — Related firefly study; not Particles.buildFireflies(). |  |
| <a id="dust-motes"></a>`dust-motes` — Ambient dust motes | [src/particles.js:buildMotes(](../src/particles.js#L441) | [moonpool / game-motes](../labs/moonpool/js/recipes.js#L263) (related) — Moon Pool motes are a separate system. |  |
| <a id="snow"></a>`snow` — Valley snowfall | [src/particles.js:buildSnow(](../src/particles.js#L496) | [weather / game-snow](../labs/weather/js/recipes.js#L50) (direct) |  |
| <a id="scent"></a>`scent` — Scent-trail glowing particles | [src/scent.js:build() {](../src/scent.js#L33) | **No mapped evidence** | No scent-trail specimen or interaction study. |
| <a id="splash"></a>`splash` — Player water-entry splash droplets | [src/player.js:// Water-splash droplet pool](../src/player.js#L97) | [weather / splash](../labs/weather/js/recipes.js#L41) (related) — Rain impacts do not exercise the player water-entry splash. |  |
| <a id="landing-dust"></a>`landing-dust` — Landing dust puffs | [src/context_actions.js:spawnLandDust(](../src/context_actions.js#L832) | **No mapped evidence** | No specimen exercises this pooled landing effect. |
| <a id="ao"></a>`ao` — Screen-space ambient occlusion | [src/postfx.js:export class AOPass](../src/postfx.js#L142) | **No mapped evidence** | Sky’s air-game baseline explicitly excludes the full game post-processing pipeline. |
| <a id="atmosphere"></a>`atmosphere` — Screen-space distance and height atmosphere | [src/postfx.js:export class AtmospherePass](../src/postfx.js#L377) | [summit / haze](../labs/summit/js/recipes.js#L73) (related) — Layered haze cards are not the game’s depth-buffer atmosphere pass. |  |
| <a id="grade"></a>`grade` — Painterly colour grading, vignette, grain and fringe | [src/postfx.js:export const GradeShader](../src/postfx.js#L479)<br>[src/postfx.js:export const GradeOutputShader](../src/postfx.js#L560) | [ground / kuwahara](../labs/ground/js/variants.js#L252) (related) — Related finish study; Kuwahara is not the game grade/grain/fringe pipeline. |  |
| <a id="summit-transition"></a>`summit-transition` — Optional summit transition video | [src/mountaintop.js:const SUMMIT_VIDEO_SRC =](../src/mountaintop.js#L26) | **No mapped evidence** | Optional runtime transition media, outside the lab specimen set; availability is not checked. |

### Summit

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="summit-meadow"></a>`summit-meadow` — Summit meadow clearing | [src/mountaintop.js:buildMeadow(](../src/mountaintop.js#L444) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-entry"></a>`summit-entry` — Summit approach steps, landing and entrance torii | [src/mountaintop.js:buildStepsAndGate(](../src/mountaintop.js#L445) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-trees"></a>`summit-trees` — Summit trees, back brush and brow stones | [src/mountaintop.js:buildRocksAndTrees(](../src/mountaintop.js#L456) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="meditation-stone"></a>`meditation-stone` — Meditation stone, enso and approach stones | [src/mountaintop.js:buildMeditationStone(](../src/mountaintop.js#L448) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="meditation-atmosphere"></a>`meditation-atmosphere` — Meditation sun pool, motes and furin | [src/mountaintop.js:buildMeditationAtmosphere(](../src/mountaintop.js#L450) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-shoulder"></a>`summit-shoulder` — Torii approach earthen shoulder | [src/mountaintop.js:buildApproachShoulder(](../src/mountaintop.js#L437) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-path"></a>`summit-path` — Lower stone path, stones and lanterns | [src/mountaintop.js:buildLowerPath(](../src/mountaintop.js#L451) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-terrain"></a>`summit-terrain` — Summit flanks and basin landform | [src/mountaintop.js:buildSummitTerrain(](../src/mountaintop.js#L439) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="vista-terrain"></a>`vista-terrain` — Vista Yodo River and road ribbons | [src/mountaintop.js:buildVistaTerrain(](../src/mountaintop.js#L463) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-pagoda"></a>`summit-pagoda` — Higashiyama pagoda and evening lanterns | [src/mountaintop.js:buildKyotoPagoda(](../src/mountaintop.js#L465) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset.<br>[summit / game-city](../labs/summit/js/recipes.js#L57) (embedded) — buildKyotoCity() calls buildKyotoPagoda(); the tower is inside the original city tile. Its evening-light material starts at zero opacity. |  |
| <a id="summit-bay"></a>`summit-bay` — Bay water, coastline and sun glints | [src/mountaintop.js:buildSummitBay(](../src/mountaintop.js#L467) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="harbour"></a>`harbour` — Harbour skyline, islands, bridge and Ferris wheel | [src/mountaintop.js:buildHarbourAndIslands(](../src/mountaintop.js#L468) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="horizon"></a>`horizon` — Summit horizon mountain ranges | [src/mountaintop.js:buildHorizonRanges(](../src/mountaintop.js#L469) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="slope-forest"></a>`slope-forest` — Summit slope forest species | [src/mountaintop.js:buildSlopeForest(](../src/mountaintop.js#L458) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-clouds"></a>`summit-clouds` — Summit cumulus and storm cloud banks | [src/mountaintop.js:buildSummitClouds(](../src/mountaintop.js#L473) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-snow"></a>`summit-snow` — Summit snowfall | [src/mountaintop.js:buildSummitSnow(](../src/mountaintop.js#L477) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-rain"></a>`summit-rain` — Summit rainfall | [src/mountaintop.js:buildSummitRain(](../src/mountaintop.js#L480) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-pollen"></a>`summit-pollen` — Summit pollen | [src/mountaintop.js:buildPollen(](../src/mountaintop.js#L482) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-petals"></a>`summit-petals` — Summit sakura petals | [src/mountaintop.js:buildSakuraPetals(](../src/mountaintop.js#L484) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-wildlife"></a>`summit-wildlife` — Summit butterflies and fly-by birds | [src/mountaintop.js:buildAmbientWildlife(](../src/mountaintop.js#L489) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="shrine-rays"></a>`shrine-rays` — Valley-to-summit shrine beacon rays | [src/mountaintop.js:buildShrineRays(](../src/mountaintop.js#L429) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-light"></a>`summit-light` — Supplementary summit sky and rim lights | [src/mountaintop.js:buildSummitLight(](../src/mountaintop.js#L428) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) |  |
| <a id="summit-grass"></a>`summit-grass` — Summit biome grass field | [src/mountaintop.js:buildGrassField(](../src/mountaintop.js#L457) | [grass / ring-lod](../labs/grass/js/types_field.js#L273) (related) — Same GrassSystem recipes, but no specimen of the summit’s field layout.<br>[summit-review / whole-scene](../tools/summit_preview.js#L62) (review) |  |
| <a id="summit-vista"></a>`summit-vista` — Layered Kyoto Bay vista assembly | [src/mountaintop.js:buildSkirtAndVista(](../src/mountaintop.js#L461) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) |  |
| <a id="kyoto-city"></a>`kyoto-city` — Summit Kyoto houses, eaves, window lights and gardens | [src/mountaintop.js:buildKyotoCity(](../src/mountaintop.js#L464) | [summit / game-city](../labs/summit/js/recipes.js#L57) (direct)<br>[summit / night](../labs/summit/js/recipes.js#L69) (direct) |  |
| <a id="blender-roofscape"></a>`blender-roofscape` — Optional Blender Kyoto roofscape GLB | [src/mountaintop.js:loadVistaLandmarks(](../src/mountaintop.js#L472) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) — Optional runtime asset with fallback; availability is not verified by this source audit. |  |
| <a id="summit-enso"></a>`summit-enso` — Weathered enso marking | [src/mountaintop.js:buildMeditationStone(](../src/mountaintop.js#L448) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) |  |
| <a id="summit-furin"></a>`summit-furin` — Summit meditation furin | [src/mountaintop.js:buildMeditationAtmosphere(](../src/mountaintop.js#L450) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) |  |
| <a id="bay-bridge"></a>`bay-bridge` — Bay bridge | [src/mountaintop.js:buildHarbourAndIslands(](../src/mountaintop.js#L468) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) |  |
| <a id="ferris-wheel"></a>`ferris-wheel` — Harbour Ferris wheel | [src/mountaintop.js:buildHarbourAndIslands(](../src/mountaintop.js#L468) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) |  |
| <a id="summit-butterflies"></a>`summit-butterflies` — Summit butterfly visitors | [src/mountaintop.js:buildAmbientWildlife(](../src/mountaintop.js#L489) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) |  |
| <a id="summit-birds"></a>`summit-birds` — Summit fly-by bird palette variants | [src/mountaintop.js:buildAmbientWildlife(](../src/mountaintop.js#L489) | [summit-review / whole-scene](../tools/summit_preview.js#L62) (review) |  |

### Inactive code

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="old-petal-drifts"></a>`old-petal-drifts` — Removed static petal-drift discs | [src/vegetation.js:buildPetalDrifts(](../src/vegetation.js#L438) | [komorebi / game-drift](../labs/komorebi/js/recipes.js#L60) (direct) | **Inactive.** Method is a no-op. Its original lab tile is an empty baseline, not a shipped visible asset. |
| <a id="old-sakura-grove"></a>`old-sakura-grove` — Unused empty sakura-grove method | [src/vegetation.js:buildSakuraGrove(](../src/vegetation.js#L366) | **No mapped evidence** | **Inactive.** Empty legacy entry point; active sakura are built by sakuraTree(). |
| <a id="legacy-summit-gate"></a>`legacy-summit-gate` — Legacy rear summit gate, stairs, toro and gorinto | [src/mountaintop.js:buildLegacyRearGate(](../src/mountaintop.js#L446) | **No mapped evidence** | **Inactive.** Defined but not called by the current summit constructor. |
| <a id="legacy-vista-approach"></a>`legacy-vista-approach` — Unused vista descent and torii | [src/mountaintop.js:buildVistaApproach(](../src/mountaintop.js#L447) | **No mapped evidence** | **Inactive.** Defined but not called by the current summit constructor. |

## Source-module accounting

Every current `src/*.js` module is classified. Every class method declared with a `buildX` or `createX` name has an inventory owner or an explicit helper exclusion. Nonconforming entry points (trees, grass additions, scent, cosmetics and optional GLB loading) are mapped manually. New semantic objects added inside an existing method still require human review.

| Module | Role | Accounting |
|---|---|---|
| [src/ambient_life.js](../src/ambient_life.js) | assets | Koi, sparrows, guardian crows and butterflies. |
| [src/audio.js](../src/audio.js) | excluded | Procedural audio, outside visual asset scope. |
| [src/bootstrap.js](../src/bootstrap.js) | excluded | Boot loading and recovery. |
| [src/cad_overrides.js](../src/cad_overrides.js) | excluded | Optional arbitrary user-authored CAD overrides cannot have a finite core asset inventory. |
| [src/cat.js](../src/cat.js) | assets | Cat render assembly, accessories and cosmetics. |
| [src/cat_anatomy.js](../src/cat_anatomy.js) | support | SDF cat parts and proportions, owned by cat component rows. |
| [src/cat_motion.js](../src/cat_motion.js) | support | Pose and animation definitions for inventoried cats. |
| [src/cat_sdf.js](../src/cat_sdf.js) | support | Generic geometry/SDF engine; no independently placed asset. |
| [src/cat_shading.js](../src/cat_shading.js) | support | Materials and procedural coat/face painting, owned by cat component rows. |
| [src/collider_grid.js](../src/collider_grid.js) | excluded | Invisible collision acceleration. |
| [src/context_actions.js](../src/context_actions.js) | assets | Landing-dust pool; other actions control inventoried assets. |
| [src/controls.js](../src/controls.js) | excluded | Input handling. |
| [src/countryside.js](../src/countryside.js) | assets | Valley landscape, architecture, props and items. |
| [src/dialogue.js](../src/dialogue.js) | excluded | Dialogue text/interface. |
| [src/foliage.js](../src/foliage.js) | support | Reusable canopy geometry and textures, owned by tree rows. |
| [src/grass.js](../src/grass.js) | assets | Shipped procedural grass recipe families and fireflies. |
| [src/hidden_places.js](../src/hidden_places.js) | assets | Moon Pool and Lantern Glade. |
| [src/instanced_chunks.js](../src/instanced_chunks.js) | support | Rendering adapter for inventoried instanced geometry. |
| [src/interior.js](../src/interior.js) | assets | Tea-house interior and knockable props. |
| [src/main.js](../src/main.js) | assets | Character placement and orchestration; UI and journal text excluded. |
| [src/menus.js](../src/menus.js) | excluded | Menu/settings DOM. |
| [src/mountaintop.js](../src/mountaintop.js) | assets | Summit and vista; inventoried read only. |
| [src/music.js](../src/music.js) | excluded | Procedural music, outside visual asset scope. |
| [src/npc.js](../src/npc.js) | assets | Named cat instances; DOM names excluded. |
| [src/particles.js](../src/particles.js) | assets | Weather and ambient particles. |
| [src/player.js](../src/player.js) | assets | Michi and splash droplets. |
| [src/postfx.js](../src/postfx.js) | assets | Screen-space visual passes. |
| [src/progression.js](../src/progression.js) | excluded | XP/ranks and journal rewards; cosmetic bell meshes are inventoried in cat.js. |
| [src/quest.js](../src/quest.js) | excluded | Quest state and text rewards. |
| [src/save.js](../src/save.js) | excluded | Persistence. |
| [src/scent.js](../src/scent.js) | assets | Instanced scent-trail particles. |
| [src/settings.js](../src/settings.js) | excluded | Settings state. |
| [src/sky.js](../src/sky.js) | assets | Sky objects and lighting. |
| [src/textures.js](../src/textures.js) | support | Procedural material library; surfaces are mapped with their owning objects. |
| [src/ui.js](../src/ui.js) | excluded | HUD, prompts and photo/journal interface. |
| [src/vegetation.js](../src/vegetation.js) | assets | Trees, bamboo, ground cover and dappled light. |
| [src/waypoints.js](../src/waypoints.js) | excluded | Compass and waypoint interface. |

### Explained construction helpers

| Source | Reason |
|---|---|
| [src/cat.js:buildSkeleton(](../src/cat.js#L76) | Rigging helper; the rendered cat body and components are inventoried separately. |
| [src/cat.js:buildMaterials(](../src/cat.js#L80) | Material setup for the inventoried cat; not another object. |
| [src/countryside.js:createRiverUniforms(](../src/countryside.js#L1590) | Shader parameter state for the inventoried river/paddies, not another visible asset. |
| [src/npc.js:createNameTag(](../src/npc.js#L212) | DOM character label; interface is outside the visible world-asset inventory. |
| [src/main.js:buildJournalUI(](../src/main.js#L1700) | DOM journal interface; journal text rewards are not physical inventory objects. |
| [src/menus.js:buildSettings(](../src/menus.js#L140) | DOM settings interface, outside the world-asset scope. |
| [src/postfx.js:buildKernel(](../src/postfx.js#L176) | AO sampling-kernel data, not a second visual asset. |

## Scope exclusions and text-only rewards

- HUD, menus, dialogue text, journal-only keepsakes, audio/music, invisible colliders and simulation helpers.
- Lab-only proposals and Roof Road (a separate prototype, not loaded by the game).
- dawCAT, cadJS, OLD, arbitrary CAD overrides and per-instance procedural placements.
- Every individual texture, material, triangle, animation pose and shader helper; these belong to their owning asset types.

Narrative-only characters and journal/progression rewards are recorded separately below, outside the visual-asset denominator. The Guardian’s Feather, Golden Dango and Jade Paw have actual meshes and are inventoried above.

| Nonvisual entry | Source | Reason |
|---|---|---|
| Bokuchi, the forest spirit | [src/main.js](../src/main.js#L1849) | Named in Kuro’s dialogue; no separate Bokuchi actor or mesh is constructed. |
| Mist Charm | [src/context_actions.js](../src/context_actions.js#L690) | Journal/progression reward from touching the altar; no collectible mesh. |
| Bokuchi’s Blessing | [src/main.js](../src/main.js#L1920) | Journal/progression reward for the offering-bell quest; no separate item mesh. |
| The valley became home | [src/context_actions.js](../src/context_actions.js#L762) | Journal memory from a quiet moment; no physical item. |

Optional media and dormant code are recorded without claiming that a download succeeded or an unused builder is part of the current playable scene. The Roof Road retains its own prototype review and reachability checks.

## Keeping the claim current

1. Add or update an asset row when an authored visual type changes. Use a game-source declaration or unique construction anchor.
2. Map its actual specimen/bench/review definition. Keep invisible objects and analogous techniques at `related`; record missing coverage with an explanation.
3. Classify new source modules and account for new `buildX`/`createX` methods. Keep retired assets marked `inactive`.
4. Run `node tools/labs_coverage.mjs --write`, then `node tools/labs_coverage.mjs` and `node --test tools/labs_coverage_test.mjs`.

The checker validates source anchors, named specimen selectors (including the catalog’s dynamic IDs), target references, unique IDs, method accounting, classifications and report freshness. It does not render the specimens, prove geometric fidelity or verify game integration. Use the browser construction review for visual evidence.
