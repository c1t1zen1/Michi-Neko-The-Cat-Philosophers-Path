# h1-hero report
Built tools/hero_capture.mjs (kinds game/summit/rooftops/sheet, --list/--only/--preview/--diff, reuses headless.mjs) and docs/images/hero/shots.json: 15 shots, 2560x1440 masters in michi-wt/_scratch/h1-hero/masters, 1600 px JPGs 58-320 KB in docs/images. Full run ~2 min, no page errors. Checks: check_syntax 192 OK; verify All checks passed; labs_check OK; --diff 02-torii-dusk maxDelta 0; --diff 09-summit-seat-dawn maxDelta 219 (wall-time page).
Gaps (details in docs/fable/handoff/h1-hero.md): title-screen.jpg not replaced (menu does not step frames); summit city not lit at night so shot 10 is dusk; no after-rain state (shot 3 is in rain); no season flag; summit dawn reads as bright morning; 11 roof frame dim but real.
Removed capture-*.jpg; link mapping in the handoff. PR #56.

## Fix round 1
Items 1-5, 7, 8 done; item 6 done differently: live title menu saved as hero-title-menu.jpg because index.html:806 uses docs/images/title-screen.jpg as the title backdrop (replacing it would nest the title in itself); README poster= is h2's. maxDelta (two runs): 04 56, 05 0, 08 0, 00 4, 09 216, 11 193, 12 233 (wall-time pages). Details in the status file and handoff.

## Fix round 2
Shot 05: artifacts present in classic and modular, unaffected by swap moon-pool/trees/greenery, so shared valley canopy code; handoff "Defects found while shooting". Re-shot from the south-west, clean. Shot 12: tilt 0.24 rad, no big squares, moon cropped. Title menu label added. maxDelta twice: 05 80 (11 px over 8), 12 233.
