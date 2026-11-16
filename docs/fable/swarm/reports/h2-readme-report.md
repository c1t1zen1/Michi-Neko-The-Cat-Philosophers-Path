# h2-readme report

- Lane: `h2-readme` (Phase 8, guide §15 H2.1–H2.3). Worker: Claude Opus 5.5.
- Branch `fable/h2-readme`, base d69a6b0 (fable/h1-hero), merged origin/fable/integration 865ca20 (h1-hero PR #56 and R88) as fb42570.
  A second fetch before the PR found nothing new; `b1-build-budget` was not merged.
- PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/58

## Commits

| SHA | Subject |
|---|---|
| 8bfb580 | h2-readme: claim lane (status file) |
| fb42570 | Merge remote-tracking branch 'origin/fable/integration' into fable/h2-readme |
| f94aa58 | h2-readme: README rewritten in the guide's thirteen sections (H2.1) |
| 1f4527c | h2-readme: INSTALL, QUICKSTART, AGENTS and catalog README brought up to date (H2.2) |
| 410e487 | h2-readme: handoff (cadJS README proposal, stale text in other lanes' files), status and checks (H2.3) |

## Files changed

`README.md` (rewrite), `INSTALL.md`, `QUICKSTART.md`, `AGENTS.md`, `catalog/README.md`, `docs/fable/status/h2-readme.md` (new),
`docs/fable/handoff/h2-readme.md` (new). `labs/ASSET_COVERAGE.md` was regenerated with `node tools/labs_coverage.mjs --write`
and did not change. Nothing under `cadJS/`, `dawCAT/`, `src/`, `rooftops/` or `tools/` was edited or staged.

## What was built

### README.md (H2.1, the thirteen sections in order)
1. Title, the original badges, `hero-valley-golden-hour.jpg` (linked to the live site, caption says real frame, modular set),
   play button, the status box (date 2026-11-16, tag `20261116a`), a contents line.
2. What it is, in three sentences (no fail states, no combat, no timers; very early alpha), plus the Inspirations list.
3. The three areas, each with one hero image and what you can do there:
   - Village: hero-torii-dusk; the short "what you can do" list, then a `<details>` holding every still-true feature bullet of
     the old README (world, cat, gameplay, audio, interface). Stale bullets fixed from the code: the 70k-blade meadow replaced by
     the Grass Lab grass (from the old update log), ranks (sprint is from the start, `player.canSprint = true`), kit sounds.
   - Hilltop: how to reach it (ten bells; the thicket parts, from `mountaintop.js` toasts), what is there, how to return, the
     a2 polish pass and the provisional acceptance (G-S).
   - Roof Road: the Seven Posts unlock (from `src/rooftops/posts.js`), the run (about 1.7 km, eleven named districts with
     length, from `buildLevel()`), the finale and the lantern home (`pocket.js`), Leave the Roof Road, saves, the sandbox button.
4. From the build: eight real frames in pairs, dated 2026-11-16, commit 9c7f490 game code, said to be on `?assets=modular`
   (not the default), with links to `shots.json` and `docs/images/README.md`. The villagers frame is labelled a review sheet.
5. What is new: the kit in plain words (187 assets, 28 families; parts, tiers, seeded, footprint, budgets, editable params,
   classic fallback), characters, the before/after pair and the parts sheet (exact ASCII part keys), then **Classic is still
   the default**, how to try modular (`?assets=modular` with a live link, `?swap=`, the `assetSet` setting from the console,
   ignored on Low), and that the flip needs the final review, the operator's approval and R66 (1.26–1.42 × vs 1.25 ×).
6. Play: the live title menu frame (labelled; backdrop is concept art), desktop, touch and Roof Road controls (from
   `controls.js`, `main.js` and `manager.readInput()`), comfort settings incl. live reduce motion on the roofs.
7. Quality and compatibility: the tier table from `Game.applyQuality()` and `resolveQuality()`, Auto rules, the governor,
   the asset-set switches, the Low promise, saves, and a benchmarked / not benchmarked list (dev machine only; no phones,
   tablets, low-end GPUs, other browsers; summit and Roof Road perf spots wait for z-final).
8. Project setup: live site runs `main`, requirements, local server, other pages, the one-server option, the documentation
   index (as a list for phones; new entries for the Fable docs, Skretch, Shinkansen, the downtown notes).
9. Architecture: technology, the two asset sets, the resolution order, the layout/mesh split and `placeAsset`, the
   contract, part tree, tiers, merging, `env`; the folder map updated (bootstrap, summit/, rooftops/, kit/, characters/,
   labs, catalog, Skretch, Shinkansen).
10. Make and swap an asset: eight steps, worked on `toro`, with a minimal family (practice only, for `summit-clouds`), every
    command shown with its real output.
11. Companion tools: Asset Library (production variant, swap board), cadJS (kit parameters, AI actions, schema 2), dawCAT
    (kit sound events), the Labs (22 + extras) and the Grass Lab button, review sheets and `hero_capture.mjs`, Skretch and
    Eastbound.
12. Verification: Appendix C as code blocks (every merge, every gate, catalog and tools, the full game).
13. Roadmap (where things are on 2026-11-16, the status table with new rows, the update log in `<details>` with the new
    entries and every old entry kept), How this was made (the old two paragraphs verbatim plus one on the swarm and the
    rulings), Concept art (not captures) with all four concept images and the teaser (labelled an edit of early footage
    ending on concept art; poster now `hero-torii-dusk.jpg`), License and Credits unchanged, the closing play button and line.

### H2.2
- INSTALL.md: browser versions corrected to import-map support (Chrome/Edge 89, Firefox 108, Safari 16.4); network row; disk
  size (game ~3 MB source, clone ~0.5 GB, measured with `du`); Option E (one server); the quality table corrected (High 4096
  only on a desktop discrete GPU); Auto and probe; adaptive resolution stages; the asset set and the not-benchmarked note;
  Roof Road touch; Low keeps classic; troubleshooting for the modular load and the Roof Road unlock; dev setup (kit, Roof
  Road, labs, catalog checks, swaps, PLAYWRIGHT_MODULE); the file tree updated.
- QUICKSTART.md: title to Michi-Neko (working title noted); morning start (`sky.dayTime = 9.5`); sprint from the start
  everywhere; Roof Road controls; ranks and XP from `progression.js`, `context_actions.js`, `main.js`, `hidden_places.js`,
  `mountaintop.js`, `manager.js` (the old "+15 greet" was the yarn gift; tea-house unlock is +20 walking up or +50 at the
  door); a new Roof Road chapter; summit unlock wording; Luna's turn-in for the quest reward (`quest.js`); autosave 30 s plus
  area changes (`main.js`); save contents; reduce motion; the asset set; FAQ.
- AGENTS.md: kept every true fact. Updated: review date, `bootstrap.js`, the kit row (28 families, 187 assets, `audio.js`,
  `sfx_pack.js`, default and flip), tools row, catalog row (414 thumbnails, production, compare, swap board), labs extras,
  the rooftops row (R88 dispose on exit and rebuild after the veil's first frame, `setReduceMotion`, R81 switch-over applied,
  the tagged-import list now also `characters/defs/chidori.js`, `sky.js`, `atmosphere.js`), new rows `Shinkansen/`,
  `kit-overrides.json`, `BUILD_GUIDE_FABLE.md`/`docs/fable/`, the docs row; `rooftop_pocket_test.mjs`; the README images
  now from `hero_capture.mjs`; the full boot last clean 2026-11-16 at the G-R chores; the 44-check smoke suite no longer
  exists on the dev machine; Status rewritten (Fable build, what is open).
- catalog/README.md: 254 entries (250 active); production variant, compare view, tier and params controls, swap board and
  its route, when the game reads `kit-overrides.json`, the third record, cadJS production handoff, files, thumbnails
  (386 + 28 = 414), `cd catalog && npm test`.
- cadJS/README.md: not edited. Exact replacement text in `docs/fable/handoff/h2-readme.md` §1 (Current boundaries lines
  57–59, Game boundary line 653, a structure note, the file map with all seven `src/` modules and both tests, Node version).
- labs/ASSET_COVERAGE.md: regenerated, unchanged.

## Checks (command → real output)

```
node tools/labs_check.mjs                → All labs checks OK
node tools/verify.mjs                    → All checks passed
node --test tools/labs_coverage_test.mjs → ℹ tests 18 · ℹ pass 18 · ℹ fail 0
node tools/labs_coverage.mjs --write     → OK 37 source modules, 112 construction methods, 69 Roof Road modules,
                                            14 Roof Road construction functions, 48 Roof Road piece types,
                                            254 inventory rows, 243 evidence targets (file unchanged)
node tools/check_syntax.mjs              → All 192 modules OK
git diff --check                         → (clean)
```

Link checker (`/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/h2-readme/linkcheck.mjs`, relative links, image paths,
`src=`/`href=`/`poster=`, and `#anchors` resolved with GitHub's slug rules; fenced and inline code skipped):

```
node linkcheck.mjs . README.md INSTALL.md QUICKSTART.md AGENTS.md catalog/README.md docs/fable/handoff/h2-readme.md docs/fable/status/h2-readme.md
130 relative links and image paths checked in 7 files, 0 broken.
(on the old README of d69a6b0: 58 checked, 6 broken — the removed capture-*.jpg)
```

Render (H2.3): README → `gh api markdown` (GitHub's own renderer) → scratch page with github-markdown-css 5.5.1 →
`tools/headless.mjs --root <scratch>` on Metal. GitHub sizes the user-attachment video with its own player, so the page adds
`video{max-width:100%}` (without it the bare `<video>` was 1154 px wide; that is the only element GitHub styles itself).

```
{"w":1280,"pageH":29266,"pageScrollW":1280,"tables":6,"overflowTables":0,"pre":13,"overflowPre":0,"imgs":31,"broken":0}
{"w":390,"pageH":45113,"pageScrollW":390,"tables":6,"overflowTables":0,"pre":13,"overflowPre":13,"imgs":31,"broken":0}
```

At 390 px the 13 code blocks scroll inside themselves, as on GitHub; no table or the page scrolls sideways. Two tables
(the documentation index and the asset-set switches) became lists for phones, and the shadow-map cell got a footnote. Section
screenshots at both widths: `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/h2-readme/render/shots/`.

Tutorial (H2.1 item 10), run on 2026-11-16:

```
node tools/kit_index.mjs --check                     → OK src/kit/index.js in sync (28 families, tag 20261116a)
node --test tools/kit_test.mjs                       → 37 tests, 37 pass
node tools/kit_contract_test.mjs --family lanterns   → 6 assets, 18 asset×tier builds, 483 checks, 0 failed … PASS: kit contract
(scratch worktree, the README's demo code block extracted verbatim)
node tools/kit_index.mjs                             → wrote src/kit/index.js (29 families: … demo …)
node tools/kit_check.mjs                             → OK src/kit/demo/index.js: id 'summit-clouds' is an active inventory id
                                                       All kit checks OK (538 passed)
node tools/kit_contract_test.mjs --family demo       → 1 assets, 3 asset×tier builds, 70 checks, 0 failed … PASS: kit contract
headless /catalog/preview.html?asset=summit-clouds&variant=production → ok, 0 errors (Demo cloud, tier switch, Puff slider)
headless /tools/summit_preview.html?view=meditation&swap=summit-clouds:modular → {"set":"classic","swaps":{"summit-clouds":"modular"},"instances":1,"problems":[]}
headless /catalog/preview.html?asset=toro&variant=production&tier=hero → ok, 0 errors
headless /cadJS/?asset=toro&variant=production       → kit lantern loaded with asset:toro (the static server 404s cadJS's
                                                       /api/catalog and /api/agent/probe, which is why the tutorial says
                                                       to use node cadJS/server.mjs)
game_shot "hour=18.5&cam=0.5,0.9,-12,0,2.2,-30,55&nohud=1&shot=1" assets=classic vs swap=toro:modular
  --diff → {"width":1280,"height":720,"maxDelta":169,"meanDelta":0.1501,"pixelsOver8":4749}
```

Both scratch worktrees (`_scratch/h2-readme/tutorial-wt`, `tutorial-wt2`) were cleaned and removed with plain
`git worktree remove`.

## Facts checked against the code (the ones that changed)

Sprint from the start (`player.js` `canSprint = true`, `progression.js`); autosave 30 s + interior changes + pagehide
(`main.js`); quality tiers (`applyQuality`, `resolveQuality`, `isDiscreteGPU`, `resolveShaftStrength`); governor 45/58 fps
and the 30 fps eco floor; the asset set and resolution (`settings.js`, `runtime.js` `setFor`, `lowLocked`); no assetSet menu
entry (`index.html` settings rows); Roof Road route 1,709.5 m rail, 13 mouths, eleven with length (`buildLevel()`), finale
perch s 1673 and autopilot 515 s (G-R chores report), seven Shōki, rooftop_test 40/40; controls (`controls.js`,
`manager.readInput`, photo mode off on the roofs); XP amounts; kit 187 assets / 28 families (`cadJS/tests/kit.test.mjs`:
"kit assets read: 187 from 28 families", read-only run), catalog 124 original adapters, 71 lab recipes, 126 editable,
254/250 rows (`getAssetCapabilities`, `catalog_check`); thumbnails 386 + 28; R88 (713967a, pocket docs).

## Self-review against H2.1–H2.3

- H2.1: thirteen sections in order — yes. Every claim maps to merged code or a run; classic named the default; how to try
  modular given; not-benchmarked stated. Licence and credits text kept exactly; "How this was made" kept verbatim with one
  added paragraph. Concept art in its own labelled section; "From the build" holds only real captures with dates (D8).
- H2.2: INSTALL, QUICKSTART (Roof Road, settings), AGENTS (layout, cache-tag list, kit rules, summit ownership kept,
  status), catalog README updated; ASSET_COVERAGE regenerated; cadJS as handoff text (operator rule).
- H2.3: link checker 0 broken; desktop and phone widths rendered and measured.

## Open concerns

1. `b1-build-budget` is not merged; the README, INSTALL and the Roadmap say 1.26–1.42 ×. Update if b1 closes R66 (handoff §3).
2. The teaser `poster=` is an absolute `raw.githubusercontent.com/.../main/...` URL (as before), now `hero-torii-dusk.jpg`.
   It resolves once `main` has the hero images.
3. Stale text in files this lane does not own (handoff §2): `labs/asset_inventory.json` scope says the game does not load the
   Roof Road (copied into ASSET_COVERAGE.md on regeneration), `catalog/js/links.mjs:107`, `docs/images/README.md` first
   paragraph, `rooftops/README.md` 1,082 m, the catalog inspector's "Edit original in cadJS" label on the production variant.
4. The README is long (about 29,000 px at 1280 wide with the details open). The two longest parts (the valley feature list
   and the update log) are folded in `<details>`, so the default view is much shorter.
5. The render check used GitHub's markdown API and its public stylesheet, not github.com itself (no browser login); the
   video is the one element whose size was emulated.
