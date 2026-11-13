# f1-golden

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 03:05 PST
- Branch:             fable/f1-golden
- Base commit:        ed9f5b9 (fable/integration = main)
- State:              in progress

Lane: guide item F1.6, split out of `f1-runtime` by the Integrator (ruling R10).
Builds the footprint golden: `tools/footprint_golden.html` (+ `.js`), the Node
CLI `tools/footprint_golden.mjs`, and the committed classic digest
`tools/golden/valley_classic.json`. Changes no game file.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: tooling lane) | | | | | |

## Steps
- [x] L1 Claim (this file, pushed)
- [ ] L2 Read (AGENTS.md, guide §3.3/§3.4/§8, review sheets, main.js world order, countryside.js, hidden_places.js)
- [ ] G1 Page `tools/footprint_golden.html` + `.js`: build + digest (objects, colliders, exclusions, anchors, rng stream)
- [ ] G2 Determinism: three runs byte-identical; list neutralised sources
- [ ] G3 Diff mode against `tools/golden/valley_classic.json`
- [ ] G4 Node CLI `tools/footprint_golden.mjs` on `tools/headless.mjs`
- [ ] G5 Commit `tools/golden/valley_classic.json` from ed9f5b9; record size, counts, run time
- [ ] G6 Perturbation proof (exit 1 with a readable diff), then discard it
- [ ] G7 Checks (`check_syntax`, `git diff --check`), report, PR

## Checks run (command → real result)

## Deferred assets and why
None (tooling lane).

## Footprint waivers requested
None.

## Notes for the Integrator
