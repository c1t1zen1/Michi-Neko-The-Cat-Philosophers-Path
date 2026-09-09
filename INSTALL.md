# 📦 Michi-Neko · 道猫 — Installation Manual

> **Michi-Neko (道猫 — "the cat's path")** is a pure browser game built with Three.js and ES Modules.  
> It requires no build step, no package manager, and no external dependencies —  
> just a static web server and a modern browser.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Web browser** | Chrome 56+, Firefox 51+, Safari 15+, or Edge 79+ (must support WebGL 2.0) |
| **Local web server** | Any static file server (Python, Node, VS Code Live Server, etc.) |
| **GPU** | Any GPU with WebGL 2.0 support (integrated graphics are fine) |
| **RAM** | 512MB+ free (the game targets <500MB memory usage) |
| **Disk space** | ~5MB (the entire game is source code — no asset downloads) |

> **Why a web server?** Michi-Neko uses ES Modules (`import`/`export`), which browsers block when loading files directly from the filesystem (`file://`). A local server is required.

---

## Quick Install (2 minutes)

### Option A — Python (recommended, no install needed on most systems)

```bash
# From the repository root (Michi-Neko-The-Cat-Philosophers-Path/):
py -m http.server 8080 --bind 127.0.0.1
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

---

## Browser Setup

### Recommended Browsers

| Browser | Version | Notes |
|---------|---------|-------|
| **Chrome / Chromium** | 56+ | Best WebGL performance, hardware-accelerated |
| **Firefox** | 51+ | Excellent WebGL support, smooth experience |
| **Safari** | 15+ | Works well on macOS, touch controls on iPad |
| **Edge** | 79+ | Chromium-based, full support |

### Enabling Hardware Acceleration

If the game runs slowly, ensure hardware acceleration is enabled:

- **Chrome:** Settings → System → "Use hardware acceleration when available" → Relaunch
- **Firefox:** Settings → General → Performance → Uncheck "Use recommended settings" → Check "Use hardware acceleration"
- **Safari:** Automatically enabled on macOS with supported GPU

### WebGL Check

Not sure if your browser supports WebGL 2.0? Visit [webglreport.com](https://webglreport.com/?v=2) — if you see a report, you're good to go.

---

## Graphics Quality Settings

Michi-Neko auto-detects your device capability on first launch. You can also adjust quality manually in the **Settings** menu (gear icon on the title screen or pause menu):

| Quality | Shadow Resolution | Bloom | Pixel Ratio Cap | Target Devices |
|---------|-------------------|-------|-----------------|----------------|
| **Low** | 1024px | Off | 1.0x | Older phones, low-end laptops, single-board PCs |
| **Medium** | 2048px | On | 1.25x | Mid-range desktops, modern phones |
| **High** | 2048px | On | 1.75x | Gaming PCs, modern Macs |
| **Auto** | Detected | Detected | Detected | Let the game decide (recommended) |

The game also features **adaptive resolution** — if your FPS drops below 45, it automatically reduces the pixel ratio. If FPS exceeds 58, it scales back up. This happens seamlessly without menu intervention.

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
   - Left side: virtual joystick to move
   - Right side: JUMP, ACT, MEOW buttons
   - Swipe anywhere on the right half to rotate the camera

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

### Touch controls not appearing

- **Cause:** The game only shows touch controls on touch-capable devices
- **Fix:** If on a hybrid device (e.g., Surface), ensure touch input is being detected. The game checks `ontouchstart` and `maxTouchPoints`.

---

## Development Setup

If you want to modify the game:

1. **No build step required** — edit any `.js` or `.html` file and refresh the browser
2. **File cache busting** — source files use `?v=` query params in imports. When editing, either change the version string or do a hard refresh (`Ctrl+Shift+R`)
3. **Debug overlay** — press `F3` in-game to see FPS, draw calls, triangle count, and GPU memory
4. **Console access** — the game instance is exposed as `window.game` for debugging

### File Structure Overview

```
Michi-Neko-The-Cat-Philosophers-Path/
├── index.html          # HTML shell, CSS styling, UI overlays
├── src/                # All game source code (ES modules)
│   ├── main.js         # Game class — main entry point
│   ├── player.js       # Player controller & camera
│   ├── cat.js          # Cat avatar model & animation
│   ├── countryside.js  # World generation (Kyoto valley)
│   ├── sky.js          # Sky, day/night, weather
│   └── ...             # 20+ other game modules
├── docs/               # Performance reviews & inspiration artwork
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
