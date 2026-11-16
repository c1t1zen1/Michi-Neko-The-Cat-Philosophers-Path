# a2-hilltop review r1
Verdict: NEEDS FIXES (0 Critical, 1 Important, 4 Minor)
Important
- src/kit/summitlife/weather.js:125 - kit pollen reduce-motion ratio measured 0.59; classic summit damps its other motion to 0.16-0.20 (src/summit/clearing.js:712,736; src/summit/weather.js:241) and kit CALM is 0.3. 0.59 is not a meaningful reduce-motion response; make the snapshot approach take the full CALM (e.g. snapshot before facade step / divide the facade share) and re-prove at runtime.
Minor
- docs/fable/status/a2-hilltop.md:28 - stale ranked issue 1 "A.1 route walks and A.7 comfort boots not run" contradicts the done sections.
- docs/fable/status/a2-hilltop/r1_z26_23.jpg (also r1_z16_*) - route camera sits against a riser: stair face fills the frame, muddy; route not really walked at these points. Re-sample.
- docs/fable/status/a2-hilltop/seat_23_modular.jpg - night seat very dark, lit city barely readable; ranked as known (issue 3/4), acceptable but note.
- src/kit/summitlife/weather.js:36,68 - `const first = false` leaves dead `first ? :` branches; simplify.
Checked: classic untouched (no mountaintop.js hunk), summit_preview change is additive/classic default, G-S tick says provisional with evidence, 56 JPGs <=150KB, seat day frame clean and painterly.
