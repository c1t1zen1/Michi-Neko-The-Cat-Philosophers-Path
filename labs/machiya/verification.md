# Machiya workshop verification · 2026-11-06

Checked against the lab as served from the repository root. Browser harnesses
and intermediate captures live outside the repository in
`/tmp/michi-machiya-qa/`. No npm dependency or build system was added to the
project. The final 1200 × 750 portal capture is `poster.png`.

## Automated checks

- `node tools/labs_check.mjs`: passed across all labs, including module syntax,
  bridge-only game imports, matching cache tags, registry and preview paths.
- `git diff --check`: passed.
- Chromium browser smoke: all **35 specimens** built and rendered, including
  their shaders. All **37 views** (street, specimens, assembly) built. No page
  exceptions or shader/console errors in the specimen sweep.
- The actual `src/cat.js` cat loaded, animated and rendered successfully.
- Switched all three shading modes and all four roof controls, original and
  bengara lattice, and all four original house references without page errors.
- Search `sangawara` returns one specimen. Original-reference filter returns
  fourteen (four full houses plus one baseline on each of ten part/style shelves).
- JSON recipe downloaded and parsed. It carries builder options, hour and wind.
- Assembly starts with only the foundation visible; the finished step exposes
  cloth and lanterns. Exploded view uses the same assembly groups.
- Keyboard movement changed position; holding Space raised the cat’s feet.
- Continuous manual climb simulation passed from left lattice → eave → upper
  opening, exiting at **4.647 m**, with climbing released at the top.
- A 390 px viewport has no horizontal overflow. Touch movement and jump controls
  are visible when a touch device is emulated. Reduced-motion gallery and cloth
  animation are suppressed.
- Hub featured card and registry row both load `machiya/poster.png`, with working
  links to the lab. Preview image dimensions are 1200 × 750.

## Roof coverage regression

For each of `slab`, `courses`, `wave` and `mukuri`, cast downward rays over a
19 × 19 grid inside the main roof footprint. Test the rendered roof group,
not an abstract rectangle. Result:

- **1,444 samples; zero missing intersections.**
- Away from the decorative ridge barrel, largest difference between the
  rendered intersection and cat support height was **0.090 m**.

The collider intentionally follows the supporting profile plus an average
tile clearance; it does not model every tile lip or the ridge ornament.
This grid is a useful regression check, not a mathematical watertightness proof.
The underlying closed shell is what prevents light leaks between tile meshes.

## Rooftop wander regression

Run the real lab steering/vertical controller for **3,600 steps at 1/60 s**.
No teleports or correction to its feet occur during the simulation. Starting
on the central roof, the cat repeatedly crosses both gaps and turns at the
outer houses:

- X range: **−9.058…9.060 m**.
- Lowest feet height: **4.897 m**.
- **21 jumps**, with no fall to the street.

This tests the lab controller. The game controller and its route progression
still need review before promotion.

## Performance observation and visual review

Development machine: Apple M5 Max, Chromium 153 / ANGLE Metal, 1440 × 1050
viewport, screenshot run at pixel ratio 1, shadows enabled. The static street
went from **446 meshes / 894 draws** before within-part merging to
**127 meshes / 256 draws**, including shadow passes. Geometry remained about
**265k triangles**. The post-merge capture reported around **60 fps** and
**2 ms CPU** for the street. These are observations from this development
machine, not target-device budgets or a stable benchmark.

Visually reviewed daytime street, detailed cat-on-roof view, dusk lighting,
roof specimen comparison, completed assembly, mobile/touch layout and the
portal. Corrected the initial full-width HUD blur, oversized introductory
text, and the overly expensive unmerged frame. The portal uses a clean
capture of the actual lab, with HUD and focus outline hidden for that shot.

## Scope and remaining integration work

No game source, summit, summit UI, rooftop lab, or interiors lab was changed.
`labs/shared/game.js` only gains a lazy, cache-tagged game-builder loader;
other labs do not eagerly load the town module. Existing game import tags stay
at `20261106a`, because game source was not edited.

The experimental kit is not promoted into the valley. Target-device tests,
far LODs, game `MAT` registration, original progression and game collider review
remain promotion work, as described in the research notebook.
