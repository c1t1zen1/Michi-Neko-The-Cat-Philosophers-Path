# a3-rooftops handoff

## Finale framing (rooftops/js/runview.js, operator/Integrator file; NOT edited)
Judgement from the pocket finale frames (pocket_*_finale.jpg, t about 9 s, before the card): the five fires sit well in the upper band, but the
camera's fixed offset (`c - 5.2, +0.7, +3.6`, aimed at the fires' centroid) is taken from Michi alone, so Chidori lands at the centre
and Michi at the left edge (modular: top-left, small). Proposed patch, UNTESTED visually (the sandbox `skipFinale` card hides the cats,
so the framing could not be compared in that view); in `updateCamera`, finale branch, frame the pair's midpoint:

```
-      const c = catRoot.position;
+      const c = this.tmpV2 || (this.tmpV2 = new THREE.Vector3());
+      c.copy(catRoot.position).lerp(guideRoot.position, 0.5);   // frame the pair, not Michi alone
       const want = this.tmpV.set(c.x - 5.2, c.y + 0.7, c.z + 3.6);
```
(THREE is already imported in runview.js.) Apply, then check `?finale=1` in the sandbox and the pocket finale at t about 9 s.

### Integrator: tested, adjusted, applied (2026-11-16, post-G-R batch, job C)
**The patch as proposed is wrong; an adjusted version is applied.** The camera looks at the fires about 640 m east, so screen-right is
about +z. Chidori ends 1.3–3.6 m ahead of Michi (+z) on the ridge below the perch (y 4.5 vs 5.3) on every arrival measured (`?finale=1`,
the pocket's `startAt` on the perch, and full autopilot runs). Taking the same world offset from the pair's midpoint therefore pushes
Michi further left (NDC x −0.64 → −0.85 with `?finale=1`, −0.96 after an autopilot run, its box past the left edge). The 0.4 m lower camera
then skims the float's deck, which hides Chidori, and a roof covers the fifth fire (`docs/fable/status/a3-rooftops/finale-patch-as-proposed.jpg`).
Moving the camera sideways onto the pair (bearing-frame offsets, 0–1.2 m) walks it into the float's shingi pole and deck, so the camera
keeps its slot.

Applied instead (`RunView.updateCamera`, finale branch; `this.tmpP` added in the constructor):
- the camera's offset from Michi is unchanged except the height: +1.1 m instead of +0.7, so Michi shows whole over the near ridge;
- the look point is the fires' centroid 45 m down instead of 20 (about 2.2° of pitch down), so the roofs and the cats come up the frame;
- as the finale settles (the same `k` easing), the camera turns half-way from the fires toward Michi and Chidori's midpoint. It uses
  Michi alone when Chidori is more than about 6 m away (smoothstep 3.5–6 m), caps the turn at 13°, and clamps it so that every fire's
  centre stays within 0.85 of the frame's half-width. A narrow portrait screen therefore keeps the fires and turns less.

Measured (NDC; the cat box is 0.84 m around each cat; t = 12 s, five fires lit, before the card):

| frame | Michi x (box left) before → after | Chidori x before → after | fires x before → after |
|---|---|---|---|
| sandbox `?finale=1`, classic and modular, 1280×720 | −0.64 (−0.79) → −0.40 (−0.53) | −0.17 → 0.03 | −0.47…0.50 → −0.26…0.75 |
| sandbox autopilot arrival, classic, 1280×720 (Chidori 2.5 m / 3.5 m ahead on the two runs: arrivals vary) | −0.64 (−0.79) → −0.47 (−0.60) | −0.15 → 0.24 | −0.47…0.50 → −0.32…0.67 |
| pocket (game), classic and modular, 1280×720 | −0.64 (−0.79) → −0.40 (−0.53) | −0.16 → 0.04 | −0.47…0.50 → −0.26…0.75 |
| sandbox portrait 600×900 | −0.71 (−0.89) → −0.45 (−0.59) | −0.19 → 0.03 | −0.53…0.56 → −0.29…0.84 |
| sandbox 1440×900 / 844×390 | −0.71 / −0.52 → −0.45 / −0.33 | | max 0.56 / 0.41 → 0.84 / 0.62 |
| sandbox 360×780, 390×844 | −1.03 (out) → −0.99 (out; the clamp holds the fires) | −0.29 → −0.26 | max 0.81 → 0.85 |

By eye (`finale-{sandbox,pocket}-{classic,modular}-{before,after}.jpg`, `finale-sandbox-autopilot-*`, `finale-sandbox-portrait-*`):
before, Michi is half-hidden behind the near ridge at the left edge. After, Michi sits whole on the left third and Chidori sits lower,
centre to centre-right. The five fires stay across the band, the moon comes into the top left, and the shingi pole stays out.
Reduce motion on (`finale-*-reducemotion-after.jpg`) settles to the same frame (only the easing is slower). The transition (t 2–6 s,
both settings) is smooth: the turn eases in with the finale.
Not fixed: on 360/390-wide portrait phones Michi was already outside the frame before this change (x −1.03) and still is (−0.99). All
five fires and Michi cannot fit that width at the 96° finale field without moving the camera or widening the field; that is left to the
operator.

Guarded by `tools/rooftop_pocket_test.mjs` "Finale framing" (the real pocket in the game). At 1280×720 both cats' boxes must sit within
|x| ≤ 0.75 and all five fires within 0.9; at 360×780 the five fires must fit (|x| < 0.95, as `tools/rooftop_browser_test.mjs` asks of the
sandbox). On the shipped camera this section fails "Michi well inside" ([−0.791, …]). Without the fire clamp it fails the 360×780
check (a fire at x 1.21).
Console clean on every capture (sandbox and game, classic and modular, reduce motion on and off): errors [] warnings []. rooftop_test
40/0, companion 7 (autopilot reaches the finale), alley PASS, manager 81/0, rooftop golden classic EQUAL + modular routing 41/41.
This is an Integrator change to the operator's camera (`runview.js` serves the sandbox page and the game pocket alike). The
operator may overturn it with one revert.

## Not a patch
build.js band for the distant city stays 'far' (Integrator ruling): the far tier now carries the city (see the status file, fix round 1).
