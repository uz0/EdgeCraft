# Edge Craft Roadmap: Phases 3-6 Detailed Plan

## 🎯 Executive Summary

This document provides **detailed recommendations for Phases 3-6** of Edge Craft development, bridging the gap between rendering infrastructure (Phases 1-2) and production-ready game engine (Phases 7+).

**Timeline**: 12-16 weeks total
**Team**: 2-4 developers
**Budget**: $90,000-120,000

---

## 📊 Strategic Context

### Where We Are
- ✅ **Phase 0**: Project bootstrap (3/15 PRPs complete)
- 🚧 **Phase 1**: Core engine + rendering (1/7 PRPs complete)
- ⏳ **Phase 2**: Advanced rendering (planned)

### Where We're Going
- 🎮 **Phase 3**: Game Logic Foundation (playable prototype)
- 🛠️ **Phase 4**: Editor MVP (content creation)
- 🌐 **Phase 5**: Multiplayer Infrastructure (online play)
- ⚡ **Phase 6**: Advanced Features (production polish)

### Alignment with Strategic Plan
The original strategic plan defines:
- **Months 1-3**: Basic renderer → Phases 0-1
- **Months 4-6**: Advanced rendering → Phase 2
- **Months 7-9**: Editor MVP → Phases 3-4
- **Months 10-12**: Community alpha → Phases 5-6

**This roadmap refines those goals with detailed PRPs and dependencies.**

---

## 🎮 Phase 3: Game Logic Foundation (3 weeks)

### Overview
**Transform renderer into playable game**

**Goal**: Users can select units, gather resources, build structures, and engage in combat.

**Duration**: 3 weeks | **Team**: 2-3 developers | **Budget**: $25,000

### PRPs (10 total)
See [PHASE3-DEFINITION.md](./PHASE3-DEFINITION.md) for complete details.

| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 3.1 | Unit Selection & Control | 3 | 🔴 Critical |
| 3.2 | Command & Movement | 4 | 🔴 Critical |
| 3.3 | Pathfinding (A*) | 5 | 🔴 Critical |
| 3.4 | Resource System | 3 | 🟡 High |
| 3.5 | Building Placement | 4 | 🟡 High |
| 3.6 | Combat System | 4 | 🟡 High |
| 3.7 | Fog of War | 3 | 🟡 High |
| 3.8 | Minimap | 2 | 🟢 Medium |
| 3.9 | Unit AI & State Machine | 3 | 🟡 High |
| 3.10 | Game Simulation Loop | 2 | 🔴 Critical |

### Success Metrics
- [ ] 500 units @ 60 FPS in combat
- [ ] <16ms pathfinding for 100 units
- [ ] Playable "gather → build → fight" loop
- [ ] Fog of War working correctly
- [ ] Save/load game state

### Key Deliverables
1. **Playable Prototype**: Demo map with 2 factions
2. **AI Opponent**: Basic attack-move AI
3. **Resource Economy**: Gold/lumber gathering
4. **Unit Roster**: 5-10 basic units (worker, melee, ranged, etc.)

### Phase 3 Dependencies
**Requires**:
- Phase 1 terrain system (for pathfinding grid)
- Phase 1 GPU instancing (for unit rendering)
- Phase 1 map loading (for unit/building data)

**Enables**:
- Phase 4 editor (needs selection and placement)
- Phase 5 multiplayer (needs deterministic simulation)
- Phase 6 advanced features (builds on AI/combat)

---

## 🛠️ Phase 4: Editor MVP (4 weeks)

### Overview
**Enable community content creation**

**Goal**: Users can create custom maps with terrain, units, triggers, and save to .edgestory format.

**Duration**: 4 weeks | **Team**: 3-4 developers | **Budget**: $40,000

### PRPs (15 total)

#### **Terrain Editing** (Week 1)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 4.1 | Editor Framework & UI | 3 | 🔴 Critical |
| 4.2 | Terrain Height Sculpting | 3 | 🔴 Critical |
| 4.3 | Texture Painting (Multi-layer) | 3 | 🔴 Critical |
| 4.4 | Cliff & Ramp Placement | 2 | 🟡 High |
| 4.5 | Water & Doodad Placement | 2 | 🟡 High |

#### **Unit & Building Placement** (Week 2)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 4.6 | Unit Placer with Properties | 3 | 🔴 Critical |
| 4.7 | Building Placer | 2 | 🔴 Critical |
| 4.8 | Starting Location Setup | 2 | 🔴 Critical |
| 4.9 | Player Configuration | 2 | 🟡 High |
| 4.10 | Map Settings (size, tileset, etc.) | 2 | 🟡 High |

#### **Trigger System** (Week 3)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 4.11 | Visual Trigger Editor (Blockly) | 5 | 🔴 Critical |
| 4.12 | Event System (unit dies, enters region) | 3 | 🔴 Critical |
| 4.13 | Action System (create unit, play sound) | 3 | 🟡 High |
| 4.14 | Condition System (if/else logic) | 2 | 🟡 High |

#### **Save & Test** (Week 4)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 4.15 | Save to .edgestory Format | 3 | 🔴 Critical |
| 4.16 | Test Mode (play in editor) | 2 | 🔴 Critical |
| 4.17 | Undo/Redo System | 2 | 🟡 High |
| 4.18 | Asset Browser & Import | 2 | 🟡 High |

### Success Metrics
- [ ] Create 256x256 map in <30 minutes
- [ ] Trigger editor supports 100+ event types
- [ ] Save/load .edgestory maps
- [ ] Test mode launches game from editor
- [ ] Undo/redo works for all operations

### Key Deliverables
1. **Editor Application**: Full map creation suite
2. **Sample Maps**: 5 example maps (tutorial, skirmish, custom)
3. **Trigger Library**: 50+ pre-built trigger templates
4. **Documentation**: Editor user guide and video tutorials

### Phase 4 Dependencies
**Requires**:
- Phase 3 unit selection (reuse for editor)
- Phase 3 building placement (extend for editor)
- Phase 3 game simulation (for test mode)
- Phase 1 map loading (for .edgestory format)

**Enables**:
- Phase 5 custom map sharing
- Phase 6 advanced editor features
- Community content creation (100+ alpha testers)

---

## 🌐 Phase 5: Multiplayer Infrastructure (4 weeks)

### Overview
**Enable online competitive and cooperative play**

**Goal**: Players can host/join lobbies, play synchronized matches, and watch replays.

**Duration**: 4 weeks | **Team**: 3 developers | **Budget**: $30,000

### PRPs (12 total)

#### **Core Networking** (Week 1)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 5.1 | Colyseus Client Integration | 3 | 🔴 Critical |
| 5.2 | Room Creation & Joining | 2 | 🔴 Critical |
| 5.3 | Player State Synchronization | 3 | 🔴 Critical |
| 5.4 | Latency Compensation | 2 | 🟡 High |

#### **Game Synchronization** (Week 2)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 5.5 | Deterministic Simulation | 5 | 🔴 Critical |
| 5.6 | Command Queue System | 3 | 🔴 Critical |
| 5.7 | Lockstep Synchronization | 4 | 🔴 Critical |

#### **Lobby & Matchmaking** (Week 3)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 5.8 | Lobby UI & Chat | 3 | 🔴 Critical |
| 5.9 | Matchmaking Algorithm | 3 | 🟡 High |
| 5.10 | Map Selection & Voting | 2 | 🟡 High |

#### **Replay & Spectator** (Week 4)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 5.11 | Replay Recording System | 3 | 🟡 High |
| 5.12 | Replay Playback | 2 | 🟡 High |
| 5.13 | Spectator Mode | 2 | 🟢 Medium |

### Success Metrics
- [ ] 8-player games with <100ms latency
- [ ] 99% synchronization accuracy (no desyncs)
- [ ] Matchmaking finds games in <30 seconds
- [ ] Replays work for 1-hour games
- [ ] Spectator mode supports 10+ viewers

### Key Deliverables
1. **Lobby System**: Create/join/customize games
2. **Replay System**: Record and playback matches
3. **Leaderboards**: ELO ranking system
4. **core-edge Integration**: Production server deployment

### Phase 5 Dependencies
**Requires**:
- Phase 3 deterministic simulation (CRITICAL)
- Phase 3 game logic (units, combat, resources)
- Phase 4 map loading (.edgestory support)
- External: core-edge server (https://github.com/uz0/core-edge)

**Enables**:
- Phase 6 competitive features (ranking, tournaments)
- Community alpha testing (100+ concurrent players)
- Esports potential

### External Repository Integration
**core-edge Server Requirements**:
```typescript
// Must implement these APIs
interface CoreEdgeAPI {
  // Room management
  createRoom(mapHash: string, settings: GameSettings): RoomID;
  joinRoom(roomID: string, playerToken: string): void;

  // Game synchronization
  sendCommand(roomID: string, command: GameCommand): void;
  syncState(roomID: string): GameState;

  // Replay storage
  saveReplay(roomID: string, replayData: ReplayData): void;
  loadReplay(replayID: string): ReplayData;
}
```

**Development Mode**: Use local mock server
**Production Mode**: Deploy to core-edge.edgecraft.game

---

## ⚡ Phase 6: Advanced Features & Polish (4 weeks)

### Overview
**Production-ready game engine with competitive features**

**Goal**: Feature-complete engine ready for public alpha release.

**Duration**: 4 weeks | **Team**: 3-4 developers | **Budget**: $35,000

### PRPs (16 total)

#### **Advanced Gameplay** (Week 1)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 6.1 | Hero Units & Abilities | 4 | 🔴 Critical |
| 6.2 | Tech Tree & Upgrades | 3 | 🔴 Critical |
| 6.3 | Unit Production Queues | 2 | 🔴 Critical |
| 6.4 | Alliance & Diplomacy | 2 | 🟡 High |

#### **Advanced AI** (Week 2)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 6.5 | AI Build Orders | 4 | 🟡 High |
| 6.6 | AI Army Management | 3 | 🟡 High |
| 6.7 | AI Difficulty Levels (Easy/Normal/Hard) | 2 | 🟡 High |

#### **Polish & Effects** (Week 3)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 6.8 | Sound Engine & Audio | 3 | 🔴 Critical |
| 6.9 | Music System (Dynamic) | 2 | 🟡 High |
| 6.10 | Advanced Particle Effects | 3 | 🟡 High |
| 6.11 | Cinematic Camera Tools | 2 | 🟢 Medium |

#### **Community Features** (Week 4)
| PRP | Name | Days | Priority |
|-----|------|------|----------|
| 6.12 | Mod Support Framework | 3 | 🟡 High |
| 6.13 | Custom Map Sharing (Workshop) | 3 | 🟡 High |
| 6.14 | Achievements System | 2 | 🟢 Medium |
| 6.15 | Localization (Multi-language) | 3 | 🟡 High |
| 6.16 | Analytics & Telemetry | 2 | 🟡 High |

### Success Metrics
- [ ] Hero abilities work smoothly (no lag)
- [ ] AI beats beginner players on Normal difficulty
- [ ] Sound/music enhance gameplay (not annoying)
- [ ] 10+ languages supported
- [ ] Mod system supports custom units/abilities

### Key Deliverables
1. **Complete Unit Roster**: 30+ units across 2-3 factions
2. **Advanced AI**: 3 difficulty levels with distinct strategies
3. **Sound Pack**: 500+ original sounds (CC0 licensed)
4. **Mod SDK**: Documentation and example mods
5. **Workshop Integration**: Upload/download custom maps

### Phase 6 Dependencies
**Requires**:
- Phase 3 combat system (for abilities)
- Phase 4 editor (for mod tools)
- Phase 5 multiplayer (for workshop)
- Phase 5 replay system (for analytics)

**Enables**:
- Public alpha release (Phases 7+)
- Community content ecosystem
- Competitive esports scene

---

## 📅 Combined Timeline (Phases 3-6)

### Gantt Overview
```
Week  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
─────────────────────────────────────────────────────
Phase 3: Game Logic      [====]
Phase 4: Editor MVP            [=======]
Phase 5: Multiplayer                  [======]
Phase 6: Advanced Features                   [======]
─────────────────────────────────────────────────────
                                                 ↑
                                            Alpha Ready
```

### Parallel Development Opportunities
- **Phase 3 + Phase 4 Prep**: While implementing game logic, UI team can design editor mockups
- **Phase 4 + Phase 5 Prep**: While building editor, backend team can set up core-edge server
- **Phase 5 + Phase 6 Prep**: While implementing multiplayer, content team can create assets

---

## 💰 Budget Breakdown (Phases 3-6)

| Phase | Duration | Team Size | Cost |
|-------|----------|-----------|------|
| Phase 3 | 3 weeks | 2-3 devs | $25,000 |
| Phase 4 | 4 weeks | 3-4 devs | $40,000 |
| Phase 5 | 4 weeks | 3 devs | $30,000 |
| Phase 6 | 4 weeks | 3-4 devs | $35,000 |
| **Total** | **15 weeks** | **Avg 3 devs** | **$130,000** |

**Contingency**: Add 10% ($13,000) for unexpected issues = **$143,000 total**

**Team Composition**:
- 2 Full-stack developers ($2,500/week each)
- 1 Backend/multiplayer specialist ($3,000/week)
- 1 UI/UX designer (part-time, $1,500/week)

---

## 🎯 Success Criteria by Phase

### Phase 3 Success = "It's a Game Now"
- ✅ Players can play against AI
- ✅ Basic economy and combat working
- ✅ Pathfinding feels natural
- ✅ Performance: 60 FPS with 500 units

### Phase 4 Success = "Community Can Create"
- ✅ Users create custom maps in <1 hour
- ✅ Trigger system supports complex scenarios
- ✅ Save/load .edgestory format
- ✅ 10+ community maps created during testing

### Phase 5 Success = "Multiplayer Works"
- ✅ 8-player games with <100ms latency
- ✅ No desyncs in 100 test games
- ✅ Replays work reliably
- ✅ 100+ concurrent players in alpha

### Phase 6 Success = "Production Ready"
- ✅ All core RTS features implemented
- ✅ Advanced AI provides challenge
- ✅ Sound/music enhance experience
- ✅ Mod system supports extensibility
- ✅ Ready for public alpha launch

---

## 🚨 Critical Path Dependencies

### Must Complete in Order
```
Phase 1 (Rendering)
   ↓
Phase 2 (Advanced Rendering)
   ↓
Phase 3 (Game Logic) ← Can't skip this
   ↓
Phase 4 (Editor) ← Needs Phase 3 selection/placement
   ↓
Phase 5 (Multiplayer) ← Needs Phase 3 deterministic sim
   ↓
Phase 6 (Polish) ← Needs all previous phases
```

### Can Parallelize
- **Phase 4 & 5**: Different teams (editor vs multiplayer)
- **Phase 6 assets**: Create while Phase 5 in progress
- **Documentation**: Write throughout all phases

---

## 🔄 Risk Mitigation Strategy

### Technical Risks

| Risk | Phase | Probability | Impact | Mitigation |
|------|-------|-------------|--------|------------|
| Pathfinding performance | 3 | Medium | High | Web Workers, spatial partitioning |
| Desync issues | 5 | High | Critical | Extensive testing, deterministic simulation |
| Editor complexity | 4 | Medium | Medium | Incremental feature rollout |
| AI too difficult/easy | 6 | Low | Medium | Extensive playtesting, tunable parameters |

### Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Phase overruns | Medium | High | 10% time buffer, prioritize P0 features |
| Key developer leaves | Low | Critical | Knowledge sharing, documentation |
| Scope creep | High | High | Strict PRP approval process |

### Legal Risks

| Risk | Phase | Probability | Impact | Mitigation |
|------|-------|-------------|--------|------------|
| Asset copyright | All | Medium | Critical | Automated validation, CC0-only |
| DMCA takedown | All | Low | High | Clean-room implementation |
| Patent infringement | 3-6 | Low | Medium | Patent search, prior art |

---

## 📊 Progress Tracking

### Weekly Metrics
Track these KPIs every week:
- [ ] PRPs completed vs planned
- [ ] Test coverage percentage
- [ ] Performance benchmarks (FPS, memory)
- [ ] Bug count (critical vs non-critical)
- [ ] Community engagement (Discord, GitHub)

### Phase Gates
Before advancing to next phase:
- [ ] All P0 PRPs completed
- [ ] All P1 PRPs completed or deferred with approval
- [ ] DoD met for all completed PRPs
- [ ] Performance benchmarks passing
- [ ] No critical bugs
- [ ] Documentation updated
- [ ] Team retrospective completed

---

## 🎓 Lessons from Similar Projects

### What Went Right (Learn From)
- **StarCraft 2 Arcade**: Community content drives engagement
- **Dota 2 Workshop**: Revenue sharing with creators
- **Minecraft Mods**: Open APIs enable innovation

### What Went Wrong (Avoid)
- **Warcraft 3 Reforged**: Breaking backward compatibility
- **StarCraft Remastered**: Insufficient new features
- **Unity RTS kits**: Poor performance at scale

### Apply These Principles
1. **Backward compatibility**: .edgestory evolves but supports old maps
2. **Community first**: Editor tools before advanced features
3. **Performance obsession**: 60 FPS is non-negotiable
4. **Legal paranoia**: Over-validate copyright

---

## 🚀 Post-Phase 6 (Phases 7-11)

### Phase 7: Beta Release & Testing
- Public beta (1,000+ players)
- Performance optimization
- Bug fixing and stability

### Phase 8: Production Launch
- Marketing and PR
- Server scaling (10,000+ concurrent)
- Monetization (cosmetics, premium maps)

### Phase 9: Post-Launch Support
- Seasonal content
- Esports infrastructure
- Community events

### Phase 10: Advanced Editor Features
- Terrain generation (procedural)
- Advanced triggers (nested logic)
- Custom unit models (in-browser)

### Phase 11: Long-term Vision
- Mobile version (tablet support)
- VR spectator mode
- Machine learning AI opponents

---

## 🎯 Alignment with Strategic Plan

| Strategic Milestone | Roadmap Phase | Timeline |
|---------------------|---------------|----------|
| Months 1-3: Basic renderer | Phases 0-1 | ✅ In progress |
| Months 4-6: Advanced rendering | Phase 2 | ⏳ Planned |
| Months 7-9: Editor MVP | **Phases 3-4** | 📋 This document |
| Months 10-12: Community alpha | **Phases 5-6** | 📋 This document |
| Year 2: Public beta | Phases 7-8 | 🔮 Future |
| Year 3: Full release | Phases 9-11 | 🔮 Future |

**This roadmap delivers the first year (Months 1-12) in detail.**

---

## 📚 Resources & References

### Pathfinding & AI
- [A* Pathfinding for Beginners](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [RTS AI Techniques](http://www.gameaipro.com/)
- [StarCraft AI Competition](https://www.cs.mun.ca/~dchurchill/starcraftaicomp/)

### Editor Design
- [Warcraft 3 World Editor Manual](http://www.wc3c.net/tools/)
- [StarCraft 2 Editor Tutorials](https://sc2mapster.gamepedia.com/)
- [Unity Terrain Tools](https://docs.unity3d.com/Manual/terrain-UsingTerrainTools.html)

### Multiplayer Architecture
- [Lockstep Networking](https://gafferongames.com/post/deterministic_lockstep/)
- [Colyseus Documentation](https://docs.colyseus.io/)
- [Real-time Multiplayer Best Practices](https://www.gabrielgambetta.com/client-server-game-architecture.html)

---

## ✅ Next Steps

### Immediate (This Week)
1. **Review Phase 3 Definition** ([PHASE3-DEFINITION.md](./PHASE3-DEFINITION.md))
2. **Create Phase 3 PRPs** (10 PRPs, use template)
3. **Set up project board** (GitHub Projects or Jira)
4. **Recruit team** (2-3 developers for Phase 3)

### Short-term (Next Month)
1. **Begin Phase 3 implementation** (Week 1: Selection + Movement)
2. **Design Phase 4 editor mockups** (UI/UX team)
3. **Set up core-edge dev environment** (Backend team)
4. **Create asset replacement database** (Legal/art team)

### Long-term (Next Quarter)
1. **Complete Phases 3-4** (7 weeks)
2. **Begin community alpha** (100 testers)
3. **Start Phase 5 multiplayer** (after Phase 4)
4. **Plan Phase 6 asset creation** (sounds, models)

---

**This roadmap provides a clear, actionable path from rendering engine to production-ready RTS game in 16 weeks.** 🚀🎮

**Total Investment**: $143,000
**Total Duration**: 16 weeks (4 months)
**Result**: Fully playable, multiplayer-enabled, community-driven RTS game engine

Ready to build the future of browser-based RTS gaming! 🌟
