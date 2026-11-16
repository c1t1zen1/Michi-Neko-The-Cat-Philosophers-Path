# v-keepsakes review r1

### Spec Compliance
- ✅ Spec compliant. Six ids promoted (src/kit/keepsakes/index.js assets[]), four gap specimens in lab 17 (treats.js), 60 compare JPGs present (60 files, all <=126 KB), handoff + status present, no hot-file edits listed, 0 new merged materials.
- ⚠️ Not verified here: kit_contract/golden results are the implementer's reported runs; hidden jade paw only judged in reveal-framed shots.

### Named-risk checks
1. Handle readers (grep of src/*.js): secretKeyMesh (context_actions.js:173-175,381; main.js:1118-1143,1220,1649; countryside.js:5091 spin/bob, position/visible only); corralRewardMesh (main.js:1124,1142; countryside.js:3553-3563 visible; main.js:1937 userData); collectibles (main.js:1148,1265-1269,1418,1641,1931-1964; context_actions.js:230-247,597) use position/userData/visible/scene.remove on the root, all of which the root group provides (footprint copies userData, jade stays visible=false). Pulse (countryside.js:5176-5180) reads `item.material` and the kit sets `group.material` (index.js yarn/dango/jade), so it still works. No reader touches item.geometry/isMesh. Charm and pickup use name-free userData flags (isCharm/isCorralReward).
   Interior fish: only readers of interior fishMesh are interior.js:157 (protectedRoots) and :758 (visible=false). Child `fish` holder is protected, so platter/garnish merge into statics and the fish stays an own mesh; eating hides the fish only, platter stays, as classic. Nothing reads fishMesh.name/position/parent. Secret-house fish (countryside.js:2431 binds '.', :2932 visible=false) binds the root; fine.
2. Key halo: grep `halo`/Halo in src: only lanternHalos and grass comments; countryside.js:2809-2812 creates the classic ring with no handle and nothing animates or toggles it. Removal is safe. Spin/bob and MAT.goldAntique pulse (5091-5100) act on root/shared material, unaffected.
3. Carried items: checkCollectibles (main.js:1265-1270, 1931-1946) only does scene.remove(item) + splice; batYarn (context_actions.js:558-566) sets position/userData.velocity on the root. No reparent or scale of the mesh, so a Group with children (yarn thread, key glint sprite, dango glow) survives.

### Strengths
- Root group carries gameplay identity (name, userData, bob, bat, protection from merge) so quest/pickup logic needs no change; `group.material` trick keeps the proximity pulse working.
- Key glint and dango glow dispose their own SpriteMaterials; fallback materials disposed only when created.
- Deterministic (seed from layout.id, no Math.random); jpgs show clear modular upgrades (key with ward bit, bream with garnish).

### Issues
#### Critical
none
#### Important
none
#### Minor
- src/kit/keepsakes/index.js (glintTexture): module-level cached texture is never disposed; harmless but a leak across kit reloads (flagged userData.kit, likely intentional).
- index.js buildDango: classic charm was a 0.14 octahedron; modular skewer is larger-looking (+glow sprite 0.5 m). Pickup radius is unchanged (1.0 m on root position) so no gameplay impact, noted for visual review.
- Interior-fish waiver moves the digest key to `.../fish`; the Integrator must accept that golden diff (already recorded).

### Assessment
**Task quality:** Approved
**Reasoning:** Every reader of the six handles needs only position/userData/visible/material on the root (or child fish for the room), all of which hold. The halo ring was never referenced, and nothing reparents or rescales carried items.
