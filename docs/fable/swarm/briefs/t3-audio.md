# Lane brief: t3-audio (Phase 6 — dawCAT sound hooks for new assets)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/t3-audio   Branch: fable/t3-audio (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/t3-audio-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then AGENTS.md (dawCAT row), BUILD_GUIDE_FABLE.md §13 lane t3 (T3.1–T3.3),
dawCAT's README/docs (esp. dawCAT/docs/GAME_AUDIO_CATALOG.md and the zero-file sfx-pack.js export route), src/audio.js
(read-only), and the kit families' handoffs that mention sound (garden onClack, lanterns kindle, shrine bell, water…).

## Your files
`dawCAT/**` — granted. Operator's standing rule: dawCAT/ often carries unrelated WIP. Check `git status --short dawCAT/`
(should be clean in a fresh worktree); stage ONLY files you changed, by explicit path. For kit-side hooks: kit files
call sound only through an `env.audio` hook (T3.3) — the runtime's update(env) must carry `audio`: that is a hot-file
change (src/kit/runtime.js / src/main.js) → exact patch in your handoff; family files that need an onX → env.audio call
are owned by their lanes → list exact patches per family in your handoff (the Integrator applies them). No kit file may
import src/audio.js directly.

## Steps
- T3.1 list every asset with a sound moment (shishi-odoshi clack, fūrin, lantern kindle, bells, water over stones,
  noren, float bells, boat pole) in dawCAT/docs/GAME_AUDIO_CATALOG.md, with the kit id, the event, and today's game sound
  (if any).
- T3.2 author or map the sounds in dawCAT; export through the existing zero-file sfx-pack.js route.
- T3.3 the env.audio hook design + patches as above; `cd dawCAT && npm test` passes.
