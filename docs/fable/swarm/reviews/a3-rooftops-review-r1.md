# a3-rooftops review, fix round 1 (ef6adad..a840f43)

Verdict: Needs fixes. Critical 0, Important 1, Minor 5.

## Important
1. src/kit/budgets.js (roof-distant-city row, `far: { triangles: 90000, buildMs: 6 }`): the buildMs 6 is set from a loaded contract pass (load 3.2 and 2.3; the status file says "no failure reported at 6", not a measured value). R54/R85 forbid setting a budget from a loaded reading and require a median-of-3 quiet read. Either re-read at load < 2 and cite the numbers, or keep the default far cap until then. The `why` is honest about classic (7,956 houses / 79,560 tris / 2 meshes / 2 materials) but then says the far tier "keeps classic coverage": the kit has about 5,900 instances (74% of classic) at about 82,000 tris, which is above classic's triangles with fewer houses. Say "about 74% of classic's houses" instead of "classic density".

## Minor
- src/kit/rooffestival/city.js (Soup.tri, `v ** 2.2`): the linearisation applies to hero and mid as well as far, so their colours changed. The captures A/B only s 150/350/950 (far in practice), so hero/mid are unchecked. Classic is not touched, so this is not a golden risk.
- city.js far tier: deterministic (only ctx.rng; the jitter and tint come from rng draws). The instance count is lattice-dependent and unasserted. `mesh.name = ''` relies on the contract to name the part `asset:<id>/city`, which I did not verify.
- R52 at s=350: modular 202,202,202 against classic 200,199,203 (and 203, 206 earlier). The margin is within classic's own swing; the all-spots run (204 vs 206 and others) holds. The claim "modular <= classic" is accepted as noise-level, not proven; the integrator should re-measure once.
- Bicycle (roofs.js dressHouse, hero only, line 195 gate): decoration only. It is deterministic (hash1 of s0, no rng draw), sits in the seed>0.72 branch, which is disjoint from the bench branch (<0.3), and stays within the d+0.7 band the vines already use (d+0.8). Platforms come from level data, not meshes, so I found no routing or platform effect. Cost is about 1.5 ms on a machiya hero warm build. The 17-18 ms vs 15 cap failure also fails on the unchanged base (15.3/16.6), so I treat it as unverified contention, but the bicycle pushes the margin the wrong way. Re-read at a quiet machine.
- Skipped checks: no game boot (classic or modular) after the change. The footprint and rooftop goldens were not re-run per the instructions. A boot is cheap insurance for the shared kit material and instancing path.

## Handoff patch (runview.js finale)
Syntactically fine (lazy `tmpV2`, `c` is then a Vector3 copy, so the `c.x` uses below stay valid), but NOT safe to apply blind. It changes the camera for classic and the pocket alike, depends on `guideRoot.position` being meaningful during the finale (the sandbox `skipFinale` card hides the cats; it is unproven that Chidori is placed when the camera runs), and the author states it is visually untested. Apply only by the Integrator/operator with a `?finale=1` sandbox and a pocket check. Fine to leave as a proposal.

## Checked as asked
- far-tier city: single InstancedMesh, matte shared material, classic untouched (build.js untouched, `ctx.tier==='far'` branch only).
- A.5 parity: the claim that audio is event or state driven and not mesh-tied is plausible; the missing hayashi/canal/kindle call sites are outside the roof families.
