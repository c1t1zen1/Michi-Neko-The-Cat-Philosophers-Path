# Skretch — the Roof Road stage 2 review board

A mobile-first board for reviewing **stage 2** (`kyoto-rooftops.html`, the
Roof Road lab) end to end: the whole 1,082 m route as one long horizontal
scroll of captured scenery, with pen/pencil/marker sketching and pinned
notes saved back to disk for the next fix pass.

## Run

```
node Skretch/server.mjs            # http://localhost:8098/Skretch/
node Skretch/server.mjs --host 0.0.0.0   # same, reachable from a phone on Wi-Fi
```

The server is zero-dependency Node. It serves the repo (so the per-frame
`▸ play` links into `kyoto-rooftops.html?at=<s>` work) plus a tiny API:

- `GET /Skretch/api/review` — the current review (empty scaffold if none)
- `PUT /Skretch/api/review` — `{ baseRevision, review }`, revision-checked,
  atomic writes, last 20 revisions kept in `data/history/`
- `GET /Skretch/api/report` — `review.md` rendered on the fly

## What gets saved

Every save writes, atomically, into `Skretch/data/`:

- `review.json` — canonical annotations. Per route: `strokes`
  (`{tool, size, color, points:[[x,y,pressure]…]}`) and `notes`
  (`{x, y, color, title, body, category: layout|scenery|movement|other,
  status: open|done}`) in capture-pixel space, each with a stable id and
  `updatedAt` so a disconnected phone can merge without reviving deletions.
- `review.md` — the same review as a readable work list: each note with its
  frame id, route-metre anchor and source image; each stroke summarised.
  This is the file to feed the fix pass.
- `history/review-*.json` — last 20 saved revisions.

Conflicting saves get a **409 → merge** flow in the UI (per-id newest-wins).

## Using the board

- **Browse**: the strip is one long scroll — swipe/drag, mouse wheel, or
  drag the minimap ruler (districts labelled by mouth, tick every 50 m,
  hatched segments are street turns). The header shows district · metre · zoom.
- **Open a screen**: tap/click any screenshot to zoom into it, then pick a
  pen. `⇤ strip` or double-tap returns to the whole board.
- **Sketch**: pen · pencil · marker · eraser (whole-stroke) — 7 colours,
  S/M/L sizes. Undo/redo work per board. Ink is stored as vectors, so it
  stays sharp at every zoom.
- **Notes**: 📌 tool, tap the board → tooltip card with title, body,
  category, open/done status and colour. Pins render on the strip; the
  **Notes** drawer lists everything (filter open/done) and jumps to the spot.
- **Routes**: the picker switches between the main run and the six alley
  supplements (overhead views of the hidden lanes).
- **Keys** (desktop): H P B M E N tools · ⌘Z / ⇧⌘Z undo/redo · ⌘S save ·
  +/− zoom · 0/Esc back to strip.

Offline: opened from any other static server the board still works —
annotations mirror to `localStorage` and **Download review.json** exports
them by hand.

## Re-capturing the scenery

`assets/` holds 47 main frames + 12 alley frames (1200×750 JPEG, orthographic
elevations at fixed warm daylight), thumbs, the stitched panorama and
`manifest.json` (frame ↔ route-metre mapping used by the whole app).

```
node Skretch/tools/capture.mjs     # needs PLAYWRIGHT_MODULE + SHARP_MODULE
```

The rig (`tools/capture.html` + `capture-scene.js`) boots the real level —
`level.js` → `buildWorld` → `Sky` at phase 0.24 — and shoots each rail
segment side-on; turns are separate wider views, alleys are oblique
overheads.

## Tests

```
cd Skretch && npm test             # model + server API (node:test)
cd Skretch && npm run test:browser # headless Chromium: draw, pin, save, reload
```
