# r3b-canal-market review r1
Verdict: APPROVED. Critical 0, Important 0, Minor 4.
Ran: contract roofcanal PASS; rooftop_golden classic EQUAL; modular golden changes only pieces(74)/root(4)/batches/update(5), none in platforms/walls/ceilings/lights; kit_check 456 OK (local kit_index, reverted); rooftop_test 38/2 baseline (autopilot stops s=1232.17); cadJS check 16/16; no Math.random/labs imports.
Ribbons: water piece tris/verts/bounds equal classic (976 tris, bounds identical across fillets). Water/foam transparent materials (depthWrite false); sorting is by render list, argument holds in effect (mergeByMaterial keys per material; same cells), castShadow/cameraObstacles both skip transparent, so no behavioural change. Argument's wording ("whichever group") is right; "never overlap" only eyeballed.
Boat: boatman/pole in sockets, scratch boat3.js drives world.update 600 frames and compares group matrix, wake, opacity, boatman y/z, pole z: credible, pole pivot included.
Minor:
1. Boat motion proof is scratch only (not in golden); handoff §6 offers hook. Add to tools/rooftop_golden.js later.
2. R52 proxy: visible-mesh counts ignore shadow-pass draws and are not repeatable evidence; tri/material equality plus 0 new merged materials is the sounder basis. Acceptable.
3. Kit boat group sits at layout spot until first update (classic at origin): root digest differs, harmless.
4. Cherry boughs bounds differ slightly from classic (kit rng streams), tris equal; parity not identity.
