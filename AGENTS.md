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

Current tag: `20260912b`.

## Verification

Syntax check ES modules (Node can't `--check` ESM directly):

```
for f in src/*.js; do node --input-type=module --check < "$f" >/dev/null || echo "FAIL $f"; done
```

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
