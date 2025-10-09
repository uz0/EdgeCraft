# Contributing to Edge Craft

Thank you for your interest in contributing to Edge Craft! This document provides guidelines for contributing to the project.

## 🚨 Legal Requirements

**CRITICAL**: Edge Craft must maintain strict legal compliance. Before contributing, understand:

1. **NO copyrighted assets** from Blizzard games
2. **Clean-room implementation** only
3. All code must be **original work**
4. All assets must be **CC0, MIT, or originally created**

## 📋 Before You Start

1. Read the [README.md](./README.md) to understand the project
2. Review [CLAUDE.md](./CLAUDE.md) for coding standards
3. Check existing [PRPs](./PRPs/) for planned features
4. Search existing issues to avoid duplicates

## 🔄 Development Workflow

### 1. Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/your-org/edge-craft.git
cd edge-craft

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### 2. Context Engineering Workflow

We use Context Engineering methodology with AI assistance:

```bash
# Generate a PRP for your feature
/generate-prp features/your-feature.md

# Execute the PRP
/execute-prp PRPs/your-feature.md

# Use specialist agents as needed
/agent babylon-renderer    # For rendering work
/agent format-parser       # For file format work
/agent legal-compliance    # For asset validation
```

### 3. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 4. Make Your Changes

Follow these guidelines:

- **TypeScript**: Use strict mode, no `any` types
- **React**: Functional components with hooks
- **Babylon.js**: Proper resource disposal
- **Tests**: Minimum 70% coverage
- **Documentation**: Update relevant docs

### 5. Validate Your Work

Run all validation checks:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm test

# Asset validation (IMPORTANT!)
npm run validate-assets

# Performance benchmarks (for engine changes)
npm run benchmark
```

### 6. Submit Pull Request

1. Push your branch
2. Create PR with clear description
3. Link related issues
4. Ensure CI passes
5. Wait for review

## 📝 Code Style

### TypeScript
```typescript
// Good: Explicit types, clear naming
interface UnitData {
  id: string;
  position: Vector3;
  health: number;
}

// Bad: Any types, unclear names
interface Data {
  id: any;
  pos: any;
  hp: any;
}
```

### React Components
```typescript
// Good: Typed props, clear structure
const MapEditor: React.FC<MapEditorProps> = ({ mapData }) => {
  const [selectedTool, setSelectedTool] = useState<Tool>('terrain');
  // Component logic
  return <div>{/* JSX */}</div>;
};
```

### Babylon.js
```typescript
// Good: Proper cleanup
class GameScene {
  dispose(): void {
    this.mesh?.dispose();
    this.material?.dispose();
    this.texture?.dispose();
  }
}
```

## 🧪 Testing Requirements

All contributions must include tests:

```typescript
describe('YourFeature', () => {
  it('should handle normal operation', () => {
    // Test expected behavior
  });

  it('should handle edge cases', () => {
    // Test boundary conditions
  });

  it('should handle errors gracefully', () => {
    // Test error scenarios
  });
});
```

## 📚 Documentation

Update documentation when:
- Adding new features
- Changing APIs
- Modifying architecture
- Updating dependencies

## 🛡️ Asset Guidelines

### Creating Original Assets

1. **Models**: Use Blender, export as glTF
2. **Textures**: Create from scratch or use CC0 sources
3. **Audio**: Original creation or royalty-free sources

### Asset Attribution

Add to `assets/LICENSES.md`:
```markdown
- asset_name.ext - License - Creator - Source URL
```

## 🐛 Reporting Issues

Use the issue templates:
- **Bug Report**: For defects
- **Feature Request**: For enhancements
- **Legal Concern**: For copyright issues

Include:
1. Clear description
2. Steps to reproduce (for bugs)
3. Expected vs actual behavior
4. System information
5. Screenshots if applicable

## 🚀 Feature Requests

1. Check if already requested
2. Create detailed issue
3. Consider creating a PRP
4. Discuss in community channels

## 💬 Communication

- **GitHub Issues**: For bugs and features
- **Discussions**: For questions and ideas
- **Discord**: [Join our server](https://discord.gg/edgecraft)

## ⚖️ Legal Compliance Checklist

Before submitting:

- [ ] No Blizzard assets included
- [ ] No copyrighted code copied
- [ ] All assets have proper licenses
- [ ] Attribution file updated
- [ ] `npm run validate-assets` passes

## 🙏 Thank You!

Your contributions help make Edge Craft better for everyone. We appreciate your time and effort in following these guidelines.

Remember: Quality over quantity. A well-tested, documented feature is worth more than many hasty additions.