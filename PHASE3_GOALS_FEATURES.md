# Phase 3: Game Logic Foundation - Goals & Feature Requests

## 🎯 Phase 3 Definition

**Duration**: 3 weeks | **Team**: 2-3 developers | **Budget**: $25,000

### Strategic Context
After Phase 2 delivers visual effects, **Phase 3 makes it playable** by implementing core RTS game logic.

**Why Game Logic Before Editor?**
- Can't build meaningful map tools without playable game mechanics
- Editor needs to test placement, triggers, balance → requires functional game
- Multiplayer needs deterministic simulation → must be built into game logic from start

---

## 📋 Phase 3 Goals

### Primary Goal: Playable RTS Prototype
Transform renderer into functional RTS game with gather → build → fight gameplay loop.

### Success Criteria
- [ ] **500 units @ 60 FPS** in active combat
- [ ] **Playable gameplay loop**: Gather resources → Build structures → Train units → Attack enemy
- [ ] **Basic AI opponent** that gathers, builds, and attacks
- [ ] **Unit pathfinding** <16ms for 100 units simultaneously
- [ ] **Deterministic simulation** ready for multiplayer (Phase 5)

---

## 🏗️ Phase 3 PRP Breakdown (10 PRPs)

### **PRP 3.1: Unit Selection & Control** (3 days)
**Priority**: 🔴 Critical

**Features**:
- Click to select individual units
- Drag box to select multiple units
- Control groups (Ctrl+1-9)
- Formation control (line, box, scatter)
- Right-click to move/attack/gather

**DoD**:
- [ ] Select 500 units with drag box <16ms
- [ ] Control groups save/restore correctly
- [ ] Formation movement looks natural
- [ ] Double-click selects all of type on screen

---

### **PRP 3.2: A* Pathfinding System** (4 days)
**Priority**: 🔴 Critical

**Features**:
- A* algorithm with binary heap
- Dynamic obstacle avoidance
- Flow fields for 100+ units (shared paths)
- Unit collision prevention
- Terrain awareness (cliffs, water)

**DoD**:
- [ ] 100 units pathfind simultaneously <16ms
- [ ] Units navigate around obstacles
- [ ] No units stuck in corners/walls
- [ ] Flow fields reduce CPU for large groups
- [ ] Paths update when obstacles move

---

### **PRP 3.3: Resource Gathering System** (3 days)
**Priority**: 🔴 Critical

**Features**:
- 3 resource types (Gold, Wood, Food)
- Worker units auto-gather nearest resource
- Resource nodes deplete over time
- Carry capacity and return to base
- Visual feedback (units carry resources)

**DoD**:
- [ ] 50 workers gathering efficiently
- [ ] Resources update in real-time UI
- [ ] Depletion affects gameplay (forces expansion)
- [ ] Workers queue at crowded resource nodes
- [ ] Auto-continue gathering after drop-off

---

### **PRP 3.4: Building Placement & Construction** (3 days)
**Priority**: 🔴 Critical

**Features**:
- Grid-based building placement
- Collision detection (can't overlap)
- Construction progress (health increases)
- Cancel construction (refund resources)
- Building prerequisites (tech tree)

**DoD**:
- [ ] 20+ building types placeable
- [ ] Visual feedback for valid/invalid placement
- [ ] Construction time scales with building size
- [ ] Multiple workers speed up construction
- [ ] Placement works on uneven terrain

---

### **PRP 3.5: Unit Training & Production** (2 days)
**Priority**: 🟡 High

**Features**:
- Production queue (5 units max)
- Unit costs (resources + time)
- Rally points for new units
- Cancel production (refund 50%)
- Tech requirements (e.g., Barracks → Knight)

**DoD**:
- [ ] 10+ unit types trainable
- [ ] Queue visible in UI
- [ ] Rally points work for all buildings
- [ ] Production continues when player away
- [ ] Insufficient resources shows error

---

### **PRP 3.6: Combat System** (4 days)
**Priority**: 🔴 Critical

**Features**:
- Attack damage calculation (DPS-based)
- Armor and damage types (normal, pierce, magic)
- Attack range and cooldown
- Auto-attack when enemy in range
- Death animations and unit removal

**DoD**:
- [ ] 500 units fighting @ 60 FPS
- [ ] Damage types affect armor correctly
- [ ] Melee and ranged units work
- [ ] Kill count and stats tracked
- [ ] Overkill doesn't waste damage

---

### **PRP 3.7: Fog of War & Vision** (3 days)
**Priority**: 🟡 High

**Features**:
- Per-player vision (fog for enemy areas)
- Unit sight range
- Building sight range
- Fog reveals with exploration
- Unexplored (black) vs explored (grey) vs visible

**DoD**:
- [ ] Fog updates <5ms per frame
- [ ] 500 units have individual vision
- [ ] Enemy units invisible in fog
- [ ] Previously explored areas stay revealed (grey)
- [ ] Minimap shows fog correctly

---

### **PRP 3.8: Minimap System** (2 days)
**Priority**: 🟡 High

**Features**:
- Top-down RTT view of map
- Click to navigate camera
- Unit/building icons
- Resource node markers
- Fog of war overlay

**DoD**:
- [ ] Minimap updates @ 10 FPS (not every frame)
- [ ] Click-to-navigate <100ms response
- [ ] Icons scale with zoom level
- [ ] Fog overlay matches main view
- [ ] <5ms render cost per update

---

### **PRP 3.9: Basic AI System** (4 days)
**Priority**: 🟡 High

**Features**:
- AI gathers resources
- AI builds base (town hall, barracks, etc.)
- AI trains units (workers, soldiers)
- AI attacks player when strong enough
- 3 difficulty levels (Easy, Medium, Hard)

**DoD**:
- [ ] AI builds functional economy
- [ ] AI creates balanced army composition
- [ ] AI attacks at logical times
- [ ] Easy AI beatable by new players
- [ ] Hard AI challenges experienced players

---

### **PRP 3.10: Game Simulation Loop** (3 days)
**Priority**: 🔴 Critical

**Features**:
- Fixed timestep simulation (60 ticks/sec)
- Deterministic logic (for multiplayer)
- Game state serialization
- Save/load game state
- Replay recording infrastructure

**DoD**:
- [ ] Simulation runs deterministically
- [ ] Same inputs = same outputs (100% reproducible)
- [ ] Save/load works mid-game
- [ ] Replay recording captures all commands
- [ ] <10ms simulation overhead

---

## 🎮 Gameplay Flow (After Phase 3)

```
1. Game Start
   ↓
2. Gather Resources (Workers → Gold/Wood/Food)
   ↓
3. Build Structures (Barracks, Armory, etc.)
   ↓
4. Train Army (Footmen, Archers, Knights)
   ↓
5. Scout Enemy (Explore with units)
   ↓
6. Attack Enemy Base
   ↓
7. Victory/Defeat
```

**Playable**: ✅ Yes! Core RTS loop functional

---

## 🌟 Feature Request Framework

### Purpose
Enable community to suggest features while maintaining legal compliance and technical feasibility.

### Process

#### 1. **Submission** (GitHub Issue)
Template:
```markdown
## Feature Request

**Title**: [Concise feature name]

**Category**: [ ] Gameplay [ ] Editor [ ] Multiplayer [ ] Assets [ ] Other

**Description**:
[What is the feature?]

**Use Case**:
[Why do you want this?]

**Examples**:
[Similar features in other games]

**Assets Needed**:
[ ] Models [ ] Textures [ ] Sounds [ ] None

**Legal Compliance**:
[ ] I confirm this request does NOT involve copyrighted content from Blizzard or other games
[ ] All suggested assets are original, CC0, or MIT licensed

**Priority** (your opinion):
[ ] Critical [ ] High [ ] Medium [ ] Low

**Estimated Effort** (your guess):
[ ] Small (1-3 days) [ ] Medium (1 week) [ ] Large (2+ weeks)
```

#### 2. **Auto-Check** (GitHub Actions)
Automatic rejection if:
- Contains keywords: "Blizzard", "Warcraft", "StarCraft" campaigns
- Requests copyrighted assets (maps, models, sounds from games)
- Lacks legal compliance checkbox

#### 3. **Community Voting** (GitHub Reactions)
- 👍 = Support this feature
- 👎 = Don't want this
- ❤️ = Critical for me
- 🎉 = Nice to have

Score = (👍 + 2×❤️) - 👎

#### 4. **Team Triage** (Weekly)
Review top-voted requests:
- Assign to phase (3, 4, 5, etc.)
- Create PRP if approved
- Close if rejected (with explanation)

#### 5. **Weighted Scoring**
```
Final Score =
  User Value (30%) +
  Strategic Alignment (25%) +
  Technical Feasibility (20%) +
  Legal Safety (15%) +
  Effort/ROI (10%)
```

**Auto-Accept**: Score ≥ 8.0
**Review**: Score 6.0-7.9
**Auto-Reject**: Score < 6.0 OR legal flag

#### 6. **PRP Creation**
Approved features → detailed PRP
- Assign to appropriate phase
- Add to roadmap
- Notify requester

#### 7. **Implementation**
When phase starts:
- Implement feature per PRP
- Notify community via release notes
- Close feature request with link to PR

---

## 📊 Example Feature Requests

### ✅ **Accepted: Replay System** (Score: 8.1)
**Category**: Multiplayer
**Why**: Tournament hosting, learning, content creation
**Effort**: 1 week (PRP 5.8)
**Status**: Assigned to Phase 5

**Scoring**:
- User Value: 9/10 (high demand)
- Alignment: 8/10 (supports esports goal)
- Feasibility: 8/10 (deterministic sim ready)
- Legal: 10/10 (no concerns)
- Effort/ROI: 7/10 (medium effort, high value)
- **Final**: (0.3×9 + 0.25×8 + 0.2×8 + 0.15×10 + 0.1×7) = 8.1 ✅

---

### ⚠️ **Under Review: Hero Abilities** (Score: 7.2)
**Category**: Gameplay
**Why**: Add depth, strategy, uniqueness
**Effort**: 2 weeks (new PRP)
**Status**: Review for Phase 4

**Scoring**:
- User Value: 8/10 (popular request)
- Alignment: 7/10 (aligns with advanced gameplay)
- Feasibility: 6/10 (complex systems integration)
- Legal: 10/10 (original abilities only)
- Effort/ROI: 5/10 (high effort, medium value)
- **Final**: 7.2 ⚠️ (needs design review)

---

### ❌ **Rejected: Warcraft 3 Campaigns** (Auto-rejected)
**Category**: Content
**Why**: Nostalgia, learning maps
**Effort**: N/A
**Status**: Rejected (copyright violation)

**Reason**: Contains Blizzard copyrighted content (stories, maps, dialogue). Violates legal compliance policy.

**Alternative Suggested**: Create original campaign system where community can build custom campaigns with original stories.

---

## 🗺️ Long-Term Roadmap (Phases 3-6)

### **Phase 3: Game Logic Foundation** (3 weeks, $25k)
- 10 PRPs: Selection, pathfinding, resources, combat, AI
- **Milestone**: Playable RTS prototype
- **Deliverable**: gather → build → fight gameplay loop

### **Phase 4: Editor MVP** (4 weeks, $40k)
- 18 PRPs: Terrain editor, unit placer, trigger GUI, save/load
- **Milestone**: Community can create maps
- **Deliverable**: Custom map creation in <30 minutes

### **Phase 5: Multiplayer Infrastructure** (4 weeks, $30k)
- 13 PRPs: Colyseus integration, lobby, matchmaking, replays
- **Milestone**: 8-player online games
- **Deliverable**: 100 concurrent alpha players

### **Phase 6: Advanced Features** (4 weeks, $35k)
- 16 PRPs: 30+ units, advanced AI, sound/music, mods
- **Milestone**: Production-ready engine
- **Deliverable**: Ready for public alpha

**Total**: 15-16 weeks, $143k (with 10% contingency)

---

## 🚀 Next Steps

### Immediate (This Week)
1. [ ] Review Phase 3 PRP breakdown
2. [ ] Approve Phase 3 budget ($25k)
3. [ ] Set up GitHub feature request template
4. [ ] Create Phase 3 PRP files (3.1-3.10)

### Short-term (Next Month)
1. [ ] Recruit Phase 3 team (2-3 game developers)
2. [ ] Begin Phase 3 Week 1 (Selection + Pathfinding)
3. [ ] Launch feature request process
4. [ ] Design Phase 4 mockups (UI/UX in parallel)

### Long-term (Next Quarter)
1. [ ] Complete Phases 3-4 (7 weeks)
2. [ ] Launch community alpha (100 testers)
3. [ ] Implement top feature requests
4. [ ] Prepare for Phase 5 (multiplayer)

---

**Phase 3 transforms Edge Craft from a pretty renderer into a playable RTS game! 🎮**

Feature requests ensure the community shapes the future of Edge Craft while maintaining legal compliance. 🌟
