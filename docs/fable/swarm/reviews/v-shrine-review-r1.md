# v-shrine review r1

### Spec Compliance
- ✅ Spec compliant. All 7 ids promoted, offering-box specimen (saisen-bako) added for L4, compare JPGs exist for every id (pairs differ per `cmp`), no `Math.random`/`Date.now`/labs imports in src/kit/shrine (grep).
- ⚠️ Not verified by me: the headless gameplay run (ringBell, touchAltar, thicket, bell pickup) was not re-run; I checked the handles by reading code (risk 2).

### Strengths
- Torii at default params sits correctly (lintel on both posts at dusk and day, torii-12/22 modular images). One kit-wide shimaki/kasagi curve, solved bearing height.
- Mist-altar keeps three private fade materials and the `plinth/bell/flame` part names that `_altarFadeMats` binds (countryside.js:3644). Offering-bells keeps collectible userData through the footprint lists.
- Footprint/platform numbers (4.91 / 5.29) preserved; one new merged material.

### Risk checks
1. Torii lintel (gate.js `solveGate`, lines 52-62). I evaluated the shimaki underside against the post top (H) at the post's inner and outer edge, across span 2.4-6, ext 0.4-1.8, lean 0-0.05, height 3.2-7, taper 0.6-1, post_r 0.12-0.4, all four sori. Default params (span 3.6, ext 1.3, lean .02, gentle): gap -0.024..-0.004 m = tight, slight embed, no visible gap. myojin default: +0.003 at outer edge (fine). Out of default: gap grows with sori and post radius: gentle up to +0.047, myojin +0.108, deep +0.211 m (fat post_r 0.4, short ext 0.4); penetration up to -0.155 m (deep, inner edge). Cause: the underside is solved at the post centre only (topX uses `p.lean*p.height`, post top uses `p.lean*S.H`, line 59 vs 80) and ignores the beam's slope across the post width and the post radius. So "no gap, no intersection for the params range" is NOT met at the range extremes; only for default / gentle.
2. Interactions. Only bound handle in the shrine family is `mistAltar: '.'` plus `_altarFadeMats` parts `plinth.material/bell.material/flame.material` (countryside.js:3644-3647); altar.js:44-63 provides parts.plinth, bell, flame with identically named parts, all own transparent materials, opacity 0 initially. ringBell uses a fixed `shrinePoint` (context_actions.js:30,571), no bound part; hall/shimenawa/bell/box have no `layout.bind`. Offering bells: no bind; userData comes from footprint lists (3780), kit builds group. Clean. Far tier of the altar: bell shares stoneMat so `_altarFadeMats` lerps one material three times (faster, and flame x0.85 logic touches it); waived, never built at far in the valley, so Minor.
3. Shide / shimenawa. Classic `meshShimenawaClassic` (countryside.js:3962) is a single static cylinder with no shide and no animation; grep for sway in countryside.js finds only lanterns, bushes, chime. No sway exists to regress. Modular adds shide and tufts, static: AAA-5 not regressed. The report calls it a "waiver of the lab animation", which is fine (lab only).

### Issues
#### Critical
none
#### Important
- gate.js:52-62 and 80: lintel/post contact only solved for the post-centre and default-ish params; outside it, fat posts with myojin/deep sori leave up to 0.1-0.21 m gap (outer edge) and 0.16 m penetration (inner), exactly the card's construction fix and the s2-clearing reuse params. Fix: compute `Cb` at the real top x (`half - lean*H`, iterated once, not `lean*height`), and set the underside to the max (not centre) of C over [topX-r, topX+r] (or clamp the post top to that underside with an extended embed), or narrow the ranges (sori != deep, post_r*taper bound) and add a numeric test in kit_check for the solved gap across params. Brief says "for the params range, not just the default span".
#### Minor
- altar.js:60,68: far-tier shared material triples the fade lerp (waived, unreachable).
- Torii `NL = p.span + 2` nuki projection is fixed while ext param changes; nuki/kasagi platforms (4.91/5.29, ±2.8/3.1 m) stay fixed when span changes, fine for game, note for s2-clearing.
- hall night shot (shrine-hall-22) shows no distinct shimenawa; not blocking.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** Solid, spec-compliant kit with working gameplay handles and no animation regression, but the card-mandated lintel solve holds only at default/gentle parameters; at myojin/deep with large post radius a measurable gap/intersection appears within the declared param ranges.
