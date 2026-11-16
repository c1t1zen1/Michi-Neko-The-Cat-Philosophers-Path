# Lane brief: h1-hero (Phase 8 — hero capture tool and shots)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/h1-hero   Branch: fable/h1-hero (from fable/integration; the dispatch names the base)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/h1-hero-report.md
Read: briefs/_common.md (same folder), AGENTS.md (Verification: game captures, the URL flags, review sheets), BUILD_GUIDE_FABLE.md §2, §15
(lane h1-hero: H1.1–H1.5 are your acceptance list), docs/fable/decisions.md D8 (captures only in "From the build"; concept art kept in a
labelled section), docs/images/README.md, the three area status files (docs/fable/status/a1-village.md, a2-hilltop.md, a3-rooftops.md:
their best frames and camera paths are your starting points), and tools/game_shot.mjs + tools/headless.mjs (reuse them; do not fork them).

## Files you own
`tools/hero_capture.mjs` (new), `docs/images/hero/shots.json` (new), new JPGs under `docs/images/`, `docs/images/README.md`, your status
file and handoff. Replacing the six `docs/images/capture-*.jpg` and `title-screen.jpg` (H1.3) is yours; the README text that points at them
is h2's — list every renamed/replaced path in your handoff so h2 can update links. Do NOT edit README.md, src/**, rooftops/** or tools other
than your new one. If a shot needs a capture flag the game/sandbox lacks (e.g. a season, a character placement), write the exact patch in
docs/fable/handoff/h1-hero.md and frame the shot with what exists.

## Rules
- Real frames only, on `?assets=modular` (D8): no painting over, no compositing except the parts sheet (13) and the before/after pair (14),
  which are labelled as such. Every shot reproducible from shots.json + the commit (`?shot=1` gives a fixed step and seeded randomness).
- `--use-angle=metal` (fast, real GPU). Masters 2560×1440 OUTSIDE the repo (`/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/h1-hero/`);
  README-sized JPGs (≤ ~1 MB, most far less; 1600 px wide is plenty) committed. Descriptive kebab-case names.
- Shots: the fourteen in §15 H1.2. For the game pages use `/index.html` via the autostart boot (as game_shot does) with `?hour=`, `?cam=`,
  `?weather=`, `?nohud=1&shot=1`; for the summit use what the game or tools/summit_preview.html supports (the a2 lane added `&assets=`); for
  the Roof Road use `/kyoto-rooftops.html` (`?at=`, `?hour=`, `?finale=1`, `?shot=1&nohud=1`) and say which page in shots.json; for 8
  (villagers together) and 13 (parts sheet) the review sheets tools/cat_preview.html (npcs) and a kit specimen page may serve — label them as
  review-sheet captures. Compose well: look at every frame you keep and re-frame weak ones (this is the project's shop window).
- H1.4: docs/images/README.md lists each file: capture or concept art, shot id, date, commit, the exact command.
Checks: `node tools/hero_capture.mjs --only <id>` reproduces one shot (diff two runs with game_shot `--diff`: report maxDelta), the full run
completes, image sizes listed, G1 (check_syntax, verify, labs_check) green. Push, PR into fable/integration ("h1-hero: hero capture tool and
shots"), report per _common.md.
