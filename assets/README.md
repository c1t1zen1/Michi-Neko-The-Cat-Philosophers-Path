# assets/

Optional runtime media for **Michi-Neko**. Nothing here is required for the
game to boot — every slot has a graceful fallback.

## `models/summit_kyoto_landmarks.glb`

Compact Blender-authored middle-distance roofscape for the summit panorama:
five terraced rows of machiya, blue-grey kawara roofs, a hillside torii and a
five-storey pagoda. The editable source and repeatable export script live at
`data/misc/summit_vista_landmarks/` and
`tools/blender/summit_vista_landmarks.py`.

The model is merged into one mesh with six material primitives (about 292 KB)
and loaded only by `SummitManager`. If it cannot load, the procedural 3D
districts, gardens, harbour, bay and mountain ranges still carry the complete
vista; no image-wall fallback is required.

## `summit-transition.mp4` (optional)

Plays full-screen during the ascent to the mountain top clearing (天上), over
the veil declared in `index.html` (`#summit-transition` / `#summit-video`) and
driven by `src/mountaintop.js`.

**Behaviour**

- The `<video>` element ships with **no `src` and `preload="none"`**, so this
  file is never fetched at cold start.
- `SummitManager.enter()` attaches `SUMMIT_VIDEO_SRC` lazily on first use and
  calls `video.load()`.
- If the file is absent (404) or the browser can't decode it, the video's
  `error` handler adds `.fallback` to the veil and the CSS light-burst in
  `index.html` plays instead. **The transition always works.**

**Recommended encoding**

| Property | Value |
| --- | --- |
| Container | MP4 (H.264 video) |
| Audio | none — the element is `muted`; the scene's own wind bed carries the sound |
| Resolution | 1920×1080 (the veil uses `object-fit: cover`, so any 16:9 works) |
| Frame rate | 24–30 fps |
| Length | 4–10 s (auto-advances at the end; a 12 s safety timer always releases input) |
| Filename | exactly `summit-transition.mp4` |

Content-wise it should read as *climbing into light* — the shrine's god-rays
brightening, a rise through cloud, then the meadow opening out over Kyoto.
The teleport happens ~1.7 s in, behind the veil, so the video's midpoint is
where the new scene appears.

Because it's ignored by git (see `.gitignore`), dropping the file in locally
is enough to test it.
