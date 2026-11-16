# r2b-roofs-streets merge report
Merge f6feb39 (clean, no conflicts), handoff commit 9f7c0ed pushed. PR #51 state MERGED.
G1: check_syntax 192 OK, verify pass, kit_check 534 OK, labs_check OK, footprint_golden EQUAL-run ok, labs_coverage_test, swap matrix 250 rows OK. rooftop_golden classic EQUAL (no regen); swap 7 ids: 185 pieces changed, routing 41/41. rooftop_test 40/40, companion 7, alley pass. cadJS check 16/16, catalog 50/0.
Handoff: budgets note corrected, adapters row added, board r2 [x] (part c deferred), section 0 updated.
Re-reads: see docs/fable/status/r2b-roofs-streets.md "Post-merge quiet re-reads".
- machiya warm hero buildMs: 3 of 9 runs fail at load 1.3-1.5 (12.2, 12.9, 13.7 ms vs 12). BLOCKED, not raised.
- Draw calls classic / ?assets=modular / 7-id swap: s14 160/142/152; s125 165/160/163; s233 191/165/189; s700 132/117/134 (loads 1.3-1.8). 7-id swap fails R52 at s=700 by 2.
