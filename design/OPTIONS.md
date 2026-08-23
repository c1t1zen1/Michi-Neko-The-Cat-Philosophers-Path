# Cat Walk: Progression System Options

**Version:** 1.0  
**Date:** 2026-07-10  
**Purpose:** Compare 3 distinct progression models for gameplay design  

---

## Overview

This document presents three fundamentally different approaches to player progression in Cat Walk. Each model offers distinct gameplay experiences, with different emphasis on exploration, challenge, and narrative.

---

## OPTION A: "Discovery-First" (Recommended for Open-World)

### Philosophy
**Emphasis:** Emergent gameplay, organic exploration, intrinsic motivation

Players progress through natural exploration without explicit level gates. The world opens up gradually as players discover locations and build relationships. No quest markers, no level requirements—just curiosity-driven gameplay.

### Core Mechanics

#### Progression Triggers
- **Exploration:** Reach new location → Auto-unlock for future visits
- **Relationship:** Build +50 relationship with NPC → New quests/areas revealed
- **Discovery:** Find collectible → Unlock crafting/trades
- **Time:** In-game time advancement (days/weeks) → New NPCs/events
- **Mastery:** Execute complex action → Skill automatically unlocked

#### Skill System
- **Implicit Unlocks:** Skills auto-unlock based on usage
  - Used jump 50 times? Double-jump unlocks
  - Climbed 500m? Wall-run available
  - Built relationship with 5 cats? Leadership skill active
  
- **No Skill Trees:** Progression organic, not menu-based
- **Mastery Levels:** Each skill has 5 mastery ranks (novice→legend)

#### Area Progression
```
Week 1:
├─ Downtown (starting, all accessible immediately)
├─ Parks (unlock when first NPC mentions)
└─ Residential (unlock when you explore enough)

Week 2:
├─ Waterfront (unlock at day 8)
├─ Industrial (unlock via Luna's quest)
└─ Suburbs (unlock when downtown 100% explored)

Week 3:
├─ Secret Gardens (hidden, requires 10+ NPCs befriended)
├─ Underground Tunnels (found via exploration)
└─ Downtown Night (after 8 PM always accessible)

Endgame:
└─ The Gateway (unlock after discovering all other areas)
```

#### Relationship-Driven Progression
- **Luna:** Greets you → Suggests exploring → At +50 relationship, reveals secret location
- **Shadow:** Territorial at first → At +30 relationship, teaches combat tricks
- **Sage:** Aloof, hard to befriend → At +75 relationship, reveals story about "The Gateway"

#### Pacing
- **Soft Gates:** Suggest player is ready (visual markers, NPC hints)
- **No Hard Gates:** Player can always attempt challenges, but some are very difficult
- **Scalability:** Challenges adjust difficulty based on player skill level

### Content Distribution
- **Recommended:** 60-80 hours for full completion
- **Casual:** 30-40 hours for main story
- **Speedrun:** 10-15 hours for skilled players

### Example Progression Path (Player-Driven)
1. **Hour 0-2:** Downtown exploration, meet Luna, basic mechanics
2. **Hour 2-5:** Build relationships, attempt first climb, collect items
3. **Hour 5-10:** Expand to nearby parks, attempt challenges
4. **Hour 10-20:** Industrial zone (hard area, optional), waterfront discovery
5. **Hour 20-40:** Complete most quests, reach Beloved tier with most NPCs
6. **Hour 40-80:** Secret areas, Gateway preparation, perfect completion

### Strengths
✓ Natural, organic progression feels intuitive  
✓ Player agency: Choose own path and pacing  
✓ Replayability: Different orders = different experiences  
✓ Emergent gameplay: Unexpected discoveries reward exploration  
✓ No grind: All content earned through play  
✓ Story emerges naturally from interactions  

### Challenges
✗ Difficult to guarantee story coherence  
✗ Players might miss important content  
✗ Slower early game might frustrate some players  
✗ Harder to balance difficulty (high variance)  
✗ Requires careful design to prevent dead-ends  

### Implementation Complexity
- **Low:** Fewer systems, organic triggers
- **Medium:** Relationship system complex
- **High:** Balancing emergent difficulty

---

## OPTION B: "Story-Driven Narrative" (Best for Single-Player Campaign)

### Philosophy
**Emphasis:** Structured narrative, guided experience, cinematic moments

Players follow a predetermined story with clear acts and turning points. Progression is gated by story completion, not arbitrary level requirements. Each area reveals new story elements and character development.

### Core Mechanics

#### Act-Based Progression
```
ACT 1: "Finding Home" (Levels 1-5)
├─ Location: Downtown
├─ Story: Discover your neighborhood
├─ Objectives:
│  ├─ Move around and orient yourself
│  ├─ Meet Luna (first friendly NPC)
│  ├─ Unlock first quest: "Find Home"
│  └─ Complete Downtown exploration (5/5 areas)
├─ Cutscene: Luna shows you your home
└─ Unlock: Residential zone, Skill Tree I

ACT 2: "Making Friends" (Levels 6-10)
├─ Location: Residential + Parks
├─ Story: Build relationships and understand social dynamics
├─ Objectives:
│  ├─ Build +30 relationship with 3 NPCs
│  ├─ Complete tutorial quests from each NPC
│  ├─ Collect first 10 items
│  └─ Survive first encounter with Territorial Cat
├─ Cutscene: Luna warns you about Shadow
└─ Unlock: Industrial zone, Skill Tree II

ACT 3: "The Gateway Appears" (Levels 11-15)
├─ Location: Industrial + Waterfront
├─ Story: Discover something bigger (mysterious plot element)
├─ Objectives:
│  ├─ Industrial zone main quest (collect 3 artifacts)
│  ├─ Waterfront main quest (meet Sage, elder cat)
│  ├─ Sage reveals hints about "The Gateway"
│  └─ Survive challenging climbing section
├─ Cutscene: Sage explains ancient cat legend
└─ Unlock: Suburbs, Secret Areas, Skill Tree III

ACT 4: "The Gateway Trial" (Levels 16-20)
├─ Location: All areas, climax in Secret Gateway location
├─ Story: Complete the prophecy, become a legend
├─ Objectives:
│  ├─ Gather 5 sacred tokens (hidden in each area)
│  ├─ Build +50 relationship with all main NPCs
│  ├─ Complete final trial dungeon
│  └─ Confrontation with mysterious force
├─ Cutscene: Epilogue, cat legend complete
└─ Unlock: Prestige mode, New Game+
```

#### Quest Hierarchy
- **Story Quests (8-12 total):** Drive narrative, gated progression
- **Character Quests (5 per NPC):** Develop relationships, optional but rewarding
- **Activity Quests (Unlimited):** Repeatable, side content

#### Skill Unlock Gates
- Act 1: Walk, Run, Jump, Basic Knock
- Act 2: Climb Basics, Sprint Boost, Friendly Meow
- Act 3: Wall Run, Power Knock, Persuasion
- Act 4: Double-Jump, Chaos Control, Legend Status

#### Pacing
- **Chapter Completion:** 60-90 minutes per act
- **Optional Content:** 30+ hours additional side quests
- **Total Campaign:** 20-30 hours main story, 60+ for completion

### Content Distribution
- **Tight narrative arc** with clear beginning/middle/end
- **Scripted events** at key story moments
- **Dynamic difficulty** that ramps with player progression
- **Cinematic moments** at act transitions

### Story Example Arc
```
OPENING: Player wakes up confused in Downtown
INCITING INCIDENT: Luna befriends you, explains situation
RISING ACTION: Build relationships, explore, gather strength
MIDPOINT REVELATION: Sage mentions ancient prophecy
CLIMAX: Gateway trial, mysterious challenge
RESOLUTION: Become legend, unlock new perspective
```

### Strengths
✓ Clear, satisfying narrative arc  
✓ Predictable pacing guides player  
✓ Cinematic moments create memorability  
✓ Easy to balance difficulty (gated progression)  
✓ Strong story coherence and character development  
✓ Perfect for first-time players  
✓ Guides player to important content  

### Challenges
✗ Less player agency (predetermined path)  
✗ Linear progression might feel restrictive  
✗ Story gates can frustrate explorers  
✗ Less replayability (same story each time)  
✗ Difficult to allow skipping story content  
✗ Can feel "on rails" to sandbox players  

### Implementation Complexity
- **High:** Story system, scripted events, branching narrative
- **Very High:** Cinematics, dialogue trees, narrative consistency
- **Medium:** Technical implementation (quest system)

---

## OPTION C: "Challenge-Based Progression" (Best for Skillful Players)

### Philosophy
**Emphasis:** Mastery, skill expression, self-imposed challenges

Players progress through increasingly difficult challenges and skill tests. Progression is unlocked by demonstrating mastery, not completing quests. The world is open, but areas have difficulty ratings, and progression shows player skill growth.

### Core Mechanics

#### Challenge Tiers
```
TIER 1: Tutorial (Free, no prerequisites)
├─ Walking & Jumping Basics
├─ Simple Knockables Challenge (knock 10 light objects)
├─ First Tree Climb (easy, short)
└─ Reward: +50 XP, Tier 2 unlock

TIER 2: Apprentice (Easy, all accessible)
├─ Power Knock Challenge (knock 20 medium objects)
├─ Parkour Tutorial (3-level platforming)
├─ Vertical Climb Race (climb tree under 30 seconds)
├─ Social Challenge (build +30 relationship with Luna)
└─ Reward: +100 XP each, Tier 3 unlock at 3/4 complete

TIER 3: Intermediate (Medium, requires Tier 2)
├─ Destruction Test (break 10 ceramic vases)
├─ Advanced Parkour (5-level complex platforming)
├─ Building Climb Race (reach rooftop in <60 seconds)
├─ Social Hierarchy (reach +50 with 3 different cats)
├─ Exploration Speed Run (visit 10 locations in <10 minutes)
└─ Reward: +200 XP each, Tier 4 unlock at 3/5 complete

TIER 4: Advanced (Hard, requires Tier 3)
├─ Chaos Championship (coordinated knockdowns of 30 objects)
├─ Extreme Parkour (10-level gauntlet with time limit)
├─ Free-Climb Challenge (any surface, <100 second time)
├─ NPC Tournament (competitive games with all cats)
└─ Reward: +300 XP each, Tier 5 unlock at 2/4 complete

TIER 5: Master (Very Hard, requires Tier 4)
├─ The Gateway Trial (culmination of all skills)
├─ Speedrun Championship (entire game in <15 minutes)
├─ Perfection Challenge (no mistakes allowed)
├─ Legend Status Quest (prove mastery to all NPCs)
└─ Reward: +500 XP each, Prestige unlock

TIER 6: Prestige (Impossible, requires Tier 5)
├─ Hardcore Mode (permadeath, limited saves)
├─ Master Challenge (combination of all previous challenges)
├─ New Game+ (replay with unlocked abilities from start)
└─ Reward: Cosmetics, badges, eternal glory
```

#### Skill Mastery Ranks
Each skill has 5 levels, with requirements:
- **Rank 1 (Novice):** Unlock skill (free, no requirement)
- **Rank 2 (Apprentice):** Use 50 times
- **Rank 3 (Expert):** Use 200 times or complete tier 2 challenge
- **Rank 4 (Master):** Use 500 times or complete tier 3 challenge
- **Rank 5 (Legend):** Use 1000 times or complete tier 4 challenge

#### Area Difficulty Ratings
| Area | Tier | Recommended Level | Difficulty |
|------|------|------------------|------------|
| Downtown | 1-2 | 1-5 | Tutorial |
| Residential | 2-3 | 3-8 | Easy-Medium |
| Parks | 2-3 | 4-9 | Easy-Medium |
| Industrial | 3-4 | 8-14 | Medium-Hard |
| Waterfront | 3 | 7-12 | Medium |
| Suburbs | 4 | 12-18 | Hard |
| Secret Areas | 4-5 | 15-20 | Hard-Extreme |
| The Gateway | 5 | 18-20 | Extreme |

#### Progression Metrics
- **Overall Level:** Average of all skill mastery ranks (1-5)
- **Completion %:** Challenges completed / total challenges
- **Speedrun Time:** Fastest completion of game sequence
- **Leaderboard:** Rank against other players (optional multiplayer)

#### Example Progression
1. **Hour 0-5:** Tutorial challenges, basic movement
2. **Hour 5-15:** Tier 2 challenges, explore, build skills
3. **Hour 15-30:** Tier 3 challenges, master advanced movement
4. **Hour 30-50:** Tier 4 challenges, extreme parkour, NPC tournaments
5. **Hour 50-80+:** Tier 5 challenges, prestige attempts, perfection runs

### Content Distribution
- **Quick Completion:** 5 hours (main story speedrun)
- **Standard Completion:** 25 hours (all tier 4 challenges)
- **Master Completion:** 50+ hours (all tiers, multiple playthroughs)
- **Infinite:** Prestige resets allow endless progression

### Strengths
✓ Clear skill progression and mastery tracking  
✓ High replayability (always harder challenges)  
✓ Satisfies skill-focused players  
✓ Leaderboard/competitive potential  
✓ Players set own goals and pace  
✓ Emergent gameplay from self-imposed challenges  
✓ Scales from casual to professional skill levels  

### Challenges
✗ Difficult to onboard casual players  
✗ Story nearly non-existent  
✗ High frustration if too difficult early  
✗ Requires extensive testing/balance  
✗ Less appealing to narrative-focused players  
✗ Can feel grindy (repetitive skill building)  

### Implementation Complexity
- **Medium:** Challenge system and scoring
- **High:** Balancing difficulty curve
- **Very High:** Leaderboard systems, replay tracking

---

## Comparative Analysis

### Player Psychographics

| Player Type | Option A | Option B | Option C |
|------------|----------|----------|----------|
| **Explorer** | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| **Storyteller** | ★★★☆☆ | ★★★★★ | ★☆☆☆☆ |
| **Completionist** | ★★★★★ | ★★★★☆ | ★★★★★ |
| **Casual** | ★★★★☆ | ★★★★★ | ★★☆☆☆ |
| **Hardcore/Speedrunner** | ★★★☆☆ | ★★☆☆☆ | ★★★★★ |
| **Socialite** | ★★★★★ | ★★★★☆ | ★★★☆☆ |

### Game Experience Metrics

| Metric | Option A | Option B | Option C |
|--------|----------|----------|----------|
| **Replayability** | Very High | Medium | Very High |
| **Story Coherence** | Medium | Very High | Low |
| **Player Agency** | Very High | Low | High |
| **Onboarding Ease** | Low | Very High | Low |
| **Mastery Curve** | Gradual | Linear | Steep |
| **Completion Time** | 40-80 hrs | 20-30 hrs | 25-50 hrs |
| **Content Density** | High | Medium-High | Medium |

### Development Priorities

| Aspect | Option A | Option B | Option C |
|--------|----------|----------|----------|
| **NPC System** | High | Very High | Medium |
| **Narrative** | Medium | Very High | Low |
| **Challenge Design** | Medium | Medium | Very High |
| **Relationship Tracking** | Very High | High | Medium |
| **Tutorial/Guidance** | Medium | Very High | Low |

---

## Recommendation: Hybrid Approach

**Suggested:** Implement **Option A (Discovery-First)** as the **base** with **Option B (Story)** as **optional narrative framework** and **Option C (Challenge)** as **endgame content**.

### Hybrid Implementation
```
EARLY GAME (Levels 1-5):
├─ Use Story structure (Option B) for onboarding
├─ Clear objectives guide new players
└─ Narrative introduces mechanics naturally

MID GAME (Levels 6-15):
├─ Transition to Discovery (Option A)
├─ NPCs suggest areas but don't force it
├─ Player driven exploration with soft gates
└─ Relationship building becomes primary motivator

LATE GAME (Levels 16-20):
├─ Challenge Tiers (Option C) unlock
├─ Optional speedrun/hardcore modes
├─ Prestige system with cosmetic rewards
└─ Competitive/skill-based progression

CUSTOM OPTIONS MENU:
├─ Story Mode: Follow narrative beats (Option B)
├─ Explore Mode: Free roaming with hints (Option A)
├─ Challenge Mode: Tier-based (Option C)
└─ Mix & Match: Custom combination
```

### Why This Works
- ✓ New players: Guided story ensures understanding
- ✓ Explorers: Soft gates don't prevent discovery
- ✓ Completionists: Challenge system rewards mastery
- ✓ Speedrunners: Times can be tracked
- ✓ Replayability: Each mode feels different

---

## Implementation Priority

1. **Foundation (Week 1-2):** Core mechanics (movement, knockables, climbing)
2. **Story Framework (Week 2-3):** Act structure, story quests, narrative
3. **NPC System (Week 3-4):** Relationships, dialogue, routines
4. **Challenge System (Week 4-5):** Tiers, difficulty scaling
5. **Polish (Week 5-6):** Balance, cosmetics, endgame content

---

**End of OPTIONS.md**

Last Updated: 2026-07-10  
Recommendation: Hybrid A+B+C approach for maximum appeal
