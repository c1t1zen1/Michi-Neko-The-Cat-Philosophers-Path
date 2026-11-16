# h1-hero re-review r1 (fix cacfccd..08c2ad3)
Scope: the five Important findings from r1 plus the title-screen and README-commit points. I viewed the re-shot JPGs; I did not read the diff file.

- 11 roof-road: FIXED. Michi is in the foreground and Chidori is on the ridge. The pagoda, hills, skyline and sunset all read. It is now a strong hero.
- 09 summit: FIXED by relabelling. The file is now hero-summit-seat-morning.jpg and the frame is unchanged. Honest and acceptable.
- 05 moon-pool: PARTLY FIXED. The framing is closer and Michi, pool and lantern read. NEW Important: two jagged near-white patches in the canopy (about x300,y310 and x1250,y300) are rendering artifacts. They have a hard cutout-leaf alpha edge and are far brighter than anything in a night scene. They are not sky or scene elements. A red glow bleeds on the right edge (x1590, y500-700) and looks like a stray bloom or lamp. Re-shoot with a framing that drops the canopy gaps (tilt the camera down or lower the FOV) or nudge the camera.
- 04 river: FIXED. Michi and Kuro are both fully framed, the pagoda is visible and the glare is lower.
- 12 okuribi: NOT FIXED (Important). The white square star sprites are still visible (about (150,80), (503,121), (1248,180), (95,260)), and now more of them. Reframe to crop them, or fix or shrink the sandbox star points.
- 08 villagers: re-shot, colours changed slightly. It is still a sheet, labelled as such. Fine.
- Title screen: the title-screen.jpg decision is sound, because index.html uses it as the backdrop and overwriting it would nest the menu in itself. hero-title-menu.jpg is a real frame of the live menu, but its backdrop is the blurred concept art and the whole frame is dark. Acceptable only if README and handoff label it "live menu over concept backdrop". It is a poor poster; prefer a game frame such as hero-torii-dusk.jpg for the video poster (h2). Minor.
- Shot 11 camera via eval: legitimate under D8. It is the real scene and real renderer with a staged camera, like Photo Mode, and nothing is painted or composited. The shots.json and README note it.
- README commit: addressed in the docs diff (not re-verified line by line).

New Important: 05 canopy artifacts. Remaining Important: 12 star squares.
Verdict: Needs fixes
