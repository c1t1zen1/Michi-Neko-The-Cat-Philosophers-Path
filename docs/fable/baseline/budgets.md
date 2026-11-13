# Budgets for the modular set (P0.5)

**Proposals — accepted provisionally under ruling D1.** Lanes build to them
now; the operator may change them, and G-V1 cannot pass until they are
accepted (guide §7, D1).

Every number is derived from `perf.md` (classic set, Apple M5 Max, headless
Chromium on Metal, 1200 × 750, hour 10.5, the four fixed spots). Budgets are
checked on the same machine, backend and viewport with the same tools:

```sh
node tools/perf_spots.mjs --url-suffix "?assets=modular" --out modular.json   # scene budgets (§1, §2)
node tools/perf_spots.mjs --assets --out assets.json                          # classic per-asset reference
# per-asset budgets (§3) are checked by tools/kit_contract_test.html (Phase 1, AAA-7)
```

They are **not** phone or low-end budgets. The low tier is protected by
construction instead: quality `low` always resolves to the classic set and
never downloads the kit (guide §3.1, §3.6).

## 1. Scene budgets per tier (whole frame, per spot)

Classic medians from `perf.md` (frame ms is GPU-synced; draw calls and
triangles are per whole frame, all passes):

| Spot | low: ms / calls / triangles | medium: ms / calls / triangles | high: ms / calls / triangles |
|---|---|---|---|
| street | 10.55 / 505 / 5.03 M | 13.50 / 589 / 6.02 M | 18.90 / 781 / 8.17 M |
| shrine | 8.80 / 258 / 4.11 M | 10.40 / 309 / 5.03 M | 16.20 / 448 / 7.04 M |
| river | 10.10 / 420 / 4.22 M | 12.50 / 492 / 5.09 M | 17.10 / 661 / 6.94 M |
| meadow | 10.20 / 485 / 4.73 M | 12.30 / 558 / 5.64 M | 17.50 / 734 / 7.53 M |

Proposed budgets for the **modular** set, per spot:

| Tier | Frame ms (median, GPU-synced) | Draw calls (frame) | Triangles (frame) | Rule |
|---|---|---|---|---|
| **low** | = classic low (within its round-median range) | = classic low ±2 % | = classic low ±2 % | `low` never loads the kit. Any change here means the kit leaked into `low`: a bug, not a budget question. (±2 % is the boot-to-boot spread: street triangles 4.99–5.05 M, calls 502–514.) |
| **medium** | ≤ classic high: street 18.9, shrine 16.2, river 17.1, meadow 17.5 | ≤ classic high: 781 / 448 / 661 / 734 | ≤ classic high: 8.17 / 7.04 / 6.94 / 7.53 M | The guide's rule. Target (not a gate): no more than half of that headroom, i.e. ≤ midway between classic medium and classic high |
| **high** | ≤ 1.2 × classic high: 22.7 / 19.4 / 20.5 / 21.0 | ≤ 1.2 × classic high: 937 / 538 / 793 / 881 | ≤ 1.3 × classic high: 10.6 / 9.15 / 9.02 / 9.79 M | High is opt-in for strong GPUs. 1.2 × keeps its GPU wait (11–13 ms classic) under ~16 ms on this machine, i.e. in the same 60 fps class |

The headroom this gives the kit on **medium** (classic high − classic
medium), which sizes the per-asset budgets in §3:

| Spot | Frame ms | Draw calls | Triangles |
|---|---:|---:|---:|
| street | +5.4 | +192 | +2.15 M |
| shrine | +5.8 | **+139** | +2.01 M |
| river | **+4.6** | +169 | **+1.85 M** |
| meadow | +5.2 | +176 | +1.89 M |

A modular run passes a spot when its median frame ms, frame draw calls and
frame triangles are within the row above for its tier. Because GPU
contention inflates single runs (see `perf.md`, "Reading the numbers"),
re-measure a failing spot on a quiet machine before calling it a regression,
and compare medians, never p90s.

## 2. World build budgets per tier

Classic (median of 3 boots, `perf.md`): world ready (constructor → first
frame) low 2,786 / medium 2,888 / high 3,259 ms; world build (constructor →
its closing `loop()`) 1,984 / 1,724 / 2,105 ms; boot total (engine start →
first frame) 3,879 / 3,774 / 4,357 ms.

| Tier | World ready | World build | Boot total | Rule |
|---|---|---|---|---|
| **low** | = classic low (2.7–3.3 s range) | = classic | = classic | the kit is never loaded |
| **medium** | ≤ 1.25 × classic medium = **3,610 ms** | ≤ 1.25 × = 2,155 ms | ≤ classic + 1,000 ms = **4,774 ms** | +25 % is about +0.5 s of building behind the boot screen. Boot total also carries the kit's module downloads (`runtime.preload()` runs before the constructor), hence an absolute +1 s |
| **high** | ≤ 1.25 × classic high = **4,074 ms** | ≤ 1.25 × = 2,631 ms | ≤ classic + 1,000 ms = **5,357 ms** | same |

## 3. Per-asset budgets for the contract test (AAA-7)

### Detail tiers

Proposed handover distances (camera to asset centre), for Phase 1 to fix in
the runtime: **hero < 12 m, mid 12–45 m, far ≥ 45 m**. The valley rim is at
r ≈ 39–46 m, so `far` is the rim and beyond.

### How many assets a view holds

Measured on a medium-tier boot at the four spots (scratch script, one boot):
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

### Triangles, draw calls and build time per asset

Classic reference per class from `perf.md` → "Per-asset classic costs"
(median, max in brackets). The caps are per instance, as built at that tier:

| Class | Classic triangles | Triangles: hero / mid / far | Classic build ms | Build ms (first build of a variant): hero / mid / far |
|---|---|---|---|---|
| Small prop (≤ ~1.5 m: toro, chōchin, crates, barrels, bells, chimes, items, nest) | ~150 (656) | **6,000 / 1,500 / 300** | 0.1–0.5 (max 1.7) | **2 / 1 / 0.5** |
| Structure (1.5–6 m: torii, a fence run, bridge, gate, altar, shishi-odoshi) | ~430 (4,354 for the whole corral) | **16,000 / 4,000 / 800** | 0.3–1.7 (corral 5.9) | **4 / 2 / 1** |
| Building or landmark (> 6 m: machiya, tea house, residence, shrine hall, pagoda) | ~3,950 (5,318) | **40,000 / 10,000 / 2,000** | 0.8–2.2 | **12 / 5 / 2** |
| Tree (sakura, maple, pine, rim tree) | ~7,200 (10,926) | **30,000 / 8,000 / 1,500** | 1.5–6.4 | **10 / 4 / 1.5** |
| Character (cats; Phase 3) | ~120,000 (123,876) | **130,000 / 32,000 / 8,000** | 6.2–8.3 | **12 / 6 / 3** |

- **Repeat instances.** A second instance of the same variant (same params)
  must share geometry and materials: ≤ **0.2 ms** to build (classic small
  props build in 0.1–0.25 ms each).
- **Draw calls per asset** (as built, before the valley merge): distinct
  materials ≤ **6 / 4 / 2** (hero / mid / far), all of them kit materials
  registered in `MAT` so `_mergeStatics()` merges them; meshes kept out of
  the merge (`live`: animated or glowing) ≤ **3 / 1 / 0**.
- **Ratios.** mid = hero ÷ 4 and far ≈ hero ÷ 20 in triangles, roughly
  halving the linear detail per step; build time falls with them.

### Why these numbers fit the scene budget

- **Triangles.** Worst-case view, every object a building at the cap of its
  band: 14 × 40,000 + 81 × 10,000 + 192 × 2,000 = **1.75 M ≤ 1.85 M**, the
  tightest medium headroom (river). Real views mix in props and structures
  far below the building caps, and the classic geometry they replace is
  subtracted, so there is margin.
- **Draw calls.** Live meshes are the only per-instance draw calls once
  statics merge by material: 14 × 3 + 81 × 1 + 192 × 0 = **123 ≤ 139**, the
  tightest medium headroom (shrine). Each new kit material adds a merged draw
  call valley-wide, so families should share `KitMaterials`.
- **Build time.** The medium budget allows +25 % of world build, ~430 ms.
  For example 40 distinct variants × ~5 ms first builds (200 ms) plus ~600
  repeat instances × 0.2 ms (120 ms) = 320 ms ≤ 430 ms.

### Caveat for Phase 1: merged statics are not culled per object

Classic `Countryside._mergeStatics()` pass 1 merges every eligible static
mesh in the whole valley into one world-space mesh per material, with no
spatial cells. A merged mesh is drawn (and drawn into the shadow map) in full
whenever any part of it is in view. So kit geometry that joins that merge
costs its **valley-wide** triangle total on every frame, at whatever tier it
was built, and cannot switch tiers by distance later. The scene budgets in
§1 are therefore the binding gate; the per-asset caps keep any one asset from
breaking them. The runtime (`f1-runtime`) has to decide how tiered assets
merge (per tier per chunk, or only `far` merges and `hero`/`mid` stay live,
or tier chosen at build time by quality); whichever it picks, re-run
`tools/perf_spots.mjs` on the modular set to prove §1.
