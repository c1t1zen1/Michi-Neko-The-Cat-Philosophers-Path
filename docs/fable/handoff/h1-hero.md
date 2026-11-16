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
| docs/images/title-screen.jpg | NOT replaced: index.html:11 preloads it and index.html:806 uses it as the title backdrop. Live title menu is docs/images/hero-title-menu.jpg |

Other new files: hero-river-morning, hero-tea-house-interior, hero-summit-seat-morning, hero-summit-vista-dusk, hero-parts-sheet-toro (labelled parts sheet), hero-before-classic + hero-after-modular (pair).

Gaps and notes:
- README.md line 5: the video `poster=` still points at docs/images/title-screen.jpg (concept art). h2: repoint it to docs/images/hero-title-menu.jpg (real menu) or docs/images/hero-valley-golden-hour.jpg, and label any use of title-screen.jpg as concept art.
- Shot 9 is morning: the summit sky has no true dawn (5.7-6.0 h reads as blue night, 6.4 h as bright day).
- Shot 12: the square star sprites (white squares in the night sky, also in classic) are for z-final; the frame is tilted down and zoomed 8 percent to crop most of them.
- Roof Road has no ?cam=; shots 11 and 12 move runView.camera from `eval`. Patch if wanted: a `?cam=px,py,pz,tx,ty,tz[,fov]` in rooftops/js/game.js applied after updateCamera.
- Summit "city lit at night": the summit's city shows no window lights at night (only the lantern pairs glow), so shot 10 is dusk (19.2 h). Summit dawn (6.4 h) reads as bright morning.
- Rain: there is no "after rain" state (wet ground without rain); shot 3 is in the rain.
- No season flag exists; `season` in shots.json is unused.
- Shot 11 is Roof Road sandbox s=950; I do not know which mouth is Awataguchi, so it is not named so.
