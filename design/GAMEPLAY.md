# Cat Walk: First-Person Cat Game - Gameplay Mechanics

**Version:** 1.0  
**Date:** 2026-07-10  
**Target Platform:** ThreeJS (RPi 5, Desktop)  
**Perspective:** First-Person (Cat-height, ~20cm from ground)  

---

## 1. CAT MOVEMENT & PHYSICS

### 1.1 Core Movement System

#### Walking Mechanics
- **Speed:** 3-4 m/s (realistic cat pace)
- **Acceleration:** Smooth ramping over 0.3 seconds
- **Ground Friction:** Dynamic based on terrain type
  - Grass: Normal (1.0x)
  - Concrete: Slippery (1.2x speed, 0.8x control)
  - Carpet/Fabric: Sticky (0.9x speed, 1.2x control)
  - Ice/Wet: Very slippery (1.5x speed, 0.5x control)
- **First-Person View:** Camera position from cat eye height, offset slightly forward for natural perspective
- **Head Bobbing:** Subtle sinusoidal motion (amplitude: 0.02m, frequency: 4Hz when walking, disabled when idle)

#### Running Mechanics
- **Speed:** 6-7 m/s (burst speed)
- **Stamina System:**
  - Stamina pool: 100 points
  - Running costs: 20 points/sec
  - Recovery: 15 points/sec while walking or idle
  - Below 20% stamina: Speed caps at 5 m/s (automatic slow to trot)
- **Sprint Duration:** Max 5 seconds at full speed before exhaustion
- **Acceleration to Run:** Smooth transition, player must hold "run" input

#### Jumping Mechanics
- **Jump Height:** 0.8-1.2m (realistic for 20cm-tall cat)
- **Jump Distance:** 1.5-2.5m horizontal
- **Airtime:** 0.6-0.8 seconds
- **Hang Time:** Slight delay at apex (psychological feedback)
- **Stamina Cost:** 10 points per jump
- **Cooldown:** 0.3 seconds between consecutive jumps
- **Physics:**
  - Gravity: 9.8 m/s² (earth-standard, scaled for cat perspective)
  - Velocity preservation: Horizontal momentum preserved during jump
  - Coyote time: 0.1 seconds of grace period after leaving ledge (allows mid-air jump)
  - Double-jump unlock: Available after "Agility II" skill

### 1.2 Tail Physics

#### Tail Simulation Options (Player Config)
1. **Simple Tail (Performance Mode)**
   - IK-based, 4 bones
   - Follows player orientation with 0.2s lag
   - No wind interaction
   - 2 vertices per frame
   - Recommended for: RPi 5, low-end hardware

2. **Standard Tail (Balanced Mode)**
   - Physics-based, 8 bones
   - Gravity and momentum affect tail angle
   - Slight wind resistance
   - Swings outward during turns (inertia)
   - Reduces motion during walk, increases during run
   - ~200 vertices per frame
   - Recommended for: Desktop, target 60 FPS

3. **Advanced Tail (Ultra Mode)**
   - Full soft-body dynamics, 12+ bones
   - Per-frame physics simulation
   - Wind interaction
   - Collision with environment
   - Cloth simulation
   - Hair shader with movement
   - ~500+ vertices per frame
   - Recommended for: High-end systems only

#### Tail Interactions
- **Emotional State Visible:** Tail position reflects happiness/fear/curiosity
  - Happy: Upright, slight wave (0.1Hz)
  - Curious: Alert, twitching (0.3Hz small movements)
  - Stressed: Low, tucked, trembling
  - Hunting: Rigid, low, focused twitch
- **Control:** Player can manually position tail with Alt+Mouse for photo mode

### 1.3 Vocalization System

#### Meow Mechanics
- **Vocalization Types:**
  - Meow: Standard friendly greeting (pitch varies by emotion)
  - Purr: Idle/content state, continuous (disabled during movement)
  - Hiss: Fear/threat response (automatic when scared)
  - Yowl: Hunting/excited state, high pitch
  - Chatter: Prey-focused, teeth-chattering sound

- **Input System:**
  - Press M: Play meow (context-sensitive pitch based on emotion)
  - Hold M: Sustained yowl (stamina cost 5 points/sec)
  - M + Direction: Directional call (affects NPC response)
  
- **Frequency Control:**
  - Meowing too much: NPCs find it annoying (relationship -2 per excess meow)
  - Strategic meowing: Attracts friendly NPCs, calls other cats
  - Silent movement: Stealth meowing (no sound) costs 5 stamina

#### Audio Implementation
- **Sample Bank:**
  - 5 base meow samples (pitch-shifted variations)
  - 3 purr loops (adjustable volume)
  - 2 hiss variants (short/long)
  - 1 yowl sample (extended)
  - 1 chatter loop
  
- **3D Audio:** Positioned in world space, audible up to 15 meters
- **Attenuation:** Distance-based volume falloff
- **Echo:** Indoor spaces add reverb effect

### 1.4 Grooming & Idle Animations

#### Idle System
- **Idle Timeout:** 5 seconds without input triggers idle state
- **Grooming Animations (random rotation):**
  - Paw grooming face: 3 seconds (10%)
  - Licking paw: 2 seconds (15%)
  - Stretching: 2.5 seconds (20%)
  - Sitting down: 5 seconds (25%)
  - Looking around: 3 seconds (30%)

#### Grooming Mechanics
- **Manual Grooming:** Press G to groom (2 seconds, restores 5% health, costs 2 stamina)
- **Auto-Grooming:** When muddy/wet (happens automatically over 30 seconds)
- **Cleanliness Stat:**
  - Max: 100%
  - Decays: 2% per minute in rain/mud
  - Restored: 5% per grooming action
  - Effect on speed: Below 50% cleanliness = -10% movement speed
  - Effect on NPC reactions: Dirty cats receive -relationship modifier

#### Sitting & Resting
- **Press SPACE while standing:** Sit down (idle animation)
- **Hold SPACE for 3+ seconds:** Full rest (regain stamina at 2x rate)
- **Interaction radius while sitting:** Can still look around, talk to NPCs
- **Standing from sit:** 0.5 second transition

### 1.5 Terrain Interaction & Climbing

#### Terrain Types
| Terrain | Walk Speed | Traction | Climb | Notes |
|---------|-----------|----------|-------|-------|
| Grass | 1.0x | High | No | Soft, natural |
| Concrete | 1.2x | Medium | No | Slippery |
| Dirt/Gravel | 0.95x | Medium | No | Rough |
| Carpet | 0.9x | High | No | Soft |
| Metal (grates) | 1.1x | Low | Yes | Dangerous in rain |
| Wood (fences) | 0.8x | High | Yes | Good grip |
| Brick/Stone walls | 0.6x | Medium | Yes | Difficult angles |

#### Climbing System
- **Climbable Surfaces:** Trees, fences, buildings, cliff faces (marked with ~climbable shader)
- **Climb Speed:** 1.5 m/s (slower than walk)
- **Stamina Cost:** 15 points/sec (high cost)
- **Technique:**
  1. Jump toward surface
  2. Hold Alt to grab on
  3. Use W/A/S/D to move along surface
  4. Mouse controls head direction only (can't turn torso)
  5. Press Space to jump off (away from surface)

- **Climb Mechanics:**
  - Three-point contact required (can't hold on with 1-2 limbs)
  - Stamina depletes constantly while climbing
  - Below 20% stamina while climbing: Auto-release (fall)
  - Claw grip strength varies by surface type
  - Rain reduces grip (stamina cost +25%)
  - Wet surfaces: Only 50% grip strength

- **Climb Progression Unlocks:**
  - **Level 1 (Start):** Wood fences, low trees
  - **Level 2 (Agility I):** Brick walls, higher branches
  - **Level 3 (Agility II):** Metal pipes, steep surfaces
  - **Level 4 (Master Climber):** Any surface, 20% faster, reduced stamina

#### Ledge & Jump Interactions
- **Auto-Ledge Grab:** Jump toward ledge within 30 degrees: Auto-grab (no stamina cost)
- **Ledge Walk:** Walk along narrow surfaces (< 0.5m wide) with balance mechanic
  - Balance requires precise center-of-weight
  - Stray > 0.25m from center: Fall
  - Tail helps balance (+20% margin with tail)
- **Parkour Elements:**
  - Vault over low objects (< 0.8m): Press Spacebar while jumping at object
  - Wall-run: Jump at wall at angle, maintain jump input to slide down
  - Corner-swing: Jump into corner, hold Alt to swing around it

---

## 2. INTERACTION SYSTEMS

### 2.1 Knockable Objects

#### Object Types & Physics

**Category 1: Light Objects (Mass: 0.1-0.5 kg)**
- Papers, small balls, toy mice
- Knock distance: 2-4m
- Sound: Light shuffle, soft impact
- Behavior: Slide & stop (no bouncing)
- Pushable: Yes, slow push mechanic

**Category 2: Medium Objects (Mass: 0.5-2 kg)**
- Coffee mugs, vases, small boxes
- Knock distance: 1.5-3m
- Sound: Soft thud or ceramic break
- Behavior: Roll or slide with momentum
- Pushable: Yes, can push up slopes
- Breaking: Glass objects shatter (visual/audio feedback)

**Category 3: Heavy Objects (Mass: 2-10 kg)**
- Trash cans, vases (large), chairs
- Knock distance: 0.5-2m
- Sound: Deep thud, possible structure damage
- Behavior: Tip over or slight roll
- Pushable: Limited (needs running start)
- Destruction: Can knock into NPCs (relationship damage)

**Category 4: Fixed Objects (Mass: >10 kg)**
- Furniture, doors, large containers
- Knock effect: Small movement/sound only
- Sound: Resonant impact
- Behavior: No movement
- Alternative: Can interact (open, push)

#### Knockable Object Mechanics
- **Knockable Detection:** Visual indicator shows for interactable objects (subtle aura in UI)
- **Interaction:** Walk/run into object or press E+direction
- **Physics Response:**
  - Momentum = (PlayerMass × PlayerSpeed) × (1 / ObjectMass)
  - Direction = Player velocity + slight randomization
  - Angular velocity: Based on hit location (off-center hits spin object)
  - Friction: Surface friction slows object over 1-5 seconds
  
- **Environmental Feedback:**
  - Knocked over vase: Ceramic sound, object breaks into pieces
  - Scattered papers: Individual physics for each sheet
  - Pushed trash: Trash scatters around
  - Knocked furniture: Thud sound, possible human NPC alarm

#### Satisfaction Mechanics
- **Satisfaction Meter:** Tracks knockable behavior
  - Each object knocked: +5 satisfaction
  - Satisfaction cap: 100 points
  - Effects: Above 50% = happy tail (visual feedback)
  - Usage: Unlocks "Chaos" challenge modes

### 2.2 Physics Feedback System

#### Real-Time Physics
- **Collision Response:** Visual deformation on impact (objects slightly compress)
- **Weight Simulation:** Heavy objects harder to knock, light objects fly farther
- **Momentum Transfer:** Objects maintain velocity until friction stops them
- **Sound Design:**
  - Material-dependent: Wood sounds different from ceramic
  - Velocity-dependent: Faster knockes produce louder sounds
  - Echo: Indoor spaces add reverb
  - Distance attenuation: Quiet at far distances

#### Physics Debugging (Dev Mode)
- Press F3: Show collision geometry
- Press F4: Show physics vectors
- Toggle wireframe: Show bounding boxes

### 2.3 Climbing Structures

#### Tree Climbing
- **Interaction:** Jump at trunk, hold Alt to grip
- **Climbable Paths:** Marked with invisible climbing assists
- **Branches:** Perches for resting (reduce stamina cost)
- **Canopy:** Top provides vantage point for exploration
- **Dynamic:** Trees sway slightly in wind

#### Fence Climbing
- **Types:** 
  - Wooden: Easy grip, slow climb
  - Metal: Slippery, requires skill unlock
  - Chain-link: Medium grip, easy to see through
- **Top Traversal:** Can walk on top of fences (balance mechanic)
- **Through-gaps:** Small gaps allow passing through

#### Building Climbing
- **Walls:** Textured surfaces provide grip points
- **Ledges:** Roofs, window ledges for resting
- **Downspouts/Pipes:** Climbable paths on building exteriors
- **Locked Zones:** Some roofs inaccessible until unlocked
- **Perspective:** Climbing high gives expansive city views

#### Urban Features
- **Poles:** Slide down quickly, jump off at any height
- **Vines:** Climbable but unstable (risk of fall)
- **Scaffolding:** Complex climbing paths with hidden shortcuts
- **Cables:** Tightrope walking (high skill, high reward)

### 2.4 Door & Window Interactions

#### Door Mechanics
- **Door Types:**
  1. Push-doors: Walk into from right side, auto-open
  2. Pull-doors: Walk into from left side, auto-open
  3. Cat-doors: Automatic pass-through
  4. Locked-doors: Blocked (visual indicator)
  5. Windowsills: Jump through (no collision)

- **Interaction:**
  - Proximity detection: Door highlights when within 2m
  - Auto-trigger: Walk through doorway (0.5s transition)
  - Manual open: Press E to open before entering
  
- **Level Transitions:**
  - Interior/exterior: Full scene swap
  - Loading: Short fade effect (0.3s)
  - Music: Cross-fade between interior/exterior tracks

#### Window Interactions
- **Window Types:**
  1. Open windows: Can jump through (no collision)
  2. Closed windows: Reflection render, can't pass
  3. Window sills: Can stand on ledge, look inside
  4. Glass panes: Can see through, interact with interior NPCs
  
- **Mechanics:**
  - Jump toward window to perch on sill
  - Can meow through glass (interior NPCs hear)
  - Can tap glass to get attention (relationship +1)
  - Breaking glass: High impact can shatter windows

### 2.5 Vehicle Interactions

#### Car Interactions
- **Approach:** Walk near parked car (proximity trigger)
- **Behaviors:**
  1. **Sit on hood:** Jump onto car, stay there indefinitely (good hiding spot)
  2. **Sit on roof:** Highest perch, great views, can't climb down directly
  3. **Follow car:** If car starts moving, ride on roof (mini-game to stay on)
  4. **Under car:** Shelter from rain, hiding spot
  
- **Mini-Game: Car Riding**
  - Car acceleration: Player must adjust for momentum
  - Turning: Player must shift weight (use mouse)
  - Physics: Fall off if physics get too rough
  - Reward: +10 relationship with car owner (if they see you, +5)
  - Risk: +15 fear if siren/horn activated nearby

#### Other Vehicles
- **Bicycles:** Can't sit on (moves), but can interact with wheels
- **Scooters:** Similar to bikes
- **Motorcycles:** Can sit on when parked
- **Trucks:** Large surfaces, good for climbing

#### Vehicle Physics
- **Collision:** If car hits player, knockback effect (damage dependent on speed)
- **Safety:** NPCs will honk/brake to avoid you
- **Sound:** Engine sounds provide audio feedback when near vehicles

---

## 3. GAMEPLAY LOOP

### 3.1 Core Loop: Exploration

**5-Second Loop (Micro):**
1. Player moves through environment
2. Discovers nearby objects/NPCs/areas
3. Interacts (knock, talk, climb)
4. Observes feedback (sound, visual)
5. Plans next action

**2-Minute Loop (Standard):**
1. Explore new neighborhood section
2. Find 3-5 new objects to interact with
3. Encounter 1-2 NPCs
4. Complete small discovery (unlock area, collect item)
5. Decide: Continue exploring or return home

**10-Minute Loop (Extended):**
1. Quest objective: Reach location or find item
2. Navigate obstacles: Climb, jump, knock objects
3. Social interaction: Talk to NPCs, build relationships
4. Exploration bonus: Find hidden areas
5. Return to quest-giver or home for reward

### 3.2 Objectives System

#### Objective Types

**Discovery Objectives**
- "Find the pink house on Maple Street"
- "Discover 5 new neighborhoods"
- "Reach the highest roof in downtown"
- **Reward:** New area unlock, +50 XP, visual marker placed

**Collection Objectives**
- "Find 3 fish treats hidden in the garden"
- "Collect 10 yarn balls for your friend"
- "Gather 5 feathers for crafting"
- **Reward:** Collectible obtained, +25 XP per item

**Social Objectives**
- "Talk to Luna (orange cat) in the park"
- "Help 3 NPCs with small tasks"
- "Achieve friendly relationship with 5 NPCs"
- **Reward:** New friend, +relationship, unlock interaction dialogue

**Challenge Objectives**
- "Knock over 10 vases without breaking any"
- "Climb the downtown buildings without falling"
- "Run across the entire neighborhood in under 3 minutes"
- **Reward:** Badge, +100 XP, unlock challenge mode

#### Objective Tracking
- **Active Objectives:** Max 3 at once (UI shows markers)
- **Quest Log:** Full history of completed/available quests
- **Markers:** Yellow (standard), Blue (story), Red (timed), Purple (challenge)
- **Progress:** Real-time tracking with completion percentage

### 3.3 Discovery-Based Progression

#### Area Unlock System
- **Start Area:** Downtown (0.5 km²)
- **Discovery Mechanics:**
  - Reach new location: Auto-unlock for future visits
  - Complete objectives: Unlock adjacent areas
  - Relationship unlock: NPCs tell you about new places
  - Time-gated: Some areas available at specific times

#### Area Progression Path
1. **Downtown (Starting):** Commercial zone, shops, restaurants
2. **Residential (Discover at 15 min):** Houses, gardens, parks
3. **Industrial (Unlock via quest):** Warehouses, factories, shipyard
4. **Waterfront (Relationship unlock):** Harbor, boats, fishermen
5. **Suburbs (Time-gated):** Quiet neighborhoods, larger gardens
6. **Downtown Night (Explore after 8 PM):** Different NPCs, spookier feel
7. **Secret Areas (Hidden objectives):** Underground tunnels, rooftops, gardens

#### Discovery Bonuses
- **First visit:** +50 XP + visual marker
- **Full exploration:** Complete all objectives in area = +100 XP + challenge unlock
- **Hidden area:** Extra +25 XP per secret location found
- **Speed bonus:** Complete area in under 5 minutes = +25 XP

### 3.4 Collectibles System

#### Yarn Balls
- **Location:** Throughout environment, 20+ per area
- **Appearance:** Colorful (red, blue, yellow, purple)
- **Interaction:** Walk into / press E
- **Effect:** Happiness +10%, can carry 5 max
- **Use:** Trade to other cats for favors

#### Fish Treats
- **Location:** Fish markets, near water, hidden in gardens
- **Appearance:** Small, shiny, animated
- **Interaction:** E to pick up
- **Effect:** Hunger (stamina restoration mechanic)
- **Use:** Eat for stamina +20, or trade to NPCs

#### Feathers
- **Location:** Parks, rooftops, near birds
- **Appearance:** Floating, drifting down
- **Interaction:** Jump and catch
- **Effect:** Collectible crafting material
- **Use:** Craft toys or trade

#### Badges/Trophies (Virtual Collectibles)
- **Appearance:** Floating icons in journal
- **Interaction:** Earn through achievements
- **Effect:** Unlock cosmetics or abilities
- **Use:** Prestige system

#### Collection Mechanics
- **Inventory:** Can carry 10 items (yarn balls, feathers, etc.)
- **Drop:** Press X to drop current item
- **Show:** Press C to open collection view
- **Sorting:** Auto-sort by type
- **Synergy:** Collecting all colors of yarn = +25 relationship with crafters

### 3.5 Achievements & Badges System

#### Challenge Badges
| Badge | Objective | Reward |
|-------|-----------|--------|
| Knockers | Knock 50 objects | +50 XP, special tail animation |
| Climber | Climb 500m cumulative | +100 XP, fast climbing unlock |
| Collector | Gather 25 collectibles | +50 XP, collector's discount |
| Speed Runner | Complete area in <5min | +75 XP, sprint unlock |
| Socialite | Achieve friendly with 10 NPCs | +100 XP, dialogue unlock |
| Night Owl | Explore after midnight | +50 XP, night mode unlock |
| Perfectionist | 100% area completion | +200 XP, cosmetic unlock |
| Adventurer | Visit all 7 areas | +300 XP, story epilogue unlock |

#### Achievement Categories
1. **Exploration:** Discovery-based (10 badges)
2. **Interaction:** Knockable/climbing (8 badges)
3. **Social:** NPC relationship (10 badges)
4. **Challenge:** Timed/difficult (12 badges)
5. **Secret:** Hidden achievements (5 badges, unlocks unknown until found)

#### Badge Effects
- **Visual:** Badge appears in journal, cosmetic tail change
- **Mechanical:** Unlock abilities or speed bonuses
- **Social:** Other NPCs react with respect (+relationship)
- **Progression:** 10+ badges unlock cosmetics, 20+ unlock new areas

---

## 4. NPC SYSTEM

### 4.1 Cat NPCs

#### NPC Character Archetypes

**1. Friendly Neighborhood Cats**
- Names: Luna, Whiskers, Tiger, Mittens
- Locations: Park bench, alley, rooftop
- Personality: Greeting, curious, helpful
- Relationships: Start at +5 (friendly)
- Interactions: Meow exchanges, playtime, advice
- Schedule: Morning in park, afternoon alley, evening rooftop

**2. Territorial Cats**
- Names: Shadow, Smokey, Blackjack
- Locations: Specific buildings/yards
- Personality: Defensive, respectful of boundaries
- Relationships: Start at 0 (neutral)
- Interactions: Challenge games, territory respect
- Schedule: Guard duty, specific routes

**3. Aloof/Independent Cats**
- Names: Sage, Phantom, Midnight
- Locations: Rooftops, quiet places
- Personality: Reserved, mysterious
- Relationships: Start at -5 (distant)
- Interactions: Brief acknowledgment, hard to befriend
- Schedule: Nocturnal, wandering patterns

**4. Playful Kittens**
- Names: Zippy, Pounce, Fluff, Dash
- Locations: Gardens, playgrounds
- Personality: Energetic, easily excited
- Relationships: Start at +10 (very friendly)
- Interactions: Chase games, toy sharing
- Schedule: All day play (except rain)

#### Cat NPC Behaviors

**Greetings**
- Within 5m of cat: They notice you
- Friendly: Approach, meow response
- Neutral: Acknowledge, wait for you to approach
- Hostile: Turn away or hiss warning

**Social Hierarchy**
- Your stats affect how cats treat you:
  - Many badges: Respect (+5 relationship)
  - Many collectibles: Impressed (+3 relationship)
  - Low cleanliness: Disdain (-3 relationship)

**Activity Patterns**
- Morning (6 AM-12 PM): Social interactions, playing
- Afternoon (12 PM-6 PM): Napping/grooming, less interactive
- Evening (6 PM-9 PM): Active again, gathering food
- Night (9 PM-6 AM): Hunting/roaming, rare encounters

**Dynamic Relationships**
- Gift a fish: +5 relationship, cat remembers
- Defeat in playful fight: -10 relationship temporarily
- Help with task: +10 relationship, unlock dialogue
- Ignore greetings repeatedly: -2 per time

### 4.2 Human NPCs

#### Human Archetypes

**1. Cat Owners**
- Relationship: Care for specific cats
- Interactions: Can talk about their cats, give tasks
- Schedule: Home in evening, work during day
- Rewards: Treats, information, unlocks

**2. Shop Owners**
- Location: Markets, pet stores, restaurants
- Relationship: Neutral (professional)
- Interactions: Buy/sell items, trade collectibles
- Schedule: Open during business hours

**3. Street Vendors**
- Location: Parks, plazas
- Relationship: Friendly (seek friendly company)
- Interactions: Buy treats, chat, mini-quests
- Schedule: All day at their spot

**4. Delivery Persons**
- Location: Moving throughout city
- Relationship: Passing (rarely stick around)
- Interactions: Quick meow exchanges, sometimes gifts
- Schedule: Delivery routes, specific times

**5. Children**
- Location: Parks, playgrounds
- Relationship: Highly interactive if friendly
- Interactions: Play requests, petting, games
- Schedule: After school, weekends

#### Human Mechanics
- **Perception:** Humans see/hear cat actions within 10m
- **Reaction:**
  - Knocking objects: Concern/annoyance
  - Meowing: Affection/annoyance (context dependent)
  - Climbing: Curiosity/concern
  - Grooming: Affection
- **Engagement:**
  - Friendly: Pet you, give treats, talk
  - Neutral: Acknowledge, ignore
  - Hostile: Shoo, try to pick up, chase
- **Relationship Decay:** -1 per day without positive interaction

### 4.3 NPC Behavior Trees

#### Simplified Example: Friendly Cat AI

```
Root: Selector (choose first successful branch)
├─ Sequence: Player Within 5m AND Player Friendly?
│  ├─ Action: Turn toward player
│  ├─ Action: Play greeting meow (random pitch)
│  ├─ Action: Wait 2 seconds
│  └─ Action: Return to previous activity
├─ Sequence: Time is Activity Time?
│  ├─ Action: Navigate to activity location
│  ├─ Action: Play activity animation (groom/play/eat)
│  └─ Action: Repeat for 60 seconds
└─ Sequence: Default Behavior
   └─ Action: Wander patrol route
```

#### NPC Routines
- **Morning Routine (6 AM):** Wake at home, groom, head to activity
- **Work Day (9 AM-5 PM):** Activity location, fixed schedule
- **Evening (6 PM):** Return home, dinner, social time
- **Night (9 PM+):** Sleep or nocturnal activities
- **Weather-Modified:** Rain changes routines (shelter-seeking)

#### Dynamic NPC Reactions
- **To Player Actions:**
  - Knocking objects near NPC: Angry reaction (-5 relationship)
  - Meowing at distance: Approach (+1 relationship)
  - Giving gift: Excited reaction (+10 relationship)
  - Showing off badge: Impressed reaction (+3 relationship)

### 4.4 Dialogue & Depth System

#### Dialogue Structure
- **Question-Response:** Player asks cat NPC questions (meow with direction)
- **Statement:** NPC makes statement, player can respond
- **Offers:** NPC offers quest/trade
- **Rejection:** NPC can decline (based on relationship)

#### Dialogue Trees
```
Luna (Friendly Cat):
├─ Greeting:
│  └─ "Oh, hi there! How are you?"
├─ Questions:
│  ├─ "Where can I find fish?"
│  │  └─ "Try near the harbor, past the warehouses."
│  ├─ "Want to play?"
│  │  └─ [Playtime Mini-Game]
│  └─ "Tell me a secret?"
│     └─ [Unlocks hidden location hint]
├─ Offers:
│  ├─ "Find my lost toy?" [+100 XP reward]
│  └─ "Race to the park?" [Challenge]
└─ Farewell:
   └─ "See you later!"
```

#### Relationship Thresholds
- **-20 to 0:** Hostile (attack/flee on sight)
- **0 to 20:** Neutral (acknowledge only)
- **20 to 50:** Friendly (approach, talk)
- **50+:** Best Friend (special quests, gifts, invites to events)

---

## 5. PROGRESSION SYSTEM

### 5.1 Level Gates & Area Unlocks

#### Level Structure
- **Levels 1-5:** Introductory zones (Downtown)
- **Levels 6-10:** Mid-game zones (Residential, Parks)
- **Levels 11-15:** Advanced zones (Industrial, Waterfront)
- **Levels 16-20:** Endgame zones (Suburbs, secret areas)
- **Level 21+:** Prestige system (cosmetics, challenge modes)

#### Gate Mechanics
- **Quest Gate:** Must complete area objectives to unlock next
- **Relationship Gate:** Build relationship with NPC to unlock area info
- **Exploration Gate:** Reach specific location to unlock
- **Achievement Gate:** Earn 3+ badges to unlock endgame zones

### 5.2 Skill Unlock Tree

#### Movement Skills
```
Tier 1 (Level 1):
├─ Walking (unlocked at start)
├─ Running (unlock at Level 1 end)
└─ Jumping (unlock at Level 1 end)

Tier 2 (Level 5):
├─ Agility I: +0.5m jump height, faster stamina recovery
├─ Sprint Boost: Running cap increases to 8 m/s
└─ Climb Basics: Can climb wooden surfaces

Tier 3 (Level 10):
├─ Agility II: Double-jump, climbing speed +25%
├─ Wall Run: Slide down walls, parkour moves
└─ Balance: Walk on narrow ledges

Tier 4 (Level 15):
├─ Master Climber: Any surface, 30% faster, -50% stamina cost
├─ Superhero Landing: Land from any height without damage
└─ Parkour Master: Vault/swing/glide mechanics
```

#### Combat/Interaction Skills
```
Tier 1 (Level 1):
└─ Knockable Basics: Can knock light objects

Tier 2 (Level 5):
├─ Power Knock: Heavier knockables, more distance
└─ Stealthy Touch: Knock quietly (NPCs less likely to notice)

Tier 3 (Level 10):
├─ Destructive Force: Break ceramic objects on demand
└─ Chain Reaction: Knock objects into other objects

Tier 4 (Level 15):
└─ Chaos Control: Cause large-scale destruction without NPC anger
```

#### Social Skills
```
Tier 1 (Level 1):
└─ Friendly Meow: NPCs start +5 relationship

Tier 2 (Level 5):
├─ Persuasion: +relationship gain from interactions
└─ Charm: Unlock special dialogues

Tier 3 (Level 10):
├─ Leadership: Cats follow your directions
└─ Negotiation: Unlock new trades with NPCs

Tier 4 (Level 15):
└─ Legendary Status: All NPCs start at +10 relationship
```

#### Sensory Skills
```
Tier 1 (Level 1):
└─ Normal Vision: Standard FOV, normal colors

Tier 2 (Level 5):
├─ Night Vision: See in darkness (B key to toggle)
└─ Scent Tracking: See trails of collectibles

Tier 3 (Level 10):
├─ Thermal Vision: See heat signatures of NPCs/animals
└─ Whisker Sensitivity: Detect hidden objects

Tier 4 (Level 15):
└─ Predator Vision: Combination of all abilities, auto-highlights targets
```

### 5.3 Reputation System

#### Reputation Tiers

| Tier | Name | Threshold | Benefits |
|------|------|-----------|----------|
| 1 | Newcomer | 0-50 | Basic interactions |
| 2 | Friendly | 51-150 | Unlocks quests |
| 3 | Trusted | 151-300 | NPC gifts, discounts |
| 4 | Beloved | 301-500 | Special events, free items |
| 5 | Legend | 501+ | VIP access, exclusive quests |

#### Reputation Mechanics
- **Per NPC:** Individual relationship tracking
- **Global:** City-wide reputation (average of all NPCs)
- **Faction:** Cat vs. Human reputation separate
- **Decay:** -1 per day without interaction (minimum -20)

#### Reputation Rewards
- **Tier Unlock:** Access new shops, NPC quests, areas
- **Dialogue Unlock:** New dialogue trees at higher tiers
- **Gift System:** NPCs give gifts at Tier 3+
- **Events:** Special gatherings unlock at Tier 4+

### 5.4 Story Progression

#### Story Arc: "Finding Your Way"

**Act 1: Discovery (Levels 1-5)**
- Intro: Wake up in Downtown, uncertain of surroundings
- Discover basic mechanics: Movement, climbing, knockables
- Meet first cat (Luna): Friendly encounter
- Complete first quest: Find home location
- Goal: Explore Downtown fully, understand controls

**Act 2: Connection (Levels 6-10)**
- Find home territory (residential area)
- Build relationships with 3+ cats
- Unlock industrial zone via NPC info
- Discover the story hook: Cats mention "The Gateway"
- Goal: Understand city layout, form friendships

**Act 3: Adventure (Levels 11-15)**
- Explore industrial zone: Dangerous, new mechanics
- Unlock waterfront: Harbor reveals boating opportunities
- Story development: Meet Sage (mysterious elder cat)
- Mystery: "The Gateway" is something important
- Goal: Gain strength, complete major quests

**Act 4: Destiny (Levels 16-20)**
- Enter secret areas: Hidden gardens, underground tunnels
- Climax: "The Gateway" revealed (endgame location)
- Final challenge: Complete Gateway trials
- Epilogue: Unlock prestige system
- Goal: Achieve legend status, complete all objectives

#### Discovery-Based Story Elements
- **Environmental Stories:** Hidden notes/items tell stories
- **NPC Stories:** Each cat has backstory (revealed through dialogue)
- **Location Stories:** Buildings have histories (revealed by exploration)
- **Event Stories:** Time-specific events (concerts, gatherings, dramas)

---

## 6. PROGRESSION PHILOSOPHY

### Design Principles

1. **Player Agency:** Progression follows player interest, not predetermined path
2. **Intrinsic Motivation:** Fun interactions reward themselves (knock objects feels good)
3. **Clear Feedback:** Immediate visual/audio response to all actions
4. **Skill Expression:** Allow advanced players to show mastery (parkour, complex knockdowns)
5. **Community:** NPC relationships reward social play
6. **Discovery:** Unlocks feel rewarding, secrets motivate exploration
7. **No Grinding:** All progression comes from natural exploration
8. **Accessibility:** All content reachable within 50 hours of play

### Success Metrics
- **Engagement:** Player spends >3 hours in first session
- **Exploration:** Player discovers 50%+ of areas by level 10
- **Retention:** Player returns 3+ sessions within first week
- **Social:** Player builds relationships with 5+ NPCs by level 10
- **Mastery:** Skilled players complete all areas by level 20

---

## 7. CONFIGURATION & CUSTOMIZATION

### Difficulty Settings
- **Easy:** Higher stamina, lower jump requirements, friendly NPCs
- **Normal:** Balanced (default)
- **Hard:** Lower stamina, precise jumps needed, skeptical NPCs
- **Hardcore:** Permadeath, limited saves

### Accessibility Options
- **Motion Sickness:** Reduce head bob, lower FOV options
- **Colorblind Mode:** Adjust UI colors
- **Audio Cues:** Activate visual indicators for sounds
- **Difficulty Assists:** Adjust individual mechanics (jump height, sprint duration)

### Performance Options (RPi vs. Desktop)
- **Tail Physics:** Simple/Standard/Advanced
- **NPC Population:** Low (3)/Medium (8)/High (15)
- **Draw Distance:** 50m/100m/200m
- **LOD Precision:** Low/Medium/High
- **Target FPS:** 30/45/60

---

**End of GAMEPLAY.md**

Last Updated: 2026-07-10  
Status: Complete design specification ready for implementation
