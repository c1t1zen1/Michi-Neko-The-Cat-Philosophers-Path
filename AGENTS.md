# AGENTS.md — Michi-Neko

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

Current tag: `20261022f` (also used by every `tools/*_preview.*`).

On Windows do NOT bulk-rewrite with PowerShell `Get-Content`/`Set-Content` —
it re-encodes and corrupts em-dashes/Japanese text. Use Node (byte-safe):

```
node -e "const fs=require('fs');const files=fs.readdirSync('src').filter(f=>f.endsWith('.js')).map(f=>'src/'+f).concat('index.html');for(const f of files){let s=fs.readFileSync(f,'utf8');const n=s.replace(/\?v=[0-9a-z]+/g,'?v=TAG');if(n!==s)fs.writeFileSync(f,n)}"
```

## Verification

Syntax check ES modules (Node can't `--check` ESM directly):

```
for f in src/*.js; do node --input-type=module --check < "$f" >/dev/null || echo "FAIL $f"; done
```

Cat model review: `tools/cat_preview.html?sheet=<name>` renders posed cats
from fixed angles (sheets: anatomy, face, gait, stride, poses, sleep,
closeup, npcs; add `&raw=1` for bare sculpts, `&golden=1` for sunset light,
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

Hidden valley places (Moon Pool, Lantern Glade) live in `src/hidden_places.js`
— built before `Vegetation` (they register exclusion/water rects), attached to
the game after `ContextActionManager` exists. They never touch the summit.
New `Countryside` code must not add `this.random()` calls mid-build: the
valley layout is seeded and any extra draw shifts everything built after it.

Comfort settings (FOV, interface size, larger dialogue text, high-contrast
prompts, reduce motion, grain/fringe) live in `src/settings.js` and are applied
in `Game.applyComfort()`; reduce-motion defaults to the OS preference.

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
measured results in `docs/VERIFICATION_REPORT_2026-09-11.md`.
Accessibility settings (U2.x) and real-device benchmarks are the main
remaining gaps.
