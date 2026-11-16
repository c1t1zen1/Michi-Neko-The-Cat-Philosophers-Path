# Re-review r1: r2b-roofs-streets (23643a5..ea527f3)

1. ADDRESSED. budgets.js now holds roof-machiya/kura/kido rows in-branch; each why cites classic vs modular (machiya 413 meshes/8892 tris vs 26/8021 at the golden; kura 17/520 vs 6/374; kido 11/152 vs 4/152), and machiya buildMs 12 cites warm 11.0 ms at load 1.5 (<3). Caveat: status admits a second quiet re-read after the integration merge is not done; allowance 12 over a 11.0 reading is thin but not loosened from a loaded reading.
2. ADDRESSED. Multi._bag keys by material and 32 m world cell (floor(wx/32), floor(wz/32)), same formula as mergeByMaterial (rooftops/js/pieces/common.js:138-152, key from the mesh bbox centre). Rotation by layout.ry is correct. Approximations: uses the geometry bbox centre plus offset, ignoring per-part rotation, and pieces <= 12 m use their origin cell, so a short piece straddling a cell edge could differ by one batch from classic. Reported draws modular <= classic at all four spots (159/151, 165/163, 192/190, 137/134, load 1.5). Deterministic: no Math.random/Date.now in src/kit/roofstreets. Part names gain a cell suffix (n/p).
3. ADDRESSED (accepted as known gap, documented in status).
4. ADDRESSED. The two kura-near-dusk JPGs now differ (cmp: differ).

New breakage: none Critical/Important. Minor: the handoff diff block is stale beside the "already applied" line. I did not re-run the contract (relied on reported numbers).

Verdict: Approved
