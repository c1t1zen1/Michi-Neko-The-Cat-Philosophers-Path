# v-ranges review r1

### Spec Compliance
- ✅ Spec compliant for the code and contract points I could verify. Single-pass review of the diff; compare pairs opened: mountains-mid-18, edge-forest-mid-6, distant-village-mid-18 (classic and modular).
- Named risk 1 (kit parent must not build components): VERIFIED. src/kit/ranges/mountains.js builds only the `far` ring; no edge-forest, pagoda, village or mist import or build call. village.js and mist.js likewise build only themselves.
- Risk 2 (edgeForestTrunks): VERIFIED identical. The only readers are countryside.js:4321 (bind `edgeForestTrunks: 'trunks'`) and :4563 (`this.edgeForestTrunks.setMatrixAt(tr.trunkIdx, ...)` in setShrineThicketOpen, called from mountaintop.js:549/844). Kit `trunks` (forest.js, `mk('trunks', ..., trees.length, true)`) has one instance per tree in layout order, so trunkIdx = i holds. Thicket crown/branch sets are filled with `next++` in the same traversal order as classic (thicketSets), so `idx` matches. Trunk matrix (y = 0.6*sy, same rotTrunk and scale) matches classic. Thicket sets are `noChunk`, as classic. The trunk is tapered (flaredTrunk); geometry is centred 1.2 tall like the classic cylinder, so re-posing behaves the same. The status claim (21 colliders dropped) is consistent. Not verified here: the runtime run of setShrineThicketOpen (report only).
- Risk 3 (dawn mist fade): VERIFIED. mist.js buildDawnMist: opacity 0, `visible=false`, per-sprite SpriteMaterial and `mist_N` names, so countryside.js:4845-4860 (updateDawnMist: visible, position, `spr.material.opacity`) works unchanged. Scale is `layout.scale * p.size` (default 1, so equal to classic).
- Risk 4 (reusable builders): general and deterministic. ridgeRingGeometry takes heightAt, colorAt and radii; cacheKey memo clones the arrays. canopySet is seeded (`seeded(9000+v*31)`), cached, with the caveat in M3. No Math.random, Date.now or labs/ imports in src/kit/ranges (grep clean). terrainHeight/terrainSector ported from countryside.js:669-716 and compared line by line: identical.
- Budgets: committed numbers are plausible and equal the measured counts quoted in each `why` (mountains 57.8k classic / 30.7k far; edge-forest 1.696M / 1.713M; undergrowth 89.6k / 89.6k; foothill 189k / 167.8k far; village 1.14k / 1.62k). Modular is not gratuitously heavier at the tier the game builds: mountains far 30.7k < 57.8k; foothill far 167.8k < 189k; village +42% on 1.1k tris but 2 draws vs about 190; edge-forest +1% (flared 8x4 trunks), edge-undergrowth equal. Hero/mid tier ceilings above classic (foothill hero 430k = 2.3x, mountains hero 69k, set by the lab tiers) are not built by the game.
- ⚠️ Cannot verify from diff: the claim that the runtime calls `update(dt,t,env)` with `env.hour` for mist-ring (the hour tint); classic update() at countryside.js:5187 drives opacity only, so confirm the tint is not just dead code. Also the perf and boot numbers (report only).
- L4: gap specimens foothill-stands, village, mists added in labs/ranges with test_life.mjs (5 checks, pure data). Satisfied. L6: 56 pairs exist and none byte-identical (cmp run on all -classic/-modular pairs: no IDENT).

### Strengths
- Clean component discipline, the thicket bind contract preserved exactly, per-sprite materials kept so Countryside's fades work.
- Village: one baked mesh plus one window mesh (about 190 draws to 2) with a visible gable/eave gain in the pair.
- Budget exceptions carry measured classic vs modular counts. Honest self-assessment in the report (edge-forest "weak").
- landform.js is a legitimate general API for s3-vista (heightAt/colorAt injection, seam-wrapped polar grid, cliff eased out).

### Issues
#### Critical
- none
#### Important
- none
#### Minor
- M1 src/kit/ranges/landform.js:25-52 duplicates Countryside.terrainHeight/terrainSector. It is identical today, but no test asserts parity, and foothill trees and the village are placed from the game's height field while the ring is meshed from the port. Add a parity check (tools or kit test) or have the runtime pass `layout.heightAt` as the handoff suggests.
- M2 edge-forest modular is visibly different but not clearly better: in edge-forest-mid-6-modular.jpg the crown tops show a jagged, noisy silhouette and a gap at left against classic's smoother wall. Same crown recipe, so AAA-1 is not met (report admits this).
- M3 forest.js `canopySet` cache key is tier|fill|warmth with unbounded growth under param sweeps in the lab (never disposed by design); fine for the game, note for lab use.
- M4 mountains pair: mountains-mid-18 classic vs modular are indistinguishable by eye; the gain is below perception at distance.
- M5 village roofs in the modular pair read slightly flat-shaded and some roof colours look lighter than classic; acceptable.

### Recommendation (risk 5)
- Ship swap for: distant-village (clear gain, big draw-call win), foothill-forest (far tier cheaper than classic, tone gradient), mist-ring, dawn-mist (low risk, subtle), edge-undergrowth (equal cost, shape variety), mountains (cheaper far ring, risk-free, subtle, keep for the s3-vista reuse value).
- Defer edge-forest (keep classic default; leave the kit asset and its thicket-bind verification in place, selectable by `?swap=edge-forest:modular`). It is the heaviest cost surface (1.7M tris, 260 instances, the bound thicket gameplay path), the visible result is not better, and the mismatch with classic's silhouette is a regression risk. Undergrowth is a classic component of edge-forest and can swap independently. If the Integrator prefers to ship all seven, nothing here blocks it.

### Assessment
**Task quality:** Approved
**Reasoning:** The kit parent boundary, thicket handle, dawn fade and general builders all check out against the classic code, and the committed budget numbers match the measured counts. The only real doubt is value, not correctness: edge-forest (and mountains) add little, so defer edge-forest by default.
