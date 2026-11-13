// Per-tier budgets the contract test (tools/kit_contract_test.html, AAA-7)
// holds every kit asset to. Machine-readable twin of
// docs/fable/baseline/budgets.md (Phase 0, step P0.5; operator decision D1).
//
// STATUS: PROVISIONAL. docs/fable/baseline/budgets.md had not merged when
// this file was written (2026-11-13); these numbers are the Phase 1 working
// limits, sized from the classic valley (a classic machiya is ~4k triangles,
// a toro ~600, the pagoda impostor far tier ~2 triangles). When budgets.md
// lands, copy its accepted numbers here, set `source.status` to 'accepted'
// and cite the section. tools/kit_check.mjs reports the status.
//
// Pure data: no imports, loads under Node.

export const BUDGET_SOURCE = Object.freeze({
  file: 'docs/fable/baseline/budgets.md',
  status: 'provisional',
  note: 'Phase 1 working limits; replace with the D1-accepted numbers from budgets.md'
});

/**
 * One row per tier. `triangles` and `meshes` are per instance (an
 * InstancedMesh counts its instances in triangles and once in meshes);
 * `buildMs` is the median of two builds on the dev machine's real GPU
 * backend, generous enough for a cold shader-free build.
 */
export const BUDGETS = Object.freeze({
  hero: Object.freeze({ triangles: 12000, meshes: 16, buildMs: 40 }),
  mid: Object.freeze({ triangles: 4000, meshes: 8, buildMs: 20 }),
  far: Object.freeze({ triangles: 800, meshes: 3, buildMs: 10 })
});

/**
 * Per-asset exceptions, keyed by inventory id, for assets that are honestly
 * bigger than a prop (a whole machiya, the pagoda). Each entry overrides the
 * fields it names and must cite why. Added by the owning lane in its PR.
 */
export const BUDGET_EXCEPTIONS = Object.freeze({
  // 'tea-house': { hero: { triangles: 40000, meshes: 40 }, why: 'a whole building with interior-facing walls' }
});

/** The budget row for one asset and tier, with exceptions applied. */
export function budgetFor(id, tier) {
  const base = BUDGETS[tier] || BUDGETS.mid;
  const exception = BUDGET_EXCEPTIONS[id] && BUDGET_EXCEPTIONS[id][tier];
  return exception ? { ...base, ...exception } : { ...base };
}
