# Eastbound — Michi-Neko, stage 03

**Open [`/Shinkansen/`](http://localhost:8000/Shinkansen/) from the served repository root.**

A standalone, buildless Three.js adventure: leap from a Kyoto overpass onto a
sixteen-car bullet train, explore its roof, descend into a seated coach and the
Cloud Café, greet Sora and Yuzu, and return to the roof for Fuji, the ocean and
Tokyo. The camera follows behind Michi in full 3D and can orbit freely.

The normal journey is **30 minutes of active, unpaused travel**, across twelve
150-second scenic chapters. This is a travel clock, not a deadline: Tokyo waits
indefinitely. Walking pace is independent of the train's itinerary; you can reach
the front early, explore back along the train, or use **F / “ride to the next
view”** to shorten the ride. Coach and café visits are required before the arrival
interaction at the front perch. Postcards and tea are optional. This first build
has not had a human 30-minute pacing playtest; the exact travel duration and
movement safety are tested automatically.

## Play

From the repository root:

```sh
python3 -m http.server 8000
# http://localhost:8000/Shinkansen/
```

Three.js r160 and the optional web fonts load over the network, as in the valley.
There is no npm install or build step. The stage lives entirely in this folder;
the valley, summit, and Roof Road entry points have not been changed.

| Input | Action |
| --- | --- |
| WASD / arrows | Move relative to the camera |
| Shift | Run |
| Space | Jump; hold for the full leap |
| C / Ctrl | Crouch under amber service hoops and brace against wind |
| E | Board, use a hatch, stamp a postcard, greet a friend, or finish at Tokyo |
| Drag / wheel | Orbit / zoom the follow camera |
| Q | Recenter the camera |
| R | Return to the last safe roof position |
| F | Settle in and ride to the next scenic chapter |
| M | Toggle synthesized train sounds |
| Esc / P | Pause and open the travel journal |

Touch has a left movement pad (push wide to run), jump, held crouch and use
buttons; drag the scene with the other thumb to look. A standard controller uses
left stick, A jump, B crouch, X use, right stick look and L3 run.

Start with **Space or E** for the boarding leap. The coach hatch is green, at
160.1 m from the rear (car 10). Inside, walk forward through two coach cars and
two café cars; the forward roof ladder is at 251.65 m (car 7). Yuzu's counter is
in the first café car. Eight brass seals hold optional postcards. Roof gutters
hold Michi inside safe bounds; an unjumped seam stops walking, a short landing
catches a roof lip, and a missed low hoop moves Michi back less than two metres.
The amber hoops are fictional service markers, separate from the higher power
catenary. There is no damage, falling, countdown, or loss of postcards.

Progress saves in the browser under `michi.shinkansen.v1`. Preview and QA URLs
use a separate review save. Sound starts off and only creates its AudioContext
after a gesture. “Gentle camera” defaults to the OS reduced-motion preference
and disables rumble, train roll and speed-driven FOV changes. Guidance can be
hidden in the journal.

## The route

| Chapter | Scenic beat |
| --- | --- |
| Kyoto | Overpass leap, cherry petals, green foothills |
| Ōmi | Reflective rice paddies, embankment flowers and wayside shrines |
| Ibuki | A long horseshoe tunnel with amber guide lights |
| Kiso | Viaduct over a broad river, an oncoming sister train |
| Coach | Seated saloon, luggage shelves, Sora at the window |
| Cloud Café | Hōjicha, pastries, timber tables and the Labs' paper lanterns |
| Ōi | A second river crossing and stronger rooftop gusts |
| Fuji | Snow-capped Fuji on the left, over fields and foothills |
| Suruga | Ocean on the right, fishing boats and gulls |
| Hakone | The final tunnel opens into late-afternoon light |
| Tokyo approach | Towers, lit windows and Tokyo Tower |
| Arrival | Red-brick station frontage, city lights, front-perch finale |

The geography is a storybook compression of an eastbound journey, not a railway
simulator or a geographically exact depiction of the Tōkaidō alignment.

## Blender source → browser

The assets were **actually generated in the installed Blender 5.2.2 LTS**, then
exported as glTF 2.0 binary and loaded through Three.js `GLTFLoader`.

- `blender/eastbound.blend` — editable source scene.
- `blender/build_assets.py` — deterministic, reproducible metre-based authoring.
- `assets/eastbound-kit.glb` — approximately 684 KB, no external textures.
- `assets/manifest.json` — Blender version, semantic asset names and triangle counts.

The kit includes a sculpted nose, separate coach shell and crown, seats, café
counter, tea service, cottages, two tree types, tunnel vault, viaduct, Fuji, and
Tokyo Tower. Rebuild on this Mac:

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --python Shinkansen/blender/build_assets.py
```

The same Python script works with `blender --background --python ...` elsewhere.
Coordinates are converted from the game's Y-up frame to Blender Z-up on authoring
and back through glTF. Parts are joined by material before export. Scenery uses
pooled instanced meshes with near/far parallax; the scenery moves around a stable
train coordinate frame to avoid huge coordinates. No heavy background downloads.

Shared, read-only game/Labs resources:

- Real sculpted `Cat`, its gait, prowling pose, coat, collar and face.
- The game `Sky`, with a stage-specific daylight palette and the existing sunset.
- Labs `M` and `paintify()` with the game's procedural timber, plaster, metal and
  painted surfaces (256 px); `craft.js` seeded random and paper-lantern recipes.
- All game imports go through `labs/shared/game.js`, retaining `20261107a`.

## Code

| File | Responsibility |
| --- | --- |
| `js/route.js` | Chapters, timing, train dimensions, hatches, postcards |
| `js/physics.js` | Pure bounded motor, jump buffering, gap catches, duck/setbacks |
| `js/assets.js` | Blender kit loader, shared material conversion and instancing |
| `js/world.js` | Train, interior dressing, scenery, tunnels, river/ocean, landmarks |
| `js/game.js` | Fixed-step loop, camera, real cats/sky, saves and chapter flow |
| `js/input.js` | Keyboard, orbit, multitouch and gamepad |
| `js/audio.js` | Synthesized wind, rail rhythm, tunnel sound and chimes |
| `js/ui.js` | Travel journal, guidance, interactions and finale |

## Verify

```sh
cd Shinkansen
npm test
# Optional; Playwright and its browser stay outside the repository:
PLAYWRIGHT_MODULE=/absolute/path/to/playwright npm run test:browser
```

The pure suite checks every gap in both directions, soft catches, edge safety
through an entire 30-minute simulation, crouch/hoop responses, connected coach and
café hatches, save bounds, itinerary continuity, and the actual Blender GLB.
The browser suite exercises the real loop at desktop, portrait and landscape
touch sizes, the bridge leap, jumping, both interiors, simultaneous touch input,
every scenic chapter, pause, arrival and restored milestones. Reports and
screenshots go to `michi-shinkansen-review` in the system temporary directory. Overrides:
`SHINKANSEN_URL`, `SHINKANSEN_QA_DIR`, `PLAYWRIGHT_MODULE`.

Review URLs: `?shot=1&nohud=1&at=285&chapter=fuji&yaw=.65`,
`?shot=1&nohud=1&inside=1&at=216.8&chapter=tea`,
`?quality=low|high`, `?shadows=0`, `?yaw=`, `?pitch=`, `?dist=`.

Console `shinkansen` exposes readiness, motor, world, camera, draw statistics and
projected cat position. Only `?qa=1` enables `at()`, `chapter()`, `advance()`,
`use()`, `ride()`, `start()`, `save()` and `pause()` for accelerated testing.

Real phone performance and subjective 30-minute pacing still need hands-on
playtesting. Low-power rendering is automatic on touch devices, with fewer
instances, reduced pixel ratio and no dynamic shadows; it is also available via
`?quality=low` on desktop.
