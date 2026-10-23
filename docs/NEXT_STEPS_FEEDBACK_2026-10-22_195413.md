# Michi-Neko — Next Steps: Honest Feedback

**Date:** 2026-10-22 19:54
**Purpose:** Recommendation on which visual updates and changes to work on next. Advice only — no code changes were made.
**Basis:** The project's own docs (`docs/GAME_MASTER_REVIEW_2026-09-11.md`, `docs/BUILD_GUIDE_2026-09-11_041436.md`) and the commit history. The current build was not played for this write-up. The master review is dated 2026-09-11, so verify that its gaps haven't been fixed since.

---

## Overall take

The rendering has outrun the game. The world looks much better than it plays. The master review describes a beautiful 30–60 minute stroll with one real quest, three NPCs and about 14 collectibles. Nearly everything planned for social posts is about how the game looks, so the next work should make the world feel like a place, not a tech demo.

## Recommended work, in priority order

### 1. Consistency pass across the whole valley (biggest visual gap)
- The tree, cat and water upgrades created a quality gradient: the newest things are far more detailed than buildings, props, NPCs and interiors.
- Bring machiya, the torii, the tea house, lanterns, fences and NPC cats up to the standard of the new trees and the cat.
- The README still describes its art as "inspiration art," not in-game captures. Closing that gap would allow real screenshots and is the best marketing improvement available.

### 2. NPC cats and characters
- The player cat has sculpted anatomy and a proper gait. The NPC cats (`tools/cat_preview.html?sheet=npcs`) are the next most visible thing.
- Check for distinct silhouettes, coat variety, idle behaviours and reactions to the player.
- Three NPCs next to a hero cat that looks like a different game reads as unfinished.

### 3. Make the existing places worth finding
- The summit is the model: a secret reward at the end of a climb.
- Add two or three more hidden spots in the same spirit (a roof view, a quiet shrine pool, a lantern-lit bamboo clearing), each with a distinct light and sound.
- Mostly visual/audio design on existing systems; it addresses "nothing to discover once the quests are done."

### 4. Light and time of day as the signature
- Golden hour, dusk and lantern-lit night are what people will screenshot.
- Invest in transitions: lantern warm-up at dusk, window glow, valley mist at dawn, rain on water.
- Cheap relative to new content and matches the Ghibli reference.

### 5. Water and weather interaction
- Payoff for the water overhaul: ripples when the cat steps in, rain hitting the surface, dusk reflections, koi reacting.
- Interaction makes a surface feel real in clips.

## Non-visual items that can block everything else

- **Real-device performance.** The master review found the adaptive-resolution second stage can never activate. Per-frame colour allocations and fixed particle simulation counts also remain, and the foliage shader is expensive (more foliage work has been added since). Real-device benchmarks (V1.1 / V1.3) are still listed as open. Stutter on phones would undercut the visuals.
- **Accessibility settings (U2.x).** FOV, camera shake, UI scale, contrast and input remapping are all not started. Motion-sensitive players will bounce off a camera-heavy game.
- **Save robustness and WebGL context-loss recovery.** A lost context or bad save in front of a new viewer ends the visit.

## Skip for now

- **Tokyo / bullet-train expansion.** The design guardrail says deepen Kyoto first. Keep it as the roadmap tease post.
- **More tooling polish on dawCAT and cadJS.** They're strong enough for storytelling; the game itself is where the next gains are.

## If only three things get done

1. Close the quality gap on buildings and NPC cats.
2. Add two more hidden places.
3. Run a real-device performance pass.

These give better footage for posts, a longer first session for new players, and a build that holds up on a phone.

## Suggested follow-up

Measure the quality gap concretely: run the cat and tree preview sheets next to the town and interiors, and produce a specific list of assets to upgrade.
