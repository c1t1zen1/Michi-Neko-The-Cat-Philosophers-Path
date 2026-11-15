# v-alley handoff
- Inventory: `crates`, `sake-barrel` rows exist; add `"production": "alley"` adapters if the catalog uses them. No new rows.
- Part names: `stack` (crates), `barrel` (sake-barrel). No `layout.bind` fields exist for either.
- Footprint waivers: none (platform tops identical; verified by footprint golden swap).
- Helpers: none to move; `tint`/crate builder local to the family.
- Integrator: regenerate src/kit/index.js with `node tools/kit_index.mjs`.
