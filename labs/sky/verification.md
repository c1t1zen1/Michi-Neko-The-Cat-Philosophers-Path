# Sky Lab verification — 2026-11-07

Local repository served over HTTP. Browser: Safari, WebGL2, Apple GPU.
Scratch harness and intermediate captures live outside the repository in
`/tmp/michi-sky-review/`. The checked-in `poster.png` is a real 1200×750
render from the lab's postcard exporter: summer recipe, 15:30, wind offset
`[0.15, 0.6]`, Study quality, original game houses and cat.

## Browser checks

| Check | Observed result |
| --- | --- |
| Render each of the 24 recipes through the real postcard exporter | All 24 produced opaque, nonempty 1200×750 images. |
| Visit every gallery window to trigger lazy scene construction | All 24 visited; no runtime errors or failed shader programs. |
| Actual r160 shader insertion | 32 compiled receiving programs contained the directional-light transmittance hook after gallery creation. |
| Pixel-level sunlight check | With the field filled and hard cloud shade at full strength, the lower 250 rows averaged 38.39 fewer RGB levels than with shade disabled. The sky field was held constant. This checks that receiving surfaces actually change, beyond uniform wiring. |
| Pause | Simulation time stayed fixed across animation frames. |
| Brush wrapping | A stamp at U=0.999 also changed the first texture column. |
| Saved-field round trip | JSON recipe restored the signed brush array; maximum Float32 error against the saved quantised values was 2.82×10⁻⁸. |
| Zero coverage/shade | Controls and render uniforms reached zero. Density explicitly returns zero at zero coverage. |
| Original sprite mode | Projected cloud shade disabled automatically; no unrelated field shadows attributed to the original sprites. |
| Quality tiers | Eco used 12 view samples; Study used 24. |
| Real cat | `CatWalker.ready === true`; the game cat rendered in the scene and exported postcards. |
| Desktop layout | 1200 px iframe viewport; no document horizontal overflow. |
| Narrow layout | 390 px iframe viewport; no document horizontal overflow; observed the responsive observatory in Safari. The postcard strip intentionally scrolls horizontally within itself. |
| Sources | 24 recipe drawers; every recipe has existing implementation and source references. |
| Captures | Summer, golden hour, night and volume reference exported successfully. Night reflections fade with daylight; the houses no longer retain their daytime environment brightness. |

The field, volume, diagnostic, mist, halo, rainbow, analytic sky and original
sky paths were all included in the 24-recipe render sweep. The original/new
comparison was inspected in the browser; controls use a shared camera and
scissored viewports.

## Static checks

* `node tools/labs_check.mjs`: module syntax, live registry links, preview file,
  and the game import bridge's cache tags.
* `node tools/verify.mjs`: passed the repository's syntax/static wiring,
  summit state-machine and HTML checks.
* Focused recipe/wiring check: 24 unique IDs, four original specimens, six
  postcards, eight steps, valid option values, implementation files, citations
  and required control mounts.
* `git diff --check` restricted to this change's lab/portal/bridge files.

The shared game bridge follows the current `20261113a` tag in `src/main.js`.
The game sources and Ground Lab are being worked on independently; those edits
are outside this change.

## Limits

This is a browser study, not a production integration or a real-device
benchmark. No full-game headless boot was run for this lab-only addition.
The 390 px review verifies layout in a desktop browser, not phone GPU speed or
physical touch input. Reduced-motion startup is implemented through the shared
OS preference; changing the host's OS setting was not part of this check.

The shadow column approximates the volume's density; the four-slice painting
approximates depth; the rays are sky-space rather than a geometry-occlusion
post-process. Thin-cloud star visibility uses the original star system with a
global cloud-cover fade. Reflection intensity follows the light, while the
shared cat walker's small environment map is not a freshly integrated physical
atmosphere. These distinctions are also visible in the recipes and research.
