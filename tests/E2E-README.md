# Edge Craft E2E Testing

End-to-end testing infrastructure using Playwright for WebGL/Babylon.js rendering validation.

## Quick Start

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Tests in UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Debug Tests
```bash
npm run test:e2e:debug
```

### Update Screenshot Baselines
```bash
npm run test:e2e:update-snapshots
```

## Test Structure

- `tests/map-gallery.spec.ts` - Gallery UI, search, filters
- `tests/w3x-rendering.spec.ts` - W3X map loading/rendering
- `tests/w3n-rendering.spec.ts` - W3N campaign loading
- `tests/sc2-rendering.spec.ts` - SC2Map loading
- `tests/visual-regression.spec.ts` - Screenshot comparisons

## Writing New Tests

### Basic Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test('my new test', async ({ page }) => {
  await page.goto('/');
  // ... test actions
});
```

### Using Helpers

```typescript
import { selectMap, waitForMapLoaded } from '../fixtures/screenshot-helpers';

test('test map loading', async ({ page }) => {
  await page.goto('/');
  await selectMap(page, 'Footmen Frenzy 1.9f.w3x');
  await waitForMapLoaded(page);
  // ... assertions
});
```

## CI Integration

E2E tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

Failed test artifacts (screenshots, videos, traces) are uploaded for debugging.

## Docker Testing

Run tests in Docker for CI consistency:

```bash
npm run test:e2e:docker
```

## Troubleshooting

### Tests Timeout
- Increase timeout in `playwright.config.ts`
- Check dev server is starting correctly

### Screenshot Differences
- Anti-aliasing can vary across systems
- Update baselines if changes are intentional
- Use 5% threshold for tolerance

### WebGL Context Loss
- Ensure proper scene disposal in tests
- Check browser GPU support

## Resources

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Babylon.js Playwright Example](https://github.com/BarthPaleologue/BabylonPlaywrightExample)
- [Edge Craft Testing Guide](../CONTRIBUTING.md#testing)
