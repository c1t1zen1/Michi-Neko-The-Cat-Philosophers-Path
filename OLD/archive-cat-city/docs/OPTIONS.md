# CAT WALK: Progression Models Comparison

**Document Version:** 1.0  
**Date:** 2026-07-10  
**Purpose:** Compare three distinct progression system philosophies for Cat Walk  
**Recommendation:** See summary at end

---

## MODEL 1: DISCOVERY-DRIVEN PROGRESSION (RECOMMENDED)

### Philosophy
Players progress by **exploring, discovering, and building relationships**. No leveling system; progression is a natural consequence of gameplay. Content unlocks are tied to *what the player does*, not *how long they play*.

### Core Mechanics

**Primary Gate: Exploration Quota**
```
Home Area (Rank 1)
├─ Need: Start game
├─ Unlock: Walk, jump, basic meow
└─ Area Access: Home neighborhood

Park District (Rank 2)
├─ Need: Explore 5 unique locations + meet 1 NPC
├─ Unlock: Enhanced jump (+0.3m), climbing (3m limit)
└─ Area Access: Park, residential streets

Urban Core (Rank 3)
├─ Need: Explore 15 locations + befriend 1 NPC (Level 2)
├─ Unlock: Wall jump, climbing (5m), faster meow
└─ Area Access: Downtown, commercial district

Advanced Areas (Ranks 4-5)
├─ Need: 25+ locations, 2+ friends at Level 3
├─ Unlock: Advanced parkour, climbing (8m), power abilities
└─ Area Access: Industrial zone, rooftops, waterfront

Secret Sanctuaries (Rank 6)
├─ Need: All core areas + 5 friends at max (Level 5)
├─ Unlock: Ultimate abilities, secret cosmetics
└─ Area Access: 5 hidden areas (each behind one NPC)
```

**Secondary Gate: Relationship Building**
- Meeting NPCs organically through exploration
- Friendship levels unlock NPC-specific content
- Some areas require befriending specific NPCs
- Story progression through NPC interactions

**Tertiary Gate: Skill Demonstration**
- Successfully jumping high obstacles → Unlock higher jumps
- Climbing successfully → Unlock higher climbing limits
- Using meow creatively → Unlock meow abilities
- Skills gate later ability tiers (optional challenge)

### Progression Pacing
| Phase | Duration | Content Unlocked | Player Activity |
|-------|----------|------------------|-----------------|
| Discovery Phase | 20-30 min | Ranks 1-2, 2 skills, 2 areas | Explore, learn controls |
| Expansion Phase | 40-60 min | Ranks 2-3, 4-5 skills, 4 areas | Explore deeper, build friendships |
| Mastery Phase | 50-80 min | Ranks 3-4, 6-7 skills, 3 areas | Skill challenges, NPC secrets |
| Endgame Phase | 60+ min | Ranks 5-6, ultimate abilities, secrets | Completionist, hidden areas |

### Progression Curve
- **Early:** Rapid unlocks, frequent discoveries, high novelty
- **Mid:** Steadier pacing, meaningful choices between paths
- **Late:** Exploration becomes challenge-focused, mysteries remain
- **Endgame:** Cosmetic/prestige progression, optional challenges

### Pros
✅ Feels organic and player-driven  
✅ Natural difficulty scaling through gameplay  
✅ Exploration incentivizes deep world engagement  
✅ No grinding or artificial time-gates  
✅ Multiple valid progression paths  
✅ High replayability (different area exploration order)  
✅ Story beats feel earned, not scripted  
✅ Best matches game's "discovery" theme  

### Cons
❌ Less clear progression path (some players want guidance)  
❌ Requires good level design to feel natural  
❌ Harder to balance difficulty (exploration order varies)  
❌ Can't show player "level number" clearly  
❌ May confuse players: "Am I progressing?"  
❌ Requires robust save system to track progress state  

### Implementation Complexity
**High** - Requires:
- Robust exploration tracking system
- Multiple area unlock conditions
- NPC relationship state machine
- Dynamic skill unlock triggers
- Complex progression validation

### Best For
- Players who love exploration and discovery
- Narrative-driven experience preferred
- Preference for organic gameplay flow
- Players who enjoy multiple playthroughs

---

## MODEL 2: POINTS-BASED LINEAR PROGRESSION

### Philosophy
Players accumulate **progression points** through any action. A visible progress bar shows advancement toward next rank. Clear, predictable, game-like progression. Players always know exactly where they stand.

### Core Mechanics

**Progression Points System**
```
Sources of Points:
- Explore new location: +10 pts
- Collect item: +2 pts
- Complete objective: +15-30 pts
- Befriend NPC: +20 pts
- Build relationship level: +10 pts per level
- Overcome obstacle: +15 pts
- Discover secret area: +25 pts
- Achieve milestone: +50 pts

Rank Requirements:
Rank 1 → 2: 0 - 50 pts
Rank 2 → 3: 50 - 150 pts
Rank 3 → 4: 150 - 350 pts
Rank 4 → 5: 350 - 700 pts
Rank 5 → 6: 700 - 1200 pts
```

**Skill Unlock Milestones**
```
Every 50 points → Unlock one skill/ability
Specific skill trees available by rank:
- Rank 1: Movement basics (walk, jump, meow)
- Rank 2: Movement upgrades (better jump, climbing)
- Rank 3: Combat skills (knock harder, precision hit)
- Rank 4: Advanced movement (parkour, wall jump)
- Rank 5: Mastery skills (extreme sprint, expert climb)
- Rank 6: Ultimate abilities (special meow, reality-bending)
```

**Area Unlocks (Time-gated to Rank)**
```
Rank 1: Home area
Rank 2: Park, residential
Rank 3: Downtown, commercial
Rank 4: Industrial, rooftops
Rank 5: Waterfront, special areas
Rank 6: Secret sanctuaries (NPC-specific)
```

### Progression Pacing
| Rank | Target Time | Points to Reach | Content Available |
|------|-------------|-----------------|-------------------|
| 1-2 | 10-20 min | 50 pts | Starter area, 3 skills |
| 2-3 | 20-40 min | 100 pts | 2 new areas, 4 skills |
| 3-4 | 30-50 min | 200 pts | 2 new areas, 5 skills |
| 4-5 | 40-60 min | 350 pts | 2 new areas, 6 skills |
| 5-6 | 60-120 min | 500 pts | Secret areas, ultimate skills |

### Progression Curve
- **Linear:** Points accumulate at steady rate (~10 pts/min)
- **Optional Acceleration:** Challenging optional objectives give bonus points
- **No Punishment:** Casual players progress at own pace
- **Clear Milestones:** Every 50 points is visible achievement

### Pros
✅ Very clear progression indicators  
✅ Players always know "level" and next unlock  
✅ Easy to balance (tune point values)  
✅ Appeals to achievement hunters  
✅ Predictable pacing  
✅ Easy to add catch-up mechanics  
✅ Suits casual play well  
✅ Simple to implement  

### Cons
❌ Feels game-like, less immersive  
❌ Can seem grindy (accumulating to point target)  
❌ Less player agency (pre-defined progression)  
❌ Reduced exploration incentive ("just farm points")  
❌ Multiple optimal paths emerge (efficiency)  
❌ May undermine discovery theme  
❌ Requires careful balance to avoid grinding  

### Implementation Complexity
**Medium** - Requires:
- Point accumulation tracking
- UI progress bar
- Skill tree/unlock system
- Rank level storage
- Balance tuning

### Best For
- Players who like visible progress
- Casual gamers
- Completionists
- Players who want clear goals

---

## MODEL 3: QUEST-LOCKED HYBRID PROGRESSION

### Philosophy
**Major story beats unlock through curated quests**. Players follow a guided narrative path with optional exploration. Balances discovery with structure. Progression is **linear but flexible** — story gates content, but optional paths exist for hardcore players.

### Core Mechanics

**Main Quest Chain (7 Story Acts)**
```
Act 1: Welcome Home (Rank 1)
├─ Quest: Explore your house and yard
├─ Unlock: Walk, jump, meow
└─ Next: Meet first neighbor

Act 2: Making Friends (Rank 2)
├─ Quest: Meet and befriend 2 NPCs
├─ Unlock: Enhanced jump, climbing (3m)
└─ Next: Help with neighborhood problem

Act 3: Community Champion (Rank 3)
├─ Quest: Resolve conflict between two cats
├─ Unlock: Wall jump, climbing (5m)
└─ Next: Journey to the big park

Act 4: Urban Explorer (Rank 4)
├─ Quest: Complete parkour challenge course
├─ Unlock: Advanced parkour, climbing (8m)
└─ Next: Discover rooftop highway

Act 5: Secret Keeper (Rank 5)
├─ Quest: Gather lore fragments from 4+ NPCs
├─ Unlock: Extreme abilities, special meow
└─ Next: Final mystery

Act 6: The Revelation (Rank 6)
├─ Quest: Discover world-changing secret
├─ Unlock: Ultimate abilities
└─ Next: New Game+ mode

Act 7: Mastery (Optional Endgame)
├─ Quest: Achieve all optional objectives
├─ Unlock: Cosmetics, prestige title
└─ End: Character complete
```

**Parallel Progression Paths**
1. **Story Path (Guided):** Follow quests, reach all ranks
2. **Explorer Path (Optional):** Find areas/NPCs before quests guide
3. **Collector Path (Optional):** Speedrun collecting all items
4. **Social Path (Optional):** Max friendship with all NPCs
5. **Speedrun Path (Optional):** Reach end as quickly as possible

**Skill Unlocks: Dual System**
- **Quest Unlocks:** Story milestone unlocks core skill
- **Optional Skill Tree:** Find optional upgrades through exploration
- **Challenge Unlocks:** Beat optional parkour challenges for cosmetic abilities

### Progression Pacing
| Act | Story Focus | Expected Time | Content |
|-----|-------------|----------------|---------|
| 1 | Orientation | 10-15 min | Home area, basic controls |
| 2 | Socialization | 20-30 min | Neighborhood, 2 areas, relationships |
| 3 | Conflict | 25-35 min | Resolution through gameplay |
| 4 | Challenge | 30-45 min | Parkour, skill tests, new area |
| 5 | Mystery | 40-60 min | Lore gathering, multiple NPCs |
| 6 | Revelation | 30-50 min | Final puzzle, climactic moment |
| 7 | Mastery | 60+ min | Endgame challenges, cosmetics |

### Progression Curve
- **Guided Beginning:** Clear direction, immediate gratification
- **Gradual Opening:** Side paths become available
- **Branching Middle:** Multiple valid strategies
- **Optional Challenges:** Skill-based progression for hardcore players
- **Prestige Endgame:** Cosmetic/challenge-based rewards

### Pros
✅ Clear narrative structure  
✅ Natural difficulty progression  
✅ Combines exploration + guided path  
✅ Story context for all unlocks  
✅ Easy to understand progression  
✅ Appeals to story-driven players  
✅ Good replayability (alternate paths)  
✅ Balanced casual/hardcore appeal  

### Cons
❌ Requires more quest design work  
❌ Less player agency than pure exploration  
❌ Story beats might feel railroaded  
❌ Can't skip story (some players may want to)  
❌ Harder to balance multiple paths  
❌ More complex to implement  
❌ May lead to "optimal path" playing out  

### Implementation Complexity
**High** - Requires:
- Quest system with branching
- Story trigger system
- Multiple progression paths
- Balance across paths
- NPC quest integration
- Narrative system

### Best For
- Story-focused players
- Players who want guidance + exploration
- Narrative adventure game fans
- First-time players

---

## COMPARATIVE ANALYSIS

### Progression Feel
| Model | Feel | Immersion | Clarity | Replayability |
|-------|------|-----------|---------|--------------|
| **Discovery** | Organic, emergent | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Points** | Game-like, clear | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Hybrid** | Balanced, structured | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### Player Guidance
| Model | Clarity | Guidance | Agency | Optional Content |
|-------|---------|----------|--------|-----------------|
| **Discovery** | Low | Minimal | Very High | Integrated |
| **Points** | Very High | None | Medium | Separate |
| **Hybrid** | High | Strong | High | Integrated |

### Development Effort
| Model | Complexity | UI Work | Balance | Design Time |
|-------|-----------|---------|---------|------------|
| **Discovery** | High | Medium | Hard | Very High |
| **Points** | Medium | Low | Easy | Medium |
| **Hybrid** | High | High | Medium | High |

### Player Satisfaction Timeline
```
Discovery Model:
Early: ⭐⭐⭐ (Discovery is exciting but can confuse)
Mid:   ⭐⭐⭐⭐⭐ (Lots to find, player agency)
Late:  ⭐⭐⭐⭐⭐ (Mystery/secrets reward exploration)

Points Model:
Early: ⭐⭐⭐⭐ (Clear goals, fast feedback)
Mid:   ⭐⭐⭐ (Grinding can set in)
Late:  ⭐⭐ (Lack of surprise, feels complete)

Hybrid Model:
Early: ⭐⭐⭐⭐⭐ (Clear goals + exploration)
Mid:   ⭐⭐⭐⭐⭐ (Story + optional paths)
Late:  ⭐⭐⭐⭐ (Challenges + side paths)
```

---

## DETAILED RECOMMENDATION

### Recommended Model: **DISCOVERY-DRIVEN PROGRESSION (Model 1)**

**Rationale:**

Cat Walk's core theme is **"experience the world from a cat's perspective through organic exploration."** The Discovery model perfectly aligns with this:

1. **Thematic Fit:** Cats are natural explorers. Progression through discovery matches feline behavior
2. **Immersion:** Players feel like *a cat discovering a neighborhood*, not *grinding points*
3. **Emergent Gameplay:** No two playthroughs are identical (different exploration order)
4. **Natural Difficulty Curve:** Exploration naturally leads to harder areas and challenges
5. **Reward Structure:** Finding secrets feels *earned*, not handed out
6. **Replayability:** "What if I explore in different order?" keeps players coming back

**Implementation Strategy:**

**Phase 1: Core (Weeks 1-2)**
- Build basic exploration tracking
- Implement 3 primary areas (home, park, downtown)
- Create 3-4 NPCs with simple relationship system
- Test pacing with early players

**Phase 2: Expansion (Weeks 3-4)**
- Add remaining 9 areas
- Expand NPC system to 8-12 cats
- Implement skill unlock tree
- Test unlock conditions

**Phase 3: Polish (Weeks 5-6)**
- Tune progression pacing with player feedback
- Add cosmetics/achievements
- Story integration
- Performance optimization

**Key Success Metrics:**
- Average player discovery rate: 80%+ of content in first playthrough
- Replay rate: >40% of players do second playthrough
- NPC interaction rate: >70% encounter all NPCs
- Skill unlock rate: >90% unlock core skills, >40% unlock advanced

### Alternative if Discovery Proves Too Complex: **Hybrid Model**

If testing shows Discovery model creates player confusion:
- Add lightweight quest structure as optional guidance
- Keep exploration central, quests as guardrails
- Best of both worlds: exploration + clarity

### Alternative if Targeting Casual Players: **Points Model**

If market research shows preference for casual/achievement-focused:
- Use Points model for clarity
- Tie points to exploration/discovery actions
- Maintains progression feel while adding clarity

---

## PROGRESSION PACING RECOMMENDATIONS

### For Discovery Model (Recommended)

**Target Playtime:**
- Casual completion: 3-4 hours (Ranks 1-4)
- Full completion: 6-8 hours (all ranks)
- 100% completion: 10-12 hours (all ranks + cosmetics)

**Recommended Play Sessions:**
1. Short session (20 min): Casual exploration, 1 area
2. Medium session (45 min): Exploration + NPC interaction
3. Long session (90+ min): Story/quest progression

**Engagement Hooks:**
- Every 10-15 minutes: New area discovery
- Every 20-30 minutes: NPC relationship breakthrough
- Every 45-60 minutes: Skill unlock/ability upgrade
- Every 2-3 hours: Story beat/narrative progression

### Difficulty Scaling
- **Early Areas (Ranks 1-2):** No platforming challenges, friendly NPCs
- **Mid Areas (Ranks 3-4):** Moderate parkour, NPC relationships matter
- **Late Areas (Ranks 5-6):** Challenging parkour, skill demonstration required

---

## COSMETICS & PRESTIGE PROGRESSION

**Post-Rank 6 progression via:**
1. **Collectibles:** All 100+ items → Special cosmetic
2. **Achievements:** Unlock optional badges → Cosmetics per 5 badges
3. **NPC Max Friendship:** Unique cosmetics per NPC relationship
4. **Speedrun Challenges:** Beat content in <X time → Time medals
5. **Hidden Challenges:** Secret parkour courses, extreme jumps → Prestige items

**Cosmetics (No Pay-to-Win):**
- Fur colors/patterns (20+ variants)
- Tail physics variations (fluffier, longer, etc.)
- Meow sounds (special/humorous variants)
- Collar/accessory items
- HUD themes

---

## FINAL SUMMARY TABLE

| Aspect | Discovery | Points | Hybrid |
|--------|-----------|--------|--------|
| **Best For** | Experience-focused players | Achievement hunters | Balanced approach |
| **Immersion** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Implementation Effort** | Very High | Medium | High |
| **Player Clarity** | Medium | Very High | High |
| **Replayability** | Very High | Medium | High |
| **Theme Alignment** | Perfect | Poor | Good |
| **Recommended?** | ✅ YES | ⚠️ If casual | ⚠️ Backup |

---

**Final Recommendation: DISCOVERY-DRIVEN PROGRESSION (Model 1)**

**Reasoning:** Cat Walk's unique narrative and thematic focus on exploration justify the extra implementation effort. The Discovery model creates a more memorable, replayable, and immersive experience that sets it apart from typical achievement-focused games. The organic progression feels like playing a real cat, not grinding a game.

**Fallback Plan:** If testing reveals too much player confusion, migrate toward Hybrid Model 3 (quest guidance + exploration).

---

**Document Status:** Complete v1.0  
**Last Revised:** 2026-07-10  
**Recommendation Confidence:** High (85%)
