# Cat Walk — Future Quests & Gameplay Expansion Build Guide

**Version:** 0.1 (Draft)
**Date:** 2026-08-22
**Status:** Conceptual build guide for future development
**Scope:** New gameplay challenges, item quests, set-piece sequences, and world expansion from Kyoto to Tokyo
**Design Pillars:** Ghibli whimsy · All-ages accessible · Mobile-first controls · Sanguine storytelling

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [World Expansion: Kyoto to Tokyo](#2-world-expansion-kyoto--tokyo)
3. [Act I — Kyoto Valley New Quests](#3-act-i--kyoto-valley-new-quests)
4. [Act II — The Bullet Train Sequence](#4-act-ii--the-bullet-train-sequence)
5. [Act III — Tokyo & The Parade Float Quest](#5-act-iii--tokyo--the-parade-float-quest)
6. [The Forest Chase](#6-the-forest-chase)
7. [Additional Quest Concepts](#7-additional-quest-concepts)
8. [New Item & Collectible Catalog](#8-new-item--collectible-catalog)
9. [New NPC Concepts](#9-new-npc-concepts)
10. [Mobile-First Design Considerations](#10-mobile-first-design-considerations)
11. [Technical Implementation Notes](#11-technical-implementation-notes)
12. [Suggested Build Order](#12-suggested-build-order)

---

## 1. Design Philosophy

### 1.1 The Ghibli Principles

- **Wonder over threat** — Challenges evoke awe, not anxiety. Even chase scenes feel exhilarating rather than frightening. Think Mei running through the forest in *Totoro* — scared, but the audience feels wonder.
- **Sanguine storytelling** — The world is fundamentally kind. Obstacles are puzzles, not enemies. "Antagonists" are misunderstood creatures, grumpy shopkeepers, or natural phenomena. Conflicts resolve through empathy, curiosity, or cleverness — never violence.
- **Small stories, big feelings** — A quest about finding a lost mitten can be as emotionally resonant as a festival parade. Scale matters less than emotional truth.
- **Food is love** — Ghibli films treat food with reverence. Every act should include a food moment — a shared meal, a discovered treat, a cooking scene.
- **Nature is alive** — Rivers, trees, wind, and weather are characters. The forest doesn't just contain creatures — the forest *is* a creature.
- **Silence is golden** — Build in moments of stillness. Some of the most powerful Ghibli scenes are quiet: a cat watching rain, a train passing through countryside, a sunset over water.
- **The journey IS the destination** — The bullet train ride isn't a loading screen. It's a scene. The walk through the forest isn't a commute. It's the game.

### 1.2 All-Ages Accessibility

- **No fail states** — Chase scenes use "soft failure" — cat tumbles, dusts off, restarts from checkpoint. No progress lost.
- **No reading required for core gameplay** — Quests completable through visual cues alone. Text enhances but never gates.
- **Touch-first, desktop-second** — Every mechanic playable with one thumb on joystick + occasional action button taps. No multi-touch gestures.
- **Generous timing windows** — 0.5s+ reaction windows for action sequences. Mobile touch latency is ~80-120ms.
- **Color-blind safe** — Quest markers use shape and icon differentiation, not color alone.

### 1.3 Mobile-First Game Design

- **Virtual joystick (left thumb)** — movement, always available
- **Three action buttons (right thumb)** — JUMP, ACT, MEOW (contextually swapped for DUCK during scroller sequences)
- **Swipe (right side)** — camera control
- **No multi-touch gestures** — no pinch, no two-finger rotations, no complex combos
- **Session length: 3-5 minutes** — each quest beat completable in a short bus-ride session
- **Auto-save every transition** — entering new area, completing quest step, or finishing a set-piece

---

## 2. World Expansion: Kyoto to Tokyo

### 2.1 Journey Map

```
ACT I: KYOTO VALLEY (existing alpha + new quests)
  ├── Kyoto Valley (current map — expanded)
  ├── Arashiyama Bamboo Forest (new zone — forest chase)
  ├── Fushimi Inari Shrine Path (new zone — shrine quests)
  └── Kyoto Station (new zone — bullet train boarding)
       │
       ▼
ACT II: BULLET TRAIN (set-piece scroller sequence)
  ├── Shinkansen Rooftop (jump/duck/dodge scroller)
  └── Station Arrivals (brief cutscene moments)
       │
       ▼
ACT III: TOKYO (new world hub)
  ├── Yanaka District (old Tokyo — parade float quest)
  ├── Ueno Park (cat gathering, NPC hub)
  ├── Asakusa (Senso-ji temple, festival preparation)
  ├── Shibuya (crossing scene, urban exploration)
  └── Akihabara (neon night exploration, rooftop parkour)
```

### 2.2 Narrative Throughline

The cat begins in the Kyoto Valley (existing alpha). Through quests, the cat learns about a grand festival in Tokyo — a parade where giant floats (dashī) are pulled through the streets. Luna tells an old legend: *"Every hundred years, a cat inspires the float-maker's greatest creation. Perhaps this year, that cat is you."*

This gives the player a gentle, long-term motivation: **travel from Kyoto to Tokyo to see the festival and discover whether the legend is about them.** No urgency — the festival is "when the cherry blossoms fall," meaning the player can take as long as they want.

### 2.3 Act Structure

| Act | Setting | Tone | Primary Gameplay | Est. Playtime |
|-----|---------|------|------------------|---------------|
| **I** | Kyoto + forest + shrine | Peaceful, wondrous, nostalgic | Exploration, collection, NPC friendships | 2-4 hours |
| **II** | Bullet Train rooftop | Exhilarating, fast-paced, whimsical | 2.5D-scroller jump/duck/dodge | 5-10 min (set piece) |
| **III** | Tokyo districts | Bustling, colorful, festive | Exploration, parade float quest, urban parkour | 3-6 hours |

---

## 3. Act I — Kyoto Valley New Quests

### 3.1 "The Bamboo Whisper" (Arashiyama Expansion)

**Trigger:** After completing Luna's Yarn Hunt and reaching Curious Cat rank.

**Setup:** Mochi mentions the bamboo grove has been "whispering louder than usual."

**Steps:**

1. **Follow the bamboo path** — New trail opens east of current bamboo grove into denser forest. Towering bamboo sways and creaks. Fireflies appear even during day (Ghibli magical realism).

2. **Find the Forest Spirit** — Deep in the bamboo, discover a clearing with a moss-covered maneki-neko statue. Eyes glow faintly. Press E — a ghostly translucent cat spirit appears: **Bokuchi (木地)**, old, kind, mischievous.

3. **The Spirit's Request** — Wind has been carrying away travelers' offerings (coins, origami, bells). Bokuchi asks the cat to retrieve 5 **Offering Bells**.

4. **Bell Collection:**
   - One inside a hollow bamboo stalk (jump to reach)
   - One floating in a forest stream (wade in)
   - One on a high rock ledge (3-jump climbing puzzle)
   - One carried by a forest bird (sneak/prowl close, pounce — bird drops it)
   - One buried under autumn leaves (walk over pile, it rustles, press E)

5. **Return to Bokuchi** — Place all 5 bells around the statue. Bokuchi grants **Wind Whisper** ability and tells a story about a faraway festival where cats are celebrated. First narrative hook toward Tokyo.

**Ghibli Moment:** When the last bell is placed, all bamboo sways in unison. Warm wind sweeps through. Bokuchi fades with a smile. No music — just wind and bamboo creaks for 10 seconds.

**Rewards:** +120 XP, Wind Whisper ability, Forest Spirit badge, story hook

### 3.2 "The Thousand Torii" (Fushimi Inari Expansion)

**Trigger:** After "The Bamboo Whisper" + Backyard Explorer rank.

**Steps:**

1. **Enter the Torii Path** — New path south of current shrine, up a mountainside through hundreds of vermilion torii gates (Fushimi Inari tunnel). Dappled light, moss, stone fox statues (kitsune).

2. **Meet the Shrine Cats:**
   - **Inari (稲荷)** — White fox-patterned cat, jade eyes, serene and ceremonial
   - **Kitsune (狐)** — Young orange tabby with white-tipped tail, energetic

3. **The Gate Count** — Inari asks the cat to count torii gates (meditative walking task). Walk the path, touch each gate (press E or auto-touch). 50 gates total. Intentionally repetitive and calming — a walking meditation. Ambient music shifts to slow koto drone.

4. **The Hidden Altar** — Kitsune reveals one gate has a hidden altar behind it. Find it by listening for a faint bell sound. Correct gate is randomized per save. Press E to reveal alcove with offering box.

5. **The Offering** — Place any collectible in the offering box. Triggers cutscene: gates glow warmly, fox-fire (kitsunebi) — floating blue flames — appears along the path. Inari gives the cat the **Fox Charm**.

6. **The Vision** — Inari says: *"The foxes run between cities. Follow the iron snake — it will carry you to where cats dance among giants."* Narrative hook for the bullet train.

**Ghibli Moment:** Fox-fire scene. Blue flames float along the torii path, world goes quiet, cat sits in the glow. Camera slowly pulls back to show the path from above — red gates and blue fire climbing the mountain. 15 seconds of silence and beauty.

**Rewards:** +150 XP, Fox Charm, Inari & Kitsune badges, bullet train hook

### 3.3 "The Station Cat" (Kyoto Station Expansion)

**Trigger:** After "The Thousand Torii."

**Steps:**

1. **Follow the road south** — New path leads to a small train station. Tiled roof, wooden benches, ticket gate, single platform.

2. **Meet Eki (駅)** — Calico cat with stationmaster's hat. Friendly, organized, speaks in train metaphors. *"Right on time! The express comes at sunset."*

3. **Station Tasks:**
   - Collect 3 lost tickets (platform, bench, ticket machine)
   - Chase away 2 pigeons (run at them, they flutter)
   - Sit on the ticket gate (press E — gate clicks open, nod to Tama the real station cat)

4. **The Ticket** — Eki gives **Shinkansen Ticket** (key item). *"The next train goes to Tokyo. But be careful — the rooftop is windy, and tunnels come fast. Stay low, jump high, and don't fall off."*

5. **Wait for Sunset** — Wait until in-game sunset (or nap on station bench). Shinkansen arrives with a dramatic whoosh. Press E to board.

**Ghibli Moment:** Train arriving at sunset. Empty platform except for the cat and Eki. Orange sun. Train slides in — silent, sleek, white. Doors open. Eki bows. Cat steps on. No music — just cooling systems and evening cicadas.

**Rewards:** +100 XP, Shinkansen Ticket, Eki badge, transition to Act II

---

## 4. Act II — The Bullet Train Sequence

### 4.1 Overview

A **set-piece action sequence** — the cat rides atop the Shinkansen at 300 km/h. Gameplay shifts to a **2.5D side-scrolling runner** with jump and duck mechanics.

**Duration:** 5-10 minutes
**Tone:** Exhilarating, wind-in-your-fur, whimsical — not dangerous
**Inspiration:** The cat bus in *Totoro* meets the train ride in *Spirited Away*

### 4.2 Scene Description

Camera shifts to side profile. Cat is on the roof. Japanese countryside blurs past — rice paddies, mountains, rivers, small towns. Sky transitions from sunset orange to twilight purple to night blue.

**Parallax layers:**
- **Layer 0:** Train roof (interactive surface)
- **Layer 1:** Telephone poles, trees, buildings (near)
- **Layer 2:** Towns, rivers, bridges (mid)
- **Layer 3:** Mountains, sky gradient, clouds (far)
- **Layer 4:** Stars appearing, moon rising (sky)

### 4.3 Gameplay Mechanics

**Controls (mobile-first):**

| Input | Action |
|-------|--------|
| Tap JUMP / Space | Jump over obstacles |
| Tap DUCK / hold S | Duck under obstacles |
| Swipe up | Jump (alternative) |
| Swipe down | Duck (alternative) |

**Obstacle types:**

| Obstacle | Response | Frequency |
|----------|----------|-----------|
| **Low signal pole** | Jump | Every 3-5s |
| **Overhead wire arm** | Duck | Every 4-6s |
| **Tunnel entrance** | Duck and hold 1.5s | Every 20-30s |
| **Wind gust** | Timed jump (ride gust upward) | Every 15-20s |
| **Bird flock** | Jump or duck (mixed heights) | Every 10-15s |

### 4.4 Difficulty Curve

| Phase | Time | Speed | Reaction Window | Notes |
|-------|------|-------|-----------------|-------|
| **Sunset** | 0:00-2:00 | Slow | 0.8s | Single obstacles only, tutorial pace |
| **Twilight** | 2:00-5:00 | Medium | 0.6s | Alternating jump/duck, combos begin |
| **Night** | 5:00-7:00 | Full | 0.5s | Rapid patterns, frequent tunnels, mixed bird heights |
| **Tokyo approach** | 7:00-8:00 | Slowing | — | Obstacles thin out, city lights appear on horizon |
| **Arrival** | 8:00 | Stop | — | Train enters tunnel, emerges in Tokyo Station. Cat hops off. Cutscene. |

### 4.5 Soft Failure

- Cat hits obstacle → tumbles, rolls, lands back on roof (ragdoll-style)
- "Dizzy" animation for 1.5s (birds circle cat's head — Ghibli style)
- No restart, no progress loss
- Gentle "boing" sound (not harsh error)
- After 3 consecutive hits: auto-prowl for 3s (wider duck hitbox, slower obstacles — adaptive difficulty)

### 4.6 Collectibles During Ride

- **Wind Chimes** (x10) — Floating, jump into them. +15 XP each, pleasant chime.
- **Shooting Stars** (x5) — During night section, tap/E at right moment to catch. +25 XP each, sparkle effect.

### 4.7 Technical Notes

- Separate scene (`ShinkansenScene`) replaces main world during ride
- Train roof is simple flat mesh with vibration animation
- Obstacles are pooled meshes scrolling right-to-left
- Parallax uses separate sprite planes at different Z depths
- Reuses existing `Sky` class with accelerated `dayTime`
- Lighter than main game — fewer draw calls, simpler geometry — high FPS on mobile

---

## 5. Act III — Tokyo & The Parade Float Quest

### 5.1 Tokyo Districts

| District | Theme | Visual Style | Key Features |
|----------|-------|--------------|--------------|
| **Yanaka** | Old Tokyo, nostalgic | Wooden houses, narrow alleys, temples | Parade float studio, old shops |
| **Ueno Park** | Green oasis | Large park, pond, cherry trees, museum | Cat gathering hub, NPC central |
| **Asakusa** | Temple town, festive | Senso-ji, Nakamise market, lanterns | Festival prep, float construction |
| **Shibuya** | Modern urban | Skyscrapers, famous crossing, neon | Crossing scene, rooftop parkour |
| **Akihabara** | Electric town | Neon signs, anime billboards | Night exploration, light puzzles |

**Scale:** ~2 km². Districts connected by streets, alleys, rooftop paths. More vertical than Kyoto. "Cat tunnels" (sewer pipes, wall gaps) provide fast-travel between discovered districts.

### 5.2 The Parade Float Quest — Overview

The **central quest of Act III** — a multi-step storyline where the cat becomes the inspiration for a giant parade float (dashī). The emotional heart of the game's narrative.

**Inspiration:** Kyoto Gion Festival's Yamaboko Junkō meets the cat parade in *The Cat Returns*.

**Duration:** 1-2 hours across multiple sessions

### 5.3 Step 1: "The Art Studio" (Yanaka)

**Trigger:** Explore Yanaka. Meet **Sumi (墨)** — old ink-painter cat with grey fur and paint-stained paws — outside a traditional art studio.

**The Studio Interior:** Cluttered workshop — wood shavings, paint pots, sketches, half-built float models. A large worktable with blueprints. An old human artisan (never seen clearly — only hands and voice, Ghibli style) is struggling with a design. Paintings of various animals on walls — but none of cats. A sleeping dog in the corner (atmospheric).

**The Cat's Role:** The cat jumps onto the worktable. The artisan notices and begins sketching. The player can:
- **Walk across blueprints** — leaving ink paw prints the artisan incorporates
- **Sit on paint pots** — tail dips into paint, leaving colorful swirl marks
- **Meow at specific sketches** — artisan pins that sketch to the board
- **Bat a wind chime** — artisan hears the sound and has an idea (glowing orb floats from chime to artisan's head)

**Completion:** After interacting with 3 studio elements, the artisan has a breakthrough. Montage plays: sketches fill the wall, a scale model takes shape — and the model looks like the cat. A tiny wooden cat float with golden eyes and a red ribbon.

**Ghibli Moment:** The montage has no dialogue. Just pencils, sawing, and the cat purring. Camera slowly reveals the completed model from behind — it's the cat. The artisan's hands rest on the table. The cat sits beside its tiny wooden twin. 20 seconds of warmth.

**Rewards:** +200 XP, Sumi friendship badge, **Muse's Paw Print** item, parade float design unlocked

### 5.4 Step 2: "Gathering Materials" (Asakusa)

**Trigger:** After "The Art Studio."

**Materials needed:**

1. **Vermilion Lacquer** — From paint shop in Nakamise market. Shopkeeper cat **Nori (海苔)** trades it for 5 yarn balls.

2. **Golden Bell** — From temple bell shop near Senso-ji. Shopkeeper **Tetsu (鉄)** is grumpy. Visit 3 times. On 3rd visit, bring a **Fish Treat**. Tetsu eats it, softens, gives the bell: *"Fine. Take it. But don't come crying if it's too heavy."*

3. **Silk Ribbon** — From fabric shop in Yanaka. Shopkeeper **Nuno (布)** is shy and hides. Enter and sit quietly (don't move for 10 seconds — patience test). Nuno peeks out, sees the cat sitting calmly, comes out. Meow gently (press M), Nuno offers the ribbon.

4. **Cherry Wood** — From Ueno Park. A fallen cherry branch near the pond. Drag it back to the studio (push object mechanic — walk into branch, it slides forward, heavier and slower than yarn balls).

**Ghibli Moment:** Dragging the cherry branch through Yanaka's narrow streets at sunset. The branch is almost as big as the cat. Slow, awkward, funny. Neighbors peek out of windows and smile. An old woman puts down a saucer of milk as the cat passes. The cat stops, drinks, continues. No dialogue — just wood scraping on stone and evening birds.

**Rewards:** +250 XP, Nori/Tetsu/Nuno badges, float construction begins

### 5.5 Step 3: "The Festival Eve" (Asakusa)

**Trigger:** After "Gathering Materials" + next in-game day (or nap to advance time).

**Setup:** The float is built — enormous. A giant wooden cat with golden eyes, red ribbon, vermilion body, golden bell. It sits on wheels. But the festival needs one more thing: **the cat must bless the float.**

**The Blessing Ritual:**
1. Climb onto the float's head (platforming puzzle — boxes to scaffolding to shoulder to head)
2. Press E to sit on the float's head
3. Meow (press M) — the float's golden eyes light up
4. Lanterns around the float ignite one by one
5. Festival music begins (new music phase: "festival" — taiko drums, flute, celebratory)
6. The cat is now the float's guardian spirit

**Ghibli Moment:** The cat sits on the float's head, silhouetted against the night sky. Lanterns light up below. Festival music swells. Camera pulls back slowly to reveal the entire float — a giant cat, glowing, alive. The real cat sits on top, tiny and proud. 30 seconds of pure magic.

**Rewards:** +300 XP, **Festival Guardian** title, float blessed

### 5.6 Step 4: "The Parade" (Asakusa — Festival Day)

**Trigger:** Next in-game morning after the blessing.

**The Parade Sequence:**
- **Slow walking sequence**, not an action scene
- Cat walks alongside the float as it's pulled through Asakusa's streets
- Crowds of NPCs line the streets — cats and humans cheering
- The cat can:
  - Walk at its own pace (float moves slowly)
  - Meow to make the crowd cheer louder (press M — each meow triggers crowd response)
  - Jump onto the float and ride it (press E — cat climbs up, sits on the head)
  - Collect **Festival Coins** tossed from windows (10 coins along the route — jump to catch mid-air)
- Parade route ~200m through Asakusa, ending at Senso-ji temple
- At the temple, the float parks. Cat jumps down. Final cutscene plays.

**The Ending Cutscene:**
- Cat stands before the temple. The float looms behind it.
- Luna appears (she traveled from Kyoto — "I wouldn't miss this")
- All befriended NPCs appear: Mochi, Kuro, Inari, Kitsune, Eki, Sumi, Nori, Tetsu, Nuno
- The cat looks at them all. The crowd is quiet.
- The cat meows once.
- The crowd erupts in cheers.
- Fade to black. Title card: **"猫の散歩 — A cat's stroll."**
- Credits roll over a slow camera pan of the Kyoto Valley at dawn

**Ghibli Moment:** The entire parade. It's not a boss fight. It's not a climax of action. It's a walk. A slow, proud, beautiful walk through a street full of people who love this cat. That's the most Ghibli thing possible.

**Rewards:** +500 XP, **Parade Hero** achievement, credits, New Game+ unlocked

---

## 6. The Forest Chase

### 6.1 Overview

A set-piece chase sequence in the Arashiyama bamboo forest. The cat is pursued by... something. But in true Ghibli fashion, the "something" is not a monster — it's a **forest guardian** (a large, spirit-like creature) who is actually trying to return something the cat dropped.

**The reveal:** The player thinks they're being chased by a scary creature. After the chase, the guardian catches up (or the cat stops), and the guardian gently places a lost item (the Fox Charm, or a bell) at the cat's feet, makes a soft sound, and retreats into the forest. The "chase" was the guardian trying to catch up to return the item.

**Inspiration:** The forest spirit in *Princess Mononoke* — but kind instead of ominous. Also Kodama scenes — small spirits that follow and observe.

**Duration:** 2-3 minutes
**Tone:** Exhilarating → tense → heartwarming (emotional arc within the scene)

### 6.2 Scene Description

**Trigger:** After collecting the 5th Offering Bell in "The Bamboo Whisper" quest, the cat turns to head back. Suddenly, bamboo starts shaking. A deep rumbling sound. Screen shakes slightly. Something large is moving through the forest.

**Visual:** The forest guardian is not fully visible — the player sees:
- Bamboo stalks being pushed aside (swaying, cracking sounds)
- A large shadow moving between trees
- Glowing eyes in the darkness (two soft amber lights)
- Heavy footsteps (low frequency rumble audio)
- Dust and leaves kicked up

The cat's ears flatten (fear animation). The game enters chase mode.

### 6.3 Chase Mechanics (Mobile-First)

**Control scheme:**

| Input | Action |
|-------|--------|
| Joystick / WASD | Run (auto-sprint) |
| JUMP button / Space | Jump over obstacles |
| DUCK button / hold S | Slide under low bamboo barriers |
| Swipe left/right | Quick dodge (shift 1 lane left or right) |

**3-lane runner:**
- Forest path has 3 lanes (left, center, right)
- Obstacles appear in lanes — logs to jump, bamboo to slide under, gaps to jump across
- The guardian is always behind — visible as a growing shadow at the bottom of the screen
- If the cat hits an obstacle, it stumbles (0.5s delay) and the guardian gains ground
- 3 perfect dodges in a row → cat gains distance (shadow shrinks)

**Obstacle types:**

| Obstacle | Response | Visual |
|----------|----------|--------|
| **Fallen log** | Jump | Mossy log across path |
| **Low bamboo arch** | Duck/slide | Bamboo poles forming low barrier |
| **Stream crossing** | Jump (timed) | Small water channel — splash on landing |
| **Rock pile** | Dodge left or right | Rocks blocking center lane |
| **Roots** | Jump (small) | Exposed tree roots — small hop |
| **Spider web** | Dodge left or right | Web spanning one lane — slows you |

**Duration:** ~90 seconds of running, then the path opens into a clearing.

### 6.4 The Reveal

The cat bursts into a clearing and stops. The guardian emerges from the forest...

**The Guardian:** A large creature — like a combination of a tanuki and a forest spirit. Round body, leafy fur, big amber eyes, a gentle expression. It's breathing heavily — it was running hard. It looks at the cat. It opens its mouth...

...and drops a small bell at the cat's feet. One of the Offering Bells the cat had collected. It must have fallen out.

The guardian makes a soft "wuf" sound, turns, and waddles back into the forest. The bamboo sways gently as it passes.

The cat picks up the bell (press E). The forest is quiet.

**Ghibli Moment:** The reveal. The player's heart is racing from the chase. The guardian emerges — big, scary-looking... and then it gently drops a bell and waddles away. The tension breaks into warmth. The music (which was intense during the chase) fades to a single, soft koto note. 10 seconds of silence as the cat stands in the clearing, bell in mouth, watching the forest settle.

**Rewards:** +80 XP, **Guardian's Bell** item, guardian becomes a friendly NPC that appears occasionally in the forest

### 6.5 Revisiting the Guardian

After the chase, the guardian can be found sleeping in a specific clearing. If the cat visits and sits next to it (press E), the guardian's breathing syncs with the cat's purring. A hidden XP trickle (+1 XP/second) accumulates while sitting. This becomes a meditation spot — a place players return to for calm.

---

## 7. Additional Quest Concepts

### 7.1 "The Lost Kitten" (Kyoto Valley)

**Type:** Escort quest (gentle)
**Trigger:** Random encounter while exploring Kyoto Valley at night

A tiny kitten (smaller than the player cat) is found crying near a bridge. The cat must guide the kitten home by walking slowly — the kitten follows but stops if the cat moves too fast or gets too far ahead. Walk at prowl speed, occasionally stop and meow to encourage the kitten.

**Route:** ~150m from bridge to a house with a warm light. The kitten's owner (an old woman) is waiting on the porch. She gives the cat a **Fish Treat** and pets it.

**Ghibli Moment:** Walking through nighttime Kyoto with a tiny kitten following. Street lights are warm. The kitten's tiny footsteps echo behind the cat's. No music — just footsteps and crickets.

**Rewards:** +100 XP, Fish Treat, **Guardian Cat** badge

### 7.2 "The Rainstorm Shelter" (Kyoto or Tokyo)

**Type:** Weather-triggered environmental quest
**Trigger:** Being outside during heavy rain

When a rainstorm begins, the cat must find shelter within 60 seconds. If it stays in the rain too long, the cat gets "soaked" (fur flattened, occasional sneeze, movement speed -15%). Finding shelter removes the soaked state.

**Shelter locations:**
- Under a shop awning (press E to shake off water — splash particle effect)
- Inside a bus stop (sit on bench — cat watches rain through glass)
- Under a shrine eave (ring the bell for +10 XP while waiting)
- Inside the tea house (take a cozy nap until rain passes)

**Bonus:** If another NPC cat is already sheltering, they share a "rain moment" — sitting together, watching rain, +5 relationship. A *Spirited Away* bus stop moment.

**Ghibli Moment:** Two cats sitting under an awning, watching rain fall on a Kyoto street. Steam rises from warm ground. Sound of rain on the awning. Neither cat moves. 15 seconds of peace.

**Rewards:** +50 XP, **Rain Friend** badge if NPC shares shelter

### 7.3 "The Rooftop Garden" (Tokyo — Shibuya)

**Type:** Discovery & building quest
**Trigger:** Reaching Shibuya and climbing to a specific rooftop

The cat discovers an abandoned rooftop garden — old planters with dead plants, broken bench, empty pots. Over multiple visits, the cat can "restore" the garden:

1. **Bring seeds** — Find seed packets scattered in Tokyo. Carry one at a time to the rooftop, place in planter (press E).
2. **Bring water** — Find a water source (puddle after rain, fountain in Ueno Park). Cat's fur gets wet, walk to rooftop, shake off over planter.
3. **Bring sunlight** — Automatic — garden improves over in-game days. Each visit shows slightly more growth.
4. **Invite NPC cats** — After 3 plants, meow at NPC cats to invite them. They'll visit and sit among the plants.

**Completion:** After 5 plants growing and 3 NPCs visited, the rooftop becomes a **Cat Haven** — a fast-travel point and resting spot. The cat can nap here to advance time.

**Ghibli Moment:** The first time the cat returns and sees green sprouts in the planters. No fanfare — just tiny green shoots in brown dirt. The cat sits among them. A butterfly lands on the cat's head. 10 seconds of quiet joy.

**Rewards:** +200 XP, **Garden Keeper** badge, Cat Haven fast-travel point

### 7.4 "The Neon Chase" (Tokyo — Akihabara)

**Type:** Light-based puzzle chase
**Trigger:** Exploring Akihabara at night

A glowing spirit (a small will-o'-wisp) appears and zips through the neon-lit streets. The cat must follow it — chasing the light through alleys, over rooftops, through electric sign gaps. The spirit stops at certain points and waits for the cat to catch up.

**At the end:** The spirit leads the cat to a hidden rooftop with a view of the entire Tokyo skyline. The spirit transforms into a small star-shaped charm (the **Electric Star** item). The skyline glitters below.

**Ghibli Moment:** The cat stands on the rooftop, looking at Tokyo's skyline. Neon signs reflect in the cat's golden eyes. The city hums below. A single piano note plays. 15 seconds of awe.

**Rewards:** +150 XP, **Electric Star** item, Akihabara viewpoint unlocked

### 7.5 "The Ferry Cat" (Tokyo — Sumida River)

**Type:** Relaxing transit experience
**Trigger:** Finding the Sumida River ferry dock in Asakusa

The cat can ride a small ferry across the Sumida River. No challenge — the cat sits on the ferry and watches the city pass by:
- Cherry petals float on the water
- Other cats sit on the ferry (random NPCs)
- The cat can bat at petals floating near the edge
- The ride takes ~60 seconds of real time
- At the end, the cat arrives at the other bank (new area access)

**Ghibli Moment:** The ferry ride itself. Water lapping against the boat. The city sliding past. A cat on a boat. That's it. That's the scene. 60 seconds of tranquility.

**Rewards:** +30 XP, **Ferry Pass** item (unlimited rides), new area access

### 7.6 "The Origami Trail" (Tokyo — Yanaka)

**Type:** Collection puzzle
**Trigger:** Finding a paper origami crane on the ground in Yanaka

The cat finds an origami crane. Picking it up reveals another nearby — slightly higher, on a fence. And another on a rooftop. The cranes form a trail through Yanaka's alleys and rooftops.

**The trail:** 12 origami cranes, each slightly harder to reach. The final crane is on the highest rooftop in Yanaka, next to a small shrine. Collecting all 12 unlocks a **Paper Crane** item — a decorative charm on the cat's collar.

**Ghibli Moment:** Reaching the final rooftop. The cat is high above Yanaka. Paper cranes are arranged in a circle around the shrine. A breeze picks them up and they scatter into the sky — a flock of paper birds. The cat watches them go. 10 seconds of wonder.

**Rewards:** +180 XP, **Paper Crane** collar charm, Yanaka high viewpoint

### 7.7 "The Midnight Cat Meeting" (Tokyo — Ueno Park)

**Type:** Social event
**Trigger:** Visiting Ueno Park central pond at midnight (in-game 0:00-3:00)

Once per night, a **Cat Meeting** is happening. 8-10 NPC cats are gathered in a circle around the pond. The cat can join the circle (walk to an empty spot and sit).

**During the meeting:**
- Each cat takes turns meowing (different pitches and durations — sounds like conversation)
- The cat can meow when it's their turn (prompt: "Your turn — press M")
- After 3 rounds, the meeting ends and all cats disperse
- A **Cat Council** badge is earned

**Ghibli Moment:** The circle of cats around the pond. Moonlight on water. Each cat meows in turn. It sounds like music — a round, a canon, a conversation no human can understand. The cat's turn comes. It meows. The other cats nod. 20 seconds of belonging.

**Rewards:** +120 XP, **Cat Council** badge, +10 relationship with all participating NPCs

---

## 8. New Item & Collectible Catalog

### 8.1 Quest Items (Key Items)

| Item | Source | Purpose |
|------|--------|---------|
| **Shinkansen Ticket** | Eki (Kyoto Station) | Unlocks bullet train sequence |
| **Muse's Paw Print** | Art Studio (Yanaka) | Proof of inspiration — shown to festival organizer |
| **Vermilion Lacquer** | Nori's paint shop (Asakusa) | Float construction material |
| **Golden Bell** | Tetsu's bell shop (Asakusa) | Float decoration — rings during parade |
| **Silk Ribbon** | Nuno's fabric shop (Yanaka) | Float decoration — matches cat's ribbon |
| **Cherry Wood** | Ueno Park (fallen branch) | Float construction material |
| **Festival Coin** (x10) | Parade route (Asakusa) | Collected during parade — bonus XP |

### 8.2 Collectibles

| Item | Source | Value |
|------|--------|-------|
| **Offering Bell** (x5) | Bamboo forest (quest) | +20 XP each |
| **Wind Chime** (x10) | Bullet train rooftop | +15 XP each |
| **Shooting Star** (x5) | Bullet train (night section) | +25 XP each |
| **Festival Coin** (x10) | Parade route | +30 XP each |
| **Origami Crane** (x12) | Yanaka rooftops | +15 XP each |

### 8.3 Abilities

| Ability | Source | Effect |
|---------|--------|--------|
| **Wind Whisper** | Bokuchi (Bamboo quest) | Faint audio cue when a collectible is within 30m. Subtle wind particles drift toward the item. |
| **Prowl+** | Unlocked at Rooftop Wanderer rank | Prowl speed increased from 45% to 60% of walk speed. Purr audio louder. |
| **Double Jump** | Unlocked at City Legend rank | Press jump again in mid-air. Animation: cat does a mid-air twist. |

### 8.4 Charms (Equippable)

| Charm | Source | Effect | Visual |
|-------|--------|--------|--------|
| **Fox Charm** | Inari (Fushimi Inari quest) | +10% XP gain from all sources | Small fox face pendant on collar |
| **Guardian's Bell** | Forest guardian (chase reveal) | Soft ring when hidden item is within 10m | Small bronze bell on collar |
| **Electric Star** | Akihabara wisp chase | Glows softly at night — illuminates dark areas | Star-shaped charm on collar |
| **Paper Crane** | Origami trail (Yanaka) | Attracts birds — birds land near cat more often (cosmetic) | Paper crane tucked in ribbon |
| **Muse's Paw Print** | Art Studio (parade quest) | NPC cats 15% more likely to approach the cat first | Golden paw print badge on ribbon |

### 8.5 Consumables

| Item | Source | Effect | Duration |
|------|--------|--------|----------|
| **Fish Treat** | Various (quest rewards, market) | +20% speed boost, heals "soaked" state | 30 seconds |
| **Sakura Mochi** | Market stalls (Asakusa, festival) | +15% jump height, pink particle trail | 25 seconds |
| **Matcha Tea** | Tea House / market | Restores stamina (if added), warm glow | 20 seconds |
| **Taiyaki** | Market stalls (Tokyo) | +10% XP gain, sweet chime on consumption | 60 seconds |

---

## 9. New NPC Concepts

### 9.1 Kyoto NPCs

| NPC | Location | Fur | Personality | Role |
|-----|----------|-----|-------------|------|
| **Bokuchi (木地)** | Bamboo forest clearing | Grey-green, moss-like texture | Old, wise, mischievous, speaks in riddles | Forest spirit — "Bamboo Whisper" quest |
| **Inari (稲荷)** | Fushimi Inari shrine path | White with fox markings, jade eyes | Serene, ceremonial, formal | Shrine guardian — "Thousand Torii" quest |
| **Kitsune (狐)** | Fushimi Inari shrine path | Orange tabby, white-tipped tail | Young, energetic, curious | Inari's companion — hints and guidance |
| **Eki (駅)** | Kyoto Station | Calico with stationmaster's hat | Organized, punctual, train metaphors | Station cat — "Station Cat" quest |

### 9.2 Tokyo NPCs

| NPC | Location | Fur | Personality | Role |
|-----|----------|-----|-------------|------|
| **Sumi (墨)** | Yanaka art studio | Grey with ink-stained paws | Old, artistic, gentle | Painter cat — parade float quest chain |
| **Nori (海苔)** | Asakusa paint shop | Brown tabby, white paws | Cheerful, business-minded | Shopkeeper — trades materials for yarn |
| **Tetsu (鉄)** | Asakusa bell shop | Dark grey, stocky, scarred ear | Grumpy, lonely, softens with food | Shopkeeper — needs Fish Treat to befriend |
| **Nuno (布)** | Yanaka fabric shop | Cream with calico patches | Shy, hides from strangers | Shopkeeper — requires patience to befriend |
| **Hana (花)** | Ueno Park | Pink-grey (rare), flower behind ear | Social, festival organizer | Festival coordinator — parade quest progression |
| **Denki (電気)** | Akihabara | Black with neon-green eyes | Hyperactive, loves neon | Electric town guide — neon chase quest |
| **Yuki (雪)** | Shibuya rooftops | Pure white, blue eyes | Cool, aloof, parkour expert | Rooftop garden quest — teaches advanced jumps |
| **The Guardian** | Bamboo forest | Large, leafy, round, amber eyes | Silent, gentle, misunderstood | Chase scene "antagonist" → friend |

### 9.3 NPC AI Enhancements

- **Follow behavior** — NPCs follow the cat for limited time (escort quests, "show me the way")
- **Hide behavior** — Nuno hides when cat enters; peeks out based on cat's stillness
- **Schedule behavior** — NPCs appear at specific locations based on in-game time
- **Trade behavior** — Nori and market vendors open a simple trade UI (yarn → items)
- **Group behavior** — Midnight cat meeting requires multiple NPCs to path to circle formation and take turns

---

## 10. Mobile-First Design Considerations

### 10.1 Touch Controls by Scene Type

| Scene Type | Control Scheme | Notes |
|------------|---------------|-------|
| **Exploration** (default) | Joystick + 3 buttons + swipe camera | Current scheme — no changes |
| **Bullet Train scroller** | JUMP + DUCK buttons (replaces ACT/MEOW) | No joystick — cat auto-runs. Swipe up/down alternative |
| **Forest chase (3-lane)** | Joystick (lane shift) + JUMP + DUCK | Auto-sprint. Swipe left/right for quick dodge |
| **Parade walk** | Joystick only (slow walk) + MEOW | No JUMP needed. ACT to mount/dismount float |
| **Ferry ride** | None (passive) | Cat sits automatically. Tap to bat at petals |
| **Cat meeting** | MEOW button only | No movement — cat is seated |

### 10.2 Session Length Targets

| Activity | Target Duration | Mobile Session Fit |
|----------|----------------|-------------------|
| Single quest step | 3-5 minutes | Perfect for bus ride |
| Full quest (5 steps) | 15-25 minutes | Lunch break |
| Bullet train sequence | 8-10 minutes | Single session |
| Forest chase | 2-3 minutes | Quick burst |
| Parade sequence | 5-8 minutes | Single session |
| District exploration | 20-40 minutes | Multiple sessions (auto-save supports this) |

### 10.3 Performance Considerations

- **Tokyo districts** use existing streaming/chunk system — only load current district + neighbors
- **Set-piece sequences** (bullet train, forest chase) are separate scenes with minimal geometry — high FPS
- **Parade scene** has many NPCs — use LOD and instancing for crowd rendering
- **Neon effects** (Akihabara) use emissive materials, not real-time lights — cheaper on mobile
- **Particle effects** (petals, fireflies, confetti) use existing pooled instanced mesh system

---

## 11. Technical Implementation Notes

### 11.1 Scene Architecture

```
MainScene (Kyoto Valley)
  ├── Countryside (existing)
  ├── BambooForest (new — extends east)
  ├── ToriiPath (new — extends south)
  ├── KyotoStation (new — south edge)
  └── InteriorManager (existing tea house + new: art studio, shops)

ShinkansenScene (new — bullet train)
  ├── TrainRoof (platform)
  ├── ObstacleSpawner (pooled)
  ├── ParallaxLayers (4 sprite planes)
  └── Sky (reuses existing Sky class with accelerated time)

TokyoScene (new — Tokyo world)
  ├── YanakaDistrict
  ├── UenoPark
  ├── AsakusaDistrict
  ├── ShibuyaDistrict
  ├── AkihabaraDistrict
  ├── InteriorManager (art studio, shops, temple)
  └── FestivalScene (parade route — Asakusa)

ChaseScene (new — forest chase)
  ├── ForestPath (3-lane runner)
  ├── ObstacleSpawner (pooled)
  ├── GuardianShadow (visual effect — not a real mesh)
  └── ClearingReveal (ending area)
```

### 11.2 Quest System Extensions

The current `QuestManager` supports basic quest tracking. Additions needed:

- **Multi-step quests** — Sequential steps, each with its own completion condition
- **Quest chains** — Prerequisite system (quests that unlock other quests)
- **Quest flags** — World state flags that persist in save data (e.g., `metBokuchi`, `blessedFloat`)
- **Quest items** — Items that exist only within quest contexts
- **Quest UI** — Quest log panel in pause menu showing active and completed quests

### 11.3 Save Data Expansion

Current save schema:
```javascript
{ position, score, xp, rank, quest, collected, worldState, dayTime, weather }
```

Expanded save schema:
```javascript
{
  // existing
  position, score, xp, rank, collected, worldState, dayTime, weather,
  // new
  currentAct: 1|2|3,
  currentScene: 'kyoto'|'shinkansen'|'tokyo'|'chase',
  questLog: {
    activeQuests: [{ id, step, progress }],
    completedQuests: [questId],
    questFlags: { metBokuchi: true, ... }
  },
  inventory: {
    keyItems: ['shinkansen_ticket', 'muse_paw_print', ...],
    charms: ['fox_charm', 'guardian_bell', ...],
    consumables: { fishTreat: 3, sakuraMochi: 1, ... }
  },
  npcRelationships: { luna: 50, mochi: 30, ... },
  tokyoUnlocked: { yanaka: true, ueno: false, ... },
  catHavenUnlocked: false,
  paradeState: 'not_started'|'designing'|'gathering'|'blessed'|'complete'
}
```

### 11.4 Music Director Expansion

Current `MusicDirector` has 4 phases: dawn, day, dusk, night. New phases:

| Phase | Trigger | Instruments | Mood |
|-------|---------|-------------|------|
| **festival** | Parade quest active, Asakusa | Taiko drums, shinobue flute, koto | Celebratory, warm, rhythmic |
| **chase** | Forest chase / bullet train | Fast koto, urgent percussion, rising pad | Exhilarating, tense but not scary |
| **temple** | Inside Senso-ji / Fushimi Inari | Deep bell tones, slow pad, solo shakuhachi | Sacred, meditative, reverent |
| **neon** | Akihabara at night | Synth pad, electronic plucks, ambient hum | Futuristic, glowing, energetic |
| **parade** | During the parade walk | Full ensemble — taiko, flute, koto, bells | Triumphant, joyful, communal |
| **credits** | Ending credits | Solo piano, slow koto, warm pad | Reflective, bittersweet, peaceful |

### 11.5 Interior System Expansion

Current `InteriorManager` supports one interior (tea house). New interiors:

| Interior | Location | Size | Features |
|----------|----------|------|----------|
| **Art Studio** | Yanaka | 10m × 8m | Worktable, paint pots, blueprints, float model, sleeping dog |
| **Paint Shop** | Asakusa | 6m × 5m | Shelves, paint jars, Nori's sleeping spot |
| **Bell Shop** | Asakusa | 6m × 5m | Bell display, workbench, Tetsu's anvil |
| **Fabric Shop** | Yanaka | 8m × 6m | Fabric rolls, Nuno's hiding spot, sewing table |
| **Senso-ji Interior** | Asakusa | 12m × 10m | Incense, altar, prayer area, festival offerings |
| **Cat Haven** | Shibuya rooftop | 6m × 4m | Planters, bench, city view, rest spot |

Each interior uses the same transition system (door wipe animation, isolated coordinate space) as the existing tea house.

---

## 12. Suggested Build Order

### Phase 1: Kyoto Valley Expansion (build on existing alpha)

| Priority | Feature | Effort | Dependency |
|----------|---------|--------|------------|
| 1 | Multi-step quest system in `QuestManager` | Medium | None |
| 2 | Expanded save schema | Small | None |
| 3 | Bamboo forest zone extension | Medium | Quest system |
| 4 | "The Bamboo Whisper" quest | Medium | Forest zone + quest system |
| 5 | Forest chase scene (3-lane runner) | Large | Forest zone |
| 6 | Fushimi Inari torii path zone | Medium | None |
| 7 | "The Thousand Torii" quest | Medium | Torii zone + quest system |
| 8 | Kyoto Station zone | Small | None |
| 9 | "The Station Cat" quest | Small | Station zone |
| 10 | New NPCs: Bokuchi, Inari, Kitsune, Eki | Medium | Quest system |
| 11 | New items: Offering Bell, Fox Charm, Guardian's Bell | Small | Quest system |
| 12 | "The Lost Kitten" escort quest | Medium | NPC follow AI |
| 13 | "The Rainstorm Shelter" weather quest | Small | Weather system (existing) |

### Phase 2: The Bullet Train (set-piece)

| Priority | Feature | Effort | Dependency |
|----------|---------|--------|------------|
| 1 | ShinkansenScene architecture | Medium | Scene system |
| 2 | Parallax background layers | Medium | Scene architecture |
| 3 | Obstacle spawn system (pooled) | Medium | Scene architecture |
| 4 | Jump/duck scroller controls | Small | Obstacle system |
| 5 | Difficulty curve implementation | Small | Obstacle system |
| 6 | Soft failure / adaptive difficulty | Small | Obstacle system |
| 7 | Wind Chime + Shooting Star collectibles | Small | Obstacle system |
| 8 | Scene transition (Kyoto → train → Tokyo) | Medium | Scene system |
| 9 | "Chase" music phase | Small | Music director |

### Phase 3: Tokyo World (Act III)

| Priority | Feature | Effort | Dependency |
|----------|---------|--------|------------|
| 1 | TokyoScene architecture | Large | Scene system |
| 2 | Yanaka district (old Tokyo) | Medium | Scene architecture |
| 3 | Art Studio interior | Medium | Interior system |
| 4 | "The Art Studio" quest (Step 1) | Medium | Yanaka + interior |
| 5 | Asakusa district (temple town) | Medium | Scene architecture |
| 6 | Market street + shop interiors | Medium | Asakusa |
| 7 | "Gathering Materials" quest (Step 2) | Medium | Asakusa + shops |
| 8 | Ueno Park district | Medium | Scene architecture |
| 9 | "The Festival Eve" quest (Step 3) | Medium | Asakusa + festival scene |
| 10 | "The Parade" quest (Step 4) | Large | All districts + festival scene |
| 11 | Shibuya district + rooftop garden quest | Medium | Scene architecture |
| 12 | Akihabara district + neon chase quest | Medium | Scene architecture |
| 13 | "Ferry Cat" + "Origami Trail" + "Midnight Meeting" | Medium | Tokyo districts |
| 14 | Ending cutscene + credits | Medium | Parade quest |
| 15 | New music phases (festival, temple, neon, parade, credits) | Medium | Music director |

### Phase 4: Polish & Expansion

| Priority | Feature | Effort | Dependency |
|----------|---------|--------|------------|
| 1 | Charm equipping system | Small | Inventory system |
| 2 | Consumable usage system | Small | Inventory system |
| 3 | NPC relationship tracking + UI | Medium | Save system |
| 4 | Quest log UI panel | Medium | Quest system |
| 5 | Cat Haven fast-travel system | Small | Rooftop garden quest |
| 6 | New Game+ mode | Medium | Parade quest complete |
| 7 | Additional ambient life for Tokyo (birds, fish, insects) | Medium | AmbientLife system |
| 8 | Weather system integration for Tokyo | Small | Sky system (existing) |
| 9 | Accessibility options (timing windows, auto-collect) | Small | Settings system |

---

## Closing Notes

This document is a conceptual build guide, not a spec. Each quest and scene should be prototyped, playtested, and refined. The Ghibli principles in Section 1 should be the north star — if a feature doesn't serve wonder, kindness, and beauty, it probably doesn't belong in Cat Walk.

The existing alpha proves the core loop works: exploration, collection, NPC interaction, and atmosphere. The expansion described here adds narrative structure, set-piece variety, and emotional payoff — while keeping the game's soul intact.

**Cat Walk · 猫の散歩**
*Created with vibe coding and SOTA AI models. Inspired by Studio Ghibli and a honeymoon in Kyoto.*
*Alpha — always alpha. The stroll never ends.*
