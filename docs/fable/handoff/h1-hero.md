# h1-hero handoff (for h2-readme)

Removed (replaced) paths and where to point links now:
| Old | New |
|---|---|
| docs/images/capture-in-game.jpg | docs/images/hero-torii-dusk.jpg |
| docs/images/capture-landmarks.jpg | docs/images/hero-valley-golden-hour.jpg |
| docs/images/capture-street.jpg | docs/images/hero-machiya-lane-rain.jpg |
| docs/images/capture-hidden-places.jpg | docs/images/hero-moon-pool-night.jpg, hero-lantern-glade.jpg |
| docs/images/capture-villagers.jpg | docs/images/hero-villagers.jpg (review-sheet capture) |
| docs/images/capture-roof-road.jpg | docs/images/hero-roof-road-michi-chidori.jpg, hero-roof-road-okuribi.jpg |
| docs/images/title-screen.jpg | NOT replaced (see below); left in place as concept art |

Other new files: hero-river-morning-mist, hero-tea-house-interior, hero-summit-seat-dawn, hero-summit-vista-dusk, hero-parts-sheet-toro (labelled parts sheet), hero-before-classic + hero-after-modular (pair).

Gaps and notes:
- title-screen.jpg: the real title screen cannot be captured with the existing flags (the loop does not step frames on the menu, `?shot=1` never reaches the hold frame). Patch if wanted: in src/main.js let `capture.frame` advance while the menu is showing under `?shot=1`. Until then the video poster stays concept art; label it so.
- Summit "city lit at night": the summit's city shows no window lights at night (only the lantern pairs glow), so shot 10 is dusk (19.2 h). Summit dawn (6.4 h) reads as bright morning.
- Rain: there is no "after rain" state (wet ground without rain); shot 3 is in the rain.
- No season flag exists; `season` in shots.json is unused.
- Shot 11 is Roof Road sandbox s=950; I do not know which mouth is Awataguchi, so it is not named so.
