# AGENTS.md — Michi-Neko

Browser game (Three.js r160, vanilla ES modules, no build step) plus two
companion apps. Last reviewed 2026-10-24.

## Layout

| Path | What lives there |
|------|------------------|
| `index.html`, `src/` | The game. `main.js` orchestrates; see the README's project tree for every module |
| `src/mountaintop.js` | The summit clearing (天上). **Owned by a separate effort — don't edit it, or the summit UI in `index.html`/`ui.js`, unless asked.** Cache-tag bumps are the one exception (import lines only) |
| `src/hidden_places.js` | Moon Pool + Lantern Glade (valley floor, never a hilltop) |
| `src/grass.js` | Game grass: the Grass Lab recipes as LOD rings that follow the cat plus fixed zones, a CPU-baked `BiomeMask` (meadow / edge thicket / flowers / wild, plus lawns) and GPU spring + trail physics. The valley lays it out in `Vegetation.buildMeadow()`, the summit in `SummitManager.buildGrassField()` |
| `tools/` | Review sheets (`cat_`, `tree_`, `town_`, `hidden_`, `summit_`, `grass_preview`) and `verify.mjs` / `check_syntax.mjs` / `summit_test.mjs` / `rooftop_test.mjs` |
| `dawCAT/` | Audio studio: compose, Sound Design, Wave Lab, AI assistant. `cd dawCAT && npm test` |
| `cadJS/` | CAD workspace: Procedural Studio, push-to-game, AI agent. `cd cadJS && npm test` (`npm run check` also loads the server modules) |
| `grass/` | Grass Lab: twenty Three.js grass designs in live isometric cubes, plus a hero slab where the real `src/cat.js` walks through them with GPU spring/trail physics. Open `/grass/index.html` from the served repo root; research in `docs/GRASS_RESEARCH_2026-10-23.md`. Its `../../src/cat.js?v=` import carries the cache tag (bump it with the others); its own modules are untagged |
| `rooftops/` | The Roof Road (屋根道): a side-scrolling run over old-Kyoto roofs past the valley bridge, through seven "mouths" from the bridge to the top of a Gion Matsuri float, with the five Okuribi fires as the finale. **A lab, not yet wired into the game** (the unlock and pocket scene are designed in §8.2 of the spec). Pure modules, no three.js: `js/rail.js` (route polyline + fillets, arc length `s`), `level.js` (pieces → platforms, walls, pickups), `physics.js` (the game's jump constants + mantle/futon/rope/canopy), `reach.js` (jump reach + platform graph), `autopilot.js`. Meshes in `build.js`, sky and fires in `sky.js`, the loop in `game.js`. Its entry point is the root page `kyoto-rooftops.html` (a sandbox the main game does not link to; `rooftops/index.html` forwards there with its `?flags`), so open `/kyoto-rooftops.html` from the served repo root. Design `docs/superpowers/specs/2026-10-24-rooftop-road-design.md`, research `docs/ROOFTOPS_RESEARCH_2026-10-24.md`. Its `../../src/cat.js?v=` and `../../src/textures.js?v=` imports carry the cache tag (bump them with the others); its own modules are untagged; `rooftops/package.json` only marks them as ES modules for Node |
| `assets/` | Optional runtime media (summit vista GLB, transition mp4); every slot has a fallback |
| `docs/` | Reviews, the build guide, checklists, social posts, README artwork |
| `data/` | Reference screenshots and Blender sources |
| `OLD/` | Archived predecessor project — not this game |

## Run

Static site — serve the repo root over HTTP (ES modules + import map require
http, not `file://`):

```
python3 -m http.server 8000
# open http://localhost:8000
```

Three.js 0.160.0 loads via the import map in `index.html` from unpkg CDN —
network access required at runtime.

## Cache busting

Every module import carries `?v=<tag>`. Keep all tags in sync when editing:

```
sed -i '' -E "s/\?v=[0-9a-z]+/?v=YYYYMMDD<letter>/g" src/*.js index.html
```

Current tag: `20261024a` (also used by every `tools/*_preview.*`). A tag
bump touches every module's import lines, including `mountaintop.js` — change
only the `?v=` strings there.

Companion apps (`dawCAT/`, `cadJS/`) import their own files without tags. The
labs import game modules *with* tags, and the one-liner below only rewrites
`src/*.js` and `index.html`: bump `grass/js/hero.js`, `rooftops/js/game.js` and
`rooftops/js/build.js` by hand.

On Windows do NOT bulk-rewrite with PowerShell `Get-Content`/`Set-Content` —
it re-encodes and corrupts em-dashes/Japanese text. Use Node (byte-safe):

```
node -e "const fs=require('fs');const files=fs.readdirSync('src').filter(f=>f.endsWith('.js')).map(f=>'src/'+f).concat('index.html');for(const f of files){let s=fs.readFileSync(f,'utf8');const n=s.replace(/\?v=[0-9a-z]+/g,'?v=TAG');if(n!==s)fs.writeFileSync(f,n)}"
```

## Verification

Syntax check ES modules (Node can't `--check` ESM directly). Either:

```
node tools/check_syntax.mjs      # all 36 modules, BOM-safe, works on Windows
node tools/verify.mjs            # syntax + static wiring + summit state machine + index.html sanity
for f in src/*.js; do node --input-type=module --check < "$f" >/dev/null || echo "FAIL $f"; done
```

Roof Road: `node tools/rooftop_test.mjs` (30 checks, a few seconds). It proves
the rail is continuous, the finale is reachable from the start and from every
platform (no soft-locks), every metre of street has a climb-back within 12 m,
route links fit 80 % of the running jump, and the autopilot runs the whole
route on the real physics without touching the street. Change a height in
`rooftops/js/level.js`, run it. Page flags: `?mouth=1..7`, `?at=<s>`,
`?finale=1`, `?auto=1` (autopilot), `?debug=1` (platform lines, route in red),
`?hour=0..1`, `?cat=0`, `?shadows=0`, `?shot=1&nohud=1` for captures; console
hooks `roofRoad.at(s)`, `roofRoad.skipFinale()`. A headless capture takes about
4 min per shot under SwiftShader on the dev laptop.

Cat model review: `tools/cat_preview.html?sheet=<name>` renders posed cats
from fixed angles (sheets: anatomy, face, gait, stride, poses, sleep,
closeup, coat, npcs; add `&raw=1` for bare sculpts, `&golden=1` for sunset light,
`&perf=1` for build/update timings). Everything is driven through the real
`Cat` API with seeded randomness, so captures are repeatable.

The cat is sculpted at load time (`src/cat_anatomy.js` → `src/cat_sdf.js`)
and cached per body type; tweak proportions there, coat/face painting in
`src/cat_shading.js`, gait and poses in `src/cat.js`.

Tree/foliage review: `tools/tree_preview.html?sheet=<name>` (sheets: hero,
detail, rim, bush, compare, textures; `&golden=1`, `&perf=1`, `&wind=4` to
exaggerate a gust). Built through the real `Vegetation` / `Countryside`
builders with seeded randomness. Hero trees inside the play field are
individual leaf sprays on twigs (`buildCanopy` style `'leaves'`); the rim
(edge forest, foothills, shrubs, trees past r≈39) is painted leaf masses
(`'masses'`, `bushGeometry`). The summit still uses the default `'clumps'`.

Town and hidden-place review: `tools/town_preview.html?sheet=<name>` (sheets:
street, landmarks, props; `&golden=1`, `&night=1`) and
`tools/hidden_preview.html?sheet=<pool|glade|both>`. Both build the real
`Countryside` (and `HiddenPlaces`) with seeded randomness, so captures
repeat. The README's "From the build" images come from these sheets and the
`npcs` cat sheet.

Grass: `src/grass.js` places every blade by hashing `gl_InstanceID` on a
world-snapped grid, so a layer is one draw call whose density is a uniform
(the quality tier widens the grid; low drops the shell carpet). What grows
where comes from the biome mask, painted in `Vegetation.buildMeadow()` from
the real colliders, path, river, paddies and exclusion rects. A new
building or prop gets a grass-free footprint and a thicket edge
automatically, as long as it has a collider or a `vegetationExclusions`
rect. Blades render through `MeshLambertMaterial` (with `onBeforeCompile`),
so they receive shadows, lantern light and fog. The physics stamps are the
cat's chest, hips and paws plus villagers within 10 m. Review:
`tools/grass_preview.html?spot=<meadow|path|river|shrine|glade|corral|pool|wide>&time=10.5`,
or `?spots=a,b,c,d@hour` for a 2×2 still sheet (about 15–30 min per page
under SwiftShader on the dev laptop). The summit grass draws nothing from
the summit's seeded `this.rng`.

Hidden valley places (Moon Pool, Lantern Glade) live in `src/hidden_places.js`
— built before `Vegetation` (they register exclusion/water rects), attached to
the game after `ContextActionManager` exists. They never touch the summit.
New `Countryside` code must not add `this.random()` calls mid-build: the
valley layout is seeded and any extra draw shifts everything built after it.

Comfort settings (FOV, interface size, larger dialogue text, high-contrast
prompts, reduce motion, grain/fringe) live in `src/settings.js` and are applied
in `Game.applyComfort()`; reduce-motion defaults to the OS preference.

Villagers (`src/npc.js`): each cat has a `PERSONALITIES` entry (coat stripes,
body scale, idle verb weights and pacing, greeting, startle). Night sleep is
opt-in per cat through `schedule.sleepAtNight`. `tools/cat_preview.js` mirrors
the coat palettes — keep both in step when recolouring a villager.

Water/time of day (`src/countryside.js`): raindrop rings use their own pool
(`rainRipples`) so they never evict the cat's or the koi's ripples; dawn river
mist is `dawnMists`; lanterns kindle with a per-lantern onset.

Textures: `namakoTextures` and `lacquerTextures` in `src/textures.js` feed
`MAT.namako` / `MAT.lacquer`. New materials must be in `MAT` or
`_mergeStatics()` will not merge their meshes.

Scratch dirs: write temporary captures/scripts outside the repo. Edits to
CRLF files must preserve line endings (use a byte-safe Node script, not
PowerShell `Set-Content`).

Full-game headless boot (the only check that exercises `main.js` wiring): serve
the repo, load `/__boot.html` — a tiny page that sets
`sessionStorage.catwalk_autostart='new'` then redirects to `/index.html` — in
headless Chromium with SwiftShader and `--enable-logging=stderr --v=0`. It takes
15–20 minutes on a weak laptop; look for anything other than the AudioContext
autoplay warnings. Last run clean on 2026-10-23.

Browser smoke suites live outside the repo (Playwright harness in
`/tmp/michi-test/smoke.js` + `smoke2.js`, 44 checks total — see
`docs/VERIFICATION_REPORT_2026-09-11.md`). They serve the repo root on a local
port and drive headless Chromium.

## Design guardrails (from docs/BUILD_GUIDE)

- No fail states, no combat, no timers.
- Painterly 256px procedural textures only — no heavy downloads.
- Don't expand the map early; deepen Kyoto first.
- Free exploration is the identity — guidance UI stays soft/optional.

## Status

Checklist state lives in `docs/BUILD_GUIDE_2026-09-11_041436.md`;
measured results in `docs/VERIFICATION_REPORT_2026-09-11.md`; the latest
upgrade pass in `docs/NEXT_STEPS_CHECKLIST_2026-10-22.md`.

Shipped: perf governor (two-stage adaptive, eco floor, tiers, chunking,
collider grid), save hardening, context-loss recovery, rest spots / stillness
moments / journal, villager personalities and routines, hidden valley places,
dawn mist / rain rings / staggered lanterns, namako + lacquer town pass,
comfort settings (FOV, interface size, large text, contrast, reduce motion,
grain/fringe), cat rebuild, summit clearing (in progress elsewhere),
dawCAT 2.0 (Sound Design, Wave Lab, AI assistant), cadJS Procedural Studio and
push-to-game, Grass Lab grass in the valley and on the summit (2026-10-24).

Prototyped: the Roof Road lab (`rooftops/`, 2026-10-24) — research, design
and a playable greybox of the area past the bridge.

Next visual passes, ranked: `docs/VISUAL_NEXT_STEPS_2026-10-24.md`.

Open: real-device benchmarks (V1.1/V1.3), input remapping / gamepad /
left-handed touch layout (U2.1), information-access items (U2.4: sound
indicators, dialogue history), skirt walls and fence/lantern detail for the
tea house and craftsman residence, PWA/offline, the Roof Road in the game
(Seven Posts unlock, Odoi thicket, `RooftopManager` pocket — spec §8.2).
