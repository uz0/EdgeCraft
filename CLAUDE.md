# Edge Craft - AI Development Guidelines

## 🎯 Project Context
**Edge Craft** is a WebGL-based RTS game engine supporting Blizzard file formats with legal safety through clean-room implementation. Built with **TypeScript, React, and Babylon.js**.

---

## ⚠️ CRITICAL: DOCUMENTATION DISCIPLINE

### 🚨 THE THREE-FILE RULE (MANDATORY)

**ONLY 3 types of documentation are allowed in this repository:**

1. **`CLAUDE.md`** - This file. AI development guidelines and workflow rules.
2. **`README.md`** - Project overview, setup instructions, current status.
3. **`PRPs/`** - Phase Requirement Proposals. The ONLY format for all project requirements.

**❌ FORBIDDEN DOCUMENTATION:**
- ❌ No `docs/` directory
- ❌ No scattered `.md` files in root
- ❌ No `ARCHITECTURE.md`, `TECHNICAL-SPEC.md`, `PLAN.md`, etc.
- ❌ No "summary" or "index" files outside PRPs/
- ❌ No duplicate documentation

**✅ IF IT'S NOT IN A PRP, IT DOESN'T EXIST.**

**Why This Rule Exists:**
- Prevents documentation drift and conflicts
- Single source of truth per phase
- Forces executable, actionable requirements
- Enables automation and clear gates
- Makes progress measurable

---

## 📋 PRP-ONLY WORKFLOW

### What is a PRP?

**PRP = Phase Requirement Proposal**

A PRP is the ONLY allowed format for documenting:
- Phase objectives and scope
- Technical requirements
- Implementation steps
- Success criteria
- Testing & validation
- Exit conditions

### PRP Structure (MANDATORY)

Every PRP MUST contain these sections:

```markdown
# PRP {N}: Phase {N} - {Phase Name}

**Phase Name**: {Name}
**Duration**: {X} weeks | **Team**: {N} developers | **Budget**: ${X}
**Status**: 📋 Planned | 🟡 In Progress | ✅ Complete

## 🎯 Phase Overview
{Strategic context, why this phase matters}

## 📋 Definition of Ready (DoR)
{Checklist of prerequisites to START this phase}
- [ ] Prerequisite 1
- [ ] Prerequisite 2
...

## ✅ Definition of Done (DoD)
{Checklist of deliverables to COMPLETE this phase}
- [ ] Deliverable 1
- [ ] Deliverable 2
...

## 🏗️ Implementation Breakdown
{Detailed architecture, code examples, sub-tasks}

## 📅 Implementation Timeline
{Week-by-week rollout plan}

## 🧪 Testing & Validation
{Benchmarks, test commands, success metrics}

## 📊 Success Metrics
{Quantifiable targets}

## 📈 Phase Exit Criteria
{Final checklist to close phase}
```

### PRP Naming Convention

```
PRPs/
├── phase1-foundation/
│   └── 1-mvp-launch-functions.md          # Consolidated Phase 1 PRP
├── phase2-rendering/
│   └── 2-advanced-rendering-visual-effects.md  # Consolidated Phase 2 PRP
├── phase3-gameplay/
│   └── 3-gameplay-mechanics.md            # Consolidated Phase 3 PRP
└── phase{N}-{slug}/
    └── {N}-{slug}.md                      # Consolidated Phase N PRP
```

**Rules:**
- **One PRP per phase** (consolidated)
- **PRP number = Phase number**
- **Filename = phase number + slug**
- **No sub-PRPs** - use "Implementation Breakdown" sections within main PRP

---

## 🔄 PHASE EXECUTION WORKFLOW

### The 4-Gate Iteration Cycle

Every phase follows this cycle:

```
┌─────────────────────────────────────────────────────────────┐
│ GATE 1: DoR VALIDATION                                      │
│ ✅ All prerequisites from previous phase complete           │
│ ✅ Infrastructure ready                                      │
│ ✅ Team assigned and available                              │
│ └──> AUTOMATION: CI/CD checks DoR checklist                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ GATE 2: IMPLEMENTATION                                       │
│ 📝 Follow PRP Implementation Breakdown section              │
│ 🧪 Run tests continuously (>80% coverage)                   │
│ ⚡ Meet performance targets (benchmarks pass)               │
│ 📊 Update DoD checklist items as completed                  │
│ └──> AUTOMATION: CI/CD runs tests, benchmarks on each PR    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ GATE 3: DOD VALIDATION                                       │
│ ✅ All DoD checklist items checked                          │
│ ✅ All success metrics met                                   │
│ ✅ All tests passing (>80% coverage)                        │
│ ✅ All benchmarks passing                                    │
│ └──> AUTOMATION: CI/CD blocks merge if DoD incomplete       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ GATE 4: PHASE CLOSURE                                        │
│ 📝 Update PRP status to ✅ Complete                         │
│ 📝 Update README.md with phase completion                   │
│ 📝 Merge to main branch                                      │
│ 📝 Next phase DoR automatically becomes ready               │
│ └──> AUTOMATION: GitHub Actions updates project board       │
└─────────────────────────────────────────────────────────────┘
```

### Gate Automation Rules

**GATE 1 (DoR) - Automated Checks:**
```yaml
# .github/workflows/gate-1-dor.yml
- Check all previous phase PRPs marked ✅ Complete
- Verify performance baselines documented
- Ensure no failing tests in main branch
- Validate team assignment in PRP
```

**GATE 2 (Implementation) - Continuous Validation:**
```yaml
# .github/workflows/gate-2-implementation.yml
on: [pull_request]
steps:
  - Run TypeScript type checking (strict mode)
  - Run test suite (require >80% coverage)
  - Run performance benchmarks (must meet targets)
  - Run legal compliance validation (zero copyright violations)
  - Check code < 500 lines per file
```

**GATE 3 (DoD) - Merge Blocker:**
```yaml
# .github/workflows/gate-3-dod.yml
on: [pull_request]
steps:
  - Parse PRP DoD checklist
  - Verify all [ ] items are [x] checked
  - Run full benchmark suite
  - Validate success metrics met
  - Block merge if ANY item incomplete
```

**GATE 4 (Closure) - Phase Transition:**
```yaml
# .github/workflows/gate-4-closure.yml
on: [push to main]
steps:
  - Update PRP status badge to ✅ Complete
  - Generate phase completion report
  - Update README.md progress tracking
  - Create GitHub release for phase
  - Notify team of next phase readiness
```

---

## 📊 CURRENT PROJECT STATUS

### Phase 2: Advanced Rendering & Visual Effects (IN PROGRESS)

**Overall Status**: ⚠️ 70% Complete | 🔴 3 Critical Issues Blocking Completion

**PRIMARY GOAL**: ALL 24 MAPS (14 w3x, 7 w3n, 3 SC2Map) RENDER CORRECTLY

#### ✅ What Works (70%)
- Rendering system architecture
- Post-processing effects (FXAA, Bloom, Color Grading, Tone Mapping)
- Advanced lighting (8 dynamic lights @ MEDIUM, distance culling)
- GPU particle system (5,000 particles @ 60 FPS)
- Weather effects (Rain, Snow, Fog)
- PBR material system (glTF 2.0)
- Custom shader framework (Water, Force Field, Hologram, Dissolve)
- Decal system (50 texture decals @ MEDIUM)
- Minimap RTT (256x256 @ 30fps)
- Quality presets (LOW/MEDIUM/HIGH/ULTRA)
- Map Gallery UI
- Legal Asset Library (19 terrain textures, 33 doodad models)

#### ❌ Critical Issues (30%)

**1. Terrain Multi-Texture Splatmap (P0 - CRITICAL)**
- **Problem**: All terrain rendered with single fallback texture (`terrain_grass_light`)
- **Root Cause**: `W3XMapLoader.ts:272` passes tileset letter "A" instead of `groundTextureIds` array
- **Technical Details**:
  - W3E parser correctly extracts `groundTextureIds` array: `["Adrt", "Ldrt", "Agrs", "Arok"]`
  - Each tile has `groundTexture` index (0-3) pointing to this array
  - Loader ignores this and passes "A" which has NO mapping in AssetMap
  - Result: Fallback to single grass texture across entire map
- **Solution Required**:
  - Modify `W3XMapLoader.convertTerrain()` to pass `groundTextureIds` array as textures
  - Implement splatmap shader with 4-8 texture samplers
  - Use texture indices for per-vertex blending
- **File Locations**: `src/formats/maps/w3x/W3XMapLoader.ts:272`, `src/engine/assets/AssetMap.ts`
- **ETA**: 2-3 days

**2. Asset Coverage Gap (P0 - CRITICAL)**
- **Problem**: 56/93 doodad types missing (60% render as placeholder boxes)
- **Stats for 3P Sentinel 01 v3.06.w3x**:
  - Total unique doodads: 93
  - Currently mapped: 34 (37%)
  - Missing: 56 (60%)
  - Visible as white cubes: ~2,520 instances
- **Missing Categories**:
  - Trees (10): `ASx0`, `ASx2`, `ATwf`, `COlg`, `CTtc`, `LOtr`, `LOth`, `LTe1`, `LTe3`, `LTbs`
  - Rocks (12): `AOsk`, `AOsr`, `COhs`, `LOrb`, `LOsh`, `LOca`, `LOcg`, `LTcr`, `ZPsh`, `ZZdt`
  - Plants (15): `APbs`, `APms`, `ASr1`, `ASv3`, `AWfs`, `DTg1`, `DTg3`, `NWfb`, `NWfp`, `NWpa`, `VOfs`, `YOec`, `YOf2`, `YOf3`, `YOfr`
  - Structures (11): `AOhs`, `AOks`, `AOla`, `AOlg`, `DRfc`, `NOft`, `NOfp`, `NWsd`, `OTis`, `ZPfw`, `LWw0`
  - Misc (8): `DSp9`, `LOtz`, `LOwr`, `LTlt`, `LTs5`, `LTs8`, `YTlb`, `YTpb`, `Ytlc`
- **Solution Required**:
  - Download Kenney.nl asset packs (CC0, FREE):
    - Nature Kit - trees, rocks, plants
    - Platformer Kit - structures
    - Dungeon Kit - cave props
  - Add to `public/assets/models/doodads/`
  - Map 40-50 new entries in `AssetMap.ts`
- **File Locations**: `src/engine/assets/AssetMap.ts`, `public/assets/models/doodads/`
- **ETA**: 4-6 hours manual work

**3. Unit Parser Failures (P1 - MAJOR)**
- **Problem**: Only 1/342 units parsed (0.3% success rate)
- **Error**: `[W3UParser] Failed to parse unit 2/342: RangeError: Offset is outside bounds`
- **Impact**: Map appears empty of units (99.7% parse failure)
- **Solution Required**:
  - Debug W3U parser offset errors
  - Add version detection for different W3X format versions
  - Add optional field handling (some fields may not exist in all versions)
  - Test with 3P Sentinel (342 units expected)
- **File Locations**: `src/formats/maps/w3x/W3UParser.ts`
- **ETA**: 1-2 days

#### 🎯 Required Work to Complete Phase 2

**Per PRP 2 (PRPs/phase2-rendering/2-advanced-rendering-visual-effects.md)**:

1. **Fix Terrain Multi-Texture Splatmap** (P0, ETA 2-3 days)
2. **Expand Asset Library** (P0, ETA 4-6 hours)
3. **Fix Unit Parser** (P1, ETA 1-2 days)
4. **Validate All 24 Maps** (P1, ETA 2 days)
5. **Create Screenshot Test Suite** (P1, ETA 2 days)

**Total Remaining Work**: 7-10 days to Phase 2 completion

---

## 🚀 AI AGENT WORKFLOW

### When Working on a Phase

**1. ALWAYS Read the PRP First**
```bash
# Before ANY implementation work
cat PRPs/phase{N}-{slug}/{N}-{slug}.md
```

**2. Validate DoR (Gate 1)**
- Check ALL DoR checklist items
- If ANY item unchecked → STOP, complete prerequisites first
- Never start implementation without passing Gate 1

**3. Follow Implementation Breakdown**
- Use architecture from PRP
- Use code examples from PRP
- Follow timeline from PRP
- Meet performance targets from PRP

**4. Update DoD as You Go**
- Check off [ ] items as completed
- Never mark item complete unless fully validated
- Keep PRP as single source of truth for progress

**5. Validate Success Metrics**
- Run benchmarks from PRP
- Ensure all metrics met
- Document results in PR

**6. Pass Gate 3 (DoD Validation)**
- All DoD items checked ✅
- All tests passing
- All benchmarks passing
- Ready for merge

### When Starting New Work

**ASK YOURSELF:**
1. **"Which phase am I in?"** → Check README.md
2. **"What's the current PRP?"** → Read `PRPs/phase{N}-{slug}/{N}-{slug}.md`
3. **"Did Gate 1 pass?"** → Validate DoR checklist
4. **"What's next to implement?"** → Check DoD, find unchecked items
5. **"How do I implement it?"** → Follow "Implementation Breakdown" section

**NEVER:**
- ❌ Create new documentation outside PRPs/
- ❌ Start implementation without reading PRP
- ❌ Skip DoR validation
- ❌ Mark DoD items complete without validation
- ❌ Merge without passing Gate 3

---

## 📏 CODE QUALITY RULES

### File Size Limit
- **HARD LIMIT: 500 lines per file**
- Split into modules when approaching limit
- Use barrel exports (`index.ts`) for clean APIs

### Code Organization
```
src/
├── engine/       # Babylon.js game engine core
│   ├── renderer/
│   ├── camera/
│   └── scene/
├── formats/      # File format parsers
│   ├── mpq/
│   ├── casc/
│   └── mdx/
├── gameplay/     # Game mechanics
│   ├── units/
│   ├── pathfinding/
│   └── combat/
```

**Each module should contain:**
- `index.ts` - Public exports
- `types.ts` - TypeScript interfaces
- `Component.tsx` - React component (if UI)
- `utils.ts` - Helper functions
- `Component.test.tsx` - Tests

### TypeScript Standards
```typescript
// ✅ DO: Use explicit types
interface UnitData {
  id: string;
  position: Vector3;
  health: number;
}

// ❌ DON'T: Use 'any'
function processUnit(unit: any) { } // FORBIDDEN

// ✅ DO: Use enums for constants
enum UnitType {
  WORKER = 'worker',
  WARRIOR = 'warrior'
}

// ✅ DO: Use async/await
async function loadMap(path: string): Promise<MapData> {
  const data = await fetch(path);
  return parse(data);
}
```

### React Patterns
```typescript
// ✅ DO: Functional components with hooks
const MapEditor: React.FC<MapEditorProps> = ({ mapData }) => {
  const [selectedTool, setSelectedTool] = useState<Tool>('terrain');
  const { terrain, updateTerrain } = useTerrainEditor(mapData);

  return <div>{/* UI */}</div>;
};

// ❌ DON'T: Class components
class MapEditor extends React.Component { } // Avoid
```

### Babylon.js Patterns
```typescript
// ✅ DO: Scene management with disposal
class GameScene {
  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;

  async initialize(): Promise<void> {
    // Setup scene, lights, camera
  }

  dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}
```

---

## 🧪 TESTING REQUIREMENTS

### Test Coverage
- **Minimum: 80% coverage** (enforced by CI/CD)
- Test files: `*.test.ts`, `*.test.tsx`
- Framework: Jest + React Testing Library

### Test Structure
```typescript
describe('FeatureName', () => {
  it('should handle normal operation', () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = feature(input);

    // Assert
    expect(result).toBe(expected);
  });

  it('should handle edge cases', () => {
    // Test boundary conditions
  });

  it('should handle errors gracefully', () => {
    // Test error handling
  });
});
```

### Performance Testing
- **Babylon.js**: 60 FPS with 500 units
- **Memory**: No leaks during 1-hour sessions
- **Load times**: Maps < 10 seconds, models < 1 second

**Benchmark Commands:**
```bash
# From PRP success metrics
npm run benchmark -- terrain-lod        # 60 FPS @ 256x256
npm run benchmark -- unit-instancing    # 60 FPS @ 500 units
npm run benchmark -- full-system        # All systems @ 60 FPS
```

---

## 🛡️ LEGAL COMPLIANCE

### Zero Tolerance Policy
- **NEVER include copyrighted assets** from Blizzard games
- **Use ONLY original or CC0/MIT licensed** content
- **Run validation before EVERY commit**: `npm run validate-assets`

### Asset Sources
- ✅ Original creations
- ✅ CC0 (Public Domain)
- ✅ MIT licensed
- ❌ Blizzard copyrighted content
- ❌ Fan-made assets derivative of Blizzard IP

### Automated Validation
```yaml
# .github/workflows/legal-compliance.yml
on: [push, pull_request]
steps:
  - SHA-256 hash check (blacklist)
  - Embedded metadata scan
  - Visual similarity detection
  - Block merge if violations found
```

---

## 📊 PERFORMANCE TARGETS

### Phase 1 Baseline
- 60 FPS @ 256x256 terrain with 4 textures
- 60 FPS @ 500 units with animations
- <200 draw calls
- <2GB memory usage
- No memory leaks over 1hr

### Phase 2 Targets
- 60 FPS @ MEDIUM preset (all effects active)
- <16ms frame time
- 5,000 GPU particles
- 8 dynamic lights
- Quality presets: LOW/MEDIUM/HIGH/ULTRA

### Phase 3 Targets
- 60 FPS with 500 units in combat
- <16ms pathfinding for 100 units
- <5ms selection for 500 units
- <10ms AI decision making
- Deterministic simulation (100% reproducible)

---

## 🎯 BABYLON.JS BEST PRACTICES

### Optimization Patterns
```typescript
// ✅ DO: Use thin instances for repeated objects
mesh.thinInstanceEnablePicking = false;
mesh.thinInstanceSetBuffer("matrix", matrixBuffer, 16);

// ✅ DO: Freeze active meshes when static
scene.freezeActiveMeshes();

// ✅ DO: Disable auto-clear for extra FPS
scene.autoClear = false;
scene.autoClearDepthAndStencil = false;

// ✅ DO: Use cascaded shadows (NOT regular shadow maps)
const shadowGen = new BABYLON.CascadedShadowGenerator(2048, light);

// ✅ DO: Bake animations for instanced units
const baker = new BABYLON.VertexAnimationBaker(scene, mesh);
```

### Anti-Patterns to Avoid
```typescript
// ❌ DON'T: Load entire maps into memory at once
const allData = loadEntireMap(); // BAD

// ✅ DO: Stream and chunk large data
const chunk = loadMapChunk(x, z); // GOOD

// ❌ DON'T: Use synchronous file operations
const data = fs.readFileSync(path); // BAD

// ✅ DO: Use async operations
const data = await fs.promises.readFile(path); // GOOD

// ❌ DON'T: Couple rendering to game logic
function update() {
  moveUnit();
  renderUnit(); // BAD - tight coupling
}

// ✅ DO: Separate concerns
function update() {
  gameLogic.update();
}
function render() {
  renderer.render();
}
```

---

## 📝 JSOC DOCUMENTATION

### Public APIs
```typescript
/**
 * Parses a Warcraft 3 map file (.w3x)
 *
 * @param buffer - The map file buffer
 * @returns Parsed map data with terrain, units, and triggers
 * @throws {InvalidFormatError} If map format is invalid
 * @throws {CorruptedDataError} If map data is corrupted
 *
 * @example
 * ```typescript
 * const mapData = await parseW3Map(buffer);
 * console.log(mapData.terrain.width); // 256
 * ```
 */
async function parseW3Map(buffer: ArrayBuffer): Promise<MapData>
```

### Complex Algorithms
```typescript
// A* pathfinding implementation
// Uses binary heap for O(log n) priority queue operations
// Grid-based navigation mesh with 8-directional movement
function findPath(start: Vector3, goal: Vector3): Vector3[] {
  // ... implementation with detailed comments
}
```

---

## 🚨 WORKFLOW VIOLATIONS & PENALTIES

### ❌ VIOLATIONS

**Documentation Violations:**
- Creating `.md` files outside PRPs/ → **Delete immediately**
- Creating `docs/` directory → **Delete immediately**
- Duplicating PRP content elsewhere → **Delete duplicates**
- Modifying requirements outside PRPs → **Revert changes**

**Process Violations:**
- Starting work without reading PRP → **Stop and read PRP**
- Skipping DoR validation → **Go back to Gate 1**
- Marking DoD items complete without validation → **Uncheck and validate**
- Merging without passing Gate 3 → **Block merge, fix issues**

### ✅ COMPLIANCE

**When You See Violations:**
1. **Immediately stop work**
2. **Delete forbidden documentation**
3. **Consolidate into PRPs/** if needed
4. **Update PRP with new information**
5. **Resume work following PRP**

**Enforcement:**
- CI/CD automatically rejects PRs with violations
- Code review checklist includes workflow compliance
- Automated scripts clean up violations weekly

---

## 🎯 QUICK REFERENCE

### Starting New Work
```bash
# 1. Check current phase
cat README.md

# 2. Read the PRP
cat PRPs/phase{N}-{slug}/{N}-{slug}.md

# 3. Validate DoR
grep "Definition of Ready" PRPs/phase{N}-{slug}/{N}-{slug}.md

# 4. Find next task
grep "^\- \[ \]" PRPs/phase{N}-{slug}/{N}-{slug}.md

# 5. Implement following PRP
# ... write code ...

# 6. Run tests
npm test

# 7. Run benchmarks
npm run benchmark

# 8. Update DoD
# Mark items complete in PRP
```

### Daily Checklist
- [ ] Read current PRP before coding
- [ ] Follow Implementation Breakdown
- [ ] Write tests (>80% coverage)
- [ ] Run benchmarks (meet targets)
- [ ] Update DoD checklist
- [ ] No files >500 lines
- [ ] No copyrighted assets
- [ ] No documentation outside PRPs/

---

## 📚 REMEMBER

**The Three-File Rule:**
1. `CLAUDE.md` ← You are here
2. `README.md` ← Project overview
3. `PRPs/` ← ONLY allowed requirements format

**If it's not in a PRP, it doesn't exist.**

**Every phase has:**
- ✅ DoR (prerequisites)
- ✅ DoD (deliverables)
- ✅ Implementation Breakdown (how-to)
- ✅ Success Metrics (validation)
- ✅ Exit Criteria (done means done)

**Every commit must:**
- ✅ Pass automated gates
- ✅ Meet PRP requirements
- ✅ Advance DoD progress
- ✅ Maintain quality standards

---

**This workflow ensures:**
- 🎯 Clear objectives (PRPs define goals)
- 📊 Measurable progress (DoD checklists)
- 🚦 Transparent gates (automation enforces)
- ✅ Quality assurance (tests + benchmarks)
- 🔄 Iterative improvement (phase-by-phase)
- 📝 Single source of truth (no doc drift)

**Follow this workflow. Trust the process. Ship great code.** 🚀
