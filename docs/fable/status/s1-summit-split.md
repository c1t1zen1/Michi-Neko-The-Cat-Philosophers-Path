# s1-summit-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 04:10 PST
- Branch:             fable/s1-summit-split
- Base commit:        5dc924a (fable/integration)
- State:              in progress

Lane: guide section 11, Phase 4, steps S1.1 to S1.5 (gate G-S). Splits
`src/mountaintop.js` into `src/summit/` modules behind the `SummitManager`
facade, then adds the layout/mesh split and `placeAsset` routing on the
summit's own stream. No visible or behavioural change.

## D2 pre-check (2026-11-13, after `git fetch origin`)

`git log --oneline main..origin/<b> -- <file>` for every non-`fable/*` remote
branch (`main`, `fix/hilltop-ground-transitions`, `graphics-overhaul`,
`roof-road`) and `src/mountaintop.js`, `src/ui.js`, `index.html`:

- `src/mountaintop.js`, `src/ui.js`: no output on any branch.
- `index.html`: one commit, `9cbddf2` on `origin/graphics-overhaul` (ignored by
  ruling D6). Its only `index.html` hunk is the `src/main.js?v=` script tag
  (`20260907a` → `20260924b`), not the summit UI.
- Local branches other than `fable/*` (`feat/rooftops-downtown`): no commit
  touching `src/mountaintop.js` or `src/ui.js`.

Result: no unmerged summit work elsewhere. Phase 4 proceeds under D2.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: serial split lane; the 32 summit rows are routed, not promoted) | | | | | |

## Steps
- [x] S1.0 Claim: D2 pre-check, AGENTS.md summit row (D2), this file
- [ ] S1.1 Summit golden from the unchanged code
- [ ] S1.2 Split the builders into `src/summit/` modules (golden EQUAL per module)
- [ ] S1.3 Layout/mesh split and `placeAsset` routing by the 32 summit ids
- [ ] S1.4 `tools/summit_test.mjs` harness loads the new modules (no check removed)
- [ ] S1.5 `tools/verify.mjs` checks point at the files the code moved to (no check removed)
- [ ] Checks, previews against the Phase 0 masters, handoff, report, PR

## Checks run (command → real result)

## Deferred assets and why
None (no kit asset is promoted in this lane).

## Footprint waivers requested
None.

## Notes for the Integrator
