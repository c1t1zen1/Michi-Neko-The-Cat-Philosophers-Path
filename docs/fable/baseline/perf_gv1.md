# Gate G-V1 performance: the eight wave-2.1 families (and the pagoda) on modular

Gate G-V1 (guide §9): "budgets (D1) hold with the eight families on
`modular`". This file is the same-session measurement that judges it against
`budgets.md` section 1, taken by the G-V1 chores (Integrator delegate) on
`fable/integration` after the helper moves, the material reconciliation and
the contract-count fix (code at `a964169` (game code identical to the chores' last commit: later commits change tests and docs only)).

**What `?assets=modular` turns on.** Every family registered in
`src/kit/index.js`: the eight wave-2.1 families (rocks, lanterns, fences,
garden, greenery, alley, keepsakes, nest) **and `pagoda`**, which is a wave
2.2 lane but already merged. The pagoda is therefore inside every modular
number below; its own delta (v-pagoda report) was a saving (the classic
pagoda is about 80 unmerged meshes, the kit one merges into one draw).

**Machine and method.** Apple M5 Max, headless Chromium on Metal
(`ANGLE Metal`), 1200 × 750, hour 10.5, clear weather, the four fixed spots
of `tools/perf_spots.mjs`; 3 boots per set and tier, boots interleaved
(classic low, medium, high, then modular low, medium, high, three times), so
both sets saw the same machine. The machine was not idle: other lanes were
running (1-minute load average 2.79–5.83 at boot starts). Frame-time rows are
provisional for that reason (budgets.md); draw calls and triangles are not
load-sensitive.

```sh
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright
node tools/perf_spots.mjs --url-suffix "" --url-suffix "?assets=modular" --out perf_gv1.json
```

Raw data (outside the repo, ruling R8):
`/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/gate-v1-chores/perf_gv1.json`
(and `perf_gv1.log`, the run's own log and tables).

**The rules (budgets.md section 1), judged on per-frame means (draw calls,
triangles) and amortised frame ms, medians of the three boots:**

- medium modular ≤ classic **high** (calls, triangles, frame ms);
- high modular ≤ 1.2 × classic high (calls, frame ms), ≤ 1.3 × (triangles);
- low: `low` never loads the kit. `?assets=modular` is a developer override
  that forces the kit even on low (guide §3.1), so the low rows below are
  information; the rule itself is checked on the setting path (`assetSet:
  'modular'` saved with quality low resolves to classic and loads no family).

## Scene budgets: classic against modular, same session

| Spot | Tier | Classic calls, mean (boot min–max) | Modular calls | Δ calls | Classic tris | Modular tris | Classic frame ms (amortised) | Modular frame ms | Rule |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| street | low | 520 (502–525) | 472 (462–475) | -48 | 5.10 M | 4.90 M | 6.35 | 6.60 | info only (kit forced by `?assets=`) |
| street | medium | 600 (576–601) | 555 (552–555) | -45 | 6.08 M | 6.08 M | 9.85 | 9.85 | ≤ classic high: **holds** |
| street | high | 765 (760–777) | 697 (694–702) | -68 | 8.12 M | 8.71 M | 11.00 | 11.45 | ≤ 1.2 × / 1.3 × classic high: **holds** |
| shrine | low | 258 (257–259) | 255 (254–255) | -3 | 4.11 M | 4.00 M | 5.73 | 5.95 | info only (kit forced by `?assets=`) |
| shrine | medium | 311 (310–313) | 305 (305–306) | -6 | 5.04 M | 5.13 M | 6.95 | 7.73 | ≤ classic high: **holds** |
| shrine | high | 449 (448–449) | 436 (434–442) | -13 | 7.06 M | 7.54 M | 10.10 | 9.70 | ≤ 1.2 × / 1.3 × classic high: **holds** |
| river | low | 429 (423–468) | 420 (402–449) | -9 | 4.22 M | 4.11 M | 6.95 | 7.22 | info only (kit forced by `?assets=`) |
| river | medium | 470 (468–516) | 399 (382–458) | -71 | 5.09 M | 5.17 M | 7.80 | 8.50 | ≤ classic high: **holds** |
| river | high | 653 (632–654) | 597 (567–605) | -56 | 6.93 M | 7.43 M | 10.50 | 10.40 | ≤ 1.2 × / 1.3 × classic high: **holds** |
| meadow | low | 485 (483–485) | 444 (443–445) | -41 | 4.73 M | 4.59 M | 7.98 | 6.80 | info only (kit forced by `?assets=`) |
| meadow | medium | 557 (557–558) | 518 (518–518) | -39 | 5.64 M | 5.71 M | 9.15 | 9.15 | ≤ classic high: **holds** |
| meadow | high | 731 (730–732) | 659 (658–660) | -72 | 7.53 M | 8.09 M | 10.40 | 10.00 | ≤ 1.2 × / 1.3 × classic high: **holds** |

Calls and triangles are per-frame means over the shadow cycle; frame ms is
amortised (budgets.md, "Use amortised values"). Every row is the median of
three boots; the calls column shows the boot range.

**Verdict: the budgets hold at every spot on medium and high. No breach, so no
family had to be swapped out one at a time.**

| Rule | Worst spot | Value |
|---|---|---|
| medium modular calls ≤ classic high | shrine | 305 ≤ 449 |
| medium modular triangles ≤ classic high | river | 5.17 M ≤ 6.93 M |
| medium modular frame ms ≤ classic high | shrine | 7.73 ≤ 10.10 |
| high modular calls ≤ 1.2 × classic high | shrine | 436 = 0.97 × 449 |
| high modular triangles ≤ 1.3 × classic high | street, meadow | 1.073 × (8.71 M against 8.12 M) |
| high modular frame ms ≤ 1.2 × classic high | street | 1.04 × (11.45 against 11.00) |

The medium target in budgets.md (not a gate: spend no more than half of the
headroom between classic medium and classic high) holds too: draw calls go
down at every spot (−6 to −71), triangles use 0–4 % of the headroom, frame
time 0–26 % (shrine 7.73 against 6.95 ms, river 8.50 against 7.80 ms, on a
loaded machine).

Peaks: on a shadow-refresh frame modular is also below classic at every spot
(high: street 702 against 765 calls, shrine 436 / 448, river 598 / 651,
meadow 659 / 731; medium: 702 / 783, 440 / 449, 527 / 632, 654 / 729). The
high-tier frame-time p90 is higher on modular at street (13.8 against 12.3 ms),
river (12.8 / 11.7) and meadow (14.0 / 11.7) and lower at the shrine; the
amortised values that the budget judges are within 4 %. Re-measure on an idle
machine before reading anything into the p90.

### Why the numbers move

- **Draw calls fall** at every spot because the kit merges what classic drew
  piece by piece: the classic distant pagoda is about 80 unmerged meshes and
  the kit tower is one merged draw (v-pagoda); fences, corral, crates, nest,
  boulders, the shishi basin and the lantern stone bake into one draw per
  kit material (ruling R36); the material reconciliation (budgets.md
  section 4) took the kit from 15 to 11 merged materials.
- **Triangles rise** by 0–0.1 M on medium and 0.5–0.6 M on high (+7 %, inside
  the 1.3 × rule): merged statics are not culled per object, so the hero
  fences (about 114 k triangles valley-wide), the nest (12 k) and the rest
  are drawn, with their shadows, from every spot.
- **The pagoda (wave 2.2)** is inside every modular row: it is merged and on,
  like the eight wave-2.1 families.

## World build (section 2), same session

Median of three boots (ms). The machine was loaded, so the classic baseline
itself is slower than in `perf.md`; the same-session ratio is the rule.

| Tier | Classic world ready / build / boot total | Modular world ready / build / boot total | Rule (× classic, same session) |
|---|---|---|---|
| low | 1,485 / 1,051 / 2,188 | 1,402 / 1,014 / 2,044 | info only (`?assets=` forces the kit on low) |
| medium | 1,372 / 983 / 2,326 | 1,693 / 1,170 / 2,334 | ready 1.23 × ≤ 1.25, build 1.19 × ≤ 1.25, boot +8 ms ≤ +1,000: **holds** (ready is close) |
| high | 1,425 / 1,039 / 2,122 | 1,542 / 1,113 / 2,193 | ready 1.08 ×, build 1.07 ×, boot +71 ms: **holds** |

Against the absolute numbers in budgets.md (taken on a quieter machine) the
medium world ready (1,693 ms) is above 1,573 ms; budgets.md says to prefer the
same-session comparison for build time, and that holds. World-ready time is
the medium tier's tightest margin: watch it as wave 2.2 adds families.

## Low never loads the kit (the low rule)

Saved settings `{"quality":"low","assetSet":"modular"}`, no URL flag:

```
node tools/headless.mjs /index.html --session catwalk_autostart=new \
  --local 'catwalk_settings_v1={"quality":"low","assetSet":"modular"}' \
  --wait "window.game?._bootDissolved && game.menu.isPlaying" --eval "…"
→ {"quality":"low","stored":"modular","set":"classic","loaded":false,"instances":0,"kitScripts":[]}
```

No kit module, `materials.js` or `kit-overrides.json` was requested. The low
rows of the table above force the kit with `?assets=modular` (a developer
override, guide §3.1); even then draw calls and triangles go down.

## Kit-material draws per spot

Counted objects on kit materials, main pass plus shadow casters, before and
after the G-V1 material reconciliation: budgets.md section 4.

## Known per-asset overrun on a real layout (not in the contract sample)

`bamboo-fence` (v-fences) is tested by the contract on a 3.4 m sample; the
valley builds runs of up to about 11 m. Measured through the kit runtime
(`countScene`, the fence's own builder, real lengths 7.3 / 9.9 / 10.9 / 11.0 m):

| Tier | 3.4 m (old sample) | 11.0 m (longest real run) | Cap |
|---|---:|---:|---:|
| hero | 7,504 | 22,638 | 25,000 |
| mid | 4,200 | **12,660** | 6,000 |
| far | 192 | 568 | 1,000 |

**Outcome (ruling R51, G-V2 chores):** the contract sample is now the real
11.0 m run (`src/kit/fences/fence.js`, `sample` `len = 11.0`), so the
exception is exercised: measured through `kit_contract_test --asset
bamboo-fence` (hero / mid / far) 22,638 / 12,660 / 568 triangles against
25,000 / 13,000 (`BUDGET_EXCEPTIONS`) / 1,000. At 11 m the warm build is 8 to
11 ms on a loaded machine (71 culms, 138 knots), over the 6 / 3 ms allowance,
so the same exception carries `buildMs: 14` for hero and mid (first build
only; the valley builds each run once).
