# Edge Craft Project Guidelines

## 🎯 Project Context
**Edge Craft** is a WebGL-based RTS game engine supporting Blizzard file formats with legal safety through clean-room implementation. Built with **TypeScript, React, and Babylon.js**.

## 🔄 Project Awareness & Context
- **Always read project requirements** in PRPs/ to understand specific implementation details
- **Check existing implementations** before creating new features to maintain consistency
- **Use the Edge Craft architecture** patterns as defined in docs/ARCHITECTURE.md
- **Reference the legal compliance guidelines** in docs/LEGAL.md for any asset-related work

## 🧱 Code Structure & Modularity

### TypeScript/React Structure
- **Never create a file longer than 500 lines of code.** Split into modules when approaching limit
- **Organize code by feature domain**:
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

### Module Organization
- **Each feature module should contain**:
  - `index.ts` - Public exports
  - `types.ts` - TypeScript interfaces and types
  - `Component.tsx` - React component (if UI)
  - `utils.ts` - Helper functions
  - `Component.test.tsx` - Tests

### Import Conventions
- **Use absolute imports** from `src/` base: `import { Engine } from '@/engine'`
- **Group imports**: External libs, internal modules, types, styles
- **Use barrel exports** for clean API surfaces

## 🧪 Testing & Reliability

### Testing Requirements
- **Use Jest and React Testing Library** for tests
- **Create tests for**:
  - React components (render, interaction, state)
  - Babylon.js scenes (initialization, rendering)
  - File format parsers (parsing, validation, error handling)
  - Game logic (pathfinding, combat, resource management)

### Test Structure
```typescript
describe('FeatureName', () => {
  it('should handle normal operation', () => {});
  it('should handle edge cases', () => {});
  it('should handle errors gracefully', () => {});
});
```

### Performance Testing
- **Babylon.js performance**: Target 60 FPS with 500 units
- **Memory management**: No leaks during 1-hour sessions
- **Load times**: Maps < 10 seconds, models < 1 second

## ✅ Task Completion
- **Update PRPs/** when requirements change
- **Mark phase completion** in README.md roadmap
- **Document discovered issues** in GitHub issues

## 📎 Style & Conventions

### TypeScript Standards
```typescript
// Use explicit types, avoid 'any'
interface UnitData {
  id: string;
  position: Vector3;
  health: number;
}

// Use enums for constants
enum UnitType {
  WORKER = 'worker',
  WARRIOR = 'warrior'
}

// Use async/await over callbacks
async function loadMap(path: string): Promise<MapData> {
  // Implementation
}
```

### React Patterns
```typescript
// Functional components with hooks
const MapEditor: React.FC<MapEditorProps> = ({ mapData }) => {
  const [selectedTool, setSelectedTool] = useState<Tool>('terrain');

  // Use custom hooks for complex logic
  const { terrain, updateTerrain } = useTerrainEditor(mapData);

  return <div>{/* UI */}</div>;
};
```

### Babylon.js Patterns
```typescript
// Use scene management patterns
class GameScene {
  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;

  async initialize(): Promise<void> {
    // Setup scene, lights, camera
  }

  dispose(): void {
    // Cleanup resources
  }
}
```

## 🛡️ Legal Compliance
- **NEVER include copyrighted assets** from Blizzard games
- **Use only original or CC0/MIT licensed** models, textures, sounds
- **Document asset sources** in assets/LICENSES.md
- **Run copyright validation** before commits: `npm run validate-assets`

## 📚 Documentation & Comments
- **Update docs/** when architecture changes
- **Use JSDoc** for public APIs:
  ```typescript
  /**
   * Parses a Warcraft 3 map file
   * @param buffer - The map file buffer
   * @returns Parsed map data
   * @throws {InvalidFormatError} If map format is invalid
   */
  function parseW3Map(buffer: ArrayBuffer): MapData
  ```
- **Comment complex algorithms** (e.g., pathfinding, rendering optimizations)

## 🧠 AI Development Guidelines

### Research Before Implementation
- **Check Babylon.js documentation** for rendering features
- **Reference MDX viewer** for model format details
- **Study StormLib/CascLib** for archive formats
- **Review existing RTS engines** for gameplay patterns

### Critical Validations
- **Performance**: Run benchmarks after major changes
- **Legal**: Verify no copyrighted content
- **Compatibility**: Test with sample maps from both games
- **Memory**: Check for leaks with Chrome DevTools

### Common Pitfalls to Avoid
- ❌ Don't load entire maps into memory at once
- ❌ Don't use synchronous file operations
- ❌ Don't couple rendering to game logic
- ❌ Don't hardcode file format assumptions
- ❌ Don't skip error boundaries in React components

## 🚀 Development Workflow
1. **Start with PRP**: Check PRPs/ for detailed requirements
2. **Use appropriate agent**: `/agent babylon-renderer` for rendering tasks
3. **Validate continuously**: Run tests during development
4. **Update documentation**: Keep docs in sync with code
5. **Check legal compliance**: Ensure no copyright violations