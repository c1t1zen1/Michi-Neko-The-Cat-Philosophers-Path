# r5-roof-cast review r1
Spec: OK (boatman/hayashi deferral per R75). Quality: Approved. Critical 0, Important 0, Minor 2.
Checks run: kit_check 459 OK; contract roofcast 0 failed; cat_golden EQUAL; rooftop_golden classic 40/40 EQUAL; swap of the three ids: routing FAILED only for 40 villager pieces (+ index shift of batches: unmerged villager meshes are listed as batches) and 1 added material km.bag; rooftop_test 38/2 baseline (autopilot stall s=1232.17); cadJS npm run check 16/16; no Math.random/labs imports/colliders in src/kit/roofcast.
Chidori: def keeps palette/eyes/ribbon/scale 0.86; guide only uses Cat facade methods; section 2 patch classic-neutral (gated on setFor modular and not lowPower), keeps "guide = new mod.Cat(" anchor. Shoki body+sword are direct group children.
Minor: (1) rooftop_golden routing needs Integrator exemption for roof-villagers (like r3 pieces). (2) Treats lack an in-context L6 capture (close-up only); Chidori value modest.
