# Game asset inventory and lab coverage

Reviewed 2026-11-14. Generated from [asset_inventory.json](asset_inventory.json) by [labs_coverage.mjs](../tools/labs_coverage.mjs).

[Open the interactive Asset Library](../catalog/) — searchable originals, lab specimens, production notes, cadJS editing and AI plans.

## What can be claimed

The inventory accounts for **37 core source modules** and **112 build/create construction methods**, and for the Roof Road prototype (`rooftops/`) **58 modules**, **10 build/create/make functions** and **48 piece types**. It records **248 active asset types and assemblies**, plus **4 inactive entries**. **152 of 248 (61.3%) have a focused lab study.** Full individual specimen coverage is incomplete.

Authored visual asset types in the core src/ game, including valley, tea-house interior, summit, characters, physical items and visible effects, and in the Roof Road prototype (rooftops/, its own page; the game does not load it yet). Assemblies and separately recognizable parts are separate rows; procedural instances are not.

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
| Focused lab study | 152 | 61.3% |
| Review sheet | 77 | 31.0% |
| Embedded in a specimen | 6 | 2.4% |
| Related evidence only | 10 | 4.0% |
| No mapped evidence | 3 | 1.2% |

## Coverage by area

| Area | Active rows | Focused | Review | Embedded | Related | Missing |
|---|---:|---:|---:|---:|---:|---:|
| Characters | 9 | 8 | 1 | 0 | 0 | 0 |
| Cat components | 5 | 0 | 3 | 1 | 0 | 1 |
| Ground and water | 13 | 13 | 0 | 0 | 0 | 0 |
| Landscape | 7 | 7 | 0 | 0 | 0 | 0 |
| Buildings | 5 | 4 | 0 | 0 | 1 | 0 |
| Building components | 10 | 10 | 0 | 0 | 0 | 0 |
| Props | 12 | 12 | 0 | 0 | 0 | 0 |
| Shrine | 7 | 7 | 0 | 0 | 0 | 0 |
| Items | 8 | 8 | 0 | 0 | 0 | 0 |
| Vegetation | 22 | 15 | 6 | 0 | 1 | 0 |
| Effects | 2 | 1 | 0 | 0 | 1 | 0 |
| Hidden places | 16 | 15 | 0 | 1 | 0 | 0 |
| Interiors | 19 | 18 | 0 | 0 | 1 | 0 |
| Sky and effects | 19 | 13 | 0 | 0 | 4 | 2 |
| Summit | 32 | 21 | 9 | 0 | 2 | 0 |
| Roof Road | 62 | 0 | 58 | 4 | 0 | 0 |

## Gaps requiring focused specimens

This list includes every active row without a focused study, including review-only and embedded references. Related mappings are leads for future work, not proof of asset coverage.

| Asset | Current evidence | Limitation |
|---|---|---|
| [Michi (player cat)](#michi) | Review sheet | The sleep specimen uses Michi’s coat/build; it is a pose study rather than a dedicated player-model lab. |
| [Cat body, fur and tabby coats](#cat-coat) | Review sheet | No individual focused specimen is mapped. |
| [Cat nose, muzzle, whiskers, ears and painted eyes](#cat-face) | Review sheet | No individual focused specimen is mapped. |
| [Braided collar, bow and brass bell](#cat-collar) | Review sheet | No individual focused specimen is mapped. |
| [Master Cat gold and twin bells](#master-bells) | No mapped evidence | The ordinary collar is reviewed; no specimen explicitly enables setMasterCat(). |
| [Cat contact-shadow blob](#cat-shadow) | Embedded in a specimen | Visible with the complete cat; no isolated shadow study. |
| [Village street assembly](#village-street) | Related evidence only | Individual house references, not a specimen of the complete original street layout. |
| [Sakura trees](#sakura) | Review sheet | No individual focused specimen is mapped. |
| [Maple trees](#maples) | Review sheet | No individual focused specimen is mapped. |
| [Garden pines](#pines) | Review sheet | No individual focused specimen is mapped. |
| [Rim sakura, maple and pine leaf masses](#rim-trees) | Review sheet | No individual focused specimen is mapped. |
| [Tree trunks and limbs](#tree-trunks) | Review sheet | No individual focused specimen is mapped. |
| [Leaf sprays and clumped/mass canopy families](#tree-canopies) | Review sheet | No individual focused specimen is mapped. |
| [Roadside moss patches](#roadside-moss) | Related evidence only | The grass moss pillow differs from the roadside instanced tufts. |
| [River-bank grass fireflies](#grass-fireflies) | Related evidence only | Related hotaru study; not the GrassSystem particle shader. |
| [Moon Pool stone toro](#pool-toro) | Embedded in a specimen | No individual focused specimen is mapped. |
| [Courtyard stone lantern](#courtyard-toro) | Related evidence only | Different source builder; no courtyard lantern extraction. |
| [Sun, hemisphere, fill and bounce lighting](#sky-light) | Related evidence only | The baseline adapter hides the original lights; labs use their own rig. |
| [Valley god-ray cards](#god-rays) | Related evidence only | Sky-space rays are a different implementation from the game’s ground cards. |
| [Screen-space ambient occlusion](#ao) | No mapped evidence | Sky’s air-game baseline explicitly excludes the full game post-processing pipeline. |
| [Screen-space distance and height atmosphere](#atmosphere) | Related evidence only | Layered haze cards are not the game’s depth-buffer atmosphere pass. |
| [Painterly colour grading, vignette, grain and fringe](#grade) | Related evidence only | Related finish study; Kuwahara is not the game grade/grain/fringe pipeline. |
| [Summit meadow clearing](#summit-meadow) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit trees, back brush and brow stones](#summit-trees) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Meditation sun pool, motes and furin](#meditation-atmosphere) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Torii approach earthen shoulder](#summit-shoulder) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit flanks and basin landform](#summit-terrain) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit slope forest species](#slope-forest) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit cumulus and storm cloud banks](#summit-clouds) | Review sheet | The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |
| [Summit butterflies and fly-by birds](#summit-wildlife) | Related evidence only | Umbrella row: it builds nothing itself; the butterflies and birds are the specimens. Umbrella row: it builds nothing itself; the butterflies and birds are the specimens. |
| [Summit biome grass field](#summit-grass) | Review sheet | Same GrassSystem recipes, but no specimen of the summit’s field layout. |
| [Layered Kyoto Bay vista assembly](#summit-vista) | Related evidence only | The specimen builds the kit city layer; the assembly itself (layers, clouds, deferred ids) is only reviewed whole on the summit preview. |
| [Optional summit transition video](#summit-transition) | No mapped evidence | Optional runtime transition media, outside the lab specimen set; availability is not checked. |
| [Optional Blender Kyoto roofscape GLB](#blender-roofscape) | Review sheet | Optional runtime asset with fallback; availability is not verified by this source audit. |
| [Roof Road street ribbons: Kamo gravel and river, canal bank, market slabs, cobbled lanes](#roof-street) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road river steps down from the bridge](#roof-river-steps) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road Sanjō bridge: riverbed, deck joinery, piers, giboshi caps, ramp](#roof-bridge) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road kido gate](#roof-kido) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road machiya (walls, roof, drying deck, lanterns, dressing)](#roof-machiya) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road kura storehouse](#roof-kura) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road corner house with hip roof and drying deck](#roof-corner-house) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road komayose rails](#roof-komayose) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road inuyarai](#roof-inuyarai) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road roji side alley (drain, tobi-ishi, tsukubai, service door)](#roof-roji) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road tsuboniwa tree over a wall](#roof-tsuboniwa) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road yuka decks and kaisho plank](#roof-yuka) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road engawa, shop awnings and alley bridges](#roof-balconies) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road lantern post with red chōchin](#roof-lantern-post) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road crates](#roof-crates) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road barrels](#roof-barrels) | Review sheet | One builder serves the barrel and komodaru piece types. |
| [Roof Road komodaru (straw-wrapped sake casks)](#roof-komodaru) | Review sheet | One builder serves the barrel and komodaru piece types. |
| [Roof Road zushi tunnels under bridged machiya](#roof-zushi) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road alley pockets (flags, casks, ita-bei, shed eave)](#roof-alley-pockets) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road alley routes through the downtown blocks](#roof-alley-routes) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road utility poles and wires](#roof-utility-poles) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road vine trellises](#roof-trellises) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road Takase canal water and towpath](#roof-canal) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road canal banks (stakes, drains, rain chains, greenery)](#roof-canal-banks) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road stepping stones](#roof-stepping-stones) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road canal landings](#roof-canal-landings) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road canal footbridge](#roof-footbridge) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road stone tōrō](#roof-toro) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road cherry boughs over the canal](#roof-cherry-boughs) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road takasebune (hull, bales, planks, wake)](#roof-takasebune) | Review sheet | Moves along the canal on the run; the boatman is its own row (roof-boatman). |
| [Roof Road Nishiki glass canopy](#roof-canopy) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road canopy vents](#roof-canopy-vents) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road Nishiki market stalls](#roof-market-stalls) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road skylight bridge (market crossing)](#roof-skylight-bridge) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road laundry, tow and lantern lines](#roof-lines) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road rooftop cistern](#roof-cistern) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road chimney and rain cap](#roof-chimney) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road futon racks](#roof-futon-racks) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road canal willows](#roof-willows) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road culvert ledges](#roof-culvert-ledges) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road Tenmangū gate](#roof-tenmangu-gate) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road yatai festival stalls](#roof-yatai) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road festival lantern racks](#roof-lantern-racks) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road hoko float (wheels, brocade, roof, shingi mast, tassels)](#roof-hoko) | Review sheet | The hayashi musicians on it are their own row (roof-hayashi). |
| [Roof Road temple gate](#roof-temple-gate) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road tsuiji temple wall](#roof-tsuiji) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road yama float](#roof-yama) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road villagers](#roof-villagers) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road kawara roofs: hira and tsuma roofs with ridge caps and onigawara](#roof-kawara-roofs) | Embedded in a specimen | Shared by several piece types; a kit roof replaces it through those pieces. Inside the machiya specimen (and the kura, kido, temple gate and hoko float); no roof specimen of its own. |
| [Roof Road machiya façades and eave details](#roof-facades) | Embedded in a specimen | Shared by the machiya and the downtown kit. Inside the machiya specimen; no façade specimen of its own. |
| [Roof Road ground plane under the run](#roof-ground) | Review sheet | Built by buildWorld() around the run, not from a level piece; routed through assets.build('roof-ground', extraLayout(…)). |
| [Roof Road distant city (instanced roofscape)](#roof-distant-city) | Review sheet | Built by buildWorld() around the run; routed through assets.build('roof-distant-city', extraLayout(…)). |
| [Roof Road skyline pagodas](#roof-skyline-pagodas) | Review sheet | Three, built by buildWorld() around the run; each routed through assets.build('roof-skyline-pagodas', extraLayout(…)). |
| [Roof Road sky dome, clouds and moon (afternoon to festival night)](#roof-sky) | Review sheet | Driven by route progress, not a clock. |
| [Roof Road ring of hills around the basin](#roof-hills) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road Okuribi: the five fires on the hills](#roof-okuribi) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road atmosphere: petals, chimney smoke, birds, dust, fireflies, landing bursts](#roof-atmosphere) | Review sheet | No individual focused specimen is mapped. |
| [Roof Road clay Shōki (the seven guardians)](#roof-shoki) | Review sheet | Built by buildWorld() for each level pickup; routed through assets.build('roof-shoki', extraLayout(…)), the instance registered as the pickup. |
| [Roof Road treats](#roof-treats) | Review sheet | Built by buildWorld() for each level pickup; routed through assets.build('roof-treats', extraLayout(…)), the instance registered as the pickup. |
| [Chidori, the Roof Road guide cat](#roof-chidori) | Review sheet | The game’s Cat with Chidori’s coat (decision D3: no PERSONALITIES entry); no specimen of her own. |
| [Roof Road takasebune boatman](#roof-boatman) | Embedded in a specimen | Poles the takasebune in the boat specimen; no specimen of his own. |
| [Roof Road hayashi musicians on the hoko](#roof-hayashi) | Embedded in a specimen | Ride the hoko in the float specimen; no specimen of their own. |

## Inventory and individual evidence

Source links resolve to declarations or recognizable construction anchors. Evidence links resolve to the actual specimen definition, bench or review code. Dynamic specimen IDs (for example `original-secret` and `orig-tower`) link to their generating definitions.

### Characters

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="michi"></a>`michi` — Michi (player cat) | [src/player.js:this.mesh.name = 'Player Character (Michi)'](../src/player.js#L32)<br>[src/cat.js:buildCoat(](../src/cat.js#L88) | [cat / anatomy](../tools/cat_preview.js#L128) (review)<br>[villagers / sleep](../labs/villagers/js/recipes.js#L60) (embedded) — The sleep specimen uses Michi’s coat/build; it is a pose study rather than a dedicated player-model lab. |  |
| <a id="luna"></a>`luna` — Luna | [src/main.js:'Luna',](../src/main.js#L318)<br>[src/npc.js:export class NPC](../src/npc.js#L28) | [villagers / luna](../labs/villagers/js/recipes.js#L39) (direct) |  |
| <a id="mochi"></a>`mochi` — Mochi | [src/main.js:'Mochi',](../src/main.js#L342)<br>[src/npc.js:export class NPC](../src/npc.js#L28) | [villagers / mochi](../labs/villagers/js/recipes.js#L43) (direct) |  |
| <a id="kuro"></a>`kuro` — Kuro | [src/main.js:'Kuro',](../src/main.js#L357)<br>[src/npc.js:export class NPC](../src/npc.js#L28) | [villagers / kuro](../labs/villagers/js/recipes.js#L47) (direct) |  |
| <a id="larry"></a>`larry` — Larry the turtle | [src/countryside.js:turtle.name = 'Turtle Guardian (Larry)'](../src/countryside.js#L3451) | [critters / larry](../labs/critters/js/recipes.js#L55) (direct) |  |
| <a id="guardian-crows"></a>`guardian-crows` — Nest guardian crows | [src/ambient_life.js:buildGuardianBirds(](../src/ambient_life.js#L221) | [critters / guardian-crow](../labs/critters/js/recipes.js#L51) (direct) |  |
| <a id="sparrows"></a>`sparrows` — Valley sparrows | [src/ambient_life.js:buildBirds(](../src/ambient_life.js#L160) | [critters / game-bird](../labs/critters/js/recipes.js#L43) (direct)<br>[critters / flock](../labs/critters/js/recipes.js#L47) (direct) |  |
| <a id="koi"></a>`koi` — River koi (procedural coat variants) | [src/ambient_life.js:buildKoi(](../src/ambient_life.js#L637) | [critters / game-koi](../labs/critters/js/recipes.js#L33) (direct) | Repeated koi and randomized markings are instances of this type, not additional inventory rows. |
| <a id="butterflies"></a>`butterflies` — Valley butterflies | [src/ambient_life.js:buildButterflies(](../src/ambient_life.js#L415) | [critters / game-flutter](../labs/critters/js/recipes.js#L59) (direct)<br>[critters / hinge](../labs/critters/js/recipes.js#L63) (direct) |  |

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
| <a id="bridge"></a>`bridge` — Kiyomizu bridge, ramps and walkable rails | [src/countryside.js:bridge.name = 'Kiyomizu Bridge'](../src/countryside.js#L1492) | [water / b-game](../labs/water/js/variants.js#L232) (direct)<br>[water / b-sanjo](../labs/water/js/variants.js#L241) (direct) — Promoted as the kit bridge on the classic platforms (src/kit/water/bridge.js). |  |
| <a id="paddies"></a>`paddies` — Rice-paddy water | [src/countryside.js:buildPaddies(](../src/countryside.js#L1072)<br>[src/countryside.js:createPaddyWaterMaterial(](../src/countryside.js#L1612) | [water / p-game](../labs/water/js/variants.js#L312) (direct)<br>[water / p-mirror](../labs/water/js/variants.js#L321) (direct)<br>[water / p-taue](../labs/water/js/variants.js#L330) (direct)<br>[water / p-summer](../labs/water/js/variants.js#L340) (direct)<br>[water / p-autumn](../labs/water/js/variants.js#L350) (direct)<br>[water / p-winter](../labs/water/js/variants.js#L371) (direct) |  |
| <a id="paddy-bunds"></a>`paddy-bunds` — Paddy beds and raised banks | [src/countryside.js:Paddy Ridge](../src/countryside.js#L1149) | [water / p-aze](../labs/water/js/variants.js#L360) (direct)<br>[water / p-game](../labs/water/js/variants.js#L312) (embedded) |  |
| <a id="rice"></a>`rice` — Rice stalks | [src/countryside.js:rice.name = 'Rice Stalks'](../src/countryside.js#L1173) | [water / p-summer](../labs/water/js/variants.js#L340) (direct)<br>[water / p-autumn](../labs/water/js/variants.js#L350) (direct)<br>[water / p-taue](../labs/water/js/variants.js#L330) (direct) |  |
| <a id="water-ripples"></a>`water-ripples` — Cat and koi ripple rings | [src/countryside.js:buildRipplePool(](../src/countryside.js#L893) | [water / ripple](../labs/water/js/variants.js#L120) (direct) — Technique study; not a replay of the game ripple-pool logic. |  |
| <a id="rain-ripples"></a>`rain-ripples` — Separate raindrop ripple pool | [src/countryside.js:buildRainRipplePool(](../src/countryside.js#L930) | [weather / splash](../labs/weather/js/recipes.js#L64) (direct) — Rain impact study; original pool eviction behavior is not tested. |  |

### Landscape

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="mountains"></a>`mountains` — Valley mountain terrain and ridges | [src/countryside.js:buildMountains(](../src/countryside.js#L4043) | [ranges / stack](../labs/ranges/js/main.js#L144) (direct) |  |
| <a id="edge-forest"></a>`edge-forest` — Edge-forest broadleaf tree wall | [src/countryside.js:buildEdgeForest(](../src/countryside.js#L4256) | [ranges / wall-mass](../labs/ranges/js/main.js#L157) (direct) |  |
| <a id="edge-undergrowth"></a>`edge-undergrowth` — Edge shrubs and shrine corridor thicket | [src/countryside.js:buildEdgeUndergrowth(](../src/countryside.js#L4428) | [ranges / edge](../labs/ranges/js/main.js#L193) (direct) |  |
| <a id="foothill-forest"></a>`foothill-forest` — Foothill cedars and broadleaf crowns | [src/countryside.js:buildFoothillForest(](../src/countryside.js#L4661) | [ranges / foothill-stands](../labs/ranges/js/main.js#L280) (direct)<br>[ranges / foothills](../labs/ranges/js/main.js#L31) (embedded) — The hero valley includes the foothill carpet; there is no separate shelf specimen. |  |
| <a id="distant-village"></a>`distant-village` — Distant valley village houses and hearth windows | [src/countryside.js:buildVillage(](../src/countryside.js#L4576) | [ranges / village](../labs/ranges/js/main.js#L287) (direct)<br>[machiya / original-village](../labs/machiya/js/variants.js#L63) (related) — The street-house builder differs from buildVillage() distant silhouettes. |  |
| <a id="mist-ring"></a>`mist-ring` — Valley mist ring | [src/countryside.js:buildMistRing(](../src/countryside.js#L4757) | [ranges / mists](../labs/ranges/js/main.js#L298) (direct)<br>[ranges / air](../labs/ranges/js/main.js#L211) (related) — Aerial perspective bench; it does not extract the original mist-ring mesh. |  |
| <a id="dawn-mist"></a>`dawn-mist` — River dawn mist ribbons | [src/countryside.js:buildDawnMist(](../src/countryside.js#L4800) | [ranges / mists](../labs/ranges/js/main.js#L298) (direct)<br>[ranges / air](../labs/ranges/js/main.js#L211) (related) — General haze study; no dawn-river specimen or time envelope. |  |

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
| <a id="namako"></a>`namako` — Namako skirt walls | [src/countryside.js:// Namako-kabe skirt](../src/countryside.js#L98) | [machiya / namako-original](../labs/machiya/js/variants.js#L108) (direct) |  |
| <a id="tea-bench"></a>`tea-bench` — Tea-house bench and mosen cushion | [src/countryside.js:// Front Chamise Tea Bench](../src/countryside.js#L2290) | [machiya / bench-original](../labs/machiya/js/variants.js#L110) (direct) |  |
| <a id="secret-door"></a>`secret-door` — Secret sliding door | [src/countryside.js:slidingDoor.name = 'Secret Sliding Door'](../src/countryside.js#L2663) | [machiya / door-original](../labs/machiya/js/variants.js#L112) (direct) |  |
| <a id="lock-plate"></a>`lock-plate` — Antique brass padlock emblem | [src/countryside.js:this.lockPlate.name = 'Brass Lock Plate'](../src/countryside.js#L2679) | [machiya / lock-original](../labs/machiya/js/variants.js#L114) (direct) |  |

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
| <a id="offering-box"></a>`offering-box` — Saisen-bako offering box | [src/countryside.js:// Saisen-bako wooden offering box](../src/countryside.js#L3993) | [shrine / saisen-bako](../labs/shrine/js/recipes.js#L453) (direct) |  |
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
| <a id="sakura"></a>`sakura` — Sakura trees | [src/vegetation.js:sakuraTree(](../src/vegetation.js#L357) | [tree / hero](../tools/tree_preview.js#L97) (review) |  |
| <a id="maples"></a>`maples` — Maple trees | [src/vegetation.js:mapleTree(](../src/vegetation.js#L708)<br>[src/vegetation.js:buildMaplesAndPines(](../src/vegetation.js#L737) | [tree / hero](../tools/tree_preview.js#L97) (review) |  |
| <a id="pines"></a>`pines` — Garden pines | [src/vegetation.js:pineTree(](../src/vegetation.js#L722) | [tree / hero](../tools/tree_preview.js#L97) (review) |  |
| <a id="rim-trees"></a>`rim-trees` — Rim sakura, maple and pine leaf masses | [src/vegetation.js:treeStyle(](../src/vegetation.js#L184)<br>[src/vegetation.js:canopyTree(](../src/vegetation.js#L211) | [tree / rim](../tools/tree_preview.js#L104) (review) |  |
| <a id="tree-trunks"></a>`tree-trunks` — Tree trunks and limbs | [src/vegetation.js:trunkMesh(](../src/vegetation.js#L334) | [tree / detail](../tools/tree_preview.js#L128) (review) |  |
| <a id="tree-canopies"></a>`tree-canopies` — Leaf sprays and clumped/mass canopy families | [src/foliage.js:export function buildCanopy](../src/foliage.js#L1172) | [tree / compare](../tools/tree_preview.js#L118) (review) |  |
| <a id="bamboo-groves"></a>`bamboo-groves` — Bamboo groves, culms and leaves | [src/vegetation.js:buildBambooGrove(](../src/vegetation.js#L467) | [greenery / game-grove](../labs/greenery/js/recipes.js#L54) (direct)<br>[greenery / nodes](../labs/greenery/js/recipes.js#L33) (direct)<br>[greenery / leaves](../labs/greenery/js/recipes.js#L58) (direct) |  |
| <a id="street-bushes"></a>`street-bushes` — Street bushes | [src/countryside.js:buildStreetBushes(](../src/countryside.js#L3070) | [greenery / game-bush](../labs/greenery/js/recipes.js#L75) (direct) |  |
| <a id="roadside-moss"></a>`roadside-moss` — Roadside moss patches | [src/countryside.js:buildStreetGreenery(](../src/countryside.js#L3153) | [grass / moss](../labs/grass/js/types_wild.js#L375) (related) — The grass moss pillow differs from the roadside instanced tufts. |  |
| <a id="meadow-system"></a>`meadow-system` — Valley biome layout and grass LOD rings | [src/vegetation.js:buildMeadow(](../src/vegetation.js#L758)<br>[src/grass.js:addRing(](../src/grass.js#L1523)<br>[src/grass.js:addZone(](../src/grass.js#L1532) | [grass / ring-lod](../labs/grass/js/types_field.js#L273) (direct) | The meadow’s collider-derived biome layout has no isolated original specimen; Ring LOD studies the shared layout technique. |
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
| <a id="dappled-light"></a>`dappled-light` — Projected dappled light pools | [src/vegetation.js:buildDappledLight(](../src/vegetation.js#L382) | [komorebi / game-dapple](../labs/komorebi/js/recipes.js#L35) (direct) |  |

### Hidden places

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="moon-pool"></a>`moon-pool` — Moon Pool assembly | [src/hidden_places.js:buildMoonPool(](../src/hidden_places.js#L157) | [moonpool / game-water](../labs/moonpool/js/recipes.js#L177) (direct) |  |
| <a id="pool-apron"></a>`pool-apron` — Moon Pool mossy apron | [src/hidden_places.js:// Mossy ground apron](../src/hidden_places.js#L296) | [moonpool / apron-moss](../labs/moonpool/js/ground.js#L109) (direct) |  |
| <a id="pool-water"></a>`pool-water` — Moon Pool water and caustic layer | [src/hidden_places.js:// The water: a deep](../src/hidden_places.js#L324) | [moonpool / game-water](../labs/moonpool/js/recipes.js#L177) (direct) |  |
| <a id="pool-moon"></a>`pool-moon` — Moon reflection disc | [src/hidden_places.js:// Moon pooled on the water](../src/hidden_places.js#L364) | [moonpool / game-moon](../labs/moonpool/js/recipes.js#L217) (direct) |  |
| <a id="pool-rim"></a>`pool-rim` — Pool rim stones | [src/hidden_places.js:// Rim stones](../src/hidden_places.js#L379) | [moonpool / rim-chisel](../labs/moonpool/js/ground.js#L113) (direct) |  |
| <a id="lily-pads"></a>`lily-pads` — Lily pads | [src/hidden_places.js:// Lily pads](../src/hidden_places.js#L254) | [moonpool / game-pad](../labs/moonpool/js/recipes.js#L231) (direct) |  |
| <a id="lotus"></a>`lotus` — Lotus blossoms | [src/hidden_places.js:// Lily pads](../src/hidden_places.js#L254) | [moonpool / lotus](../labs/moonpool/js/recipes.js#L239) (direct) |  |
| <a id="pool-seat"></a>`pool-seat` — Pool sitting stone | [src/hidden_places.js:// Flat sitting stone](../src/hidden_places.js#L412) | [moonpool / seat-slab](../labs/moonpool/js/ground.js#L117) (direct) |  |
| <a id="pool-toro"></a>`pool-toro` — Moon Pool stone toro | [src/hidden_places.js:// A little stone toro](../src/hidden_places.js#L425) | [moonpool / game-water](../labs/moonpool/js/recipes.js#L177) (embedded) |  |
| <a id="pool-motes"></a>`pool-motes` — Moon Pool rising motes | [src/hidden_places.js:// Motes lifting off](../src/hidden_places.js#L451) | [moonpool / game-motes](../labs/moonpool/js/recipes.js#L263) (direct) |  |
| <a id="lantern-glade"></a>`lantern-glade` — Lantern Glade complete clearing | [src/hidden_places.js:buildLanternGlade(](../src/hidden_places.js#L486) | [moonpool / glade-whole](../labs/moonpool/js/ground.js#L138) (direct)<br>[moonpool / game-lamp](../labs/moonpool/js/recipes.js#L245) (related) — The original tile extracts a lantern, not the complete clearing. |  |
| <a id="glade-floor"></a>`glade-floor` — Glade leaf-litter ground | [src/hidden_places.js:// Leaf-litter floor](../src/hidden_places.js#L617) | [moonpool / glade-litter](../labs/moonpool/js/ground.js#L121) (direct) |  |
| <a id="glade-bamboo"></a>`glade-bamboo` — Glade bamboo ring and drooping leaves | [src/hidden_places.js:stalks.name = 'Glade Bamboo'](../src/hidden_places.js#L663) | [moonpool / bamboo-nodes](../labs/moonpool/js/ground.js#L125) (direct)<br>[greenery / game-grove](../labs/greenery/js/recipes.js#L54) (related) — Vegetation.buildBambooGrove differs from the hidden-place bamboo. |  |
| <a id="glade-lanterns"></a>`glade-lanterns` — Glade paper lanterns and glow | [src/hidden_places.js:// Paper lanterns strung](../src/hidden_places.js#L599) | [moonpool / game-lamp](../labs/moonpool/js/recipes.js#L245) (direct) |  |
| <a id="glade-seat"></a>`glade-seat` — Glade seat and mossy central boulder | [src/hidden_places.js:// A flat sitting stone](../src/hidden_places.js#L737) | [moonpool / boulder-moss](../labs/moonpool/js/ground.js#L129) (direct)<br>[rocks / moss-old](../labs/rocks/js/recipes.js#L67) (related) — Related stone finish, without the glade objects. |  |
| <a id="glade-fireflies"></a>`glade-fireflies` — Glade fireflies | [src/hidden_places.js:// Fireflies that gather](../src/hidden_places.js#L759) | [moonpool / fireflies](../labs/moonpool/js/recipes.js#L267) (direct) |  |

### Interiors

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="tea-interior"></a>`tea-interior` — Tea-house interior assembly | [src/interior.js:buildInterior(](../src/interior.js#L321) | [interiors / garden](../labs/interiors/js/data.js#L24) (direct) — A redesigned room study, not the original InteriorManager builder. |  |
| <a id="tatami"></a>`tatami` — Eight-mat tatami floor and borders | [src/interior.js:floor.name = 'Tatami Floor'](../src/interior.js#L474) | [interiors / tatami](../labs/interiors/js/craft.js#L5) (direct) |  |
| <a id="interior-frame"></a>`interior-frame` — Interior walls, timber posts and ceiling beams | [src/interior.js:// Ceiling beams & panel](../src/interior.js#L503) | [interiors / frame](../labs/interiors/js/specimens.js#L14) (direct) |  |
| <a id="shoji-doors"></a>`shoji-doors` — Entrance and exit shoji doors | [src/interior.js:exitDoor.name = 'Exit Door'](../src/interior.js#L661) | [interiors / shoji](../labs/interiors/js/craft.js#L6) (direct) |  |
| <a id="tokonoma"></a>`tokonoma` — Tokonoma alcove | [src/interior.js:toko.name = 'Tokonoma Alcove'](../src/interior.js#L411) | [interiors / tokonoma](../labs/interiors/js/specimens.js#L30) (direct) |  |
| <a id="scroll"></a>`scroll` — Kakejiku hanging scroll | [src/interior.js:// Hanging Scroll](../src/interior.js#L519) | [interiors / scroll](../labs/interiors/js/specimens.js#L45) (direct) |  |
| <a id="bonsai"></a>`bonsai` — Tokonoma bonsai pine | [src/interior.js:// Mini Bonsai Pine](../src/interior.js#L527) | [interiors / bonsai](../labs/interiors/js/specimens.js#L94) (direct) |  |
| <a id="chabudai"></a>`chabudai` — Chabudai low table | [src/interior.js:table.name = 'Chabudai Table'](../src/interior.js#L422) | [interiors / chabudai](../labs/interiors/js/specimens.js#L63) (direct) |  |
| <a id="teaware"></a>`teaware` — Ceramic teapot and yunomi cups | [src/interior.js:// Ceramic Teapot & Yunomi Cups](../src/interior.js#L571) | [interiors / pottery](../labs/interiors/js/craft.js#L7) (direct) |  |
| <a id="zabuton"></a>`zabuton` — Zabuton nap bed and embroidered tassels | [src/interior.js:bed.name = 'Zabuton Nap Bed'](../src/interior.js#L605) | [interiors / zabuton](../labs/interiors/js/specimens.js#L78) (direct) |  |
| <a id="andon"></a>`andon` — Andon paper floor lantern | [src/interior.js:andon.name = 'Andon Lantern'](../src/interior.js#L621) | [lanterns / andon](../labs/lanterns/js/recipes.js#L92) (direct) |  |
| <a id="courtyard-gravel"></a>`courtyard-gravel` — Courtyard rock-garden gravel | [src/interior.js:// Courtyard rock garden gravel](../src/interior.js#L631) | [rocks / rake](../labs/rocks/js/recipes.js#L71) (direct) |  |
| <a id="courtyard-toro"></a>`courtyard-toro` — Courtyard stone lantern | [src/interior.js:toro.name = 'Courtyard Toro Lantern'](../src/interior.js#L640) | [lanterns / game-toro](../labs/lanterns/js/recipes.js#L34) (related) — Different source builder; no courtyard lantern extraction. |  |
| <a id="courtyard-wall"></a>`courtyard-wall` — Courtyard boundary timber wall | [src/interior.js:// Courtyard outer timber wall](../src/interior.js#L651) | [interiors / courtyard-wall](../labs/interiors/js/specimens_b.js#L11) (direct) |  |
| <a id="knockables"></a>`knockables` — Three tabletop knockables (white cup, blue bowl, white sphere) | [src/interior.js:buildKnockables(](../src/interior.js#L219) | [interiors / pottery](../labs/interiors/js/craft.js#L7) (related) — Vessel geometry is studied; these three original items are not specimens.<br>[interiors / bat-cup](../labs/interiors/js/cat.js#L53) (related) — Lab physics supports batting lab vessels; original item geometry and physics differ.<br>[interiors / knockables](../labs/interiors/js/specimens.js#L112) (direct) |  |
| <a id="secret-tatami"></a>`secret-tatami` — Secret-house tatami | [src/countryside.js:tatamiFloor.name = 'Tatami Floor'](../src/countryside.js#L2568) | [interiors / secret-tatami](../labs/interiors/js/specimens_b.js#L27) (direct)<br>[machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |
| <a id="secret-table"></a>`secret-table` — Secret-house table and teaware | [src/countryside.js:table.name = 'Chabudai Table'](../src/countryside.js#L2589) | [interiors / secret-table](../labs/interiors/js/specimens_b.js#L45) (direct)<br>[machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |
| <a id="secret-bed"></a>`secret-bed` — Secret-house nap cushion | [src/countryside.js:// Gold embroidery tassels](../src/countryside.js#L2638) | [interiors / secret-bed](../labs/interiors/js/specimens_b.js#L62) (direct)<br>[machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |
| <a id="secret-andon"></a>`secret-andon` — Secret-house andon | [src/countryside.js:andon.name = 'Andon Lantern'](../src/countryside.js#L2650) | [interiors / secret-andon](../labs/interiors/js/specimens_b.js#L78) (direct)<br>[machiya / original-secret](../labs/machiya/js/variants.js#L63) (embedded) |  |

### Sky and effects

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="sky-dome"></a>`sky-dome` — Sky dome and day/night palette | [src/sky.js:buildDome(](../src/sky.js#L222) | [sky / sky-game](../labs/sky/js/data.js#L33) (direct) |  |
| <a id="clouds"></a>`clouds` — Painted cloud sprites | [src/sky.js:buildClouds(](../src/sky.js#L273)<br>[src/sky.js:buildCloudTexture(](../src/sky.js#L233) | [sky / cloud-game](../labs/sky/js/data.js#L40) (direct)<br>[sky / cloud-field](../labs/sky/js/data.js#L41) (direct) — The kit deck promotes this thickness painting (slab slices, four-genus field) and the shade-soft projection. |  |
| <a id="stars"></a>`stars` — Twinkling stars | [src/sky.js:buildStars(](../src/sky.js#L315) | [sky / sky-night](../labs/sky/js/data.js#L37) (embedded)<br>[sky / night-stars](../labs/sky/js/data.js#L65) (direct) |  |
| <a id="moon"></a>`moon` — Crescent moon | [src/sky.js:buildMoon(](../src/sky.js#L374) | [sky / sky-night](../labs/sky/js/data.js#L37) (embedded)<br>[sky / night-moon](../labs/sky/js/data.js#L66) (direct) |  |
| <a id="sky-light"></a>`sky-light` — Sun, hemisphere, fill and bounce lighting | [src/sky.js:buildLights(](../src/sky.js#L403)<br>[src/sky.js:buildPalettes(](../src/sky.js#L445) | [sky / sky-game](../labs/sky/js/data.js#L33) (related) — The baseline adapter hides the original lights; labs use their own rig. |  |
| <a id="god-rays"></a>`god-rays` — Valley god-ray cards | [src/particles.js:buildGodRays(](../src/particles.js#L127) | [sky / air-rays](../labs/sky/js/data.js#L60) (related) — Sky-space rays are a different implementation from the game’s ground cards. |  |
| <a id="rain"></a>`rain` — Valley rain streaks | [src/particles.js:buildRain(](../src/particles.js#L215) | [weather / game-rain](../labs/weather/js/recipes.js#L56) (direct) |  |
| <a id="river-petals"></a>`river-petals` — River petal rafts | [src/particles.js:buildRiverPetals(](../src/particles.js#L302) | [water / hanaikada](../labs/water/js/variants.js#L198) (direct) |  |
| <a id="falling-petals"></a>`falling-petals` — Falling sakura petals | [src/particles.js:buildPetals(](../src/particles.js#L371) | [weather / game-petal](../labs/weather/js/recipes.js#L82) (direct) |  |
| <a id="fireflies"></a>`fireflies` — Ambient valley fireflies | [src/particles.js:buildFireflies(](../src/particles.js#L411) | [weather / fireflies](../labs/weather/js/recipes.js#L90) (direct)<br>[moonpool / fireflies](../labs/moonpool/js/recipes.js#L267) (related) — Related firefly study; not Particles.buildFireflies(). |  |
| <a id="dust-motes"></a>`dust-motes` — Ambient dust motes | [src/particles.js:buildMotes(](../src/particles.js#L455) | [weather / dust-motes](../labs/weather/js/recipes.js#L94) (direct)<br>[moonpool / game-motes](../labs/moonpool/js/recipes.js#L263) (related) — Moon Pool motes are a separate system. |  |
| <a id="snow"></a>`snow` — Valley snowfall | [src/particles.js:buildSnow(](../src/particles.js#L510) | [weather / game-snow](../labs/weather/js/recipes.js#L73) (direct) |  |
| <a id="scent"></a>`scent` — Scent-trail glowing particles | [src/scent.js:build() {](../src/scent.js#L33) | [weather / scent](../labs/weather/js/recipes.js#L98) (direct) |  |
| <a id="splash"></a>`splash` — Player water-entry splash droplets | [src/player.js:// Water-splash droplet pool](../src/player.js#L97) | [weather / entry-splash](../labs/weather/js/recipes.js#L106) (direct)<br>[weather / splash](../labs/weather/js/recipes.js#L64) (related) — Rain impacts do not exercise the player water-entry splash. |  |
| <a id="landing-dust"></a>`landing-dust` — Landing dust puffs | [src/context_actions.js:spawnLandDust(](../src/context_actions.js#L832) | [weather / landing-dust](../labs/weather/js/recipes.js#L102) (direct) |  |
| <a id="ao"></a>`ao` — Screen-space ambient occlusion | [src/postfx.js:export class AOPass](../src/postfx.js#L142) | **No mapped evidence** | Sky’s air-game baseline explicitly excludes the full game post-processing pipeline. |
| <a id="atmosphere"></a>`atmosphere` — Screen-space distance and height atmosphere | [src/postfx.js:export class AtmospherePass](../src/postfx.js#L377) | [summit / haze](../labs/summit/js/recipes.js#L114) (related) — Layered haze cards are not the game’s depth-buffer atmosphere pass. |  |
| <a id="grade"></a>`grade` — Painterly colour grading, vignette, grain and fringe | [src/postfx.js:export const GradeShader](../src/postfx.js#L551)<br>[src/postfx.js:export const GradeOutputShader](../src/postfx.js#L632) | [ground / kuwahara](../labs/ground/js/variants.js#L252) (related) — Related finish study; Kuwahara is not the game grade/grain/fringe pipeline. |  |
| <a id="summit-transition"></a>`summit-transition` — Optional summit transition video | [src/mountaintop.js:const SUMMIT_VIDEO_SRC =](../src/mountaintop.js#L26) | **No mapped evidence** | Optional runtime transition media, outside the lab specimen set; availability is not checked. |

### Summit

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="summit-meadow"></a>`summit-meadow` — Summit meadow clearing | [src/mountaintop.js:buildMeadow(](../src/mountaintop.js#L444) | [summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-entry"></a>`summit-entry` — Summit approach steps, landing and entrance torii | [src/mountaintop.js:buildStepsAndGate(](../src/mountaintop.js#L445) | [summit / c-entry](../labs/summit/js/recipes.js#L106) (direct)<br>[summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-trees"></a>`summit-trees` — Summit trees, back brush and brow stones | [src/mountaintop.js:buildRocksAndTrees(](../src/mountaintop.js#L456) | [summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="meditation-stone"></a>`meditation-stone` — Meditation stone, enso and approach stones | [src/mountaintop.js:buildMeditationStone(](../src/mountaintop.js#L448) | [summit / c-stone](../labs/summit/js/recipes.js#L94) (direct)<br>[summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="meditation-atmosphere"></a>`meditation-atmosphere` — Meditation sun pool, motes and furin | [src/mountaintop.js:buildMeditationAtmosphere(](../src/mountaintop.js#L450) | [summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-shoulder"></a>`summit-shoulder` — Torii approach earthen shoulder | [src/mountaintop.js:buildApproachShoulder(](../src/mountaintop.js#L437) | [summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-path"></a>`summit-path` — Lower stone path, stones and lanterns | [src/mountaintop.js:buildLowerPath(](../src/mountaintop.js#L451) | [summit / c-path](../labs/summit/js/recipes.js#L110) (direct)<br>[summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-terrain"></a>`summit-terrain` — Summit flanks and basin landform | [src/mountaintop.js:buildSummitTerrain(](../src/mountaintop.js#L439) | [summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="vista-terrain"></a>`vista-terrain` — Vista Yodo River and road ribbons | [src/mountaintop.js:buildVistaTerrain(](../src/mountaintop.js#L463) | [summit / v-ribbons](../labs/summit/js/vista.js#L45) (direct) |  |
| <a id="summit-pagoda"></a>`summit-pagoda` — Higashiyama pagoda and evening lanterns | [src/mountaintop.js:buildKyotoPagoda(](../src/mountaintop.js#L465) | [summit / v-pagoda](../labs/summit/js/vista.js#L49) (direct) |  |
| <a id="summit-bay"></a>`summit-bay` — Bay water, coastline and sun glints | [src/mountaintop.js:buildSummitBay(](../src/mountaintop.js#L467) | [summit / v-bay](../labs/summit/js/vista.js#L53) (direct) |  |
| <a id="harbour"></a>`harbour` — Harbour skyline, islands, bridge and Ferris wheel | [src/mountaintop.js:buildHarbourAndIslands(](../src/mountaintop.js#L468) | [summit / v-harbour](../labs/summit/js/vista.js#L57) (direct) |  |
| <a id="horizon"></a>`horizon` — Summit horizon mountain ranges | [src/mountaintop.js:buildHorizonRanges(](../src/mountaintop.js#L469) | [summit / v-horizon](../labs/summit/js/vista.js#L69) (direct) |  |
| <a id="slope-forest"></a>`slope-forest` — Summit slope forest species | [src/mountaintop.js:buildSlopeForest(](../src/mountaintop.js#L458) | [summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-clouds"></a>`summit-clouds` — Summit cumulus and storm cloud banks | [src/mountaintop.js:buildSummitClouds(](../src/mountaintop.js#L473) | [summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — The real summit can be reviewed on the preview page; no individual Summit Lab specimen for this asset. |  |
| <a id="summit-snow"></a>`summit-snow` — Summit snowfall | [src/mountaintop.js:buildSummitSnow(](../src/mountaintop.js#L477) | [summit / life-snow](../labs/summit/js/life.js#L21) (direct) |  |
| <a id="summit-rain"></a>`summit-rain` — Summit rainfall | [src/mountaintop.js:buildSummitRain(](../src/mountaintop.js#L480) | [summit / life-rain](../labs/summit/js/life.js#L25) (direct) |  |
| <a id="summit-pollen"></a>`summit-pollen` — Summit pollen | [src/mountaintop.js:buildPollen(](../src/mountaintop.js#L482) | [summit / life-pollen](../labs/summit/js/life.js#L29) (direct) |  |
| <a id="summit-petals"></a>`summit-petals` — Summit sakura petals | [src/mountaintop.js:buildSakuraPetals(](../src/mountaintop.js#L484) | [summit / life-petals](../labs/summit/js/life.js#L33) (direct) |  |
| <a id="summit-wildlife"></a>`summit-wildlife` — Summit butterflies and fly-by birds | [src/mountaintop.js:buildAmbientWildlife(](../src/mountaintop.js#L489) | [summit / life-butterflies](../labs/summit/js/life.js#L37) (related) — Umbrella row: it builds nothing itself; the butterflies and birds are the specimens.<br>[summit / life-birds](../labs/summit/js/life.js#L41) (related) — Umbrella row: it builds nothing itself; the butterflies and birds are the specimens. |  |
| <a id="shrine-rays"></a>`shrine-rays` — Valley-to-summit shrine beacon rays | [src/mountaintop.js:buildShrineRays(](../src/mountaintop.js#L429) | [summit / life-rays](../labs/summit/js/life.js#L45) (direct) |  |
| <a id="summit-light"></a>`summit-light` — Supplementary summit sky and rim lights | [src/mountaintop.js:buildSummitLight(](../src/mountaintop.js#L428) | [summit / life-light](../labs/summit/js/life.js#L49) (direct) |  |
| <a id="summit-grass"></a>`summit-grass` — Summit biome grass field | [src/mountaintop.js:buildGrassField(](../src/mountaintop.js#L457) | [grass / ring-lod](../labs/grass/js/types_field.js#L273) (related) — Same GrassSystem recipes, but no specimen of the summit’s field layout.<br>[summit-review / whole-scene](../tools/summit_preview.js#L71) (review) |  |
| <a id="summit-vista"></a>`summit-vista` — Layered Kyoto Bay vista assembly | [src/mountaintop.js:buildSkirtAndVista(](../src/mountaintop.js#L461) | [summit / v-city](../labs/summit/js/vista.js#L37) (related) — The specimen builds the kit city layer; the assembly itself (layers, clouds, deferred ids) is only reviewed whole on the summit preview. |  |
| <a id="kyoto-city"></a>`kyoto-city` — Summit Kyoto houses, eaves, window lights and gardens | [src/mountaintop.js:buildKyotoCity(](../src/mountaintop.js#L464) | [summit / game-city](../labs/summit/js/recipes.js#L78) (direct)<br>[summit / v-city](../labs/summit/js/vista.js#L37) (direct)<br>[summit / v-city-lit](../labs/summit/js/vista.js#L41) (direct)<br>[summit / night](../labs/summit/js/recipes.js#L90) (direct) |  |
| <a id="blender-roofscape"></a>`blender-roofscape` — Optional Blender Kyoto roofscape GLB | [src/mountaintop.js:loadVistaLandmarks(](../src/mountaintop.js#L472) | [summit-review / whole-scene](../tools/summit_preview.js#L71) (review) — Optional runtime asset with fallback; availability is not verified by this source audit. |  |
| <a id="summit-enso"></a>`summit-enso` — Weathered enso marking | [src/mountaintop.js:buildMeditationStone(](../src/mountaintop.js#L448) | [summit / c-enso](../labs/summit/js/recipes.js#L98) (direct)<br>[summit-review / whole-scene](../tools/summit_preview.js#L71) (review) |  |
| <a id="summit-furin"></a>`summit-furin` — Summit meditation furin | [src/mountaintop.js:buildMeditationAtmosphere(](../src/mountaintop.js#L450) | [summit / c-furin](../labs/summit/js/recipes.js#L102) (direct)<br>[summit-review / whole-scene](../tools/summit_preview.js#L71) (review) |  |
| <a id="bay-bridge"></a>`bay-bridge` — Bay bridge | [src/mountaintop.js:buildHarbourAndIslands(](../src/mountaintop.js#L468) | [summit / v-bridge](../labs/summit/js/vista.js#L61) (direct) |  |
| <a id="ferris-wheel"></a>`ferris-wheel` — Harbour Ferris wheel | [src/mountaintop.js:buildHarbourAndIslands(](../src/mountaintop.js#L468) | [summit / v-wheel](../labs/summit/js/vista.js#L65) (direct) |  |
| <a id="summit-butterflies"></a>`summit-butterflies` — Summit butterfly visitors | [src/mountaintop.js:buildAmbientWildlife(](../src/mountaintop.js#L489) | [summit / life-butterflies](../labs/summit/js/life.js#L37) (direct) |  |
| <a id="summit-birds"></a>`summit-birds` — Summit fly-by bird palette variants | [src/mountaintop.js:buildAmbientWildlife(](../src/mountaintop.js#L489) | [summit / life-birds](../labs/summit/js/life.js#L41) (direct) |  |

### Roof Road

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="roof-street"></a>`roof-street` — Roof Road street ribbons: Kamo gravel and river, canal bank, market slabs, cobbled lanes | [rooftops/js/pieces/street.js:export const street = (pc, ctx) => {](../rooftops/js/pieces/street.js#L6) | [roofroad / street](../labs/roofroad/js/shelf.js#L25) (review) |  |
| <a id="roof-river-steps"></a>`roof-river-steps` — Roof Road river steps down from the bridge | [rooftops/js/pieces/steps.js:export const steps = (pc, ctx) => {](../rooftops/js/pieces/steps.js#L6) | [roofroad / steps](../labs/roofroad/js/shelf.js#L26) (review) |  |
| <a id="roof-bridge"></a>`roof-bridge` — Roof Road Sanjō bridge: riverbed, deck joinery, piers, giboshi caps, ramp | [rooftops/js/pieces/bridge.js:export const bridge = (pc, ctx) => {](../rooftops/js/pieces/bridge.js#L7) | [roofroad / bridge](../labs/roofroad/js/shelf.js#L27) (review) |  |
| <a id="roof-kido"></a>`roof-kido` — Roof Road kido gate | [rooftops/js/pieces/kido.js:export const kido = (pc, ctx) => {](../rooftops/js/pieces/kido.js#L7) | [roofroad / kido](../labs/roofroad/js/shelf.js#L28) (review) |  |
| <a id="roof-machiya"></a>`roof-machiya` — Roof Road machiya (walls, roof, drying deck, lanterns, dressing) | [rooftops/js/pieces/house.js:export const house = (pc, ctx) => {](../rooftops/js/pieces/house.js#L8)<br>[rooftops/js/downtown.js:decorateHouse(pc, ctx) {](../rooftops/js/downtown.js#L389) | [roofroad / house](../labs/roofroad/js/shelf.js#L29) (review) |  |
| <a id="roof-kura"></a>`roof-kura` — Roof Road kura storehouse | [rooftops/js/pieces/kura.js:export const kura = (pc, ctx) => {](../rooftops/js/pieces/kura.js#L7) | [roofroad / kura](../labs/roofroad/js/shelf.js#L30) (review) |  |
| <a id="roof-corner-house"></a>`roof-corner-house` — Roof Road corner house with hip roof and drying deck | [rooftops/js/pieces/corner.js:export const corner = (pc, ctx) => {](../rooftops/js/pieces/corner.js#L7) | [roofroad / corner](../labs/roofroad/js/shelf.js#L31) (review) |  |
| <a id="roof-komayose"></a>`roof-komayose` — Roof Road komayose rails | [rooftops/js/pieces/komayose.js:export const komayose = (pc, ctx) => {](../rooftops/js/pieces/komayose.js#L6) | [roofroad / komayose](../labs/roofroad/js/shelf.js#L32) (review) |  |
| <a id="roof-inuyarai"></a>`roof-inuyarai` — Roof Road inuyarai | [rooftops/js/pieces/inuyarai.js:export const inuyarai = (pc, ctx) => {](../rooftops/js/pieces/inuyarai.js#L7) | [roofroad / inuyarai](../labs/roofroad/js/shelf.js#L33) (review) |  |
| <a id="roof-roji"></a>`roof-roji` — Roof Road roji side alley (drain, tobi-ishi, tsukubai, service door) | [rooftops/js/pieces/roji.js:export const roji = (pc, ctx) => {](../rooftops/js/pieces/roji.js#L7) | [roofroad / roji](../labs/roofroad/js/shelf.js#L34) (review) |  |
| <a id="roof-tsuboniwa"></a>`roof-tsuboniwa` — Roof Road tsuboniwa tree over a wall | [rooftops/js/pieces/tsuboniwa.js:export const tsuboniwa = (pc, ctx) => {](../rooftops/js/pieces/tsuboniwa.js#L8) | [roofroad / tsuboniwa](../labs/roofroad/js/shelf.js#L35) (review) |  |
| <a id="roof-yuka"></a>`roof-yuka` — Roof Road yuka decks and kaisho plank | [rooftops/js/pieces/deck.js:export const deck = (pc, ctx) => {](../rooftops/js/pieces/deck.js#L6) | [roofroad / deck](../labs/roofroad/js/shelf.js#L36) (review) |  |
| <a id="roof-balconies"></a>`roof-balconies` — Roof Road engawa, shop awnings and alley bridges | [rooftops/js/pieces/balcony.js:export const balcony = (pc, ctx) => {](../rooftops/js/pieces/balcony.js#L6) | [roofroad / balcony](../labs/roofroad/js/shelf.js#L37) (review) |  |
| <a id="roof-lantern-post"></a>`roof-lantern-post` — Roof Road lantern post with red chōchin | [rooftops/js/pieces/post.js:export const post = (pc, ctx) => {](../rooftops/js/pieces/post.js#L6) | [roofroad / post](../labs/roofroad/js/shelf.js#L38) (review) |  |
| <a id="roof-crates"></a>`roof-crates` — Roof Road crates | [rooftops/js/downtown.js:B.crate = (pc, ctx) =>](../rooftops/js/downtown.js#L159) | [roofroad / crate](../labs/roofroad/js/shelf.js#L39) (review) |  |
| <a id="roof-barrels"></a>`roof-barrels` — Roof Road barrels | [rooftops/js/downtown.js:B.barrel = B.komodaru = (pc, ctx) =>](../rooftops/js/downtown.js#L160) | [roofroad / barrel](../labs/roofroad/js/shelf.js#L40) (review) | One builder serves the barrel and komodaru piece types. |
| <a id="roof-komodaru"></a>`roof-komodaru` — Roof Road komodaru (straw-wrapped sake casks) | [rooftops/js/downtown.js:B.barrel = B.komodaru = (pc, ctx) =>](../rooftops/js/downtown.js#L160) | [roofroad / komodaru](../labs/roofroad/js/shelf.js#L41) (review) | One builder serves the barrel and komodaru piece types. |
| <a id="roof-zushi"></a>`roof-zushi` — Roof Road zushi tunnels under bridged machiya | [rooftops/js/downtown.js:B.zushiTunnel = (pc, ctx) =>](../rooftops/js/downtown.js#L163) | [roofroad / zushiTunnel](../labs/roofroad/js/shelf.js#L42) (review) |  |
| <a id="roof-alley-pockets"></a>`roof-alley-pockets` — Roof Road alley pockets (flags, casks, ita-bei, shed eave) | [rooftops/js/downtown.js:B.alleyPocket = (pc, ctx) =>](../rooftops/js/downtown.js#L190) | [roofroad / alleyPocket](../labs/roofroad/js/shelf.js#L43) (review) |  |
| <a id="roof-alley-routes"></a>`roof-alley-routes` — Roof Road alley routes through the downtown blocks | [rooftops/js/downtown.js:B.alleyRoute = (pc, ctx) =>](../rooftops/js/downtown.js#L204) | [roofroad / alleyRoute](../labs/roofroad/js/shelf.js#L44) (review) |  |
| <a id="roof-utility-poles"></a>`roof-utility-poles` — Roof Road utility poles and wires | [rooftops/js/downtown.js:B.utilityPole = (pc, ctx) =>](../rooftops/js/downtown.js#L289) | [roofroad / utilityPole](../labs/roofroad/js/shelf.js#L45) (review) |  |
| <a id="roof-trellises"></a>`roof-trellises` — Roof Road vine trellises | [rooftops/js/downtown.js:B.trellis = (pc, ctx) =>](../rooftops/js/downtown.js#L311) | [roofroad / trellis](../labs/roofroad/js/shelf.js#L46) (review) |  |
| <a id="roof-canal"></a>`roof-canal` — Roof Road Takase canal water and towpath | [rooftops/js/pieces/water.js:export const water = (pc, ctx) => {](../rooftops/js/pieces/water.js#L6) | [roofroad / water](../labs/roofroad/js/shelf.js#L48) (review) |  |
| <a id="roof-canal-banks"></a>`roof-canal-banks` — Roof Road canal banks (stakes, drains, rain chains, greenery) | [rooftops/js/pieces/canalQuarter.js:export const canalQuarter = (pc, ctx) => {](../rooftops/js/pieces/canalQuarter.js#L8) | [roofroad / canalQuarter](../labs/roofroad/js/shelf.js#L49) (review) |  |
| <a id="roof-stepping-stones"></a>`roof-stepping-stones` — Roof Road stepping stones | [rooftops/js/pieces/steppingStone.js:export const steppingStone = (pc, ctx) => {](../rooftops/js/pieces/steppingStone.js#L7) | [roofroad / steppingStone](../labs/roofroad/js/shelf.js#L50) (review) |  |
| <a id="roof-canal-landings"></a>`roof-canal-landings` — Roof Road canal landings | [rooftops/js/pieces/canalLanding.js:export const canalLanding = (pc, ctx) => {](../rooftops/js/pieces/canalLanding.js#L6) | [roofroad / canalLanding](../labs/roofroad/js/shelf.js#L51) (review) |  |
| <a id="roof-footbridge"></a>`roof-footbridge` — Roof Road canal footbridge | [rooftops/js/pieces/canalBridge.js:export const canalBridge = (pc, ctx) => {](../rooftops/js/pieces/canalBridge.js#L6) | [roofroad / canalBridge](../labs/roofroad/js/shelf.js#L52) (review) |  |
| <a id="roof-toro"></a>`roof-toro` — Roof Road stone tōrō | [rooftops/js/pieces/toro.js:export const toro = (pc, ctx) => {](../rooftops/js/pieces/toro.js#L7) | [roofroad / toro](../labs/roofroad/js/shelf.js#L53) (review) |  |
| <a id="roof-cherry-boughs"></a>`roof-cherry-boughs` — Roof Road cherry boughs over the canal | [rooftops/js/pieces/cherry.js:export const cherry = (pc, ctx) => {](../rooftops/js/pieces/cherry.js#L8) | [roofroad / cherry](../labs/roofroad/js/shelf.js#L54) (review) |  |
| <a id="roof-takasebune"></a>`roof-takasebune` — Roof Road takasebune (hull, bales, planks, wake) | [rooftops/js/pieces/boat.js:export const boat = (pc, ctx) => {](../rooftops/js/pieces/boat.js#L34) | [roofroad / boat](../labs/roofroad/js/shelf.js#L55) (review) | Moves along the canal on the run; the boatman is its own row (roof-boatman). |
| <a id="roof-canopy"></a>`roof-canopy` — Roof Road Nishiki glass canopy | [rooftops/js/pieces/canopy.js:export const canopy = (pc, ctx) => {](../rooftops/js/pieces/canopy.js#L7) | [roofroad / canopy](../labs/roofroad/js/shelf.js#L56) (review) |  |
| <a id="roof-canopy-vents"></a>`roof-canopy-vents` — Roof Road canopy vents | [rooftops/js/pieces/vent.js:export const vent = (pc, ctx) => {](../rooftops/js/pieces/vent.js#L6) | [roofroad / vent](../labs/roofroad/js/shelf.js#L57) (review) |  |
| <a id="roof-market-stalls"></a>`roof-market-stalls` — Roof Road Nishiki market stalls | [rooftops/js/pieces/shopfronts.js:export const shopfronts = (pc, ctx) => {](../rooftops/js/pieces/shopfronts.js#L7) | [roofroad / shopfronts](../labs/roofroad/js/shelf.js#L58) (review) |  |
| <a id="roof-skylight-bridge"></a>`roof-skylight-bridge` — Roof Road skylight bridge (market crossing) | [rooftops/js/pieces/marketCrossing.js:export const marketCrossing = (pc, ctx) => {](../rooftops/js/pieces/marketCrossing.js#L6) | [roofroad / marketCrossing](../labs/roofroad/js/shelf.js#L59) (review) |  |
| <a id="roof-lines"></a>`roof-lines` — Roof Road laundry, tow and lantern lines | [rooftops/js/pieces/rope.js:export const rope = (pc, ctx) => {](../rooftops/js/pieces/rope.js#L7) | [roofroad / rope](../labs/roofroad/js/shelf.js#L60) (review) |  |
| <a id="roof-cistern"></a>`roof-cistern` — Roof Road rooftop cistern | [rooftops/js/pieces/cistern.js:export const cistern = (pc, ctx) => {](../rooftops/js/pieces/cistern.js#L7) | [roofroad / cistern](../labs/roofroad/js/shelf.js#L61) (review) |  |
| <a id="roof-chimney"></a>`roof-chimney` — Roof Road chimney and rain cap | [rooftops/js/pieces/chimney.js:export const chimney = (pc, ctx) => {](../rooftops/js/pieces/chimney.js#L7) | [roofroad / chimney](../labs/roofroad/js/shelf.js#L62) (review) |  |
| <a id="roof-futon-racks"></a>`roof-futon-racks` — Roof Road futon racks | [rooftops/js/pieces/futonRack.js:export const futonRack = (pc, ctx) => {](../rooftops/js/pieces/futonRack.js#L6) | [roofroad / futonRack](../labs/roofroad/js/shelf.js#L63) (review) |  |
| <a id="roof-willows"></a>`roof-willows` — Roof Road canal willows | [rooftops/js/downtown.js:B.willow = (pc, ctx) =>](../rooftops/js/downtown.js#L321) | [roofroad / willow](../labs/roofroad/js/shelf.js#L64) (review) |  |
| <a id="roof-culvert-ledges"></a>`roof-culvert-ledges` — Roof Road culvert ledges | [rooftops/js/downtown.js:B.culvertLedge = (pc, ctx) =>](../rooftops/js/downtown.js#L333) | [roofroad / culvertLedge](../labs/roofroad/js/shelf.js#L65) (review) |  |
| <a id="roof-tenmangu-gate"></a>`roof-tenmangu-gate` — Roof Road Tenmangū gate | [rooftops/js/downtown.js:B.tenmanguGate = (pc, ctx) =>](../rooftops/js/downtown.js#L338) | [roofroad / tenmanguGate](../labs/roofroad/js/shelf.js#L66) (review) |  |
| <a id="roof-yatai"></a>`roof-yatai` — Roof Road yatai festival stalls | [rooftops/js/pieces/yatai.js:export const yatai = (pc, ctx) => {](../rooftops/js/pieces/yatai.js#L7)<br>[rooftops/js/downtown.js:decorateStall(pc, ctx) {](../rooftops/js/downtown.js#L421) | [roofroad / yatai](../labs/roofroad/js/shelf.js#L68) (review) |  |
| <a id="roof-lantern-racks"></a>`roof-lantern-racks` — Roof Road festival lantern racks | [rooftops/js/pieces/rack.js:export const rack = (pc, ctx) => {](../rooftops/js/pieces/rack.js#L6) | [roofroad / rack](../labs/roofroad/js/shelf.js#L69) (review) |  |
| <a id="roof-hoko"></a>`roof-hoko` — Roof Road hoko float (wheels, brocade, roof, shingi mast, tassels) | [rooftops/js/pieces/float.js:export const float = (pc, ctx) => {](../rooftops/js/pieces/float.js#L9) | [roofroad / float](../labs/roofroad/js/shelf.js#L70) (review) | The hayashi musicians on it are their own row (roof-hayashi). |
| <a id="roof-temple-gate"></a>`roof-temple-gate` — Roof Road temple gate | [rooftops/js/pieces/gate.js:export const gate = (pc, ctx) => {](../rooftops/js/pieces/gate.js#L7) | [roofroad / gate](../labs/roofroad/js/shelf.js#L71) (review) |  |
| <a id="roof-tsuiji"></a>`roof-tsuiji` — Roof Road tsuiji temple wall | [rooftops/js/pieces/tsuiji.js:export const tsuiji = (pc, ctx) => {](../rooftops/js/pieces/tsuiji.js#L6) | [roofroad / tsuiji](../labs/roofroad/js/shelf.js#L72) (review) |  |
| <a id="roof-yama"></a>`roof-yama` — Roof Road yama float | [rooftops/js/downtown.js:B.yamaFloat = (pc, ctx) =>](../rooftops/js/downtown.js#L346) | [roofroad / yamaFloat](../labs/roofroad/js/shelf.js#L73) (review) |  |
| <a id="roof-villagers"></a>`roof-villagers` — Roof Road villagers | [rooftops/js/downtown.js:B.villager = (pc, ctx) =>](../rooftops/js/downtown.js#L356)<br>[rooftops/js/downtown.js:updatePeople(people, t, playerS, lowPower, reduceMotion) {](../rooftops/js/downtown.js#L461)<br>[rooftops/js/people.js:export function makeResident(](../rooftops/js/people.js#L42) | [roofroad / villager](../labs/roofroad/js/shelf.js#L77) (review) |  |
| <a id="roof-kawara-roofs"></a>`roof-kawara-roofs` — Roof Road kawara roofs: hira and tsuma roofs with ridge caps and onigawara | [rooftops/js/pieces/machiya.js:function hiraRoof(](../rooftops/js/pieces/machiya.js#L25)<br>[rooftops/js/pieces/machiya.js:function tsumaRoof(](../rooftops/js/pieces/machiya.js#L42)<br>[rooftops/js/pieces/machiya.js:function ridgeCap(](../rooftops/js/pieces/machiya.js#L9) | [roofroad / house](../labs/roofroad/js/shelf.js#L29) (embedded) — Inside the machiya specimen (and the kura, kido, temple gate and hoko float); no roof specimen of its own. | Shared by several piece types; a kit roof replaces it through those pieces. |
| <a id="roof-facades"></a>`roof-facades` — Roof Road machiya façades and eave details | [rooftops/js/pieces/machiya.js:function facade(](../rooftops/js/pieces/machiya.js#L60)<br>[rooftops/js/pieces/machiya.js:function streetEaveDetails(](../rooftops/js/pieces/machiya.js#L88) | [roofroad / house](../labs/roofroad/js/shelf.js#L29) (embedded) — Inside the machiya specimen; no façade specimen of its own. | Shared by the machiya and the downtown kit. |
| <a id="roof-ground"></a>`roof-ground` — Roof Road ground plane under the run | [rooftops/js/build.js:extra('roof-ground', extraLayout(](../rooftops/js/build.js#L175)<br>[rooftops/js/build.js:const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), M.ground);](../rooftops/js/build.js#L176) | [roofroad / run](../kyoto-rooftops.html#L23) (review) | Built by buildWorld() around the run, not from a level piece; routed through assets.build('roof-ground', extraLayout(…)). |
| <a id="roof-distant-city"></a>`roof-distant-city` — Roof Road distant city (instanced roofscape) | [rooftops/js/pieces/skyline.js:function buildDistantCity(](../rooftops/js/pieces/skyline.js#L10)<br>[rooftops/js/build.js:extra('roof-distant-city', extraLayout(](../rooftops/js/build.js#L187) | [roofroad / distant-city](../labs/roofroad/js/shelf.js#L74) (review) | Built by buildWorld() around the run; routed through assets.build('roof-distant-city', extraLayout(…)). |
| <a id="roof-skyline-pagodas"></a>`roof-skyline-pagodas` — Roof Road skyline pagodas | [rooftops/js/pieces/skyline.js:function buildPagoda(](../rooftops/js/pieces/skyline.js#L68)<br>[rooftops/js/build.js:extra('roof-skyline-pagodas', extraLayout(](../rooftops/js/build.js#L194) | [roofroad / skyline-pagoda](../labs/roofroad/js/shelf.js#L75) (review) | Three, built by buildWorld() around the run; each routed through assets.build('roof-skyline-pagodas', extraLayout(…)). |
| <a id="roof-sky"></a>`roof-sky` — Roof Road sky dome, clouds and moon (afternoon to festival night) | [rooftops/js/sky.js:export class Sky {](../rooftops/js/sky.js#L76)<br>[rooftops/js/sky.js:buildClouds() {](../rooftops/js/sky.js#L175) | [roofroad / run](../kyoto-rooftops.html#L23) (review)<br>[roofroad / finale](../rooftops/js/game.js#L1086) (review) | Driven by route progress, not a clock. |
| <a id="roof-hills"></a>`roof-hills` — Roof Road ring of hills around the basin | [rooftops/js/sky.js:buildHills() {](../rooftops/js/sky.js#L143) | [roofroad / finale](../rooftops/js/game.js#L1086) (review) |  |
| <a id="roof-okuribi"></a>`roof-okuribi` — Roof Road Okuribi: the five fires on the hills | [rooftops/js/sky.js:buildFires() {](../rooftops/js/sky.js#L212) | [roofroad / finale](../rooftops/js/game.js#L1086) (review) |  |
| <a id="roof-atmosphere"></a>`roof-atmosphere` — Roof Road atmosphere: petals, chimney smoke, birds, dust, fireflies, landing bursts | [rooftops/js/atmosphere.js:export class RooftopAtmosphere {](../rooftops/js/atmosphere.js#L278)<br>[rooftops/js/atmosphere.js:class ImpactFX {](../rooftops/js/atmosphere.js#L131) | [roofroad / run](../kyoto-rooftops.html#L23) (review) |  |
| <a id="roof-shoki"></a>`roof-shoki` — Roof Road clay Shōki (the seven guardians) | [rooftops/js/pieces/pickups.js:export function makeShoki(](../rooftops/js/pieces/pickups.js#L8)<br>[rooftops/js/build.js:k.kind === 'shoki' ? 'roof-shoki' : 'roof-treats'](../rooftops/js/build.js#L206) | [roofroad / shoki](../labs/roofroad/js/shelf.js#L78) (review) | Built by buildWorld() for each level pickup; routed through assets.build('roof-shoki', extraLayout(…)), the instance registered as the pickup. |
| <a id="roof-treats"></a>`roof-treats` — Roof Road treats | [rooftops/js/pieces/pickups.js:function makeTreat(](../rooftops/js/pieces/pickups.js#L25)<br>[rooftops/js/build.js:k.kind === 'shoki' ? 'roof-shoki' : 'roof-treats'](../rooftops/js/build.js#L206) | [roofroad / treat](../labs/roofroad/js/shelf.js#L79) (review) | Built by buildWorld() for each level pickup; routed through assets.build('roof-treats', extraLayout(…)), the instance registered as the pickup. |
| <a id="roof-chidori"></a>`roof-chidori` — Chidori, the Roof Road guide cat | [rooftops/js/game.js:guide = new mod.Cat(](../rooftops/js/game.js#L96)<br>[rooftops/js/companion.js:export class Companion {](../rooftops/js/companion.js#L18) | [roofroad / run](../kyoto-rooftops.html#L23) (review) | The game’s Cat with Chidori’s coat (decision D3: no PERSONALITIES entry); no specimen of her own. |
| <a id="roof-boatman"></a>`roof-boatman` — Roof Road takasebune boatman | [rooftops/js/pieces/boat.js:const boatman = new THREE.Group();](../rooftops/js/pieces/boat.js#L93) | [roofroad / boat](../labs/roofroad/js/shelf.js#L55) (embedded) — Poles the takasebune in the boat specimen; no specimen of his own. |  |
| <a id="roof-hayashi"></a>`roof-hayashi` — Roof Road hayashi musicians on the hoko | [rooftops/js/pieces/float.js:const musicians = [];](../rooftops/js/pieces/float.js#L154) | [roofroad / float](../labs/roofroad/js/shelf.js#L70) (embedded) — Ride the hoko in the float specimen; no specimen of their own. |  |

### Inactive code

| Asset ID / type | Game source | Evidence | Notes |
|---|---|---|---|
| <a id="old-petal-drifts"></a>`old-petal-drifts` — Removed static petal-drift discs | [src/vegetation.js:buildPetalDrifts(](../src/vegetation.js#L447) | [komorebi / game-drift](../labs/komorebi/js/recipes.js#L60) (direct) | **Inactive.** Method is a no-op. Its original lab tile is an empty baseline, not a shipped visible asset. |
| <a id="old-sakura-grove"></a>`old-sakura-grove` — Unused empty sakura-grove method | [src/vegetation.js:buildSakuraGrove(](../src/vegetation.js#L375) | **No mapped evidence** | **Inactive.** Empty legacy entry point; active sakura are built by sakuraTree(). |
| <a id="legacy-summit-gate"></a>`legacy-summit-gate` — Legacy rear summit gate, stairs, toro and gorinto | [src/mountaintop.js:buildLegacyRearGate(](../src/mountaintop.js#L446) | **No mapped evidence** | **Inactive.** Defined but not called by the current summit constructor. |
| <a id="legacy-vista-approach"></a>`legacy-vista-approach` — Unused vista descent and torii | [src/mountaintop.js:buildVistaApproach(](../src/mountaintop.js#L447) | **No mapped evidence** | **Inactive.** Defined but not called by the current summit constructor. |

## Source-module accounting

Every current `src/*.js` module is classified. Every class method declared with a `buildX` or `createX` name has an inventory owner or an explicit helper exclusion. Nonconforming entry points (trees, grass additions, scent, cosmetics and optional GLB loading) are mapped manually. New semantic objects added inside an existing method still require human review.

Every Roof Road module (`rooftops/js/*.js`, `rooftops/js/pieces/*.js`) is classified the same way. In the modules that draw, every `buildX`, `createX` or `makeX` method or function has an owner or a helper exclusion; the runner modules classified `excluded` draw nothing and are not scanned. Every piece type in the `PIECES` table (`rooftops/js/pieces/index.js`) is a row of the Roof Road group whose sources name the piece's module: that row's id is the id `buildWorld()` builds the piece under (`assets.build`).

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
| [rooftops/js/alleys.js](../rooftops/js/alleys.js) | excluded | Alley depth paths and entrances for the runner; no renderer. |
| [rooftops/js/alley-passages.js](../rooftops/js/alley-passages.js) | support | Geometry pass that carves the open alley lanes through the built blocks; not another object. |
| [rooftops/js/atmosphere.js](../rooftops/js/atmosphere.js) | assets | Roof Road petals, chimney smoke, birds, dust motes, fireflies and landing bursts. |
| [rooftops/js/autopilot.js](../rooftops/js/autopilot.js) | excluded | Attract-mode input (?auto=1) and the route test; no renderer. |
| [rooftops/js/build.js](../rooftops/js/build.js) | assets | The buildWorld facade: walks the PIECES table through assets.build, merges statics, adds the ground, skyline and pickups. |
| [rooftops/js/camera-obstacles.js](../rooftops/js/camera-obstacles.js) | excluded | Camera occlusion BVH over the opaque scenery; no renderer. |
| [rooftops/js/companion.js](../rooftops/js/companion.js) | support | Chidori's behaviour (intent, leash, jumps); her body is the game's Cat, built in game.js. |
| [rooftops/js/downtown.js](../rooftops/js/downtown.js) | assets | Downtown craft kit: crates, casks, zushi tunnels, alley pockets and routes, poles, trellises, willows, culverts, the Tenmangu gate, the yama float, villagers, house and stall dressing. |
| [rooftops/js/game.js](../rooftops/js/game.js) | assets | The Roof Road page: Michi and Chidori (the game’s Cat), camera, HUD and finale. |
| [rooftops/js/level.js](../rooftops/js/level.js) | excluded | Gameplay data: the rail, pieces, platforms, walls, ceilings and pickups; no renderer. |
| [rooftops/js/neighbourhood-map.js](../rooftops/js/neighbourhood-map.js) | excluded | SVG paper-map interface. |
| [rooftops/js/people.js](../rooftops/js/people.js) | assets | Painted Kyoto residents (villagers, stallkeepers, musicians) via makeResident; shared sculpt used by downtown villagers and the hoko hayashi. |
| [rooftops/js/physics.js](../rooftops/js/physics.js) | excluded | The runner's physics; no renderer. |
| [rooftops/js/rail.js](../rooftops/js/rail.js) | excluded | Route maths; no renderer. |
| [rooftops/js/reach.js](../rooftops/js/reach.js) | excluded | Jump reach and the platform graph; no renderer. |
| [rooftops/js/sky.js](../rooftops/js/sky.js) | assets | Roof Road sky dome, clouds, moon, the ring of hills and the five Okuribi fires. |
| [rooftops/js/street-paint.js](../rooftops/js/street-paint.js) | support | Painted street, roof and lantern surfaces; mapped with their owning pieces. |
| [rooftops/js/pieces/common.js](../rooftops/js/pieces/common.js) | support | Geometry helpers (box, cyl, slope, frameGroup, ribbon, mergeByMaterial). |
| [rooftops/js/pieces/index.js](../rooftops/js/pieces/index.js) | support | The PIECES table: piece type to inventory id, lane, module and classic builder. |
| [rooftops/js/pieces/machiya.js](../rooftops/js/pieces/machiya.js) | assets | Machiya parts several pieces share: ridge caps, hira and tsuma roofs, facades and eave details. |
| [rooftops/js/pieces/paint.js](../rooftops/js/pieces/paint.js) | support | The Roof Road's painted canvases and material set M; surfaces are mapped with their owning pieces. |
| [rooftops/js/pieces/pickups.js](../rooftops/js/pieces/pickups.js) | assets | The clay Shōki and the treats. |
| [rooftops/js/pieces/skyline.js](../rooftops/js/pieces/skyline.js) | assets | The distant city and the skyline pagodas. |
| [rooftops/js/pieces/balcony.js](../rooftops/js/pieces/balcony.js) | assets | Roof Road piece 'balcony' (one classic builder). |
| [rooftops/js/pieces/boat.js](../rooftops/js/pieces/boat.js) | assets | Roof Road piece 'boat' (one classic builder). |
| [rooftops/js/pieces/bridge.js](../rooftops/js/pieces/bridge.js) | assets | Roof Road piece 'bridge' (one classic builder). |
| [rooftops/js/pieces/canalBridge.js](../rooftops/js/pieces/canalBridge.js) | assets | Roof Road piece 'canalBridge' (one classic builder). |
| [rooftops/js/pieces/canalLanding.js](../rooftops/js/pieces/canalLanding.js) | assets | Roof Road piece 'canalLanding' (one classic builder). |
| [rooftops/js/pieces/canalQuarter.js](../rooftops/js/pieces/canalQuarter.js) | assets | Roof Road piece 'canalQuarter' (one classic builder). |
| [rooftops/js/pieces/canopy.js](../rooftops/js/pieces/canopy.js) | assets | Roof Road piece 'canopy' (one classic builder). |
| [rooftops/js/pieces/cherry.js](../rooftops/js/pieces/cherry.js) | assets | Roof Road piece 'cherry' (one classic builder). |
| [rooftops/js/pieces/chimney.js](../rooftops/js/pieces/chimney.js) | assets | Roof Road piece 'chimney' (one classic builder). |
| [rooftops/js/pieces/cistern.js](../rooftops/js/pieces/cistern.js) | assets | Roof Road piece 'cistern' (one classic builder). |
| [rooftops/js/pieces/corner.js](../rooftops/js/pieces/corner.js) | assets | Roof Road piece 'corner' (one classic builder). |
| [rooftops/js/pieces/deck.js](../rooftops/js/pieces/deck.js) | assets | Roof Road piece 'deck' (one classic builder). |
| [rooftops/js/pieces/float.js](../rooftops/js/pieces/float.js) | assets | Roof Road piece 'float' (one classic builder). |
| [rooftops/js/pieces/futonRack.js](../rooftops/js/pieces/futonRack.js) | assets | Roof Road piece 'futonRack' (one classic builder). |
| [rooftops/js/pieces/gate.js](../rooftops/js/pieces/gate.js) | assets | Roof Road piece 'gate' (one classic builder). |
| [rooftops/js/pieces/house.js](../rooftops/js/pieces/house.js) | assets | Roof Road piece 'house' (one classic builder). |
| [rooftops/js/pieces/inuyarai.js](../rooftops/js/pieces/inuyarai.js) | assets | Roof Road piece 'inuyarai' (one classic builder). |
| [rooftops/js/pieces/kido.js](../rooftops/js/pieces/kido.js) | assets | Roof Road piece 'kido' (one classic builder). |
| [rooftops/js/pieces/komayose.js](../rooftops/js/pieces/komayose.js) | assets | Roof Road piece 'komayose' (one classic builder). |
| [rooftops/js/pieces/kura.js](../rooftops/js/pieces/kura.js) | assets | Roof Road piece 'kura' (one classic builder). |
| [rooftops/js/pieces/marketCrossing.js](../rooftops/js/pieces/marketCrossing.js) | assets | Roof Road piece 'marketCrossing' (one classic builder). |
| [rooftops/js/pieces/post.js](../rooftops/js/pieces/post.js) | assets | Roof Road piece 'post' (one classic builder). |
| [rooftops/js/pieces/rack.js](../rooftops/js/pieces/rack.js) | assets | Roof Road piece 'rack' (one classic builder). |
| [rooftops/js/pieces/roji.js](../rooftops/js/pieces/roji.js) | assets | Roof Road piece 'roji' (one classic builder). |
| [rooftops/js/pieces/rope.js](../rooftops/js/pieces/rope.js) | assets | Roof Road piece 'rope' (one classic builder). |
| [rooftops/js/pieces/shopfronts.js](../rooftops/js/pieces/shopfronts.js) | assets | Roof Road piece 'shopfronts' (one classic builder). |
| [rooftops/js/pieces/steppingStone.js](../rooftops/js/pieces/steppingStone.js) | assets | Roof Road piece 'steppingStone' (one classic builder). |
| [rooftops/js/pieces/steps.js](../rooftops/js/pieces/steps.js) | assets | Roof Road piece 'steps' (one classic builder). |
| [rooftops/js/pieces/street.js](../rooftops/js/pieces/street.js) | assets | Roof Road piece 'street' (one classic builder). |
| [rooftops/js/pieces/toro.js](../rooftops/js/pieces/toro.js) | assets | Roof Road piece 'toro' (one classic builder). |
| [rooftops/js/pieces/tsuboniwa.js](../rooftops/js/pieces/tsuboniwa.js) | assets | Roof Road piece 'tsuboniwa' (one classic builder). |
| [rooftops/js/pieces/tsuiji.js](../rooftops/js/pieces/tsuiji.js) | assets | Roof Road piece 'tsuiji' (one classic builder). |
| [rooftops/js/pieces/vent.js](../rooftops/js/pieces/vent.js) | assets | Roof Road piece 'vent' (one classic builder). |
| [rooftops/js/pieces/water.js](../rooftops/js/pieces/water.js) | assets | Roof Road piece 'water' (one classic builder). |
| [rooftops/js/pieces/yatai.js](../rooftops/js/pieces/yatai.js) | assets | Roof Road piece 'yatai' (one classic builder). |

### Explained construction helpers

| Source | Reason |
|---|---|
| [src/cat.js:buildSkeleton(](../src/cat.js#L76) | Rigging helper; the rendered cat body and components are inventoried separately. |
| [src/cat.js:buildMaterials(](../src/cat.js#L80) | Material setup for the inventoried cat; not another object. |
| [src/countryside.js:createRiverUniforms(](../src/countryside.js#L1590) | Shader parameter state for the inventoried river/paddies, not another visible asset. |
| [src/npc.js:createNameTag(](../src/npc.js#L212) | DOM character label; interface is outside the visible world-asset inventory. |
| [src/main.js:buildJournalUI(](../src/main.js#L1769) | DOM journal interface; journal text rewards are not physical inventory objects. |
| [src/menus.js:buildSettings(](../src/menus.js#L140) | DOM settings interface, outside the world-asset scope. |
| [src/postfx.js:buildKernel(](../src/postfx.js#L176) | AO sampling-kernel data, not a second visual asset. |
| [rooftops/js/build.js:export function buildWorld(](../rooftops/js/build.js#L109) | Roof Road assembly facade; every piece type, the ground, skyline and pickups are inventoried separately. |
| [rooftops/js/pieces/paint.js:function makeMaterials(](../rooftops/js/pieces/paint.js#L281) | The Roof Road material set M, not another object. |

## Scope exclusions and text-only rewards

- HUD, menus, dialogue text, journal-only keepsakes, audio/music, invisible colliders and simulation helpers.
- Lab-only proposals.
- dawCAT, cadJS, OLD, arbitrary CAD overrides and per-instance procedural placements.
- Every individual texture, material, triangle, animation pose and shader helper; these belong to their owning asset types.

Narrative-only characters and journal/progression rewards are recorded separately below, outside the visual-asset denominator. The Guardian’s Feather, Golden Dango and Jade Paw have actual meshes and are inventoried above.

| Nonvisual entry | Source | Reason |
|---|---|---|
| Bokuchi, the forest spirit | [src/main.js](../src/main.js#L1918) | Named in Kuro’s dialogue; no separate Bokuchi actor or mesh is constructed. |
| Mist Charm | [src/context_actions.js](../src/context_actions.js#L690) | Journal/progression reward from touching the altar; no collectible mesh. |
| Bokuchi’s Blessing | [src/main.js](../src/main.js#L1989) | Journal/progression reward for the offering-bell quest; no separate item mesh. |
| The valley became home | [src/context_actions.js](../src/context_actions.js#L762) | Journal memory from a quiet moment; no physical item. |

Optional media and dormant code are recorded without claiming that a download succeeded or an unused builder is part of the current playable scene. The Roof Road rows describe its own prototype page, which the game does not load yet; its run keeps its reachability checks (`node tools/rooftop_test.mjs`) and its numeric golden (`node tools/rooftop_golden.mjs`).

## Keeping the claim current

1. Add or update an asset row when an authored visual type changes. Use a game-source declaration or unique construction anchor.
2. Map its actual specimen/bench/review definition. Keep invisible objects and analogous techniques at `related`; record missing coverage with an explanation.
3. Classify new source modules and account for new `buildX`/`createX` methods (and new Roof Road `makeX` functions and `PIECES` types). Keep retired assets marked `inactive`.
4. Run `node tools/labs_coverage.mjs --write`, then `node tools/labs_coverage.mjs` and `node --test tools/labs_coverage_test.mjs`.

The checker validates source anchors, named specimen selectors (including the catalog’s dynamic IDs), target references, unique IDs, method accounting, classifications and report freshness. It does not render the specimens, prove geometric fidelity or verify game integration. Use the browser construction review for visual evidence.
