# PRP 3: Phase 3 - Gameplay Mechanics (Game Logic Foundation)

**Phase Name**: Game Logic Foundation
**Duration**: 2-3 weeks | **Team**: 2-3 developers | **Budget**: $25,000
**Status**: 📋 Planned (Post-Phase 2)

---

## 🎯 Phase Overview

Phase 3 transforms Edge Craft from a beautiful renderer into a playable RTS game by implementing core game mechanics: unit control, resource gathering, building construction, pathfinding, combat, and basic AI.

### Strategic Alignment
- **Product Vision**: Functional RTS gameplay loop (gather → build → fight)
- **Phase 3 Goal**: "Making it Playable" - First interactive prototype
- **Why This Matters**: Without gameplay, Edge Craft is just a tech demo. Phase 3 delivers the first playable experience.

**Why Game Logic Before Editor?**
- Can't build meaningful map tools without playable game mechanics
- Editor needs to test placement, triggers, balance → requires functional game
- Multiplayer needs deterministic simulation → must be built into game logic from start

---

## 📋 Definition of Ready (DoR)

### Prerequisites to Start Phase 3

**Phase 2 Systems Complete**:
- [ ] All Phase 2 DoD items completed
- [ ] Post-processing pipeline working (FXAA + Bloom @ MEDIUM)
- [ ] GPU particles (5,000) @ 60 FPS
- [ ] Advanced lighting (8 lights) functional
- [ ] Weather effects operational
- [ ] PBR materials rendering correctly
- [ ] Quality preset system auto-detecting hardware
- [ ] Performance validated at 60 FPS @ MEDIUM

**Performance Baseline Established**:
- [ ] **Phase 1+2 Frame Budget**: 14-16ms @ MEDIUM
- [ ] **FPS**: Stable 60 FPS with all visual systems active
- [ ] **Memory**: <2.5GB with all effects
- [ ] **Draw Calls**: <200 maintained

**Infrastructure Ready**:
- [ ] ECS (Entity Component System) implemented or planned
- [ ] Game state management architecture defined
- [ ] Input system ready for commands
- [ ] UI framework ready for game HUD

---

## ✅ Definition of Done (DoD)

### What Phase 3 Will Deliver

**1. Unit Selection & Control System**
- [ ] Drag-to-select box with visual feedback
- [ ] Click-to-select single units
- [ ] Shift-click to add/remove from selection
- [ ] Control groups (Ctrl+1-9 to set, 1-9 to recall)
- [ ] Selection UI panel showing unit stats
- [ ] Multi-unit selection with priority (heroes first)
- [ ] **Performance**: Select 500 units <5ms
- [ ] **Validation**: Control groups persist across sessions

**2. Command & Movement System**
- [ ] Right-click move commands
- [ ] Attack-move (A+click)
- [ ] Patrol command
- [ ] Hold position/Stop command
- [ ] Formation movement (maintain spacing)
- [ ] Waypoints (Shift+click)
- [ ] Visual command feedback (destination markers)
- [ ] **Performance**: 60 FPS with 500 units moving
- [ ] **Validation**: Units maintain formation during movement

**3. A* Pathfinding System**
- [ ] A* algorithm with binary heap priority queue
- [ ] Dynamic obstacle avoidance (units, buildings)
- [ ] Path smoothing and optimization
- [ ] Hierarchical pathfinding (for large maps)
- [ ] Unit collision detection and avoidance
- [ ] Path caching and reuse
- [ ] Web Worker for pathfinding (off main thread)
- [ ] **Performance**: Path calculation <16ms for 256x256 map
- [ ] **Validation**: 100 units pathfind simultaneously @ 60 FPS

**4. Resource System & Economy**
- [ ] Resource types (gold, lumber, food/supply)
- [ ] Resource gathering (units mine/chop)
- [ ] Resource deposit points (town hall, etc.)
- [ ] Resource UI display (real-time updates)
- [ ] Resource events (collected, spent, insufficient)
- [ ] Starting resources configuration
- [ ] **Performance**: 50 workers gathering without FPS drop
- [ ] **Validation**: Resources update in UI in real-time

**5. Building Placement & Construction**
- [ ] Building placement preview (green=valid, red=invalid)
- [ ] Grid-based placement system
- [ ] Collision detection (can't overlap)
- [ ] Construction progress (0% → 100%)
- [ ] Worker assignment to construction
- [ ] Building cancellation and refunds
- [ ] **Performance**: No FPS drop during placement preview
- [ ] **Validation**: Multiple workers speed up construction

**6. Unit Training & Production**
- [ ] Production queue (5 units max)
- [ ] Unit costs (resources + time)
- [ ] Rally points for new units
- [ ] Cancel production (refund 50%)
- [ ] Tech requirements (e.g., Barracks → Knight)
- [ ] **Performance**: Queue updates <1ms
- [ ] **Validation**: 10+ unit types trainable

**7. Combat System Prototype**
- [ ] Attack ranges and targeting
- [ ] Damage calculation (attack - armor)
- [ ] Damage types (normal, pierce, siege, magic)
- [ ] Attack cooldowns and animations
- [ ] Unit death and corpse removal
- [ ] Attack-move AI (attack nearest enemy)
- [ ] Target acquisition priorities
- [ ] **Performance**: 60 FPS with 500 units in combat
- [ ] **Validation**: Damage formulas match RTS standards

**8. Fog of War & Vision System**
- [ ] Fog of War rendering (black=unexplored, gray=explored, visible)
- [ ] Unit vision radius
- [ ] Building vision radius
- [ ] Vision sharing between allies
- [ ] Dynamic fog updates as units move
- [ ] Minimap fog integration
- [ ] **Performance**: <5ms fog update per frame
- [ ] **Validation**: Enemy units hidden outside vision

**9. Minimap System**
- [ ] Real-time minimap rendering (RTT integration with Phase 2)
- [ ] Terrain representation (colors for height/texture)
- [ ] Unit dots (color-coded by team)
- [ ] Building icons
- [ ] Click-to-navigate camera to location
- [ ] Ping system (alert teammates)
- [ ] Minimap fog of war
- [ ] **Performance**: <2ms minimap render time
- [ ] **Validation**: Minimap updates @ 30 FPS

**10. Basic AI System**
- [ ] AI gathers resources
- [ ] AI builds base (town hall, barracks, etc.)
- [ ] AI trains units (workers, soldiers)
- [ ] AI attacks player when strong enough
- [ ] 3 difficulty levels (Easy, Medium, Hard)
- [ ] **Performance**: AI decision making <10ms per frame
- [ ] **Validation**: Easy AI beatable, Hard AI challenging

**11. Game Simulation Loop (Deterministic)**
- [ ] Fixed timestep simulation (60 ticks/sec)
- [ ] Deterministic logic (for multiplayer)
- [ ] Game state serialization
- [ ] Save/load game state
- [ ] Replay recording infrastructure
- [ ] **Performance**: <10ms simulation overhead
- [ ] **Validation**: Same inputs = same outputs (100% reproducible)

---

## 🏗️ Implementation Breakdown

### PRP 3.1: Unit Selection & Control System
**Priority**: 🔴 Critical | **Effort**: 3 days | **Lines**: ~600

**Architecture**:
```
src/gameplay/selection/
├── SelectionManager.ts       (250 lines)
├── DragSelectBox.ts          (150 lines)
├── ControlGroups.ts          (100 lines)
└── SelectionUI.tsx           (100 lines)
```

**Key Implementation**:
```typescript
export class SelectionManager {
  private selectedUnits: Set<Unit> = new Set();
  private controlGroups: Map<number, Set<Unit>> = new Map();

  dragSelect(startPoint: Vector2, endPoint: Vector2): void {
    const box = this.createBoundingBox(startPoint, endPoint);
    this.selectedUnits.clear();

    for (const unit of this.allUnits) {
      if (box.intersects(unit.position)) {
        this.selectedUnits.add(unit);
      }
    }
  }

  setControlGroup(groupNumber: number): void {
    this.controlGroups.set(groupNumber, new Set(this.selectedUnits));
  }
}
```

---

### PRP 3.2: Command & Movement System
**Priority**: 🔴 Critical | **Effort**: 4 days | **Lines**: ~800

**Architecture**:
```
src/gameplay/commands/
├── CommandManager.ts         (300 lines)
├── MoveCommand.ts            (200 lines)
├── FormationSystem.ts        (200 lines)
└── WaypointSystem.ts         (100 lines)
```

**Key Implementation**:
```typescript
export class CommandManager {
  issueMove(units: Unit[], destination: Vector3): void {
    const formation = this.calculateFormation(units, destination);

    units.forEach((unit, index) => {
      const offset = formation.positions[index];
      unit.addCommand(new MoveCommand(destination.add(offset)));
    });
  }

  calculateFormation(units: Unit[], center: Vector3): Formation {
    const spacing = 2.0; // units apart
    const cols = Math.ceil(Math.sqrt(units.length));

    return this.gridFormation(units.length, cols, spacing, center);
  }
}
```

---

### PRP 3.3: A* Pathfinding System
**Priority**: 🔴 Critical | **Effort**: 5 days | **Lines**: ~1,200

**Architecture**:
```
src/gameplay/pathfinding/
├── AStarPathfinder.ts        (400 lines)
├── NavigationMesh.ts         (300 lines)
├── PathSmoother.ts           (200 lines)
├── PathCache.ts              (150 lines)
└── PathfindingWorker.ts      (150 lines)
```

**Key Implementation**:
```typescript
export class AStarPathfinder {
  private openSet: BinaryHeap<Node>;
  private closedSet: Set<Node>;

  findPath(start: Vector3, goal: Vector3): Vector3[] {
    this.openSet.push(this.createNode(start, goal));

    while (!this.openSet.isEmpty()) {
      const current = this.openSet.pop();

      if (current.position.equals(goal)) {
        return this.reconstructPath(current);
      }

      this.closedSet.add(current);

      for (const neighbor of this.getNeighbors(current)) {
        if (this.closedSet.has(neighbor)) continue;

        const tentativeG = current.g + this.distance(current, neighbor);

        if (tentativeG < neighbor.g) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, goal);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;

          if (!this.openSet.contains(neighbor)) {
            this.openSet.push(neighbor);
          }
        }
      }
    }

    return []; // No path found
  }
}
```

---

### PRP 3.4: Resource System & Economy
**Priority**: 🟡 High | **Effort**: 3 days | **Lines**: ~500

**Architecture**:
```
src/gameplay/economy/
├── ResourceManager.ts        (200 lines)
├── GatheringSystem.ts        (200 lines)
└── ResourceUI.tsx            (100 lines)
```

**Key Implementation**:
```typescript
export class ResourceManager {
  private resources: Map<ResourceType, number> = new Map();

  gather(worker: Unit, resource: ResourceNode): void {
    worker.setState('gathering');

    const timer = setInterval(() => {
      if (resource.isEmpty()) {
        clearInterval(timer);
        return;
      }

      const amount = worker.gatherRate;
      resource.deplete(amount);
      worker.carrying += amount;

      if (worker.carrying >= worker.carryCapacity) {
        clearInterval(timer);
        worker.returnToDeposit();
      }
    }, 1000);
  }

  deposit(worker: Unit, amount: number, type: ResourceType): void {
    const current = this.resources.get(type) || 0;
    this.resources.set(type, current + amount);
    worker.carrying = 0;
  }
}
```

---

### PRP 3.5: Building Placement & Construction
**Priority**: 🟡 High | **Effort**: 4 days | **Lines**: ~700

**Key Implementation**:
```typescript
export class BuildingPlacementSystem {
  previewPlacement(buildingType: string, position: Vector3): PlacementPreview {
    const isValid = this.checkCollisions(buildingType, position);

    return {
      position,
      valid: isValid,
      ghostMesh: this.createGhostMesh(buildingType, isValid),
      color: isValid ? Color3.Green() : Color3.Red()
    };
  }

  startConstruction(buildingType: string, position: Vector3, workers: Unit[]): Building {
    const building = new Building(buildingType, position);
    building.healthPercent = 0;

    workers.forEach(worker => {
      worker.setState('constructing');
      worker.assignedBuilding = building;
    });

    return building;
  }
}
```

---

### PRP 3.6: Unit Training & Production
**Priority**: 🟡 High | **Effort**: 2 days | **Lines**: ~400

**Key Implementation**:
```typescript
export class ProductionQueue {
  private queue: ProductionItem[] = [];
  private maxQueueSize = 5;

  addToQueue(unitType: string, cost: ResourceCost): boolean {
    if (this.queue.length >= this.maxQueueSize) return false;
    if (!this.canAfford(cost)) return false;

    this.queue.push({
      unitType,
      progress: 0,
      duration: this.getProductionTime(unitType)
    });

    this.deductResources(cost);
    return true;
  }

  update(deltaTime: number): void {
    if (this.queue.length === 0) return;

    const current = this.queue[0];
    current.progress += deltaTime;

    if (current.progress >= current.duration) {
      this.spawnUnit(current.unitType);
      this.queue.shift();
    }
  }
}
```

---

### PRP 3.7: Combat System Prototype
**Priority**: 🟡 High | **Effort**: 4 days | **Lines**: ~900

**Key Implementation**:
```typescript
export class CombatSystem {
  calculateDamage(attacker: Unit, defender: Unit): number {
    const baseDamage = attacker.attack;
    const armor = defender.armor;
    const damageType = attacker.damageType;
    const armorType = defender.armorType;

    // Damage type multipliers (W3-style)
    const multiplier = this.getDamageMultiplier(damageType, armorType);

    // Armor reduction formula
    const reduction = armor * 0.06; // 6% reduction per armor
    const finalDamage = baseDamage * multiplier * (1 - reduction);

    return Math.max(finalDamage, baseDamage * 0.15); // Minimum 15% damage
  }

  attack(attacker: Unit, target: Unit): void {
    if (!this.isInRange(attacker, target)) {
      attacker.moveTo(target.position);
      return;
    }

    if (attacker.attackCooldown > 0) return;

    const damage = this.calculateDamage(attacker, target);
    target.takeDamage(damage);

    attacker.attackCooldown = attacker.attackSpeed;
    attacker.playAnimation('attack');
  }
}
```

---

### PRP 3.8: Fog of War & Vision System
**Priority**: 🟡 High | **Effort**: 3 days | **Lines**: ~600

**Key Implementation**:
```typescript
export class FogOfWarSystem {
  private fogTexture: RenderTargetTexture;
  private visionGrid: Uint8Array; // 0=unexplored, 1=explored, 2=visible

  updateVision(units: Unit[], buildings: Building[]): void {
    // Reset visible areas
    this.clearVisible();

    // Add vision from units
    units.forEach(unit => {
      this.revealCircle(unit.position, unit.sightRange, 2); // visible
    });

    // Add vision from buildings
    buildings.forEach(building => {
      this.revealCircle(building.position, building.sightRange, 2);
    });

    // Update fog texture
    this.updateFogTexture();
  }

  revealCircle(center: Vector3, radius: number, state: number): void {
    const gridX = Math.floor(center.x / this.gridCellSize);
    const gridZ = Math.floor(center.z / this.gridCellSize);
    const radiusCells = Math.ceil(radius / this.gridCellSize);

    for (let x = -radiusCells; x <= radiusCells; x++) {
      for (let z = -radiusCells; z <= radiusCells; z++) {
        if (x*x + z*z <= radiusCells*radiusCells) {
          const index = (gridZ + z) * this.gridWidth + (gridX + x);
          this.visionGrid[index] = Math.max(this.visionGrid[index], state);
        }
      }
    }
  }
}
```

---

### PRP 3.9: Minimap System
**Priority**: 🟢 Medium | **Effort**: 2 days | **Lines**: ~400

**Integration with Phase 2 RTT**:
```typescript
export class MinimapSystem {
  private rtt: RenderTargetTexture; // From Phase 2

  initialize(scene: Scene): void {
    // Reuse Phase 2 minimap RTT
    this.rtt = scene.getTextureByName('minimapRTT');
    this.setupMinimapCamera();
  }

  handleClick(x: number, y: number): void {
    // Convert minimap coords to world coords
    const worldPos = this.minimapToWorld(x, y);
    this.mainCamera.setTarget(worldPos);
  }
}
```

---

### PRP 3.10: Basic AI System
**Priority**: 🟡 High | **Effort**: 4 days | **Lines**: ~700

**Key Implementation**:
```typescript
export class BasicAI {
  private state: AIState = 'gathering';

  update(deltaTime: number): void {
    switch (this.state) {
      case 'gathering':
        this.gatherResources();
        if (this.resources.gold > 500) {
          this.state = 'building';
        }
        break;

      case 'building':
        this.buildBase();
        if (this.hasBarracks()) {
          this.state = 'training';
        }
        break;

      case 'training':
        this.trainArmy();
        if (this.armySize() > 20) {
          this.state = 'attacking';
        }
        break;

      case 'attacking':
        this.attackPlayer();
        break;
    }
  }
}
```

---

### PRP 3.11: Game Simulation Loop (Deterministic)
**Priority**: 🔴 Critical | **Effort**: 3 days | **Lines**: ~500

**Key Implementation**:
```typescript
export class GameSimulation {
  private fixedTimeStep = 1 / 60; // 60 ticks per second
  private accumulator = 0;

  update(deltaTime: number): void {
    this.accumulator += deltaTime;

    while (this.accumulator >= this.fixedTimeStep) {
      this.tick();
      this.accumulator -= this.fixedTimeStep;
    }
  }

  tick(): void {
    // Deterministic update order (critical for multiplayer)
    this.processCommands();
    this.updateUnits();
    this.updateBuildings();
    this.updateCombat();
    this.updateAI();
    this.updateVision();
  }

  serializeState(): GameState {
    return {
      units: this.units.map(u => u.serialize()),
      buildings: this.buildings.map(b => b.serialize()),
      resources: this.resources,
      tick: this.currentTick
    };
  }
}
```

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

## 📅 Implementation Timeline

**Duration**: 2-3 weeks
**Team**: 2-3 developers
**Budget**: $25,000

### Week 1: Core Mechanics
- **Days 1-2**: Selection & command system
- **Days 3-5**: Pathfinding (A* algorithm)

### Week 2: Economy & Combat
- **Days 1-2**: Resource gathering & building placement
- **Days 3-5**: Combat system & unit training

### Week 3: Polish & AI
- **Days 1-2**: Fog of war & minimap
- **Days 3-4**: Basic AI
- **Day 5**: Deterministic simulation & testing

---

## 🧪 Testing & Validation

### Gameplay Tests
```bash
# Selection performance
npm run test -- selection-system
# Target: 500 units <5ms

# Pathfinding performance
npm run test -- pathfinding
# Target: 100 units simultaneously @ 60 FPS

# Combat performance
npm run test -- combat-system
# Target: 500 units fighting @ 60 FPS

# Full gameplay loop
npm run test -- gameplay-integration
# Target: Gather → Build → Fight playable
```

### Deterministic Validation
```bash
# Replay test (deterministic simulation)
npm run test -- deterministic-replay
# Target: Same inputs = same outputs (100% reproducible)
```

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Selection Performance | <5ms for 500 units |
| Pathfinding Performance | <16ms for 256x256 map |
| Combat Performance | 60 FPS with 500 units fighting |
| Resource Gathering | 50 workers without FPS drop |
| AI Decision Making | <10ms per frame |
| Simulation Overhead | <10ms per tick |

---

## 📈 Phase 3 Exit Criteria

Phase 3 is complete when ALL of the following are met:

**Functional Requirements**:
- [ ] Units can be selected and commanded
- [ ] Pathfinding works smoothly for 100+ units
- [ ] Resources can be gathered and spent
- [ ] Buildings can be placed and constructed
- [ ] Units can be trained from buildings
- [ ] Combat system functional (damage, death)
- [ ] Fog of war reveals and hides correctly
- [ ] Minimap clickable for navigation
- [ ] Basic AI gathers, builds, and attacks
- [ ] Game state can be saved/loaded
- [ ] Replay recording works

**Performance Requirements**:
- [ ] 60 FPS with all gameplay systems active
- [ ] No regressions in Phase 1/2 performance
- [ ] <10ms simulation overhead
- [ ] Deterministic simulation (100% reproducible)

**Quality Requirements**:
- [ ] >80% test coverage for gameplay systems
- [ ] Gameplay loop playable start to finish
- [ ] AI opponent provides challenge
- [ ] Documentation complete

---

## 🚀 What's Next: Phase 4

After Phase 3 completion, Phase 4 will add:
- Map Editor MVP (terrain editor, unit placer, trigger GUI)
- Save/export custom maps
- Community map sharing

**Phase 4 Start Prerequisites** (Phase 3 DoD = Phase 4 DoR):
- All Phase 3 DoD items completed ✅
- Gameplay loop validated as playable
- Deterministic simulation working
- Performance maintained at 60 FPS

---

**Phase 3 makes Edge Craft playable - the first interactive RTS prototype!** 🎮
