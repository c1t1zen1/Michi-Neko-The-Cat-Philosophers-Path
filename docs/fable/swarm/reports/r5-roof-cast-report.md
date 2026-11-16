# r5-roof-cast report (Claude Sonnet 5.5, Metal, load average about 3.5 throughout)

## Built
- `src/kit/roofcast/` (family `roofcast`): `roof-shoki` (7 extras, unmerged direct-child meshes `body` + `sword`; greeting swaps every child's material, child 0 turned by world.update, both verified in code), `roof-treats` (dish + fish children), `roof-villagers` (tiered port of people.js makeResident + downtown role props; registers the `people` record; hero 4 materials, mid 2, far 1; rigid parts baked per material; head, shoulder pivots and towel stay live).
- `src/characters/defs/chidori.js`: `CHIDORI` CharacterDef (Michi body, classic coat/ribbon/scale 0.86, dusk eye-shine, idle weights). A def, not a kit asset (a Cat cannot pass AAA-7/8/9: 116k tris, Math.random in sculpt), like luna/mochi/kuro.
- Deferred: `roof-boatman`, `roof-hayashi` (hosts takasebune/hoko have no kit piece; see handoff section 3).
- Handoff: `docs/fable/handoff/r5-roof-cast.md` (exact game.js patch for Chidori; the swap does nothing for her without it; production adapter row; `src/kit/index.js` NOT committed).

## Checks (real output)
- kit_check: All kit checks OK (459 passed) (with kit_index regenerated locally, uncommitted)
- kit_contract_test --family roofcast: 3 assets, 9 asset x tier builds, 197 checks, 0 failed; merge OK
- check_syntax: All 175 modules OK; verify: All checks passed; labs_check: All labs checks OK (committed state)
- cat_golden: EQUAL; rooftop_golden classic: EQUAL
- rooftop_golden swap=roof-shoki,roof-treats,roof-villagers: DIFFERENT, ROUTING FAILED. Changes: 7 Shoki root children, 40 villager pieces + root groups + their batches, 1 added material (km.bag). Routing reasons are exactly: "every other root child ... differ: 0,1,4,5,6" (the villager groups) and "materials identical" (the one added bag material). Nothing else changes. R52 justification in the handoff.
- rooftop_test: 38 passed, 2 failed (the baseline two, same names) on the committed state.
- rooftop_companion_test: pure Node physics, fails at "player reaches finale" (baseline; it aborts at the first failure, my code is not involved).
- `?auto=1` `qa=1` advanceForReview(450): classic s=1232.1749; all four ids swapped s=1232.1749 (identical), Chidori on the def (local game.js patch), moods saunter/dash/wait/detour/feint/prowl, no page errors.
- git diff --check origin/fable/integration...HEAD: clean.

## L6
`docs/fable/status/r5-roof-cast/`: for every promoted id pairs at day/dusk/night (`<id>-<day|dusk|night>-classic|modular.jpg`, 1200x750, all under 150 KB, none byte-identical) plus close-up probes (`roof-shoki-closeup`, `roof-treats-closeup`, rendered offscreen at 0.35 m height, since the page has no free camera). Page captures are not pixel repeatable (time loops). Judgement:
- Shoki: AAA-1 clearly better than the classic cone and ball (sleeves, sash, scowl, moustache, hat, sword); AAA-5 neutral (flat clay).
- Treats: the dishes are not in the page camera frames I could reach (hidden behind ridges); judged on the close-up: better (lip, tail, eye). Honest gap: no in-context treat capture.
- Villagers: AAA-1 equal to classic by design (a port; same faces); mid/far tiers new; meshes per hero resident 32 to about 11. AAA-5 equal. Found and fixed a black-eye artefact (low-poly face sphere sinking under the hair cap) via a head probe.
- Chidori: equal plus a dusk eye glint; a near-twin by construction. AAA-1/5 equal, modest value.

## Concerns
- Chidori is inert without the Integrator's game.js patch (handoff section 2; then run `node tools/labs_coverage.mjs --write`).
- Skin tone of the hero face reads a little darker than classic in the probe (same face material; lighting only).
- Boatman and hayashi deferred; the brief said build the boatman, but no kit boat exists to host or route it.
- The rooftop_golden routing self-test will report failed for the real villager swap (see above) until the Integrator exempts roof-villagers like r3's pieces.
