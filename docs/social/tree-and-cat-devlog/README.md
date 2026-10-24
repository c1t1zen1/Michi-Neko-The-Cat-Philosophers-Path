# Tree & Foliage Evolution + Cat Anatomy Rebuild — Vertical Devlog (`1080×1920`)

A 94.2-second (`1080×1920`, 30 fps) vertical engineering devlog for Threads / Reels / Shorts tracing the complete five-stage procedural evolution of **Michi-Neko's** trees and bushes alongside the **Cat Anatomy & Locomotion Rebuild** in pure vanilla JavaScript (`Three.js r160`, zero external `.glb` models).

## Deliverables

| File | Description |
|------|-------------|
| `tree-and-cat-devlog-vertical.mp4` | Final `1080×1920` H.264 + AAC 192 kbps vertical video (`94.2s`, `2,826` frames at `30 fps`) |
| `caption.txt` | Companion social post copy for Threads / Reels / Shorts |
| `source/capture/driver.js` | Headless Chromium + SwiftShader WebGL capture server extracting historical git commits (`cc1f7e2`, `a2c4fc6`, `ce00d8f`, `e4fb486`, `9b76887`, `112c135`) and rendering 22 transparent RGBA 3D plates + per-frame projected 3D-to-2D callout anchors |
| `source/capture/harness/capture.js` | Real Three.js r160 scene builders for all 5 Tree eras and all 5 Cat eras |
| `source/video/timeline.py` | 21-scene timeline specification with commit metadata, telemetry cards, and source code snippets |
| `source/video/music.py` | Procedural stereo 44.1 kHz soundtrack synthesizer (D Hirajoshi / Yo koto & kalimba plucks, warm pad, shakuhachi flute cues, wind rustle, gait paw-steps, and scene-cut chimes) |
| `source/video/engine.py` | Pillow 2D/3D compositor with tracked 3D leader-line callouts, target reticles, syntax-highlighted code inspector, and 5-stage progress stepper |
| `source/video/edit.py` | Master frame renderer & FFmpeg H.264/AAC encoder |

## Scene Breakdown (21 Scenes · 94.2s)

1. **`00.0s – 04.6s` (`hook_split`)** — Prologue: 2×2 split comparing Aug 23 v0.9 prototypes (`cc1f7e2`) against Oct 22 Hero Sakura & SDF Voxel Cat (`112c135`).
2. **`04.6s – 08.2s` (`roadmap_overview`)** — Two-Act Engineering Roadmap: Act I Foliage Pipeline (`src/foliage.js`, `src/vegetation.js`) & Act II Cat SDF Pipeline (`src/cat_anatomy.js`, `src/cat_sdf.js`, `src/cat_shading.js`).
3. **`08.2s – 12.6s` (`tree_s1_proto`)** — Tree Stage 1 (`cc1f7e2`, Aug 23): 7-sided trunk cylinder, 4 straight 5-gon branch pegs, and 26 unmerged flat-shaded `IcosahedronGeometry(1, 0)` blobs (with wireframe wipe).
4. **`12.6s – 17.0s` (`tree_s2_painterly`)** — Tree Stage 2 (`a2c4fc6`, Sep 06): Parabolic root flare, 256px procedural bark normal map, and merged `lumpyTuftGeometry` crown with per-tuft HSL vertex tints & subsurface scattering.
5. **`17.0s – 21.4s` (`tree_s3_clumps`)** — Tree Stage 3 (`ce00d8f`, Sep 09): Recursive `buildBranch()` boughs carrying lumpy core tufts fringed with crossed alpha-cut `leafCardTexture` quads.
6. **`21.4s – 25.8s` (`tree_s4_problem`)** — Tree Stage 4 (`e4fb486`, Sep 24): Diagnosing why opaque clump cores and crossed X-cards looked like "broccoli pillows" from cat eye-level (`y = 0.35m`).
7. **`25.8s – 30.8s` (`tree_s5_arch`)** — Tree Stage 5A (`112c135`, Oct 22): Dual-architecture split (`style: 'leaves'` inside `r < 39m` vs `style: 'masses'` on the rim) + 256px procedural `leafSprayTexture` & `leafMassTexture` swatches.
8. **`30.8s – 35.8s` (`tree_s5_hero`)** — Tree Stage 5B: Hero Sakura turntable with 4-level branching wood, curved 2×2 leaf sprays on twigs, radial AO gradient (`0.52 → 1.08`), and true sky apertures.
9. **`35.8s – 40.2s` (`tree_s5_wind`)** — Tree Stage 5C: Bough macro inspection & shared GLSL `branchBend()` + `aSway` vertex wind keeping wood and leaf sprays locked together in gusts.
10. **`40.2s – 44.6s` (`tree_s5_species`)** — Tree Stage 5D: Botanical habit parameterization for **Iroha-Momiji** (tiered palmate Japanese maple) and **Akamatsu** (crooked terracotta Japanese red pine with flat needle pads).
11. **`44.6s – 49.0s` (`tree_s5_rim`)** — Tree Stage 5E: Rim forest & street shrubs using `bushGeometry` + RGBA `leafMassTexture` (R: height/highlight, G/B: normal XY tilt, A: ragged edge cutout) and live `uPlayerPos` rustle.
12. **`49.0s – 53.2s` (`cat_act_intro`)** — Act II Transition: Side-by-side comparison of the 18-mesh rigid primitive cat vs the 29-bone Surface Nets sculpted cat.
13. **`53.2s – 58.0s` (`cat_s1_s3_legacy`)** — Cat Stages 1–3 (`cc1f7e2` → `a2c4fc6` → `9b76887`): Triptych of the three legacy primitive cats walking in sync, illustrating joint seam cracks.
14. **`58.0s – 62.6s` (`cat_s4_skeleton`)** — Cat Stage 4A: 29-bone digitigrade feline skeleton (`hips`, `waist`, `chest`, `neck`, `head`, `scapL/R`, `humerusL/R`, `forearmL/R`, `wristL/R`, `fpawL/R`, `femurL/R`, `tibiaL/R`, `metaL/R`, `hpawL/R`, `tail0..tail5`).
15. **`62.6s – 67.2s` (`cat_s4_primitives`)** — Cat Stage 4B: 50 anatomical SDF ellipsoids and tapered capsules color-coded by anatomical region.
16. **`67.2s – 72.0s` (`cat_s4_smin_sculpt`)** — Cat Stage 4C: Polynomial smooth-minimum (`smin`) voxel field (`9mm` body / `4mm` head) extracted via dual Surface Nets + 6-pass Taubin `λ/μ` fairing.
17. **`72.0s – 76.6s` (`cat_s4_weights`)** — Cat Stage 4D: 4-bone geodesic skin-weight heatmap turntable showing crease-free shoulder and haunch deformation.
18. **`76.6s – 81.2s` (`cat_s5_face`)** — Cat Stage 5A: Macro portrait of shader-painted tabby coat markings, vertical slit-pupil eyes with cornea glint & live blink, rhinarium nose pad, inner pinna fur tufts, and 3D whisker arcs.
19. **`81.2s – 86.2s` (`cat_s5_gaits`)** — Cat Stage 5B: Biomechanical locomotion blending 4-beat lateral walk (`1.3 m/s`), diagonal trot (`4.6 m/s`), and rotary gallop (`7.6 m/s`) with ground-pinned stance paws.
20. **`86.2s – 90.2s` (`cat_s5_builds`)** — Cat Stage 5C: Expressive poses & 4 parametric villager builds (`michi` sitting, `mochi` curled asleep, `luna` play-bow stretching, `kuro` paw-grooming).
21. **`90.2s – 94.2s` (`finale_showcase`)** — Finale: Michi striding along the stepping-stone path beneath wind-swayed hero sakura and autumn maple crowns with drifting cherry petals.

## Rebuilding From Source

```bash
# 1. Capture all 22 WebGL 3D plate sequences + projected 2D anchor metadata into %TEMP%/tree-cat-cap/out
node docs/social/tree-and-cat-devlog/source/capture/driver.js

# 2. Synthesize the 94.2s stereo WAV soundtrack and render the final 1080x1920 MP4
python docs/social/tree-and-cat-devlog/source/video/edit.py
```
