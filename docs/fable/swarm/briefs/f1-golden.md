# Lane brief: f1-golden (Phase 1 — guide F1.6, split out of f1-runtime by the Integrator)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/f1-golden   Branch: fable/f1-golden (from fable/integration @ ed9f5b9)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/f1-golden-report.md
Common rules: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md
Lane card: BUILD_GUIDE_FABLE.md §8, item F1.6 (and §3.3 rule 2 / AAA-6 for why it matters).

The footprint golden is the safety net for the whole refactor: `f2-countryside-split` will run it after EVERY one of
~48 builders it splits, so it must be fast, deterministic and give a readable diff. It changes no game file.

## Your files (only these)
`tools/footprint_golden.html`, `tools/footprint_golden.js`, `tools/footprint_golden.mjs` (Node CLI), `tools/golden/valley_classic.json`,
`docs/fable/status/f1-golden.md`.

## What to build
1. Page `tools/footprint_golden.html` (+ `.js`): build the valley exactly the way the review sheets build `Countryside` in
   isolation (read `tools/town_preview.js` and `tools/hidden_preview.js`), with the default fixed seed. Include
   `HiddenPlaces` (it registers exclusion/water rects before Vegetation) the way the game orders it (read `src/main.js`
   ~lines 130–160). Do not include Interior (f3 extends the golden to interior later, F3.3). Then produce a JSON digest:
   (a) every named Object3D's world position, rotation (quaternion or Euler, fixed rounding e.g. 1e-4) and name path;
   unnamed meshes: an aggregate per parent (count + summed bounding boxes) so geometry changes still show;
   (b) every collider in `city.colliders` (and any other collider arrays: house colliders, platforms, water rects);
   (c) every vegetation exclusion rect; (d) interaction anchors (nap spot, nest pos, collectibles, key, doors, shrine
   bells, Larry's patrol bounds, lantern positions, rest spots — read countryside.js/hidden_places.js for every
   `this.*Pos`, `this.*Mesh`, arrays of interactables). Also (e) a stream-position check: after the build, the number
   of `this.random()` draws consumed (wrap `city.random` / count rng calls without changing countryside.js — e.g.
   monkey-patch the instance's rng before build if the constructor allows, else record the final rng state by
   drawing one probe value from a cloned seed sequence; explain the method). Stable key order, rounded numbers.
2. Diff mode: the page compares the fresh digest with `tools/golden/valley_classic.json` and reports
   `{ equal, added, removed, changed }` with readable paths (cap the list, give counts).
3. Node CLI `tools/footprint_golden.mjs [--write] [--query "?assets=modular&swap=..."] [--out file]`: runs the page
   headlessly via `tools/headless.mjs` (`runPage`), prints a one-screen summary and exits 0 when equal, 1 when
   different. `--write` regenerates `tools/golden/valley_classic.json`. `--query` is passed through to the page
   (modular support itself is added later by f1-runtime; your page must simply forward/ignore unknown flags).
4. Determinism: run it 3× — the digest must be byte-identical. If `Countryside` (or anything it calls) uses
   `Math.random()`/`Date.now()`/`performance.now()` in a way that leaks into positions, make the PAGE deterministic
   (seeded `Math.random` replacement installed before import, fixed clock) — never edit game code — and list each
   source you neutralised in the report.
5. Commit the digest generated from this checkout (= main @ ed9f5b9) as `tools/golden/valley_classic.json`.
   Record its size, the object/collider/exclusion/anchor counts and the run time.

## headless.mjs
`p0-browser` is building `tools/headless.mjs` in parallel and pushes it early on `fable/p0-browser`. Module API:
`openPage(pathOrUrl, {root,size,gpu,session,timeout,console})`, `runPage(pathOrUrl, {wait, eval, shot, settle, ...})`
→ `{ok,url,ms,errors,warnings,shot,value}`, `diffImages(a,b,{out})`. For testing before Phase 0 merges, copy it
UNTRACKED (`git fetch origin && git show origin/fable/p0-browser:tools/headless.mjs > tools/headless.mjs`) and never
stage it. If it is not pushed yet, write the page first; test it with a scratch Playwright script outside the repo
(`PLAYWRIGHT_MODULE` in the common brief). Your CLI imports `./headless.mjs`.

## Acceptance
3 identical runs; golden committed; CLI exits 0 on this checkout and exits 1 with a readable diff when you
deliberately perturb one collider in a scratch copy (prove it, then discard the perturbation); run time recorded;
`node tools/check_syntax.mjs` and `git diff --check fable/integration...HEAD` green; only your files changed. Push; open the PR.
