# docs/fable/

Working files for the Fable modular asset swap, the plan in [`BUILD_GUIDE_FABLE.md`](../../BUILD_GUIDE_FABLE.md). The people and
agents building it write here. Nothing in this folder is loaded by the game.

| Path | What it holds | Who writes it |
|---|---|---|
| `status/<lane>.md` | One status file per lane (guide Appendix B): who ran it and on which model, when it was claimed, the base commit, the steps ticked, the checks run with their real output, deferred assets and footprint waivers. A lane's compare images go in `status/<lane>/`. | The lane's worker, in its own file only |
| `handoff/<lane>.md` | What the Integrator must wire for a lane: inventory rows, catalog adapter ids, registry entries, and exact patches for hot files (guide section 4.5). | The lane's worker; the Integrator applies it |
| `baseline/` | Phase 0 measurements of `main` @ `ed9f5b9`, the "before" of every later comparison: `checks.md` (the Node commands of Appendix C), `checks-browser.md`, `perf.md`, `budgets.md`, `captures.md` with `captures/`, and `swap_matrix.md`. | Lane `p0-baseline` (two workers: `p0-checks`, `p0-browser`) |
| `decisions.md` | The operator decisions D1 to D8 with their rulings, and the note that the default flip waits for the Phase 9 go/no-go. | Phase 0; the Integrator changes it if the operator overturns a ruling |

Workers tick boxes only in their own status file. The master board in the guide (section 6) is the Integrator's.

Regenerate the swap matrix after any change to `labs/asset_inventory.json` or to a lane assignment in the generator:

```sh
node tools/fable_swap_matrix.mjs --write   # rewrite baseline/swap_matrix.md
node tools/fable_swap_matrix.mjs           # check it is current; exit 1 if stale
```
