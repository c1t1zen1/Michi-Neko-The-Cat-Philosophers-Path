# Handoff: r2b-roofs-streets

## 1. Integrator actions
- Run `node tools/kit_index.mjs` (index not committed).
- BUDGET_EXCEPTIONS are now committed in src/kit/budgets.js (fix round 1); nothing to apply.
```diff
diff --git a/src/kit/budgets.js b/src/kit/budgets.js
index e671b06..e5ece8d 100644
--- a/src/kit/budgets.js
+++ b/src/kit/budgets.js
@@ -49,6 +49,10 @@ export const KIT_LIMITS = Object.freeze({
  * fields it names and must cite why. Added by the owning lane in its PR.
  */
 export const BUDGET_EXCEPTIONS = Object.freeze({
+  // Roof Road buildings (r2b): each uses the page's own materials one mesh per material, as classic does; measured with kit_contract_test --family roofstreets
+  'roof-machiya': { hero: { meshes: 30, materials: 28, buildMs: 12 }, mid: { meshes: 23, materials: 21 }, far: { meshes: 7, materials: 7 }, why: 'the 67 m machiya record with every option on (deck, futon, vines, byobu, lanterns, kaisho); classic is the same ~30 box materials/meshes' },
+  'roof-kura': { mid: { materials: 6 }, far: { meshes: 5, materials: 5 }, why: 'plaster, namako, timber, dark, roof, ridge: the classic kura is the same six materials' },
+  'roof-kido': { far: { meshes: 4, materials: 4 }, why: 'timber, roof, ridge, timberMed: the classic kido is the same four materials' },
   // the contract samples the real 11 m run (G-V1 I1); ruling R51
   'bamboo-fence': {
     mid: { triangles: 13000 },
```
  Draw cost: the kit pieces use the Roof Road page's own ctx.MAT, so they land in the classic merge buckets (no new merged material). Calls classic/modular at s=14/125/233/700: 161/155, 167/165, 194/192, 133/136 (+3 at s=700: a kit piece is one mesh per material for the whole building, so a very wide machiya falls in one 32 m cell rather than being split across cells).
- Production adapter rows: roof-machiya, roof-kura, roof-kido, roof-river-steps, roof-komayose, roof-inuyarai, roof-tsuboniwa -> family roofstreets.

## 2. Notes
- Geometry is the classic code ported verbatim (rooftops/js/pieces/machiya.js etc.): rooftop_golden swap changes only the 201 pieces of the 7 types (122 houses, 5 kura, 1 kido, 1 steps, 2 komayose, 63 inuyarai, 7 tsuboniwa); platforms, walls, ceilings and lights are unchanged. Piece bounds equal classic except houses (largest delta 0.28 m on dressing at street level: the bicycle of decorateHouse is not ported).
- hash1 is copied into shared.js (kit may not import rooftops/).
- Deferred to part c: bridge, corner-house, roji, balconies, zushi, alley pockets/routes, street, ground.
