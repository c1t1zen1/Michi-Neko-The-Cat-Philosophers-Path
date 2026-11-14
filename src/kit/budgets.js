// Per-tier budgets the contract test (tools/kit_contract_test.html, AAA-7)
// holds every kit asset to. Machine-readable twin of
// docs/fable/baseline/budgets.md (Phase 0, step P0.5; operator decision D1).
//
// STATUS: ACCEPTED provisionally under operator decision D1 (docs/fable/decisions.md,
// D1; the operator may overturn). Numbers are copied from
// docs/fable/baseline/budgets.md section 3 ("Triangles, draw calls and build time
// per asset") and section 1. Frame-ms rows of budgets.md stay provisional (they
// are judged by tools/perf_spots.mjs in the same session, not by this file).
// tools/kit_check.mjs reports the status.
//
// Pure data: no imports, loads under Node.

export const BUDGET_SOURCE = Object.freeze({
  file: 'docs/fable/baseline/budgets.md',
  status: 'accepted',
  decision: 'D1',
  note: 'budgets.md section 3 (per-asset caps, Building/Tree class), accepted provisionally under D1; frame-ms rows stay provisional'
});

/**
 * One row per tier, the largest class of budgets.md section 3 (Building /
 * Tree: 25,000 / 6,000 / 1,000 triangles; first-build 6 / 3 / 1.5 ms).
 * Smaller classes (prop, structure, character) may be held tighter through
 * BUDGET_EXCEPTIONS. `triangles` and `meshes` are per instance (an
 * InstancedMesh counts its instances in triangles and once in meshes);
 * `buildMs` is the warm-build allowance; `materials` is the per-asset
 * distinct-material cap (6 / 4 / 2, all from MAT / KitMaterials).
 * Handover distances: hero < 12 m, mid 12-45 m, far >= 45 m.
 */
export const BUDGETS = Object.freeze({
  hero: Object.freeze({ triangles: 25000, meshes: 16, buildMs: 6, materials: 6 }),
  mid: Object.freeze({ triangles: 6000, meshes: 8, buildMs: 3, materials: 4 }),
  far: Object.freeze({ triangles: 1000, meshes: 3, buildMs: 1.5, materials: 2 })
});

/** Kit-wide limits from budgets.md section 3 (binding: high tier, shrine spot). */
export const KIT_LIMITS = Object.freeze({
  newMergedMaterials: 11,
  repeatBuildMs: 0.1,
  liveMeshes: Object.freeze({ hero: 2, mid: 0, far: 0 }),
  handover: Object.freeze({ heroBelow: 12, farFrom: 45 })
});

/**
 * Per-asset exceptions, keyed by inventory id, for assets that are honestly
 * bigger than a prop (a whole machiya, the pagoda). Each entry overrides the
 * fields it names and must cite why. Added by the owning lane in its PR.
 */
export const BUDGET_EXCEPTIONS = Object.freeze({
  // 'tea-house': { hero: { triangles: 40000, meshes: 40 }, why: 'a whole building with interior-facing walls' }
  // classic grove 82.3k hero tris; modular 89.9k/12.5k/4.7k; ruling R40, v-greenery handoff
  'bamboo-groves': {
    hero: { triangles: 92000 }, mid: { triangles: 13000 }, far: { triangles: 5000 },
    why: 'a grove is 40-78 culms with 72 leaf cards each; classic is 82k (r=7); modular hero ~90k, mid/far far below classic'
  },
});

/** The budget row for one asset and tier, with exceptions applied. */
export function budgetFor(id, tier) {
  const base = BUDGETS[tier] || BUDGETS.mid;
  const exception = BUDGET_EXCEPTIONS[id] && BUDGET_EXCEPTIONS[id][tier];
  return exception ? { ...base, ...exception } : { ...base };
}
