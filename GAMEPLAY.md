# Cat City FPS - Gameplay Design

## Executive Summary

Cat City is an exploration-focused first-person adventure game where players experience the city from a cat's perspective. The core gameplay loop emphasizes discovery, interaction, and environmental storytelling rather than combat or time pressure. Success is measured by exploration completeness, NPC relationships, and achievement collection.

**Core Pillars:**
1. **Exploration:** Dynamic city encourages wandering and discovery
2. **Interaction:** Physics-based object interactions (knockable items, climbable surfaces)
3. **Progression:** Area unlocks through story progression and skill upgrades
4. **Discovery:** Findable items, hidden areas, collectibles, lore

---

## 1. Core Movement Mechanics

### 1.1 Locomotion

**Primary Movement:**
- **Walk:** WASD / Arrow keys (5 m/s)
- **Sprint:** Hold Shift (10 m/s, 2x multiplier)
- **Jump:** Space bar (0.5s hang time)
- **Climb:** Hold W on climbable surfaces (special animation)

**Movement Characteristics (Cat-Appropriate):**
- Lower center of gravity than human FPS
- Faster acceleration (cats are nimble)
- Shorter jump distance but better control mid-air
- Quiet footsteps (stealth potential in future)
- Low camera height affects perspective and collision awareness

### 1.2 Physics Parameters

| Parameter | Value | Justification |
|-----------|-------|---------------|
| Walk speed | 5 m/s | ~1.2m cat length × 4.2 body lengths/sec |
| Sprint speed | 10 m/s | Natural cat burst speed |
| Jump height | ~1m | Cat typical jump: 1-1.5m |
| Jump time | 0.5s | Apex hang time |
| Fall damage | None (yet) | Cats always land safely (9 lives?) |
| Climb speed | 2.5 m/s | Intentionally slow for challenge |

### 1.3 Advanced Movement (Future)

**Planned Mechanics:**
- Double-jump: Unlock in progression
- Wall-slide: Slide down vertical surfaces
- Pounce: Short burst movement + attack direction
- Tail-assisted balance: Reduce fall damage at high speeds
- Swimming: Water interaction in future areas

---

## 2. Interaction Systems

### 2.1 Object Interactions

**Knockable Objects (Primary Interaction Type)**
- Found throughout city: vases, bottles, cans, papers, cushions
- Mechanics:
  - Walk into them: Transfer momentum → object moves
  - Jump on them: Extra force + landing sound effect
  - Physics: Objects continue rolling/sliding until friction stops them
  - Audio: Satisfying impact sounds (glass, ceramic, wood)
- Player motivation: Satisfying feedback, discovering hidden areas/items

**Climbable Surfaces**
- Trees, fences, building ledges, poles, chain-link fences
- Detection: Raycast from player to surface
- Interaction: Hold W to climb, S to descend, Jump to drop off
- Challenges: Climbable surface placement creates vertical exploration puzzles
- Rewards: Vantage points, secret areas, shortcut routes

**Interactive Doors & Windows**
- Doors: Automatically open on approach, close after delay
- Windows: Look through for NPC peek-a-boo interactions
- Decoration: Show NPC routines (cat in window, working at computer)
- Future: Breakable windows for dramatic entrance

**Vehicle Interactions**
- Parked cars: Can walk on roof, peer through windows
- Motorcycles/bikes: Jump on and balance (future mechanic)
- Future: Ridable vehicles for rapid traversal

**Environmental Puzzles**
- Levers/switches: Knock over to trigger door/light (future)
- Stacked objects: Climb over to reach high areas
- Floating platforms: Use furniture as stepping stones

### 2.2 NPC Interactions

**Proximity-Based Interaction**
- Approach within 2m to see interaction prompt (E key)
- Multiple interaction types:
  - **Talk:** Hear voiced lines, learn about NPC personality
  - **Pet:** Physical touch animation, NPC pleasure sounds
  - **Trade:** Exchange items (if collected any)
  - **Play:** Interactive games (future: string toy chase)

**NPC Types & Interaction Depth**

| NPC Type | Interaction Style | Example |
|----------|------------------|---------|
| Other cats | Play, social behaviors | Chase, pouncing, grooming |
| Humans | Observation, minimal touch | Observe routines, they react to you |
| Dogs | Evasion, cautious approach | Avoid, or lead them on wild chases |
| Birds | Chase/observation | Interactive sky pursuit (future) |

**Relationship System**
- Track relationship with each major NPC
- Friendly → Neutral → Antagonistic progression
- Relationships affect: NPC location choice, behavior, dialogue
- Player actions: Petting, playing, helping = increase relationship
- Blocking path, stealing food = decrease relationship

---

## 3. Gameplay Loop

### 3.1 Core Loop (60-second cycle)

```
1. OBSERVE: Player explores environment, spots interesting objects/NPCs
2. INTERACT: Player engages with world (knock objects, pet cats, enter buildings)
3. DISCOVER: Uncover collectibles, secret areas, NPC routines
4. PROGRESS: Earn achievement, unlock new areas, build relationships
5. REPEAT: Loop drives continuous engagement
```

### 3.2 Play Session Structure

**Short Session (15-30 minutes):**
- Explore 1-2 districts
- Interact with 5-10 NPCs
- Collect 3-5 items
- Solve 2-3 environmental puzzles

**Medium Session (1 hour):**
- Complete one neighborhood thoroughly
- Max out relationships with 3-5 NPCs
- Unlock 1 new area
- Complete 1-2 story sequences

**Long Session (2+ hours):**
- Explore 50%+ of city
- Complete major story arc
- Collect diverse item set (unlocks perks)
- Discover hidden cat cafe or secret rooftop village

### 3.3 Progression Triggers

**Area Unlocks:**
- Default: Overworld city accessible from start
- Locked areas: Behind doors requiring items/relationships
- Example: "Gain trust of ginger cat → He shows you hidden alley"

**Skill Unlocks:**
- **Sprint:** 5 minutes gameplay (natural unlock)
- **Double-jump:** Collect 5 yarn balls
- **Climb faster:** Reach top of 3 buildings
- **Meow louder:** Interact with 20 NPCs
- **Night vision:** Collect all hidden night vision goggles (quest)

**Story Progression:**
- Linear story beats unlocked by exploration
- Narrative: "Lost in city, find home" with side quests
- Key moments: Meet cat mentor, discover cat cafe, reunion

---

## 4. Collectibles & Progression

### 4.1 Collectible Types

**Yarn Balls (Primary Collectible)**
- Hidden throughout city (100+ total)
- Purpose: Measure exploration completion, unlock perks
- Display: Collected yarn balls shown in inventory
- Unlock thresholds: 10, 25, 50, 100 (special achievements)

**Fish Treats (Special Items)**
- Less common (20-30 total)
- Heal stamina when consumed (future mechanic)
- Trade for NPC information

**Memories (Story Items)**
- Found photos, diary pages, letters
- Trigger story dialogue when collected
- Unlock lore/world-building details

**Achievement Badges (Virtual)**
- Earned for milestones: "First Climb", "100 Knockovers", "City Explorer"
- Displayed in inventory
- Cosmetic but satisfying

### 4.2 Inventory System

**Current State:** Minimal (just tracking collectibles)
**Future:** Full inventory with:
- Equippable items (collars, bells, glasses)
- Consumables (fish treats, catnip)
- Quest items (keys, messages)
- Cosmetics (hat, collar patterns)

**UI Representation:**
- HUD shows: Yarn balls collected / total
- Detailed inventory: Press I to open full menu
- Item descriptions: Short flavor text on hover

---

## 5. NPC System & Behavior

### 5.1 NPC Population

**Planned NPC Count:**
- Major NPCs (named, recurring): 10-15
- Minor NPCs (unique, scattered): 30-50
- Background NPCs (crowd, less interactive): 50+

**Major NPCs (Examples):**
- **Orange Tom:** Streetwise tomcat, teaches survival skills
- **Whiskers:** Shy indoor cat, hides in library, loves books
- **Luna:** Night-active cat, rooftop parkour specialist
- **Princess:** Pampered house cat, fashion-focused
- **Mittens:** Kitten, always getting into trouble, needs rescuing (quests)

### 5.2 NPC Daily Routines

**Schedule System:**
Each NPC has a daily routine (6 AM - 10 PM):

```
Orange Tom:
  6-8 AM: Sleeping in alley
  8-10 AM: Breakfast at cafe (eats from bins)
  10 AM-4 PM: Patrol streets, socialize
  4-6 PM: Nap in park
  6-8 PM: Hunt/play
  8-10 PM: Return to alley
```

**Player Interaction Consequence:**
- Meet NPC during their routine for natural interaction
- Interrupt routine for memorable moments
- Watch routines to understand NPC personality

### 5.3 Behavior Tree Example: Orange Tom

```
ROOT: Orange Tom Behavior
├─ CHECK: Time of day?
│  ├─ Morning (6-8): SleepInAlley
│  ├─ Morning (8-10): EatAtCafe
│  ├─ Day (10-4): PatrolStreets
│  ├─ Afternoon (4-6): Nap
│  └─ Evening (6-10): Play/Hunt
│
├─ CHECK: Player nearby? (<5m)
│  ├─ IF hostile mood: AvoidPlayer, Hiss
│  ├─ IF neutral: WatchPlayer, CallOut
│  └─ IF friendly: Approach, Purr, Interact
│
└─ CHECK: Environment event?
   ├─ Rain: Seek shelter
   ├─ Food available: Eat
   └─ Other cat nearby: Social interaction
```

### 5.4 Relationship & Dialogue System

**Relationship Levels:**
1. Unknown (0-10 interactions)
2. Acquainted (10-25)
3. Friend (25-50)
4. Close Friend (50+)

**Dialogue Evolution:**
- **Unknown:** "..."  (simple meow)
- **Acquainted:** "Hi there!" (basic greeting)
- **Friend:** "Good to see you! Have you heard..." (gossiping)
- **Close Friend:** "You're my best friend!" (emotional depth)

**Trust-Based Unlocks:**
- Friends: Share location of secret areas
- Close Friends: Teach special movement tricks
- Can request help in future quests

---

## 6. Progression Path

### 6.1 Story Arc (20-30 hours to complete)

**Act 1: Lost (Hours 1-8)**
- Wake up in unknown city
- Meet Orange Tom (mentor figure)
- Learn basic movement and interaction
- Goal: Explore 25% of city, understand NPC system

**Act 2: Discovery (Hours 8-18)**
- Uncover hidden cat cafe (secret NPC hub)
- Gather allies for major objective
- Encounter antagonistic forces (dog packs, unfriendly humans)
- Goal: Explore 60% of city, max out 5 NPC relationships

**Act 3: Resolution (Hours 18-25)**
- Plan and execute infiltration mission (climax)
- Rescue trapped kittens or recover stolen artifacts
- Return home (if starting location is home) or find new home
- Celebration with NPC community
- Goal: Reach 100% exploration, collect rare items

### 6.2 Optional Content & Replayability

**Side Quests (Post-Game):**
- Rescue 5 trapped kittens (scattered throughout city)
- Collect all 100 yarn balls (unlocks special ending)
- Achieve perfect NPC relationship scores (5 stars with all NPCs)
- Speed-run challenges (complete story in <2 hours)

**New Game+ Content:**
- New NPC locations
- Different story dialogue (acknowledges previous playthrough)
- Harder challenges, more aggressive animals
- Cosmetic reward: Cat skin variant or collar

---

## 7. Difficulty & Accessibility

### 7.1 Difficulty Modes

**Peaceful Mode (Default):**
- No fall damage
- No enemy cats
- Reduced dog aggression
- Focus: Exploration and discovery
- Playstyle: Relaxing, no time pressure

**Normal Mode:**
- Fall damage if jump from >2m height
- Some antagonistic NPCs
- Dog avoidance puzzles
- Stamina mechanic (limits sprint duration)

**Hard Mode:**
- Full fall damage
- Aggressive enemies
- Stamina drains quickly
- Permadeath option
- Reward: Special cosmetics/achievements

### 7.2 Accessibility Features

- **Colorblind modes:** Deuteranopia, Protanopia, Tritanopia
- **Audio cues:** All visual information has audio alternative
- **Remappable controls:** Full input rebinding
- **Subtitles:** All NPC dialogue has text
- **FOV slider:** Adjust field of view (60-100 degrees)
- **Motion sickness options:**
  - Disable head bob
  - Vignette effect during fast movement
  - Max FOV change per frame

---

## 8. Player Motivations & Engagement

### 8.1 Primary Motivations

1. **Exploration:** "What's over that hill?"
2. **Curiosity:** "What does this NPC want?"
3. **Mastery:** "Can I reach that roof?"
4. **Social:** "Can I make friends with this cat?"
5. **Narrative:** "What happened to the lost kittens?"

### 8.2 Engagement Mechanics

**Short-term (Session):**
- Immediate feedback: Knockovers, NPC reactions
- Quick wins: Collectibles, achievements
- Surprises: Unexpected NPC encounters, hidden areas

**Medium-term (Days):**
- Progression milestones: Skill unlocks every 2-3 hours
- NPC relationship growth: Visible changes in behavior
- Story developments: New quests available

**Long-term (Weeks):**
- Completion metrics: % explored, % collected
- Leaderboards (optional): Speed-run times
- New Game+: Extended content after completion

---

## 9. Target Audience

**Primary:** 
- Age 8-40
- Casual to mid-core gamers
- Cat lovers (obvious)
- Exploration game fans (Outer Wilds, Journey, Gris)

**Platform:** Browser-based → accessible, no installation

**Session Length:** 15min-2 hour sessions (flexible playstyle)

---

## 10. Gameplay Validation Checklist

- [x] Core movement mechanics defined (walk, sprint, jump, climb)
- [x] Physics parameters realistic for cat perspective
- [x] Interaction systems (objects, NPCs, environment) documented
- [x] Gameplay loop engaging and understandable
- [x] Progression system clear (areas, skills, story)
- [x] Collectibles provide meaningful progression
- [x] NPC system with behavior trees outlined
- [x] Difficulty accessibility options addressed
- [x] Motivation systems (short/medium/long-term) designed
- [x] Target audience and session length identified
- [x] Replayability (side quests, NG+) considered
- [x] Advanced mechanics (future) listed

---

## Next Phase: Implementation

**Week 1:** Core movement and jumping
**Week 2:** Object knockover physics
**Week 3:** NPC spawning and basic interaction
**Week 4:** Collectible system and inventory
**Week 5:** Relationship system and dialogue
**Week 6:** Area progression and locking
**Week 7:** Story implementation and sequences
**Week 8:** Polish, tuning, and edge case handling

