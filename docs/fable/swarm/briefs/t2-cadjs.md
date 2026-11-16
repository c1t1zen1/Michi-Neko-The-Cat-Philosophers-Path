# Lane brief: t2-cadjs (Phase 6 — cadJS: production assets, param panel, AI actions, package schema 2)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/t2-cadjs   Branch: fable/t2-cadjs (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/t2-cadjs-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then AGENTS.md (cadJS row), BUILD_GUIDE_FABLE.md §3.5 and §13 lane t2 (T2.1–T2.6,
gate G-T), cadJS/README.md (esp. "Game boundary", "Structural limitation"), docs/fable/handoff/_production_adapters.md.

## Your files
`cadJS/**` — this lane is granted cadJS. IMPORTANT (operator's standing rule): cadJS/ often carries unrelated
work-in-progress. Before your first commit run `git status --short cadJS/` in your worktree — it should be clean (fresh
worktree). Stage ONLY the files you changed, by explicit path, never `git add cadJS`. Also `labs/shared/game.js` only if
you need the same kit-registry bridge as t1 (coordinate: if t1's bridge is merged, reuse it). Never edit src/** (game).

## Steps (guide §13 T2.1–T2.6)
- T2.1 handoff `/cadJS/?asset=<id>&variant=production` loads the kit asset with its part tree named (`asset:<id>/<part>`)
  and selectable.
- T2.2 parameter panel generated from `params`; edits rebuild the asset live; Undo/Redo works.
- T2.3 AI agent: validated `set_asset_params` and `swap_asset_variant` actions in agent-protocol.mjs (schema-validated
  against the asset's params; out-of-range rejected), shown for review and applied as one undoable transaction. Model
  output still cannot execute code or write arbitrary files.
- T2.4 asset package schema 2: explicit create/remove/reparent of named parts, with a migration from schema 1; schema 1
  packages keep importing (tests for both).
- T2.5 "Push to game" writes kit-overrides.json for param edits (format `michi-neko-kit-overrides`, same atomic write as
  t1 if t1 has merged — reuse it) and keeps writing cad-overrides.json for free-form edits.
- T2.6 `cd cadJS && npm run check` and `npm test` pass; update cadJS/README.md ("Game boundary", "Structural limitation").
