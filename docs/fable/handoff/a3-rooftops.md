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

## Not a patch
build.js band for the distant city stays 'far' (Integrator ruling): the far tier now carries the city (see the status file, fix round 1).
