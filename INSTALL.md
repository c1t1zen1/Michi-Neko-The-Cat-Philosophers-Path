# 📦 Michi-Neko · 道猫 — Installation Manual

> **Michi-Neko (道猫 — "the cat's path")** is a pure browser game built with Three.js and ES Modules.  
> It requires no build step, no package manager, and no external dependencies —  
> just a static web server and a modern browser.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Web browser** | A current browser with WebGL 2.0 and import maps: Chrome or Edge 89+, Firefox 108+, Safari 16.4+ |
| **Network** | Three.js r160 loads from the unpkg CDN through the import map in `index.html`, so the first load needs internet |
| **Local web server** | Any static file server (Python, Node, VS Code Live Server, etc.) |
| **GPU** | Any GPU with WebGL 2.0 support. Real phones and low-end GPUs have not been benchmarked yet (see [Performance](#graphics-quality-settings)) |
| **RAM** | 512MB+ free (the game targets <500MB memory usage) |
| **Disk space** | The game itself is about 3 MB of source code with no asset downloads; a full clone is about 0.5 GB because of the docs, images, videos and companion tools |

> **Why a web server?** Michi-Neko uses ES Modules (`import`/`export`), which browsers block when loading files directly from the filesystem (`file://`). A local server is required.

---

## Quick Install (2 minutes)

### Option A — Python (recommended, no install needed on most systems)

```bash
# From the repository root (Michi-Neko-The-Cat-Philosophers-Path/):
python3 -m http.server 8080 --bind 127.0.0.1   # macOS / Linux
py -m http.server 8080 --bind 127.0.0.1        # Windows
```

Then open **http://127.0.0.1:8080** in your browser.

> **Python 3** is pre-installed on macOS and most Linux distributions. On Windows, install it from [python.org](https://python.org) or the Microsoft Store.

### Option B — Node.js

```bash
# Using npx (comes with Node.js):
npx serve -l 8080

# Or with http-server:
npx http-server -p 8080 -a 127.0.0.1
```

Then open **http://127.0.0.1:8080** in your browser.

### Option C — VS Code Live Server extension

1. Install the **Live Server** extension (by Ritwick Dey) in VS Code
2. Right-click `index.html` in the file explorer
3. Select **"Open with Live Server"**
4. Your browser will open automatically

### Option D — Any other static server

Any tool that serves static files over HTTP will work:
- `php -S 127.0.0.1:8080`
- `ruby -run -e httpd . -p 8080`
- `Caddy file-server --listen :8080`

### Option E — one server for the game and every tool

`node cadJS/server.mjs` (Node.js 22 or newer, nothing to install) serves the game, the Asset Library, cadJS and dawCAT on one origin, and adds the routes that save to the repository and relay AI requests:

```bash
node cadJS/server.mjs
# game:   http://127.0.0.1:4173/
# assets: http://127.0.0.1:4173/catalog/
# cadJS:  http://127.0.0.1:4173/cadJS/
```

Set `PORT` or `HOST` to change the address. Keep it on `127.0.0.1` unless you mean to expose it. Browser saves and settings belong to an origin, so a save made on port 8080 does not show up on port 4173.

---

## Step-by-Step: First Run

1. **Download or clone the repository**

   ```bash
   git clone https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path.git
   cd Michi-Neko-The-Cat-Philosophers-Path
   ```

2. **Start a local web server** (choose any option from above)

3. **Open your browser** to `http://127.0.0.1:8080`

4. **Click "New Game"** on the title screen

5. **Move with WASD** and explore the valley. That's it — you're playing!

Other pages on the same server: `/kyoto-rooftops.html` (the Roof Road sandbox page), `/labs/` (the Labs), `/catalog/` (the Asset Library), `/dawCAT/` (the audio studio) and `/Shinkansen/` (*Eastbound*, a standalone stage-03 prototype).

---

## Browser Setup

### Recommended Browsers

| Browser | Version | Notes |
|---------|---------|-------|
| **Chrome / Chromium** | 89+ | Best WebGL performance, hardware-accelerated; the browser the checks run in |
| **Firefox** | 108+ | Excellent WebGL support, smooth experience |
| **Safari** | 16.4+ | Works well on macOS, touch controls on iPad |
| **Edge** | 89+ | Chromium-based, full support |

The versions are the first with import maps, which the game needs. The automated checks run in headless Chromium only.

### Enabling Hardware Acceleration

If the game runs slowly, ensure hardware acceleration is enabled:

- **Chrome:** Settings → System → "Use hardware acceleration when available" → Relaunch
- **Firefox:** Settings → General → Performance → Uncheck "Use recommended settings" → Check "Use hardware acceleration"
- **Safari:** Automatically enabled on macOS with supported GPU

### WebGL Check

Not sure if your browser supports WebGL 2.0? Visit [webglreport.com](https://webglreport.com/?v=2) — if you see a report, you're good to go.

---

## Graphics Quality Settings

Michi-Neko picks a tier for your device on first launch. You can also adjust quality manually in the **Settings** menu (gear icon on the title screen or pause menu):

| Quality | Shadow Resolution | Bloom | Pixel Ratio Cap | Target Devices |
|---------|-------------------|-------|-----------------|----------------|
| **Low** | 1024px | Off | 1.0x | Older phones, low-end laptops, single-board PCs |
| **Medium** | 2048px | On | 1.25x | Mid-range desktops, modern phones |
| **High** | 4096px on a desktop discrete GPU, else 2048px | On | 1.75x | Gaming PCs, modern Macs |
| **Auto** | Detected | Detected | Detected | Let the game decide (recommended) |

Low also turns off ambient occlusion and light shafts and halves the grass and particles; only High uses 4× MSAA. *Auto* gives phones Medium with 6 or more CPU cores and Low otherwise, and desktops High only with 8 or more cores and a recognised discrete GPU (otherwise Medium). A one-time check on the title screen can lower the starting tier on a weak device; it never raises it.

The game also features **adaptive resolution** — if your FPS drops below 45, it first drops the light shafts and quarters the bloom, then reduces the pixel ratio. If FPS exceeds 58, it scales back up. This happens seamlessly without menu intervention.

### Asset set: classic or modular

The game has two ways to build its world: the original builders (**classic**, the default) and the new modular kit (**modular**). To try the kit, add `?assets=modular` to the address (for example `http://127.0.0.1:8080/?assets=modular`), or `?swap=toro:modular` for one asset. There is no menu entry for it yet. On quality **Low** the game always uses classic and never downloads the kit, unless you add `?assets=` yourself. Saves work on both sets.

**Not benchmarked yet:** real phones, tablets and low-end or integrated GPUs. The performance budgets were measured on one desktop machine only. If the game runs slowly on your device, Low is the safe choice.

---

## Mobile & Touch Setup

Michi-Neko is designed mobile-first and works on phones and tablets:

1. **Serve over your local network** (so your phone can reach it):

   ```bash
   # Find your computer's local IP address, then:
   py -m http.server 8080 --bind 0.0.0.0
   
   # On your phone, open:
   # http://<your-computer-ip>:8080
   ```

2. **Use touch controls:**
   - Left side: virtual joystick to move (push to the edge to sprint)
   - Right side: JUMP, ACT, MEOW buttons
   - Swipe anywhere on the right half to rotate the camera
   - On the Roof Road: the stick runs left and right and drops you to a lower route when pushed down; JUMP jumps

3. **Portrait or landscape** — both work, but landscape gives a wider view

> **Tip:** Add the page to your phone's home screen for a fullscreen, app-like experience.

---

## Low-End & Single-Board PCs

The game is designed to stay playable on weak hardware — including a Raspberry Pi 5 or an old
phone:

1. **Use Chromium** (best WebGL support on Linux / Raspberry Pi OS)
2. **Set quality to "Low"** in Settings
3. **Connect a display** (headless mode won't render WebGL)
4. **Start the server on the device itself:**

   ```bash
   cd Michi-Neko-The-Cat-Philosophers-Path
   python3 -m http.server 8080
   # Open http://localhost:8080 in Chromium
   ```

5. If performance is low, the adaptive resolution system will kick in automatically.

Low keeps the original (classic) assets and never downloads the modular kit. None of these devices has been benchmarked yet, so treat this as guidance, not a promise.

---

## Troubleshooting

### "Blank screen" / nothing loads

- **Cause:** Opening `index.html` directly via `file://` instead of a web server
- **Fix:** Start a local server (see options above) and access via `http://127.0.0.1:8080`

### "WebGL is not supported" error

- **Cause:** Your browser or GPU doesn't support WebGL 2.0
- **Fix:** Update your browser, enable hardware acceleration, or try a different browser

### Game loads but runs very slowly

- **Fix 1:** Lower graphics quality in Settings → "Low"
- **Fix 2:** Close other GPU-intensive tabs/applications
- **Fix 3:** Ensure hardware acceleration is enabled in your browser
- **Fix 4:** The adaptive resolution system will attempt to recover automatically

### No sound

- **Cause:** Browsers require a user gesture before audio can play
- **Fix:** Click or tap anywhere on the game — audio will start on the first interaction
- **Check:** Verify volume sliders in Settings aren't set to zero

### Save data lost

- **Cause:** Save data is stored in `localStorage`, which is per-browser and per-origin
- **Note:** Clearing browser data/cache will erase saves. Using a different browser or incognito mode starts fresh.

### The modular set takes longer to load

- **Cause:** `?assets=modular` downloads and builds the kit before the valley appears. On the dev machine the modular world takes about 1.3–1.4 times as long to build as classic
- **Fix:** Remove `?assets=modular` to play the classic set, or wait a little longer on the first load

### The Roof Road does not open

- **How it opens:** on the valley bridge, walk the **east** railing from the **north** end to the south end without stepping off. Each of the seven posts glows and sings; at the seventh the bamboo on the old earthen wall south of the bridge parts. Walk through the noren in the gap
- **If you step off:** the glows fade and you can start again from the north end. There is no penalty and no time limit
- **If the roofs fail to load:** the game says so and puts you back on the bridge. Reload the page and try again

### Touch controls not appearing

- **Cause:** The game only shows touch controls on touch-capable devices
- **Fix:** If on a hybrid device (e.g., Surface), ensure touch input is being detected. The game checks `ontouchstart` and `maxTouchPoints`.

---

## Development Setup

If you want to modify the game:

1. **No build step required** — edit any `.js` or `.html` file and refresh the browser
2. **File cache busting** — source files use `?v=` query params in imports (the current tag is in [AGENTS.md](AGENTS.md)). When editing, either change the version string or do a hard refresh (`Ctrl+Shift+R`)
3. **Debug overlay** — press `F3` in-game to see FPS, draw calls, triangle count, and GPU memory
4. **Console access** — the game instance is exposed as `window.game` for debugging
5. **Review sheets** — `/tools/cat_preview.html?sheet=npcs`, `/tools/town_preview.html?sheet=street`, `/tools/hidden_preview.html`, `/tools/tree_preview.html?sheet=hero` render seeded, repeatable views through the real game classes
6. **Checks** — `node tools/check_syntax.mjs` (all modules) and `node tools/verify.mjs` (syntax, wiring, summit suite, kit checks); `node tools/kit_check.mjs` and `node --test tools/kit_test.mjs` for the asset kit; `node tools/rooftop_test.mjs` for the Roof Road; `node tools/labs_check.mjs` for the Labs; companion tests: `cd dawCAT && npm test`, `cd cadJS && npm test`, `cd catalog && npm test`. The full list is in the README's [Verification](README.md#verification) section
7. **Asset swaps** — `?assets=classic|modular|auto` for the whole game, `?swap=<id>:modular` for one asset; the README's [Make and swap an asset](README.md#make-and-swap-an-asset) walks through the kit from a lab study to the game
8. **Headless checks and captures** use Playwright from outside the repo: `export PLAYWRIGHT_MODULE=/path/to/node_modules/playwright` (nothing is installed in the repo)

### File Structure Overview

```
Michi-Neko-The-Cat-Philosophers-Path/
├── index.html          # HTML shell, CSS styling, UI overlays
├── kyoto-rooftops.html # The Roof Road sandbox page
├── src/                # All game source code (ES modules)
│   ├── main.js         # Game class — main entry point
│   ├── player.js       # Player controller & camera
│   ├── cat.js          # Cat facade over src/characters/
│   ├── countryside.js  # World generation (Kyoto valley)
│   ├── sky.js          # Sky, day/night, weather
│   ├── hidden_places.js# Moon Pool & Lantern Glade
│   ├── mountaintop.js  # The summit (天上); builders in src/summit/
│   ├── rooftops/       # The Roof Road in the game
│   ├── kit/            # The modular asset kit (28 families)
│   ├── characters/     # Character definitions, rig, parts, behaviour
│   └── ...             # 30+ other game modules
├── rooftops/           # The Roof Road run (rail, level, physics, pieces)
├── labs/               # The Labs — serve the repo root, open /labs/
├── catalog/            # Asset Library — open /catalog/
├── tools/              # Checks, goldens, review sheets, capture tools
├── dawCAT/             # Optional audio studio — serve the repo root, open /dawCAT/
├── cadJS/              # Optional CAD workspace — `cd cadJS && npm start`
├── Skretch/            # Roof Road review board — `node Skretch/server.mjs`
├── Shinkansen/         # Eastbound, a standalone stage-03 prototype
├── assets/             # Optional runtime media (summit vista, transition video)
├── docs/               # Reviews, build guides, checklists, social posts, images
└── OLD/
    └── archive-cat-city/  # Archived predecessor project (not this game)
```

---

## Uninstall

Since Michi-Neko runs entirely in the browser with no installation:

1. Close the browser tab
2. Stop the web server (`Ctrl+C` in the terminal)
3. Optionally clear localStorage: open browser console on the game page and run `localStorage.clear()`
4. Delete the downloaded files

That's it — no system changes to undo.

---

*Questions? Check the [QUICKSTART.md](QUICKSTART.md) for gameplay guidance, or open an issue on GitHub.*
