# v-garden handoff
- `src/kit/index.js`: regenerate with `node tools/kit_index.mjs` (adds family `garden`).
- Inventory/catalog: `shishi` -> lab `garden/shishi`, `wind-chime` -> lab `garden/glass` (set `production` adapter ids to the same). Coverage rows unchanged.
- New part names: asset:shishi/{basin,water,feed,stake,post_l,post_r,axle,anvil,pebbles,rocker,stream,pour,frame (mid/far)}; asset:wind-chime/{cord,bell,clapper,tanzaku}. Bound: rocker (shishiRocker), group '.' (windChime), clapper.material (chimeClapperMat).
- Waiver: shishiRocker pivot y 0.48 -> 0.66 (anchors.handles.shishiRocker moves 0.18 m).
- Optional wiring (hot file, countryside.js): after placeAsset('shishi'), set `inst.onClack = () => audio.playClack()` once an audio call exists; none exists in classic today.
- No helpers to move into craft.js/materials.js. No new materials (km.stone/bamboo/plain/bronze/paper, MAT.water if present; private glass/stream/clapper materials disposed on dispose()).
