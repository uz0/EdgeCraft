# PRP [Phase].[Number]: [System Name]

**Status**: 📋 Ready to Implement | **Effort**: [X] days | **Lines**: ~[XXX]
**Dependencies**: [List dependencies]

---

## Goal

[One sentence describing what this PRP delivers]

---

## Why

**Current Limitation**:
- [What's missing or broken]
- [Impact on functionality]

**DoD Requirements**:
- [Specific DoD requirement this addresses]
- [Performance target]
- [Quality requirement]

---

## What

[High-level description of the complete system]

### Key Features
1. **[Feature 1 Name]** - [Description]
2. **[Feature 2 Name]** - [Description]
3. **[Feature 3 Name]** - [Description]

---

## Implementation

### Architecture

```
src/[domain]/
├── [MainSystem].ts              # [Description] (XXX lines)
├── [SubSystem1].ts              # [Description] (XXX lines)
├── [SubSystem2].ts              # [Description] (XXX lines)
└── types.ts                     # Type definitions
```

### Core Implementation

```typescript
// src/[domain]/[MainSystem].ts

export class [SystemName] {
  // Key implementation details

  constructor(private scene: BABYLON.Scene) {
    this.initialize();
  }

  private initialize(): void {
    // Setup code
  }

  // Main API methods
}
```

---

## Performance Strategy

### [Strategy 1]
**Without Optimization**:
- [Baseline performance]

**With Optimization**:
- [Improved performance]
- [Technique used]

### Targets
- **[Metric 1]**: [Target value]
- **[Metric 2]**: [Target value]
- **Memory**: [Target]

---

## Success Criteria

- [ ] [Functional requirement 1]
- [ ] [Functional requirement 2]
- [ ] [Performance requirement 1]
- [ ] [Performance requirement 2]
- [ ] [Quality requirement]
- [ ] [Testing requirement]

---

## Testing

### Unit Tests
```typescript
describe('[SystemName]', () => {
  it('[test scenario]', () => {
    // Test implementation
  });
});
```

### Performance Tests
```bash
npm run benchmark -- [test-name]
# Expected: [performance target]
```

### Integration Tests
- [ ] [Integration scenario 1]
- [ ] [Integration scenario 2]

---

## Dependencies

```json
{
  "dependencies": {
    "[package]": "^[version]"
  }
}
```

---

## Rollout Plan

### Day 1: [Phase]
- [Task 1]
- [Task 2]

### Day 2: [Phase]
- [Task 1]
- [Task 2]

### Day [X]: [Phase]
- [Final tasks]
- Integration & testing

---

## Anti-Patterns to Avoid

- ❌ [Don't do this - why]
- ❌ [Don't do that - why]
- ✅ [Do this instead - why]

---

## Future Enhancements (Post-Phase)

- [ ] [Enhancement 1]
- [ ] [Enhancement 2]
- [ ] [Enhancement 3]

---

This PRP delivers [summary of value].
