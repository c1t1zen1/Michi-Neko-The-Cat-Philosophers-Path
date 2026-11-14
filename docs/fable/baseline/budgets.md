# Budgets for the modular set (P0.5)

**Proposals — accepted provisionally under ruling D1.** Lanes build to them
now; the operator may change them, and G-V1 cannot pass until they are
accepted (guide §7, D1).

Every number is derived from `perf.md`: the classic set, measured on
2026-11-13 17:04 PST on an Apple M5 Max in headless Chromium on Metal,
1200 × 750, hour 10.5, at the four fixed spots, with boots interleaved across
tiers and the load average on record (1.35–2.54). Raw data:
`/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/perf/perf-baseline.json`
and `assets-baseline.json`, `inview-bands.json` beside it.

They are **not** phone or low-end budgets. The low tier is protected by
construction instead: quality `low` always resolves to the classic set and
never downloads the kit (guide §3.1, §3.6).

## How a modular run is judged

**Preferred: compare in the same session.** One run, boots of both sets
interleaved, so both see the same machine load:

```sh
node tools/perf_spots.mjs --url-suffix "" --url-suffix "?assets=modular" --out cmp.json
```

Judge modular medium against classic high **from that same run**, modular
high against 1.2 × (frame, draw calls) or 1.3 × (triangles) that run's
classic high, and modular low against that run's classic low. The absolute
numbers below are the reference for when a same-session run is impossible:
triangles and draw calls carry over between sessions, frame times do not.

**Use amortised values, not single medians.** Low and medium refresh the
shadow map on every 2nd frame, so their per-frame counts and times are
bimodal (`perf.md`, "Two kinds of frame"). Every budget below is on the
*mean* (draw calls, triangles) or the *amortised* value (frame ms): the cost
averaged over the shadow cycle. Refresh frames are not gated separately: on
medium they already match a classic high frame (river: 646 calls against
high's 589), so "≤ classic high" on them would leave nothing; and with the
mean raised by at most H, a refresh frame can rise by at most 2H (only if
every addition casts shadows). The frame-time p90 shows the effect.

**Frame-time rows are provisional** until this baseline is re-measured on an
idle machine: at load 1.35–2.54 a spot's amortised frame time still moved by
up to ~4 ms between boots. A same-session comparison does not need them.

## 1. Scene budgets per tier (per spot, whole frame, all passes)

Classic reference (`perf.md`): frame = amortised GPU-synced ms; calls and
triangles = per-frame **mean**.

| Spot | low: ms / calls / triangles | medium: ms / calls / triangles | high: ms / calls / triangles |
|---|---|---|---|
| street | 10.20 / 515 / 5.06 M | 10.40 / 596 / 6.07 M | 12.30 / 774 / 8.12 M |
| shrine | 7.65 / 258 / 4.12 M | 7.88 / 311 / 5.04 M | 10.00 / 452 / 7.06 M |
| river | 9.05 / 392 / 4.19 M | 8.25 / 485 / 5.09 M | 11.00 / 589 / 6.93 M |
| meadow | 9.50 / 483 / 4.73 M | 7.98 / 557 / 5.64 M | 11.00 / 728 / 7.53 M |

Budgets for the **modular** set, per spot:

| Tier | Frame ms, amortised (*provisional*) | Draw calls, mean | Triangles, mean | Rule |
|---|---|---|---|---|
| **low** | = classic low, within its round range | = classic low, within the classic boot range (river 350–437; ≤ 3.7 % elsewhere) | = classic low ± 2 % (boot spread ≤ 1.9 %) | `low` never loads the kit. Any change means the kit leaked into `low`: a bug, not a budget question |
| **medium** | ≤ classic high: street 12.30, shrine 10.00, river 11.00, meadow 11.00 | ≤ classic high: 774 / 452 / 589 / 728 | ≤ classic high: 8.12 / 7.06 / 6.93 / 7.53 M | The guide's rule. Target (not a gate): no more than half of the headroom below |
| **high** | ≤ 1.2 × classic high: 14.8 / 12.0 / 13.2 / 13.2 | ≤ 1.2 × classic high: 929 / 542 / 707 / 874 | ≤ 1.3 × classic high: 10.56 / 9.18 / 9.01 / 9.79 M | High is opt-in for strong GPUs; 1.2 × keeps a high frame in the same class on this machine |

The headroom this leaves the kit, which sizes the per-asset budgets in §3:

| Spot | medium: ms / calls / triangles (classic high − classic medium) | high: calls / triangles (0.2 × and 0.3 × classic high) |
|---|---|---|
| street | +1.90 / +178 / +2.05 M | +155 / +2.44 M |
| shrine | +2.12 / +141 / +2.03 M | **+90** / +2.12 M |
| river | +2.75 / **+104** / **+1.84 M** | +118 / **+2.08 M** |
| meadow | +3.02 / +171 / +1.89 M | +146 / +2.26 M |

## 2. World build budgets per tier

Classic (median of 3 boots, `perf.md`): world ready (constructor → first
frame) low 1,210 / medium 1,258 / high 1,231 ms; world build (constructor →
its closing `loop()`) 891 / 896 / 890 ms; boot total (engine start → first
frame) 1,889 / 1,930 / 1,877 ms. (The contended first run measured 2.8–3.3 s
world ready; prefer the same-session comparison here too.)

| Tier | World ready | World build | Boot total | Rule |
|---|---|---|---|---|
| **low** | = classic low (1,184–1,235 ms range) | = classic | = classic | the kit is never loaded |
| **medium** | ≤ 1.25 × classic medium = **1,573 ms** | ≤ 1.25 × = 1,120 ms | ≤ classic + 1,000 ms = **2,930 ms** | +25 % is about +0.22 s behind the boot screen. Since f1-runtime, `Game.init()` awaits `assets.preload()` (the kit's module downloads) after the constructor starts and before the world builds, so world build and world ready include it; on the local test server that is small, on a real network it is not, hence the absolute +1 s on boot total |
| **high** | ≤ 1.25 × classic high = **1,539 ms** | ≤ 1.25 × = 1,113 ms | ≤ classic + 1,000 ms = **2,877 ms** | same |

## 3. Per-asset budgets for the contract test (AAA-7)

### Detail tiers

Proposed handover distances (camera to asset centre), for Phase 1 to fix in
the runtime: **hero < 12 m, mid 12–45 m, far ≥ 45 m**. The valley rim is at
r ≈ 39–46 m, so `far` is the rim and beyond.

### How many objects a view holds

One medium-tier boot, the four spots (`_baseline/perf/inview-bands.json`):
`city.colliders` boxes inside the camera frustum, by distance from the camera
(645 colliders in the valley; a collider is a proxy for one placed object,
and over-counts, because fence runs and buildings have several):

| Spot | hero (< 12 m) | mid (12–45 m) | far (≥ 45 m) |
|---|---:|---:|---:|
| street | 10 | 70 | 161 |
| shrine | 14 | 71 | 0 |
| river | 6 | 77 | 19 |
| meadow | 6 | 81 | 192 |
| worst of each band | **14** | **81** | **192** |

### The shadow pass counts twice

`renderer.info` counts a shadow-casting mesh again in the shadow pass on
every shadow-map refresh. The sun's shadow camera is a 76 m × 76 m box
centred on the cat (`sky.js`), so near enough every caster in the valley is
in it. Per frame, a caster's triangles and draw calls therefore cost:

| | medium (refresh every 2nd frame) | high (refresh every frame) |
|---|---|---|
| amortised (what the mean budget sees) | **× 1.5** | **× 2** |
| on a refresh frame | × 2 | × 2 |

The caps below assume the worst case: every in-view object is a kit asset at
its band's largest cap, all of them cast shadows, and nothing is subtracted
for the classic geometry they replace. Real views mix in props far below the
largest caps, so there is margin.

### Triangles, draw calls and build time per asset

Classic reference per class from `perf.md` → "Per-asset classic costs"
(median, max in brackets; build ms on the quiet machine). Caps are per
instance, as built at that tier:

| Class | Classic triangles | Triangles: hero / mid / far | Classic build ms | Build ms, first build of a variant: hero / mid / far |
|---|---|---|---|---|
| Small prop (≤ ~1.5 m: tōrō, chōchin, crates, barrels, bells, chimes, items, nest) | ~150 (656) | **5,000 / 1,200 / 250** | 0.0–0.2 (items up to 0.9) | **1.5 / 0.75 / 0.4** |
| Structure (1.5–6 m: torii, a fence run, bridge, gate, altar, shishi-odoshi) | ~430 (4,354 for the whole corral) | **12,000 / 3,000 / 600** | 0.1–0.3 (corral 2.7) | **3 / 1.5 / 0.75** |
| Building or landmark (> 6 m: machiya, tea house, residence, shrine hall, pagoda) | ~3,950 (5,318) | **25,000 / 6,000 / 1,000** | 0.4–1.1 | **6 / 3 / 1.5** |
| Tree (sakura, maple, pine, rim tree) | ~7,200 (10,926) | **25,000 / 6,000 / 1,000** | 0.7–2.7 | **5 / 2.5 / 1** |
| Character (cats; Phase 3) | ~120,000 (123,876) | **130,000 / 32,000 / 8,000** | 2.8–3.6 | **8 / 4 / 2** |

- **Repeat instances.** A second instance of the same variant (same params)
  shares geometry and materials: ≤ **0.1 ms** to build (classic small props
  build in 0.0–0.2 ms each).
- **Mid trees sit below the classic sakura on purpose** (6,000 against
  10,926): mid is the band that fills the view (81 objects).
- **Characters** replace the four classic cats one for one at about the
  classic cost (≤ classic + 5 % at hero), so they spend almost none of the
  headroom.
- **Materials per asset** (as built, before the valley merge): ≤ **6 / 4 / 2**
  distinct materials, all from `MAT` / `KitMaterials` so `_mergeStatics()`
  merges them. **New merged materials:** at most **11** beyond the classic
  `MAT` set, for the whole kit, shared by all families (derivation below).
- **Live meshes** (kept out of the merge: animated or glowing): ≤ **2** per
  hero instance, **0** per mid or far instance (animate those through the
  family's shared instanced or merged mesh: ≤ **2** shared live draw calls
  per family). Live meshes **do not cast shadows**; one that must, counts
  twice against these numbers.

### Why these numbers fit the scene budget (re-checked with the shadow pass)

- **Triangles, worst case** (largest cap per band: 25,000 / 6,000 / 1,000):
  14 × 25,000 + 81 × 6,000 + 192 × 1,000 = **1,028,000** before shadows.
  - medium, amortised × 1.5: **1,542,000 ≤ 1,841,013**, the tightest medium
    headroom (river). Margin 0.30 M.
  - high, × 2: **2,056,000 ≤ 2,078,783**, the tightest high headroom
    (river, 0.3 × 6,929,277). Margin 23 k: tight, by design of the worst case.
  - The previous caps (40,000 / 10,000 / 2,000, base 1,754,000) passed only
    because the shadow pass was ignored: × 1.5 = 2.63 M > 1.84 M and
    × 2 = 3.51 M > 2.08 M. They are withdrawn.
- **Draw calls, worst case** (20 kit families, the wave 2.1–2.3 lanes, all in
  view): hero live meshes 14 × 2 = 28, family shared live calls 20 × 2 = 40,
  neither casting shadows: 68. New merged materials M, each one merged mesh
  valley-wide that casts shadows:
  - medium: 68 + 1.5 M ≤ 104 (river) → M ≤ 24;
  - high: 68 + 2 M ≤ 90 (shrine) → **M ≤ 11**, the binding limit.
- **Build time.** The medium budget allows +25 % of world build: 224 ms.
  Worst case, 40 distinct variants first-built at hero (8 buildings × 6 ms +
  6 trees × 5 + 12 structures × 3 + 14 props × 1.5 = 135 ms) plus 600 repeat
  instances × 0.1 ms (60 ms) = **195 ms ≤ 224 ms**. Characters replace classic
  cats that already cost 2.8–3.6 ms each.

### Caveat for Phase 1: merged statics are not culled per object

Classic `Countryside._mergeStatics()` pass 1 merges every eligible static
mesh in the whole valley into one world-space mesh per material, with no
spatial cells. A merged mesh is drawn (and drawn into the shadow map) in full
whenever any part of it is in view. So kit geometry that joins that merge
costs its **valley-wide** triangle total, × 1.5 or × 2 for the shadow pass,
on every frame, at whatever tier it was built, and cannot switch tiers by
distance later; the in-view counts above then understate it. The scene
budgets in §1 are therefore the binding gate; the per-asset caps keep any
one asset from breaking them. The runtime (`f1-runtime`) has to decide how
tiered assets merge (per tier per chunk, or only `far` merges and `hero` /
`mid` stay live, or tier chosen at build time by quality); whichever it
picks, re-run `tools/perf_spots.mjs` in the same session as classic to prove
§1.

## 4. Kit materials (ruling R39, gate G-V1)

The cap in section 3 is **at most 11 new merged materials for the whole
kit**. A merged material is one draw for the whole valley (plus its shadow
draw), whatever family built the meshes on it; a kit material that only ever
sits on one static mesh costs the same draw, so it counts too. Kit materials
that only sit on unmerged meshes (pickups the game holds by reference, `live`
meshes, instancing) do not join the merge and are budgeted as live draws
instead (section 3, "Live meshes").

**Census (2026-11-13, G-V1 chores).** Every `KitMaterials._once` call was
recorded with its calling family (stack trace) in a headless boot of the
whole game on `?assets=modular`, all nine merged families on (the eight
wave-2.1 families plus `pagoda`, wave 2.2), at quality high and medium; then
every scene object on a kit material was counted. The instrumented copy and
scripts are outside the repo (`michi-wt/_scratch/gate-v1-chores/`). High and
medium create the same materials.

| | before | after |
|---|---:|---:|
| Kit materials created | 21 | 16 |
| … on static meshes (merged, or a single static mesh) | 15 | **11** |
| … only on pickups / live / instanced meshes | 6 | 5 |
| Scene objects on kit materials (valley-wide, high) | 38 | 36 |

**Dedupes made** (identical or visually equivalent arguments; L6 re-shoots in
`docs/fable/baseline/gv1-materials/`, classic / modular before / modular
after, hours 12 and 18; before→after pixel diffs at 960 × 600):

| Change | Families | Before → after pixels (max Δ, pixels > 8) |
|---|---|---|
| Pagoda `bag({ rough: 0.78, brush: 0.05 })` → the nest's `bag({ rough: 0.9, brush: 0.1 })` (`shared('matte')`) | pagoda | 20, 3,170 (noon, 10 m from the tower, nearer than any player stands); 16, 33 (dusk) |
| Shishi stake/feed `bamboo({ color: 0x82914b, rough: 0.48 })` → the fences' straw `bamboo` with the green in vertex colour | garden | 1, 0; 8, 0 |
| Corral-sign post `bamboo({ color: 0x8a7242 })` → the same, colour in vertex colour (exact in linear space) | fences | post region 4, 0 |
| Corral-sign board kit `wood({ base: 0x9b7a4e })` → the classic sign's own `MAT.timberLight` (`0x9a744c`) | fences | 33, 3,947; 64, 5,859: the grain on the board's 7 cm rim (the face covers the rest); colour within 1 % |
| Grove lower culms `bamboo({ color: 0xa9c06a })` → the straw `bamboo`, colour in the instance colour (ruling R38 assumed this was already one material; it was not: the fences default to straw) | greenery | 7, 0 |

Geometry is byte-identical everywhere else (a geometry-only hash of every
asset × tier: alley, keepsakes, lanterns, nest, rocks, fences' bamboo-fence
and corral, garden's wind-chime, greenery's bushes and moss unchanged; the
pagoda's geometry unchanged, material only). Colliders, platforms,
exclusions, anchors and water rects are unchanged (modular footprint digest).

**The 11 merged kit materials** are named in `src/kit/materials.js`
`KIT_SHARED` (use `km.shared(name)`; carry your own colour in vertex or
instance colour with `tintToward()` / `tintGeometry()`), plus the corral
sign's painted face (a private map):

| Name | Factory call | Families | Objects (high) | Triangles high / medium |
|---|---|---|---|---:|
| `bamboo` | `bamboo({ color: 0xd2b87c, vcol: true, rough: 0.5 })` | fences, garden, greenery (instanced groves) | 1 baked + 1 + 2 instanced | 136,392 / 66,512 |
| `matte` | `bag({ rough: 0.9, brush: 0.1 })` | nest, pagoda | 2 baked | 18,284 / 3,970 |
| `crate` | `bag({ rough: 0.85, grime: 0.4, grimeH: 0.3 })` | alley | 1 baked | 7,840 / 4,824 |
| `cord` | `plain(0x2a2017, { rough: 1 })` | fences | 1 baked | 58,688 / 31,380 |
| `darkWood` | `wood({ base: 0x4a3320, dark: 0x2a1a10 })` | fences (sign cap, far sign) | 1 | 24 / 15 |
| `stone` | `stone()` | lanterns | 1 baked + 5 (pool tōrō, hidden places has no merge pass) | 4,722 / 3,726 |
| `basinStone` | `stone({ tint: 0x77736a })` | garden | 1 baked | 928 / 504 |
| `rock` | `rock({ moss: 0.4, lichen: 0.22 })` | rocks | 1 baked | 3,080 / 1,520 |
| `rockDark` | `rock({ a: 0x45433e, b: 0x7d786d, moss: 0.4, lichen: 0.15 })` | rocks | 1 baked | 1,940 / 960 |
| `moss` | `moss()` | greenery | 1 | 1,302 / 930 |
| (sign face) | `paper({ map: <sign face> })` | fences | 1 | 2 / 2 |

Unmerged by design (5): the keepsakes' `bag` finishes for yarn (10 pickups),
fish (3) and dango (1), held by reference as collectibles; the shishi's hero
tube `bamboo` (DoubleSide, live) and the fūrin strip `paper` (live).

**Draws kit materials cost at the four spots** (scene objects on a kit
material inside the camera frustum, plus shadow casters inside the sun's
shadow frustum; one boot each, hour 10.5, perf_spots' camera). Medium refreshes
shadows every second frame, so its amortised cost is main + shadow / 2:

| Spot | high before | high after | medium before | medium after |
|---|---|---|---|---|
| street | 20 + 33 = 53 | 19 + 31 = 50 | 20 + 33 = 53 | 19 + 31 = 50 |
| shrine | 10 + 29 = 39 | 10 + 27 = 37 | 10 + 29 = 39 | 10 + 27 = 37 |
| river | 10 + 28 = 38 | 10 + 26 = 36 | 10 + 28 = 38 | 10 + 26 = 36 |
| meadow | 18 + 33 = 51 | 17 + 31 = 48 | 18 + 33 = 51 | 17 + 31 = 48 |

Whole-scene draw calls and triangles, classic against modular at the four
spots on all three tiers, are in `perf_gv1.md`.

**Headroom and the rule for wave 2.2 on.** After wave 2.1 and the pagoda
the kit is **at the cap: 11 of 11**. A lane reuses a `KIT_SHARED` material
(colour in vertex or instance colour) or a `ctx.MAT` material; it may not add
a merged material on its own (this replaces ruling R26's "one per family
without asking"). A new one needs an Integrator ruling backed by a same-session
`perf_spots` run at the shrine spot on high (the binding spot), or it must
retire one. Recommendation for the operator: the cap is a proxy for draw
calls derived from a worst case (68 live draws, every merged material in view
and casting); the gate that matters is section 1, measured per spot in
`perf_gv1.md`. If later lanes need more materials, re-derive the cap from
measured draws rather than raising it by fiat.

**Known per-asset overrun (G-V1).** The contract samples `bamboo-fence` on a
3.4 m run; the valley's longest runs (about 11 m) build 12,660 triangles at
`mid` against the 6,000 cap (hero 22,638 ≤ 25,000, far 568 ≤ 1,000). The
scene budgets hold with it (`perf_gv1.md`); it needs a ruling: a
`BUDGET_EXCEPTIONS` entry or a lighter mid culm, and a contract sample that is
the longest run.
