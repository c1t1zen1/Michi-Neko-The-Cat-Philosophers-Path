# Cat anatomy glow-up — behind-the-scenes video (Oct 22, 2026)

A 49-second vertical (1080×1920, 30 fps) dev-log video for Threads, tracing the
player cat from the v0.9 prototype (Aug 23) to the sculpted rebuild (Oct 22).

| File | What it is |
|------|------------|
| `michi-neko-cat-anatomy-glow-up.mp4` | The video (H.264 + AAC) |
| `poster.png` | Cover frame (the before/after split) |
| `caption.txt` | The post text |
| `source/` | The scripts that made it |

## What's in it

Every in-game shot is a real render of that day's `src/cat.js`, taken from
git history and driven through the `Cat` API with seeded randomness:

| Chapter | Commit | Shown |
|---------|--------|-------|
| 01 The Prototype | `cc1f7e2` (Aug 23) | 77 rigid meshes, 28K tris, 5-segment tail |
| 02 The Painterly Pass | `a2c4fc6` (Sep 06) | body-space tabby shader, toon ramp, amber irises |
| 03 Anatomy Study | `96dfae9` (Sep 24) | the Blender study renders + the proportion fixes |
| 04 Collar + Bell | `372235f` (Sep 29) | neck-axis collar, bell at its lowest point |
| 05 First Sleep Pose | `04bc77f` (Oct 04) | the stiff-legged first sleep |
| 06 The Rebuild | `112c135` + working tree (Oct 22) | 29 bones, 50 SDF primitives, smooth-min, surface nets, skin weights, painted face, gait, poses, 4 builds |

Callouts track projected bone and part positions, so labels stay pinned
to the anatomy as the camera orbits. The soundtrack is original: a 150 BPM
track synthesised in numpy (one beat = 12 frames, so every cut lands on the
grid), with a Karplus-Strong koto hook, suzu bells and SFX cued from the edit.

## Rebuilding it

`source/capture/` renders the cat frames: `driver.js` serves a scratch folder
holding per-version snapshots of `src/cat*.js` (`snap/<ver>/src/`, from
`git show <commit>:src/cat.js`) plus a local `three.module.js`, and drives
headless Chromium through `harness/capture.html` for each job made by
`make_jobs.js`. The `now` snapshot also exports the private
`bodyPrims`/`headPrims` builders from `cat_anatomy.js` for the primitive views.

`source/video/` builds the edit: `python edit.py cues cues.json`, then
`python music.py cues.json music.wav`, then
`python edit.py render out.mp4 music.wav` (set `FFMPEG` to an ffmpeg with
libx264). `python edit.py still s.png <frame>` renders single frames.
