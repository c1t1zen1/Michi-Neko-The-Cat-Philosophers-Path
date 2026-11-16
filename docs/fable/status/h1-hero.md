# h1-hero

- Worker / model:     Claude Sonnet 5.5
- Claimed:            2026-11-16 04:06
- Branch:             fable/h1-hero
- Base commit:        9c7f490 (fable/integration)
- State:              ready for review

## Steps
- [x] H1.1 tools/hero_capture.mjs + docs/images/hero/shots.json
- [x] H1.2 14 shots (15 files; the title screen and "city lit" / "after rain" gaps in the handoff)
- [x] H1.3 masters 2560x1440 outside repo; JPGs 1600 px, 58-320 KB; capture-*.jpg removed
- [x] H1.4 docs/images/README.md
- [x] H1.5 video out of scope

## Checks run
- check_syntax: All 192 modules OK; verify: All checks passed; labs_check: All labs checks OK
- --diff 02-torii-dusk: maxDelta 0; --diff 09-summit-seat-dawn: maxDelta 219 (wall-time page)
- full run: 15 files, ~2 min, no page errors
