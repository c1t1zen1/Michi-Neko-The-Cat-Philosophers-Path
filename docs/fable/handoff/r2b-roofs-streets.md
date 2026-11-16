# Handoff: r2b-roofs-streets

## 1. Integrator actions
- Run `node tools/kit_index.mjs` (index not committed).
- BUDGET_EXCEPTIONS (roof-machiya, roof-kura, roof-kido) are already in src/kit/budgets.js in the merged branch (fix round 1); there is no patch to apply.
  Draw cost: the kit pieces use the Roof Road page's own ctx.MAT, so they land in the classic merge buckets (no new merged material). Calls classic/modular at s=14/125/233/700: 161/155, 167/165, 194/192, 133/136 (+3 at s=700: a kit piece is one mesh per material for the whole building, so a very wide machiya falls in one 32 m cell rather than being split across cells).
- Production adapter rows: roof-machiya, roof-kura, roof-kido, roof-river-steps, roof-komayose, roof-inuyarai, roof-tsuboniwa -> family roofstreets.

## 2. Notes
- Geometry is the classic code ported verbatim (rooftops/js/pieces/machiya.js etc.): rooftop_golden swap changes only the 201 pieces of the 7 types (122 houses, 5 kura, 1 kido, 1 steps, 2 komayose, 63 inuyarai, 7 tsuboniwa); platforms, walls, ceilings and lights are unchanged. Piece bounds equal classic except houses (largest delta 0.28 m on dressing at street level: the bicycle of decorateHouse is not ported).
- hash1 is copied into shared.js (kit may not import rooftops/).
- Deferred to part c: bridge, corner-house, roji, balconies, zushi, alley pockets/routes, street, ground.
