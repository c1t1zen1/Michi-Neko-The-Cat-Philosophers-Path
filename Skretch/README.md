# Skretch — Roof Road stage 2 review board

Skretch unfolds the current Roof Road main route into 54 JPEG scenes at the same scale. Every scene covers 32 route metres, with the ground and the top of the festival float in the same vertical frame. The original level piece builders are run against a straightened copy of the route, so bends join into a continuous elevation while distant city scenery stays out. Adjacent captures overlap by 64 pixels; the capture tool checks and blends those overlaps before slicing the board. The last frame has blank space beyond the end of the route. This is an unfolded design view of the winding level, rather than a literal camera shot of each bend.

## Use on GitHub Pages

Publish the repository with GitHub Pages and open `/Skretch/` under its Pages URL. No server or build step is required for the board; all paths are relative and the game link requires the rest of the repository to be published too.

- Swipe/drag to browse; tap a scene to zoom; use **strip** to return. Drag the coloured ruler to jump along the route. On desktop, the mouse wheel moves along the strip; Ctrl/⌘ + wheel zooms.
- Pick **pen**, **pencil**, or **marker**, then a colour and size. Use **erase**, undo and redo to revise. The tool rail scrolls sideways on a phone. Pin a note to add a title, detail, category, colour and open/done status; the Notes drawer can jump back to it.
- On Pages, changes are saved automatically **in that browser on that device**. Use **Download** for a portable `skretch-review.json` backup; choose **Open review.json** in the menu to merge a file on any device. Browser storage can be cleared, so keep the downloaded file. Pages cannot write the review back into the repository or sync devices automatically.
- The menu also downloads a Markdown work list, an annotated JPEG of the scene currently at the centre of the screen, and the complete unannotated stage JPEG. The full image is 64,800 × 750 pixels.

The new capture changes where every scene falls on the strip. The menu’s **Open previous board** opens the earlier capture with its own browser-local annotations. Older review files can be opened there; they are intentionally rejected by the new board because their pixel coordinates no longer match. Files previously saved by the local server remain in `Skretch/data/`; open those JSON files in the previous board to review them. The current board uses a separate browser draft and will not overwrite an incompatible server review.

## Save directly to a local checkout

```sh
node Skretch/server.mjs                 # http://localhost:8098/Skretch/
node Skretch/server.mjs --host 0.0.0.0  # also reachable from a phone on Wi-Fi
```

The optional zero-dependency server saves `Skretch/data/review.json` and `review.md`, keeps the last 20 revisions, and checks revision conflicts. A browser draft is merged by annotation ID when this server becomes available. If the server contains an older incompatible capture, the board keeps a separate browser draft and does not overwrite that file. A downloaded JSON file can also be opened on the local server and saved there. Treat these review files as the input for the next implementation pass.

## Re-capture after a level change

```sh
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright \\
SHARP_MODULE=/path/to/node_modules/sharp node Skretch/tools/capture.mjs
```

The capture reads `rooftops/js/level.js` and its piece builders; it does not modify the game. It writes the numbered frames, thumbnails, one full-resolution JPEG and `assets/manifest.json`. It checks the 64-pixel overlaps before blending the tiny renderer differences and publishing the files. Changing the framing or frame order requires a new capture ID and a migration strategy for existing annotations; otherwise their pixel positions no longer correspond to the images.

## Checks

```sh
cd Skretch && npm test
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright npm run test:browser
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright npm run test:static
```

The browser suites test local server persistence and a phone-sized static-hosted workflow, including drawing, notes, reload, download and reopening a review.
