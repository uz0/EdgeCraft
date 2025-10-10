# Phase 3: Game Logic Foundation - Definition & Scope

## 🎯 Executive Summary

**Phase 3** establishes the core game mechanics that make Edge Craft playable, transitioning from a visual renderer to an interactive RTS engine. After completing rendering infrastructure (Phases 1-2), Phase 3 implements unit behavior, resource systems, and basic AI to create the first playable prototype.

**Duration**: 2-3 weeks | **Team**: 2-3 developers | **Budget**: $20,000-30,000

---

## 📊 Strategic Context

### What Came Before
**Phase 1**: Core Engine + Rendering
- ✅ Babylon.js integration
- ✅ Advanced terrain system
- ✅ GPU instancing for 500+ units
- ✅ Cascaded shadow maps
- ✅ Map loading (W3X/SCM)

**Phase 2**: Advanced Rendering (from original roadmap)
- ✅ Post-processing effects
- ✅ Particle systems
- ✅ Weather effects
- ✅ Day/night cycle
- ✅ Advanced materials

### What Comes Next
**Phase 3**: Game Logic Foundation (THIS PHASE)
- 🎮 Unit selection and control
- 🎮 Resource gathering and economy
- 🎮 Building construction
- 🎮 Basic AI pathfinding
- 🎮 Combat system prototype

**Phase 4-5**: Editor MVP and multiplayer (as per strategic plan)

---

## 🎮 Phase 3 Scope Definition

### Core Question: "What makes it a game, not just a renderer?"

After achieving 60 FPS with 500 units and beautiful terrain, users need to:
1. **Select and command units** (RTS core interaction)
2. **Gather resources** (economic gameplay loop)
3. **Build structures** (base building mechanics)
4. **Move units intelligently** (pathfinding AI)
5. **Engage in combat** (damage calculation, unit states)

### In Scope ✅
- **Unit Selection System**: Drag-to-select, shift-add, control groups
- **Command System**: Move, attack, patrol, hold position
- **Resource System**: Gold/lumber/supply (W3-style) or minerals/gas (SC-style)
- **Building Placement**: Grid-based placement with collision
- **Pathfinding**: A* algorithm with dynamic obstacles
- **Combat Mechanics**: Attack ranges, damage types, armor calculations
- **Unit State Machine**: Idle, moving, attacking, gathering, dying
- **Fog of War**: Vision system and explored/unexplored areas
- **Minimap Interaction**: Click-to-navigate, unit tracking
- **Basic AI**: Simple attack-move and defensive behavior

### Out of Scope ❌
- Advanced AI (build orders, strategic planning) → Phase 6
- Multiplayer synchronization → Phase 9
- Editor tools → Phase 8
- Trigger system → Phase 8
- Abilities/spells → Phase 6
- Tech trees/upgrades → Phase 6
- Custom scripts (JASS/Galaxy) → Phase 6

---

## 📋 Phase 3 PRPs Breakdown

### **PRP 3.1: Unit Selection & Control System**
**Priority**: 🔴 Critical | **Effort**: 3 days | **Lines**: ~600

**What It Adds**:
- Drag-to-select box with visual feedback
- Click-to-select single units
- Shift-click to add/remove from selection
- Control groups (Ctrl+1-9 to set, 1-9 to recall)
- Selection UI panel showing unit stats
- Multi-unit selection with priority (heroes first)

**Technical Approach**:
- Babylon.js Pointer events for drag detection
- Bounding box intersection tests
- Selection state management in ECS
- React UI component for selection panel

**DoD Criteria**:
- [ ] Select up to 500 units smoothly (no lag)
- [ ] Control groups persist across sessions
- [ ] Visual feedback (green circles, selection box)
- [ ] Unit tests for selection logic
- [ ] Performance: <5ms selection update time

---

### **PRP 3.2: Command & Movement System**
**Priority**: 🔴 Critical | **Effort**: 4 days | **Lines**: ~800

**What It Adds**:
- Right-click move commands
- Attack-move (A+click)
- Patrol command
- Hold position/Stop command
- Formation movement (maintain spacing)
- Waypoints (Shift+click)
- Visual command feedback (destination markers)

**Technical Approach**:
- Command queue per unit
- State machine: Idle → Moving → Arrived
- Babylon.js raycasting for ground click detection
- Formation algorithm (spread units in grid)

**DoD Criteria**:
- [ ] 500 units respond to move commands simultaneously
- [ ] Units maintain formation during movement
- [ ] Waypoint system works with Shift modifier
- [ ] Performance: 60 FPS during mass movement
- [ ] Unit tests for command queuing

---

### **PRP 3.3: Pathfinding System (A* with Dynamic Obstacles)**
**Priority**: 🔴 Critical | **Effort**: 5 days | **Lines**: ~1,200

**What It Adds**:
- A* pathfinding algorithm
- Dynamic obstacle avoidance (units, buildings)
- Path smoothing and optimization
- Hierarchical pathfinding (for large maps)
- Unit collision detection and avoidance
- Path caching and reuse

**Technical Approach**:
- Grid-based navigation mesh from terrain
- A* with binary heap priority queue
- Local avoidance using velocity obstacles
- Web Worker for pathfinding (off main thread)

**DoD Criteria**:
- [ ] Path calculation <16ms for 256x256 map
- [ ] Units navigate around obstacles smoothly
- [ ] No units stuck in corners/walls
- [ ] Performance: 60 FPS with 100 units pathfinding
- [ ] Benchmark: 1000 path requests/second

---

### **PRP 3.4: Resource System & Economy**
**Priority**: 🟡 High | **Effort**: 3 days | **Lines**: ~500

**What It Adds**:
- Resource types (gold, lumber, food/supply)
- Resource gathering (units mine/chop)
- Resource deposit points (town hall, etc.)
- Resource UI display
- Resource events (collected, spent, insufficient)
- Starting resources configuration

**Technical Approach**:
- Global resource state per player
- Gathering state: MovingToResource → Gathering → Returning
- Auto-return to resource after deposit
- React UI for resource display

**DoD Criteria**:
- [ ] Workers gather resources automatically
- [ ] Resources update in UI in real-time
- [ ] Multiple workers gather from same resource
- [ ] Resource depletion tracked
- [ ] Unit tests for resource transactions

---

### **PRP 3.5: Building Placement & Construction**
**Priority**: 🟡 High | **Effort**: 4 days | **Lines**: ~700

**What It Adds**:
- Building placement preview (green=valid, red=invalid)
- Grid-based placement system
- Collision detection (can't overlap)
- Construction progress (0% → 100%)
- Worker assignment to construction
- Building cancellation and refunds

**Technical Approach**:
- Babylon.js ghost mesh for preview
- Terrain grid query for valid placement
- Construction queue per building
- Timer-based construction progress

**DoD Criteria**:
- [ ] Visual feedback for valid/invalid placement
- [ ] Multiple workers speed up construction
- [ ] Buildings block pathfinding when placed
- [ ] Cancel building returns resources
- [ ] Performance: No FPS drop during preview

---

### **PRP 3.6: Combat System Prototype**
**Priority**: 🟡 High | **Effort**: 4 days | **Lines**: ~900

**What It Adds**:
- Attack ranges and targeting
- Damage calculation (attack - armor)
- Attack cooldowns and animations
- Unit death and corpse removal
- Attack-move AI (attack nearest enemy)
- Target acquisition priorities
- Damage types (normal, pierce, siege, magic)

**Technical Approach**:
- Range queries using spatial hash grid
- Damage formulas from W3/SC mechanics
- Combat state: Idle → Targeting → Attacking → Cooldown
- Unit health bars (billboard UI)

**DoD Criteria**:
- [ ] Units attack enemies in range automatically
- [ ] Damage calculation matches RTS standards
- [ ] Unit death triggers proper cleanup
- [ ] Performance: 60 FPS with 500 units in combat
- [ ] Unit tests for damage formulas

---

### **PRP 3.7: Fog of War & Vision System**
**Priority**: 🟡 High | **Effort**: 3 days | **Lines**: ~600

**What It Adds**:
- Fog of War rendering (black=unexplored, gray=explored)
- Unit vision radius
- Building vision radius
- Vision sharing between allies
- Dynamic fog updates as units move
- Minimap fog integration

**Technical Approach**:
- Render texture for fog state
- Grid-based vision calculation
- Shader for fog rendering (grayscale overlay)
- Incremental fog updates (not full recalc)

**DoD Criteria**:
- [ ] Fog reveals smoothly as units move
- [ ] Explored areas remain visible (but gray)
- [ ] Enemy units hidden outside vision
- [ ] Performance: <5ms fog update per frame
- [ ] Visual quality matches W3/SC standards

---

### **PRP 3.8: Minimap System**
**Priority**: 🟢 Medium | **Effort**: 2 days | **Lines**: ~400

**What It Adds**:
- Real-time minimap rendering
- Terrain representation (colors for height/texture)
- Unit dots (color-coded by team)
- Building icons
- Click-to-navigate camera to location
- Ping system (alert teammates)
- Minimap fog of war

**Technical Approach**:
- Render-to-texture for minimap
- 2D canvas overlay for UI
- React component for minimap panel
- Camera teleport on minimap click

**DoD Criteria**:
- [ ] Minimap updates at 30 FPS minimum
- [ ] Units visible as colored dots
- [ ] Click-to-navigate works accurately
- [ ] Performance: <2ms minimap render time
- [ ] Minimap shows fog of war correctly

---

### **PRP 3.9: Unit State Machine & AI**
**Priority**: 🟡 High | **Effort**: 3 days | **Lines**: ~700

**What It Adds**:
- State machine: Idle, Moving, Attacking, Gathering, Building, Dying
- Idle behavior (play idle animations, look around)
- Auto-attack nearby enemies (if aggressive)
- Return fire when attacked
- Chase behavior (pursue fleeing enemies)
- Leash distance (return to guard position)

**Technical Approach**:
- Finite State Machine (FSM) per unit
- Behavior tree for decision making
- Perception system (detect enemies in range)
- Transition rules between states

**DoD Criteria**:
- [ ] Units auto-attack enemies when idle
- [ ] Units return to position after chase
- [ ] State transitions smooth and logical
- [ ] Performance: <1ms AI update per 500 units
- [ ] Unit tests for state machine logic

---

### **PRP 3.10: Game Simulation Loop**
**Priority**: 🔴 Critical | **Effort**: 2 days | **Lines**: ~400

**What It Adds**:
- Fixed timestep simulation (16ms ticks)
- Game speed control (pause, slow, fast)
- Deterministic update order
- Save/load game state (basic)
- Game time tracking (elapsed time)
- Simulation stats (units alive, resources total)

**Technical Approach**:
- Separate render loop (60 FPS) from sim loop (fixed)
- Delta time accumulator pattern
- Serializable game state (JSON)
- React UI for game speed controls

**DoD Criteria**:
- [ ] Simulation runs at exact 16ms intervals
- [ ] Game pause works correctly
- [ ] Save/load preserves game state
- [ ] Performance: Simulation overhead <10ms
- [ ] Deterministic (same inputs = same results)

---

## 📅 3-Week Implementation Timeline

### **Week 1: Core Interactions** (Parallel)
**Days 1-3**: PRP 3.1 - Unit Selection & Control
**Days 1-4**: PRP 3.2 - Command & Movement System
**Days 5**: Integration testing + selection panel UI

**Milestone**: ✅ Select and move 500 units smoothly

---

### **Week 2: Pathfinding & Resources** (Parallel)
**Days 1-5**: PRP 3.3 - Pathfinding System (A*)
**Days 1-3**: PRP 3.4 - Resource System
**Days 4-5**: PRP 3.5 - Building Placement (Part 1)

**Milestone**: ✅ Units navigate intelligently + gather resources

---

### **Week 3: Combat & Systems** (Parallel + Sequential)
**Days 1-2**: PRP 3.5 - Building Construction (Part 2)
**Days 1-4**: PRP 3.6 - Combat System
**Days 3-5**: PRP 3.7 - Fog of War
**Days 1-2**: PRP 3.8 - Minimap (can be parallel)
**Days 3-4**: PRP 3.9 - Unit AI & State Machine
**Days 5**: PRP 3.10 - Game Simulation Loop

**Milestone**: ✅ Fully playable RTS prototype (select, move, build, fight)

---

## ✅ Definition of Done - Phase 3

### Playability Gate 🎮
- [ ] Select units with drag-box and control groups
- [ ] Move units to any terrain location
- [ ] Units pathfind around obstacles
- [ ] Gather gold and lumber with workers
- [ ] Build structures (town hall, barracks)
- [ ] Train units from buildings
- [ ] Units auto-attack enemies in range
- [ ] Fog of War hides enemy units
- [ ] Minimap shows game state
- [ ] Pause/resume game

### Performance Gate 🚀
- [ ] 60 FPS with 500 units in combat
- [ ] <16ms pathfinding for 100 units
- [ ] <5ms fog of war update
- [ ] <2ms minimap render
- [ ] <10ms total simulation overhead
- [ ] No memory leaks during 30min session

### Quality Gate ✅
- [ ] Unit tests >80% coverage
- [ ] Integration tests for all systems
- [ ] AI behaves logically (no stuck units)
- [ ] Combat feels responsive
- [ ] Resource gathering works smoothly
- [ ] Building placement UX is clear

### Compatibility Gate 🔗
- [ ] Works with Phase 1 map loading
- [ ] Compatible with W3X unit data
- [ ] Compatible with SCM unit data
- [ ] Minimap shows terrain from Phase 1

---

## 🎯 Success Metrics

### Playability Benchmarks
```bash
# Unit selection performance
npm run benchmark -- selection-system
# Target: Select 500 units in <5ms

# Pathfinding performance
npm run benchmark -- pathfinding
# Target: 100 paths calculated in <16ms

# Combat simulation
npm run benchmark -- combat-system
# Target: 500 units fighting @ 60 FPS

# Full game loop
npm run benchmark -- game-simulation
# Target: 500 units + combat + resources @ 60 FPS
```

### Feature Completeness
```bash
# Playtest scenarios
npm run test:playtest -- scenario-1-gather-gold
npm run test:playtest -- scenario-2-build-base
npm run test:playtest -- scenario-3-unit-combat
npm run test:playtest -- scenario-4-fog-of-war

# Target: All scenarios pass
```

---

## 🔄 Integration with Previous Phases

### Phase 1 Dependencies
- **Terrain System**: Pathfinding grid from heightmap
- **GPU Instancing**: State updates for 500+ units
- **Map Loading**: Unit/building data from W3X/SCM

### Phase 2 Dependencies
- **Particle System**: Combat effects (blood, explosions)
- **Post-Processing**: Visual polish for effects

### Phase 3 Enables
- **Phase 4**: Editor needs selection and placement systems
- **Phase 5**: Multiplayer needs deterministic simulation
- **Phase 6**: Advanced AI builds on basic AI from Phase 3

---

## 📦 Dependencies & Resources

### NPM Packages
```json
{
  "dependencies": {
    "pathfinding": "^0.4.18",
    "yuka": "^0.8.0"
  }
}
```
*(Note: May implement custom A* for better control)*

### Test Data Requirements
- **10 test maps** with varying terrain complexity
- **Unit definitions** for 5-10 basic unit types
- **Combat test scenarios** (melee, ranged, siege)
- **Pathfinding test cases** (corridors, open fields, mazes)

---

## 🚨 Known Risks & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Pathfinding performance | Medium | High | Use Web Workers, hierarchical pathfinding |
| 500 units in combat lag | Medium | High | Spatial partitioning, update batching |
| Fog of War render cost | Low | Medium | Use render texture, update incrementally |
| AI stuck units | High | Medium | Extensive testing, fallback behaviors |

### Design Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Combat feels unresponsive | Medium | High | Tune attack speeds, visual feedback |
| Pathfinding looks unnatural | Medium | Medium | Path smoothing, formation logic |
| Resource gathering confusing | Low | Medium | Clear UI, tooltips, tutorials |

---

## 🎓 Key Technical Decisions

### 1. Pathfinding Algorithm
**Decision**: A* with hierarchical pathfinding for large maps
**Rationale**: Best balance of performance and path quality
**Alternatives Considered**: Dijkstra (too slow), JPS (complex), Flow Fields (not suitable for RTS)

### 2. Simulation Architecture
**Decision**: Fixed timestep (16ms) separate from render loop
**Rationale**: Deterministic for multiplayer, stable physics
**Alternatives Considered**: Variable timestep (non-deterministic), 60 FPS coupled (hard to sync)

### 3. Unit AI
**Decision**: Finite State Machine (FSM) + simple behavior tree
**Rationale**: Easy to debug, performant, extensible
**Alternatives Considered**: Full behavior trees (overkill), neural networks (non-deterministic)

### 4. Fog of War
**Decision**: Grid-based with render texture
**Rationale**: Fast updates, good visual quality
**Alternatives Considered**: Shader-only (hard to sync with game logic), CPU-only (slow)

---

## 📚 Resources & References

### Pathfinding
- [A* Algorithm Explained](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [RTS Pathfinding Techniques](https://www.gamedeveloper.com/programming/toward-more-realistic-pathfinding)
- [Hierarchical Pathfinding](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter17_Hierarchical_Pathfinding_for_Large_Maps.pdf)

### RTS Game Logic
- [Age of Empires Architecture](https://www.gamedeveloper.com/audio/the-architecture-of-age-of-empires)
- [StarCraft AI Deep Dive](https://www.codeofhonor.com/blog/the-starcraft-path-finding-hack)
- [Warcraft 3 Trigger System](http://www.wc3c.net/articles/triggers/)

### Combat Systems
- [RTS Damage Formulas](https://liquipedia.net/warcraft/Damage)
- [Unit Balance Design](https://www.designer-notes.com/?p=237)

---

## 🚀 Next Steps After Phase 3

### Phase 4: Editor MVP (Months 7-9 from Strategic Plan)
With game logic foundation complete, focus shifts to:
- Terrain painting tools
- Unit placement in editor
- Trigger GUI (visual scripting)
- Save to .edgestory format
- Community alpha testing (100 testers)

### Phase 5: Multiplayer Infrastructure
- Deterministic simulation (built in Phase 3)
- Colyseus integration with core-edge server
- Lobby system
- Replay system

---

## 📊 Budget & Resource Allocation

### Phase 3 Budget: $25,000
**Team**: 2-3 Developers @ $2,000-2,500/week

| Week | Focus | Team Size | Cost |
|------|-------|-----------|------|
| 1 | Selection + Movement | 2 devs | $5,000 |
| 2 | Pathfinding + Resources | 2 devs | $5,000 |
| 3 | Combat + Systems | 3 devs | $7,500 |
| **Buffer** | Testing + Polish | 2 devs | $5,000 |
| **Contingency** | Unexpected issues | - | $2,500 |

**Total**: $25,000 (within strategic plan Phase 1-3 budget)

---

## 🎉 Why Phase 3 is Critical

### Before Phase 3:
❌ Beautiful visuals but not a game
❌ Can load maps but nothing happens
❌ Units exist but don't respond
❌ No player interaction beyond camera

### After Phase 3:
✅ **Fully playable RTS prototype**
✅ **Community can test core gameplay**
✅ **Foundation for editor and multiplayer**
✅ **Clear path to MVP (Phase 4-5)**

---

## 📝 Alignment with Strategic Plan

| Strategic Goal | Phase 3 Contribution |
|---------------|---------------------|
| Phase 1 (Months 1-3): Basic renderer | ✅ Already complete (Phases 1-2) |
| Phase 2 (Months 4-6): Advanced rendering | ✅ Already complete (Phases 1-2) |
| **Phase 3 (Months 7-9): Editor MVP** | 🎮 **Game logic prerequisite** |
| Phase 4 (Months 10-12): Community alpha | 🎮 **Enables playtesting** |

**Key Insight**: The strategic plan's "Phase 3 Editor MVP" requires playable game logic FIRST. This document defines that prerequisite layer, making the editor meaningful (you need units to place, combat to test, etc.).

---

**Phase 3 transforms Edge Craft from a renderer into a game.** 🚀
