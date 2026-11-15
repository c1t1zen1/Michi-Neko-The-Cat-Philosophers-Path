# Handoff: r4-festival (family `rooffestival`)

Family `src/kit/rooffestival/` (`index.js`, `stalls.js`, `floats.js`, `pbag.js`), 7 assets, hero/mid/far. No hot file edited except
`src/kit/budgets.js` (BUDGET_EXCEPTIONS rows, the owning lane's grant per its own comment). `src/kit/index.js` is NOT committed:
run `node tools/kit_index.mjs`.

## Promoted (inventory id : classic builder : what it draws)
| id | piece type | notes |
|---|---|---|
| roof-yatai | yatai (+ downtown `decorateStall`, folded in: the kit instance replaces both) | awning, scalloped valance, front/back posts, counter + plank front, noren in three panels, fare, chochin, sign board, crate and parcels, wind chimes / masks / kingyo / kakigori / grill / ringo / matcha trimmings. Socket `light_0` = the classic `ctx.light(sm + 0.28w, y-0.3, d+0.7)` |
| roof-lantern-racks | rack | tier beams, posts, braces, lantern rows with caps. Socket `light_0` = `(0, 1.6, d+0.3)` |
| roof-hoko | float | wheels (spokes by tier), carriage, brocade panels with lace and fringe, deck, balustrade, brackets, pillars, eave, brocade curtains, roof, ridge, lantern frame, climb frame, mast, crescent, lashings, guy ropes. Live group (part `live_group`): 6 tassels + 3 seated hayashi; `dynamic.float = { group, tassels, musicians }` as the classic record. Sockets `light_deck`, `light_body` |
| roof-temple-gate | gate | posts on plinths, floor, beam, doors with stiles and studs, tsuma-iri roof, ridge, gable |
| roof-tsuiji | tsuiji | sujibei wall, two slopes, footing, eave boards, posts |
| roof-yama | yamaFloat | deck, tapestry skirts, chassis, wheels, stage, trunk, 48-leaf pine cloud (ctx.rng, not `hash1`), pads |
| roof-skyline-pagodas | extra (3 instances) | the pagoda family's `buildPagoda` (preset `valley`, far tier), H = 27 m x `layout.scale` (classic cones were 36 / 42.7 / 29.4 m; kit 36.5 / 43.2 / 29.7). Shared `matte` kit material: the ONE new merged material this lane adds (1 draw for the 3 pagodas); the kit pagoda is slimmer than the classic cones |

Every piece builds in the rail frame at the piece's middle from `layout.piece`; platforms, colliders, grab edges are not touched (level.js).
Nothing rises above a classic surface (rack finials sit under the beam top; yatai valance and posts are below the awning top; the hoko's
curtains hang under the eave and clear of the climb frame at x < -1.3). Materials are the Roof Road's `ctx.MAT` set (0 new, besides `matte`);
a `km.plain` stand-in exists only for the contract page, whose MAT is the valley's.

## Deferred, with reasons
- **roof-distant-city**: one InstancedMesh pair of ~6,800 roofs and walls; the per-asset triangle budget counts every instance (about 130k tris against a far cap of 1k), so it needs a BUDGET_EXCEPTIONS row with the real instance counts and a decision on density. Next lane (-b), with `layout.bounds` / `layout.route` (already in `extraLayout`).
- **roof-sky, roof-hills, roof-okuribi** (`sky.js`, the five fires, the finale) and **roof-atmosphere** (`atmosphere.js`): not routed through `assets.build`; they need `sky.js` / `atmosphere.js` / `game.js` edits no lane owns (R57). Promoting them needs an Integrator patch that adds `assets.build('roof-okuribi', extraLayout(...), classic)` around `buildFires` in `sky.js`, and one around `buildHills`. The finale is untouched here: `?finale=1` is checked on both sets (status file).
- Hayashi (`roof-hayashi`) belongs to r5: this lane draws simple seated musicians inside the hoko (own geometry; `rooftops/js/people.js` is not importable from the kit). r5 can replace `musicians` through the same `dynamic.float` record.

## Integrator work
1. `node tools/kit_index.mjs` and commit `src/kit/index.js` (hot).
2. `budgets.js` rows added by this lane (see the diff): roof-yatai, roof-hoko, roof-temple-gate, roof-tsuiji, roof-yama. Reason: parts, not draws; the facade merges per material.
3. Optional: family filter for `?assets=modular` on the Roof Road page (r1 review minor 4).
4. Inventory rows for the 7 ids already exist (group Roof Road); `production` adapter ids for the catalog: `roof-yatai` ... use the id itself. Specimens: none added (the shelf `labs/roofroad/` already has these types; registry untouched).

## Footprint waivers
None: `layout.footprint` is empty and the kit returns the empty footprint.

## Golden
Classic EQUAL. With the 7 ids swapped (`--query "swap=<ids>"`): the 28 yatai/rack/float/gate/tsuiji/yamaFloat piece entries, the hoko's live group, the 3 pagoda root children, batches and update samples change, plus the one `kit:bag#1` material. The self-test's "every other piece / materials identical" rules trip on a real swap by design (r3 saw the same).
