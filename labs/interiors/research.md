# Interiors research — 2026-11-06

Notes behind `labs/interiors/` (Lab 21). 4 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/interior.js`): an `InteriorManager` handles a
few interior pockets (the tea-ceremony room among them) with tatami, shoji and
props. This lab gives each surface its construction — the weave, the light,
the alcove — and a few things a cat can knock over.

## Tatami, layer by layer

* A tatami has three parts: the **doko** (core — traditionally sewn rice
  straw, a ~40 cm stack compressed to ~5 cm), the **omote** (a weft-faced
  weave of *igusa* rush on a hemp or cotton warp; a fine mat has ~5,000–6,000
  rush strands), and the **heri** (the brocade border on the long edges).
  Kyoto's size is **Kyōma: 191 × 95.5 cm, 5.5 cm thick** (Motoyama Tatami,
  Wikipedia, Embassies of Japan — excerpts).
* Layout is a solved art: an **auspicious** tiling never lets four mat
  corners meet at one point (the "tatami tiling" rule) (Ruskey et al. —
  excerpt).

## Light through shoji

* Shoji is a **kumiko** lattice (interlocking, interwoven laths) pasted with
  washi that is **tensioned by spraying it with water**. The paper diffuses
  and roughly **halves** the sunlight, so a room glows softly and you see
  only silhouettes from outside. *Kōzo*-fibre paper blocks blue light more,
  so it reads warmer than pulp paper (Wikipedia, eshoji, ICRESS shoji study —
  excerpts).
* The lattice is structural: interwoven half-joints carry the panel, and the
  taut paper strengthens it further. Shoji block wind but let air and sound
  through (Wikipedia — excerpt).

## The tokonoma

* The alcove holds a **kakemono** hanging scroll and an **ikebana**
  arrangement, changed with the season. The guest of honour sits at the
  **kamiza**, the seat closest to the tokonoma (furthest from the door), and
  nobody steps inside the alcove. At a tea gathering the scroll sets the
  theme, and guests bow to the calligrapher through it (Wikipedia *tokonoma*,
  Society for Japanese Art, Asian Art Museum — excerpts).

## Decisions for the Lab

1. **Weave the floor.** A tatami that shows its doko → omote → heri stack,
   with the igusa warp and weft visible up close and an auspicious
   no-four-corners layout the user can re-arrange.
2. **Light the shoji.** A sliding panel whose washi diffuses a warm ~50 % —
   with silhouettes cast on the paper and the kumiko lattice darkening the
   grid.
3. **A tokonoma to knock over.** A scroll and an ikebana on the raised floor,
   with props (a chawan tea bowl, a vase, an incense box) that the cat can
   bat off — because "what can a cat knock over" is the point.

## Image references

* Traditional rooms of Japan (washitsu: tatami + shoji + tokonoma): <https://commons.wikimedia.org/wiki/Category:Traditional_rooms_of_Japan>
* Tokonoma category: <https://commons.wikimedia.org/wiki/Category:Tokonoma>
* Shōji category: <https://commons.wikimedia.org/wiki/Category:Sh%C5%8Dji>

## Sources

* Motoyama Tatami — *Structure of tatami* — <https://kyo-tatami.com/world/about/structure/> (excerpt)
* Wikipedia — *Tatami* — <https://en.wikipedia.org/wiki/Tatami> (excerpt)
* Embassies of Japan — *Tatami mats: sizes, use and etiquette* — <https://www.embjapan.org/tatami/> (excerpt)
* Ruskey et al. — *Auspicious tatami mat arrangements* — <https://www.cs.uvic.ca/~ruskey/Publications/Tatami/TatamiMonomerDimer.pdf> (excerpt)
* Wikipedia — *Shoji* — <https://en.wikipedia.org/wiki/Shoji> (excerpt)
* eshoji — *Shoji, shoji paper, rice paper* — <https://www.eshoji.com/faq/shoji-shoji-paper-rice-paper-everything-you-need-to-know/> (excerpt)
* ICRESS — *Properties and application potential of shoji screens* — <https://doi.org/10.54254/2755-2721/2025.gl22979> (excerpt)
* Wikipedia — *Tokonoma* — <https://en.wikipedia.org/wiki/Tokonoma> (excerpt)
* Society for Japanese Art — *Uki-pedia: hanging scrolls* — <https://www.societyforjapaneseart.org/news/uki-pedia-hanging-scrolls> (excerpt)
* Asian Art Museum — *Teahouse alcove (tokonoma)* — <https://education.asianart.org/resources/teahouse-alcove-tokonoma/> (excerpt)
---

## Build research — primary sources read on 2026-11-06

The notes above are the original starting brief. Its **excerpt** labels are
retained intentionally. The following sources were fetched for this build;
these findings supersede the brief where they are more specific. This is a
playable architectural study, not a measured reconstruction of a particular
house or a tea-school practice simulator. The twelve room recipes are our
compositions, not twelve historical Japanese room categories.

### 1. Start with a room measured in mats

Motoyama's own FAQ directly specifies **1.910 × 0.955 × 0.055 m** for its
standard Kyōma mat. Its construction page distinguishes straw filling
(*toko*), woven *omote*, and fabric *heri*. The warp threads are hemp or
cotton; the visible rushes pass across them. The heri runs along the long
sides. Modern cores also exist, so exposed straw describes the traditional
specimen, not every mat in Kyoto. [A, B]

Use a **0.955 m planning cell**. A full mat covers two cells; a half mat
covers one. Four-and-a-half mats occupy a 3 × 3 cell square (2.865 m each
side), six mats a 4 × 3 rectangle (3.820 × 2.865 m), and eight mats a 4 × 4
square (3.820 m each side), before timber and alcove allowances. These
measurements are derived from Motoyama's dimensions. Floor plans should
cover every cell once without overlap. For the lab's auspicious arrangement,
no internal vertex may be surrounded by four different mat IDs. The
Erickson/Ruskey/Schurch/Woodcock paper defines this combinatorial condition;
it does not prescribe ceremonial seating or one universal room plan. [C]

Useful validated presets below use `(x, z, width, depth)` in planning cells,
from the back-left corner:

```js
const fourHalf = [
  [0,0,2,1], [2,0,1,2], [0,1,1,2], [1,1,1,1], [1,2,2,1]
];
const six = [
  [0,0,2,1], [2,0,2,1], [0,1,1,2],
  [1,1,2,1], [3,1,1,2], [1,2,2,1]
];
const eight = [
  [0,0,1,2], [1,0,2,1], [3,0,1,2], [1,1,1,2],
  [2,1,1,2], [0,2,1,2], [3,2,1,2], [1,3,2,1]
];
```

These coordinates were checked with an exhaustive grid-covering scratch
solver, including all internal vertices. Rotating or mirroring the entire
arrangement preserves the condition. Rotating an arbitrary individual mat
usually creates overlap; a rearrange control should select another valid
whole arrangement. Grain direction changes with each mat, so neighboring
mats catch the same light differently. That contrast can be painted into
256 px maps; a physically anisotropic cloth shader is unnecessary here.

### 2. Separate paper, wood and the opening

Shoji is a light-filtering screen; fusuma is an opaque room partition. Kyoto
City's illustrated guide places shoji inside the veranda edge, with *ranma*
transoms between the door lintel and ceiling. It describes removing fusuma to
combine rooms for special gatherings. The plan follows the tatami module.
These are useful structural relationships, rather than decorative icons. [D]

Do **not** treat all shoji as a scientifically measured 50% diffuser.
eShoji's published product table gives 38% translucency for off-white kōzo,
43% for basic plain paper and 56% for kōzo silk. These supplier values show
variation; they are not a spectral scattering model. Warm color, a low
emissive contribution, visible paper fibers and a soft interior fill are an
artistic rendering approximation. Material opacity is not equal to measured
light transmission. Avoid strong mirror reflections on paper. [E]

Harima's actual yukimi-shoji detail drawing identifies a 30 mm frame,
8 × 15 mm lattice members and 2 mm lower glass. Yoshihara Woodworks describes
an independently moving section for a view with partial screening. A
snow-viewing recipe can therefore use a lower viewing pane beneath the
paper lattice. These are references to specific manufacturers, not standard
sizes required of every Kyoto screen. [F, G]

For summer, Kyoto City's seasonal guide explicitly describes swapping
fusuma/shoji for airy reed doors and blinds. Give the summer recipe actual
closely spaced reed slats and a looser relationship to the garden. Patterned
fusuma may use an original restrained woodblock-like repeat: Karacho makes
karakami for fusuma, walls and other interior surfaces. Do not trace or
redistribute its proprietary patterns. [H, I]

### 3. Timber and plaster should show their construction

Takenaka Carpentry Tools Museum's sukiya exhibition includes a tea-room
structure model with a removable floor mat and replaceable hearth, a display
of earthen-wall processes, and samples of logs, bamboo, shaped timber and
ceiling boards. Posts and beams should frame plaster bays; the wall texture
should carry fine granular marks and sparse fibers. A floating cutaway
ceiling is a teaching choice, inspired by the museum's exposed structures.
It is not how the finished house is roofed. [J]

Architect Keiji Ashizawa's documented Kyoto machiya restoration retains
cedar and pine and introduces hinoki and oak alongside washi, plaster,
stone and iron. Its darker lower story and lighter upper story give a
credible palette reference. Use warm weathered wood, subdued earth walls,
polished hand-worn edges and soft grazing highlights. Our recipe colors,
wear strengths and proportions remain art direction. [K]

### 4. Give the alcove a seasonal reason to exist

Asian Art Museum's teahouse-alcove photographs explain that the hanging
scroll, seasonal flowers and incense container set the gathering's theme.
The museum shows different spring, late-summer, autumn and winter displays,
including a winter camellia. Display few objects with breathing room. Keep
the scroll visually legible as a mounted paper object with upper/lower
fabric bands, hanging cord and lower roller. [L]

Urasenke's own room guide describes the four-and-a-half-mat Yūin and several
larger and smaller tea rooms. A four-and-a-half-mat plan is a useful recipe,
not a claim that all tea rooms share that size. The formal-tea composition
should emphasize kettle/brazier, preparation utensils and empty floor;
a domestic chabudai with everyday snacks belongs to a different recipe.
The game already combines hospitality and playful cat interactions, so label
that domestic interpretation honestly. [M]

### 5. Lived-in furniture and ceramic variation

Takaokaya's Kyoto-made zabuton and futon range provides direct material and
shape references: soft cotton volumes, a domed top, three-pronged center stitching and
small corner tassels. The maker lists a 55 × 59 cm medium size, cotton
fabric/filling and silk tassels. Rounded boxes with a slight surface deformation and
thin stitched contours convey this more convincingly than rigid cubes.
Use muted indigo, persimmon and moss green as original lab palettes. [N]

A winter kotatsu should read as a low frame, draped quilt and separate hard
tabletop. MUJI's manufacturer assembly instructions explicitly show laying
the quilt over the frame, then placing the top above it. The lab depicts
that layered silhouette; it does not simulate an electric heater. Storage
chests, writing desks and shelves are compositional props, not claims that
one precise furnishing set is universal in a machiya. [O]

Kyoto ceramics are not one uniform glaze. Asahido explains the variety of
handmade and hand-painted Kyo/Kiyomizu ware, including blue-and-white,
unglazed, ash-glazed and other designs. The lab can compare celadon-like
green, iron-dark and original blue brush marks without claiming these three
capture the tradition. Revolved profiles should include an inner wall, lip
and foot; a solid cylinder cannot read as an empty teacup. [P]

Denver Art Museum's black Raku bowl has an uneven lip and hand-shaped sides.
A dark bowl should use restrained roughness variation, asymmetric radius
and a visibly thick rim. `LatheGeometry` is a useful starting construction,
but hand-formed Raku is not literally wheel-thrown; deform the result if
using that reference. The Raku Museum's collection demonstrates considerable
variation even within black and red tea bowls. [Q, R]

### 6. Make the garden part of the interior

The engawa is the timber edge between room and garden. Give it continuous
boards, a threshold/track below the shoji and a small change in level. The
view outside should be a deliberately small planted court, not another
mountain landscape. Kyoto City's guide connects small gardens with air,
light and seasonal experience. A few moss mounds, irregular stepping stones,
a planted branch and gravel give enough depth for views through the screen.
The lab's tree silhouette, dust, steam, rain and snow are atmosphere studies,
with no downloaded photos or geometry. [D, H]

### 7. Three.js techniques examined against r160

The game uses **Three.js 0.160.0**. Current WebGPU/TSL examples are not
drop-in code for this repository. The following upstream files were read at
the `r160` tag; use them as API/algorithm references, not a suggestion to
copy complete demonstrations or their model assets. Three.js is MIT licensed.

| Part | Upstream r160 reference | Application and cost |
|---|---|---|
| Painted materials | [CanvasTexture source](https://github.com/mrdoob/three.js/blob/r160/src/textures/CanvasTexture.js) | A 256 × 256 canvas becomes a GPU texture; constructor marks it for upload. Reuse maps rather than repainting each frame. |
| Color and height data | [Color management guide](https://github.com/mrdoob/three.js/blob/r160/docs/manual/en/introduction/Color-management.html), [Texture source](https://github.com/mrdoob/three.js/blob/r160/src/textures/Texture.js) | Color/emissive maps use `SRGBColorSpace`; bump/roughness maps remain `NoColorSpace`. If one canvas supplies both roles, create separate texture objects with the correct annotations. |
| Lit surfaces | [MeshStandardMaterial source](https://github.com/mrdoob/three.js/blob/r160/src/materials/MeshStandardMaterial.js) | Standard metallic/roughness material supports maps, bump, emissive and environment lighting in this release. Paper glow remains an artistic proxy, not subsurface scattering. |
| Cups, bowls, vase | [LatheGeometry source](https://github.com/mrdoob/three.js/blob/r160/src/geometries/LatheGeometry.js) | Revolve a small profile around Y; include the inside surface in the profile. Use modest radial segments and share geometry across like items. |
| Cushions and softened furniture | [RoundedBoxGeometry addon](https://github.com/mrdoob/three.js/blob/r160/examples/jsm/geometries/RoundedBoxGeometry.js) | Radius must fit the shortest dimension. Low segment counts suit the lab scale; avoid a separate dense mesh for every seam. |
| Repeated slats, garden details | [InstancedMesh source](https://github.com/mrdoob/three.js/blob/r160/src/objects/InstancedMesh.js) | Repeated mesh/material pairs can share a draw. Set instance matrices/colors then mark their attributes dirty; recompute bounds when the arrangement changes. |
| Static room structure | [BufferGeometryUtils](https://github.com/mrdoob/three.js/blob/r160/examples/jsm/utils/BufferGeometryUtils.js) | `mergeGeometries()` can batch compatible static pieces by material. Keep sliding panels and knockable props outside static batches. |
| Many live room previews | [Multiple-elements example](https://github.com/mrdoob/three.js/blob/r160/examples/webgl_multiple_elements.html) | One renderer with per-element viewport/scissor; skip offscreen previews. Existing `labs/shared/stage.js` already supplies this pattern and lazy construction. |
| Light and contact | [Shadowmap example](https://github.com/mrdoob/three.js/blob/r160/examples/webgl_shadowmap.html) | Shadow casting and receiving must be enabled on relevant objects as well as renderer/light. A single hero directional shadow plus subtle contact decals is cheaper than one shadowed point light per lantern. |

Suggested visual stack: geometric silhouette → painted color and micro-bump
→ broad hemisphere fill → one soft directional shadow → warm local andon
light → sparse animated atmosphere. The precision comes from construction,
proportion and light falloff; the painterly quality comes from restrained
hue variation and intentionally broad texture marks. Keep shadow resolution,
particle count and pixel ratio adjustable. Pause offscreen motion and honor
`prefers-reduced-motion`. No photogrammetry, HDR download, video, path-tracer
or new dependency is necessary.

### 8. What the cat interaction should prove

* Floor-to-table movement must use explicit support heights and airborne
  landing, not snapping the cat upward when its X/Z enters a tabletop.
* Table legs, cabinet bodies, walls and closed panels should block a
  grounded cat. A successful jump may land on a low table; the alcove can
  remain a protected display area.
* Tea bowls placed on domestic furniture can have reversible bat/tumble/
  bounce behavior. Put the reset near the interaction; no breakage score,
  punishment, countdown or fail state.
* A cushion provides a rest action. A garden/veranda route demonstrates
  scale and readable thresholds. Direct controls should have visible touch
  equivalents and ignore keypresses while inputs are focused.
* Seed local variations. Do not add random draws to the game's countryside
  builders. Rebuilding recipes must dispose replaced geometry/materials
  while preserving intentionally shared textures and the one real cat.

### 9. Route back to the game

| Lab result | Existing destination | Integration boundary |
|---|---|---|
| Tatami layout and maps | `InteriorManager.buildInterior()` in `src/interior.js` | Replace the existing approximate mat arrangement after selecting a recipe; preserve room transitions. |
| Shoji/engawa construction | Same builder's right garden opening and exit door | Keep renderer-visible lights tied to interior activation, as current `setLightsActive()` does. |
| Hollow ceramic and bowl tumble | `buildKnockables()` / `update(dt)` | Preserve reversible toy behavior; use real player position and one consistent support surface. |
| Jumpable furniture | `platforms`, `colliders`, `getGroundHeight()` | Lab locomotion is evidence for a future integration, not an automatic replacement for game physics. |
| Seasonal alcove and painterly maps | Tokonoma group; `src/textures.js` / `MAT` when promoted | Future game materials must be registered in `MAT` so static merging continues to work. |

The lab itself imports the real cat only through `labs/shared/game.js`.
Nothing in this research pass changes `src/`, the seeded valley layout, the
summit, or the game's cache tag.

### Newly fetched source ledger

“Read” below means the source page/file was fetched, not just a search
snippet. “Excerpt” is deliberately retained where a fetch failed.

| ID | Source and access | What it supports |
|---|---|---|
| A | [Motoyama: FAQ](https://kyo-tatami.com/world/faq-list/) — Read | Exact standard Kyōma dimensions, custom-size caveat. |
| B | [Motoyama: Structure](https://kyo-tatami.com/world/about/structure/) — Read | Core, rush surface, warp and fabric edges. |
| C | [Erickson et al.: Auspicious tatami mat arrangements](https://arxiv.org/abs/1103.3309) — Read abstract | No-four-corners monomer/dimer condition. The old UVic PDF URL in the brief did not fetch. |
| D | [Kyoto City: 京町家のいろは](https://kyomachiya.city.kyoto.lg.jp/wp-content/uploads/2022/01/iroha.pdf) — Read, especially printed p10 | Mat-based planning, fusuma, shoji, engawa and transom relationships. |
| E | [eShoji: paper specifications](https://www.eshoji.com/faq/shoji-paper-specs/) — Read | Published paper translucency varies by product. |
| F | [Harima: S-08 yukimi-shoji drawing](https://www.harima-sangyou.co.jp/datadl/pdf/s-08.pdf) — Read | Frame/lattice proportions and lower glass. |
| G | [Yoshihara Woodworks: fittings reference](https://yoshiharawoodworks.com/orders/material-references/) — Excerpt (page fetched; yukimi description available only in search excerpt) | Independently moving yukimi section. |
| H | [Kyoto City: machiya information booklet](https://kyomachiya.city.kyoto.lg.jp/wp-content/uploads/2022/03/zyouhousasshi.pdf) — Excerpt, printed p24 | Seasonal reed fittings, blinds, small gardens. PDF fetched but yielded no parsed lines; claims limited to the retrieved search excerpt. |
| I | [Karacho: orders and applications](https://kirakaracho.jp/en/order/) — Read | Karakami used for fusuma and interior surfaces. |
| J | [Takenaka Museum: sukiya exhibition](https://www.dougukan.jp/sukiya/contents/photo/tokyo.html) — Read | Structural study models, earthen-wall process, material samples. |
| K | [Keiji Ashizawa Design: toune, Kyoto machiya](https://keijidesign.com/en/works/kyoto-machiya/) — Read | Documented restored material and light palette; not a universal historical standard. |
| L | [Asian Art Museum: Teahouse Alcove](https://education.asianart.org/resources/teahouse-alcove-tokonoma/) — Read | Seasonal flowers, scroll and incense container. |
| M | [Urasenke: rooms at Konnichian](https://www.urasenke.or.jp/textc/about/konnichian.html) — Read | Several room sizes, four-and-a-half-mat Yūin. |
| N | [Takaokaya: Kyoto zabuton](https://takaokaya-kyoto.com/products/kyotozabuton) — Read | Handcrafted Kyoto cotton cushion reference. |
| O | [MUJI: kotatsu assembly](https://www.muji.com/public/media/jp/doc/item/01_4550583637552_00001.pdf) — Read | Quilt and separate top layering; specific manufacturer instructions. |
| P | [Asahido: Kyo/Kiyomizu ware FAQ](https://www.asahido.co.jp/en/common/faq/) — Read | Diversity of Kyoto ceramics; small-lot handmaking and painting. |
| Q | [Denver Art Museum: Black Raku Tea Bowl](https://www.denverartmuseum.org/en/edu/object/black-raku-tea-bowl) — Read | Hand-formed irregular sides and rim, restrained black glaze. |
| R | [Raku Museum: Jikinyū collection](https://raku-yaki.or.jp/e/museum/collection/collection_16.html) — Read | Black/red and varied glazes in actual collection. |

All textures, brush marks and room compositions in the lab are original
procedural artwork. Linked museum, maker and architecture photographs are
reference material, not bundled assets. Upstream Three.js references are
version-pinned in the technique table above.
