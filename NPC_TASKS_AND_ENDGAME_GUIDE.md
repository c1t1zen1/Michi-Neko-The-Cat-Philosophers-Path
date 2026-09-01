# Michi Neko: NPC Tasks, Dialogue Riddles & End-Game Content Guide

> A comprehensive investigation of all NPC cat task systems, dialogue riddles, and completion rewards in the Michi Neko codebase.

---

## 🐱 NPC Cats & Their Tasks

### Currently Implemented NPCs (in the live game)

#### 1. Luna (月) — The Moonlight Cat

| Property | Detail |
|----------|--------|
| **Location** | Near the valley center / spawn point (position 3, 0, 3) |
| **Personality** | Mysterious, wise, speaks in riddles about the valley's secrets |

**Dialogue Riddle (initial):**
> *"Oh, hello little wanderer! I am Luna. This valley is full of secrets... and yarn. Could you collect 3 yarn balls for me? 🐾"*

> **Riddle meaning:** She hints at both "secrets" and "yarn" — the actual task is collecting 3 yarn balls, but the riddle-like phrasing about "secrets" also foreshadows the hidden Tea House and other collectibles.

**Task:** Collect **3 yarn balls** scattered throughout the valley (each gives +10 XP on collection)

**Dialogue States:**
- **During quest:** *"You have found X of 3 yarn balls. Y still hide in the valley."* (or *"Only one yarn ball remains. I can almost hear it rolling through the grass!"*)
- **Quest complete (pending reward):** *"You found all three! Even the moonlight looks warmer around you. Here is your reward: Luna's Leap lesson. Your paws can spring much higher now! Try it at the bamboo corral west of the village. A stubborn turtle guards a Jade Paw inside."*
- **After reward claimed:** *"Your new leap suits you, little wanderer. The turtle is slow but determined. Let it chase you, then spring past and claim the Jade Paw!"*

**Rewards:** +50 XP (quest completion), **Jump Boost** ability (Luna's Leap), then directs you to the Turtle Corral for the Jade Paw

---

#### 2. Mochi — The Bamboo Grove Cat

| Property | Detail |
|----------|--------|
| **Location** | East side, near the bamboo grove (position 28, 0, -18) |
| **Personality** | Cheerful, hints at secrets |

**Dialogue Riddle:**
> *"Nyaa~ The bamboo whispers today! They say a hidden house appears for cats who explore... I saw something shiny glinting near the old torii gate!"*

> **Riddle meaning:** The bamboo "whispers" — hinting that something is hidden. The shiny object near the torii gate is the **Antique Key** that unlocks the secret Tea House.

**Task:** No formal quest — provides a **hint** about the Antique Key location

**Rewards:** +5 XP (first meeting friend bonus), +15 XP (greeting)

---

#### 3. Kuro — The River Guardian Cat

| Property | Detail |
|----------|--------|
| **Location** | Near the river (position -14, 0, 24) |
| **Personality** | Quiet, cryptic, speaks in metaphor |

**Dialogue Riddle:**
> *"...You walk quietly. Good. The river keeps old secrets, little one. Follow the red shrine gates when the mist rolls in."*

> **Riddle meaning:** References "old secrets" kept by the river — this is a hint toward future content (the Fushimi Inari shrine expansion). The "red shrine gates" are the torii gates, which don't exist yet in the current alpha but are planned.

**Task:** No formal quest — provides atmospheric dialogue and hints

**Rewards:** +5 XP (first meeting), +15 XP (greeting)

---

## 📋 Complete Task Challenges List (Currently Implemented)

| # | Challenge | XP Reward | Unlock/Reward |
|---|-----------|-----------|---------------|
| 1 | **Luna's Yarn Hunt** — Collect 3 yarn balls | +50 (quest) + 10 ea (collection) | Jump Boost ability |
| 2 | **Find the Antique Key** — Hidden near bamboo shrine | +40 | Unlocks Tea House |
| 3 | **Unlock the Tea House** — Use key on machiya door | +20 | Access to interior |
| 4 | **Eat Grilled Sea Bream** — At chabudai table inside | +30 | 40s speed boost (+35% speed) |
| 5 | **Cozy Nap** — On red zabuton cushion | +50 | Advances time by 4 hours |
| 6 | **Inspect Bird's Nest** — Climb to rooftop nest | +60 | Guardian's Feather trophy |
| 7 | **Turtle Corral Challenge** — Draw Larry away, claim Jade Paw | +75 | Fence Walking ability |
| 8 | **Ring the Shrine Bell** — At the shrine | +10 | — |
| 9 | **Golden Dango Charm** — Under the bridge (in water) | +50 | 20s speed buff |
| 10 | **Paw at Koi** — In the river | +5 | — |
| 11 | **Drink Fresh Water** — At riverbank | +2 | — |
| 12 | **Bat Yarn Balls** — Knock yarn around | (mood boost) | — |

---

## 📋 Planned/Future NPC Quests (from FUTURE_QUESTS.md)

| # | NPC | Quest | Task | Riddle/Dialogue | Rewards |
|---|-----|-------|------|-----------------|---------|
| 13 | **Bokuchi (木地)** | "The Bamboo Whisper" | Collect 5 Offering Bells in forest | Speaks in riddles as forest spirit | +120 XP, Wind Whisper ability, Forest Spirit badge |
| 14 | **Inari (稲荷)** | "The Thousand Torii" | Count/touch 50 torii gates, find hidden altar | *"The foxes run between cities. Follow the iron snake..."* | +150 XP, Fox Charm, Inari & Kitsune badges |
| 15 | **Kitsune (狐)** | (Inari's companion) | Hints and guidance | Young, energetic, curious | — |
| 16 | **Eki (駅)** | "The Station Cat" | Obtain Shinkansen Ticket | Train metaphors | Unlocks bullet train sequence |
| 17 | **Sumi (墨)** | Parade Float quest | Painting/decoration tasks | Old, artistic, gentle | Parade float construction |
| 18 | **Nori (海菜)** | Material trader | Trade yarn for materials | Cheerful, business-minded | Materials for float |
| 19 | **Tetsu (鉄)** | Bell shop quest | Befriend with Fish Treat (3 visits) | Grumpy, softens with food | Golden Bell |
| 20 | **Nuno (布)** | Fabric shop quest | Sit quietly for 10s (patience test) | Shy, hides from strangers | Silk Ribbon |

### Additional Future Quest Challenges

| # | Quest | Type | XP | Rewards |
|---|-------|------|-----|---------|
| 21 | **The Forest Chase** | Chase scene with guardian | +80 | Guardian's Bell, meditation spot |
| 22 | **The Rainstorm Shelter** | Find shelter during rain | +50 | Rain Friend badge |
| 23 | **The Rooftop Garden** | Restore abandoned garden | +200 | Garden Keeper badge, Cat Haven fast-travel |
| 24 | **The Neon Chase** | Akihabara rooftop parkour | +150 | Electric Star item, Akihabara viewpoint |
| 25 | **The Ferry Cat** | 60-second ferry ride | +30 | Ferry Pass, new area access |
| 26 | **The Origami Trail** | Collect 12 origami cranes | +180 | Paper Crane collar charm |
| 27 | **The Midnight Cat Meeting** | Join cat circle at midnight | +120 | Cat Council badge, +10 all NPC relationships |
| 28 | **Parade Float Quest** (4 steps) | Multi-step crafting quest | +250 +300 +500 | Festival Guardian title, credits, New Game+ |


---

## 🏁 Ending / Total Completion Reward

### Currently Implemented (Alpha)

- **No traditional ending** — the current alpha is a pure exploration game with no story conclusion
- **Progression Ranks:**

| Rank | XP Required | Unlocks |
|------|-------------|---------|
| Kitten | 0 | Walk, jump |
| Curious Cat | 30 | Sprint (1.7x speed) |
| Backyard Explorer | 80 | Jump Boost (force 8.5) |
| Rooftop Wanderer | 150 | Speed Up (5.5 base, 1.9x sprint) |
| City Legend | 250 | Master Cat mode |

- **Torii Gate Completion Message** (highest current content): When you reach the top of the torii gate at Rank 4:
  > *"I can see beyond this valley, I wonder what's out there?"*
  This is the closest thing to a "completion" moment in the current alpha — it hints at the Tokyo expansion that's planned.

### Planned (Future) — Full Ending

- **The Parade Sequence** is the planned ending:
  1. **Gather Materials** — Collect Fox Charm, Golden Bell, Silk Ribbon, Cherry Wood (+250 XP)
  2. **The Festival Eve** — Bless the giant float with your meow (+300 XP, Festival Guardian title)
  3. **The Parade** — Walk alongside the float through Asakusa streets (+500 XP, **Parade Hero** achievement)
  4. **Credits roll** after the parade
  5. **New Game+ unlocks** — with alternate dialogue paths, challenge modes, and skipped familiar content

- **Total Playtime Estimates (Future):**
  - Casual Completion (Ranks 1-4): 3-4 hours
  - Full Progression (Ranks 1-6): 6-8 hours
  - Completionist (100%): 10-12 hours
  - Speedrun: 1.5-2 hours
  - New Game+: 4-6 hours

### Key Takeaway

In the **current alpha**, there is **no ending or total completion reward** — the game is a peaceful exploration loop with no story conclusion. The planned ending is the **Parade Sequence** in Tokyo (Act III), which culminates in credits and New Game+ unlock. The "total completion" in the current build is reaching **City Legend rank (250 XP)** and seeing the torii gate message.

---

## 🔍 Riddle Meanings Summary

| NPC | Riddle/Dialogue | Meaning |
|-----|-----------------|---------|
| **Luna** | *"This valley is full of secrets... and yarn."* | Collect 3 yarn balls; "secrets" foreshadows hidden collectibles |
| **Mochi** | *"The bamboo whispers... shiny glinting near the torii gate."* | Bamboo "whispers" = something hidden; shiny object = Antique Key |
| **Kuro** | *"The river keeps old secrets... follow the red shrine gates."* | Hints at future shrine/torii content; "old secrets" = unexplored areas |
| **Bokuchi** (future) | Forest spirit riddles about offerings and wind | Collect 5 Offering Bells in the bamboo forest |
| **Inari** (future) | *"The foxes run between cities. Follow the iron snake..."* | Count 50 torii gates, find hidden altar behind one gate |

---

## 📁 Source Files Referenced

| File | Purpose |
|------|---------|
| `QUICKSTART.md` | Game overview, progression system, XP tables |
| `FUTURE_QUESTS.md` | Planned quests, NPC dialogues, ending sequence |
| `PROGRESSION_FLOW.txt` | Progression triggers, rank conditions, endgame design |
| `src/main.js` | Game logic, NPC positions, quest initialization, XP rewards |
| `src/context_actions.js` | Interactive object actions, dialogue triggers, item collection |
| `src/progression.js` | Rank system, XP tracking, level thresholds |
| `src/countryside.js` | World/map definitions, object placements |

---

*Generated from comprehensive codebase analysis of Michi Neko: The Cat Philosopher's Path*

