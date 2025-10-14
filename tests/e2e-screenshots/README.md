# E2E Screenshot Baselines

This directory contains baseline screenshots for visual regression testing.

## Structure

- `gallery-initial.png` - Initial map gallery view
- `map-{format}-loaded.png` - Map rendered in viewer
- `*-diff.png` - Generated diff images on failure (gitignored)

## Updating Baselines

When visual changes are intentional, update baselines:

```bash
npm run test:e2e:update-snapshots
```

## CI Behavior

- CI runs with 5% pixel difference tolerance
- Diffs are uploaded as artifacts on failure
- Screenshots are compared across Chromium only (consistent rendering)
