# Eastbound verification — 2026-11-14

The stage is isolated in `Shinkansen/`. No pre-existing game, summit, Roof Road,
or Labs source files were changed.

## Passed

- Blender 5.2.2 LTS ran the authoring script and wrote the actual `.blend`, glTF
  2.0 binary kit and asset manifest. The kit has thirteen reusable asset roots,
  is approximately 684 KB, and contains no downloaded textures.
- `npm test` in `Shinkansen/`: **11 tests passed**. These exercise all fifteen
  carriage seams in both directions, a complete half-hour of lateral input and
  gusts, crouch/setback behavior, the overpass leap, both interior hatches,
  connected coach/café traversal, saved-state bounds, exact route timing and
  the binary GLB header and asset contents.
- Browser suite: **desktop 1440×900, portrait touch 390×844, landscape touch
  844×390 passed**, using headless Chromium with the Metal backend on this Mac.
  The real loop boarded from the bridge, jumped a seam, entered the coach,
  walked into the café, collected a postcard, accepted Yuzu's tea, returned by
  the forward ladder, rendered every chapter, reached the Tokyo finale, stayed
  after arrival, and restored the interior milestones after reloading.
- The touch cases exercised simultaneous movement and jumping through actual
  multitouch events. Pause stopped the journey clock. Michi's projected position
  remained within the tested viewport bounds in all twelve scenic chapters.
- No runtime or shader errors were recorded by the browser suite.
- All eight new stage modules passed Node syntax checks.
- Existing repository checks: `node tools/labs_check.mjs` and
  `node tools/verify.mjs` passed, including the existing summit's 70 state-machine
  checks. These are regression checks, not a full valley browser boot.

Visual review used additional high-quality captures of the roof, coach, café,
mountain tunnel, river crossing, Fuji, coast and city arrival. It corrected the
camera's scenery framing, ceiling and gangway openings, foreground mast placement,
coastal ground coverage, riverbanks, and the sunrise/sunset palette.

## Reproduce

Serve the repository root on port 8000, then:

```sh
cd Shinkansen
npm test
PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
SHINKANSEN_QA_DIR=/tmp/michi-shinkansen-review npm run test:browser
```

The browser report is `report.json` in the selected QA directory, with Fuji and
arrival captures for each viewport. The normal browser save is separate from
the QA/shot save.

## Practical limits

The 30-minute itinerary is verified with accelerated simulation; a human has
not yet played the whole journey in real time to assess pacing. It is a scenic
ride with optional fast-forwarding, rather than thirty minutes of required
platforming. The three viewports emulate touch layouts; they do not measure
phone temperature, battery use or actual-device frame rates. This is the first
playable stage build and remains a standalone entry point at `/Shinkansen/`.
