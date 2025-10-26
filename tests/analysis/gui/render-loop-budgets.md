# Render Loop Budgets

Benchmark command: `npm run benchmark:browser`

Summary (Chromium 129, macOS 14 / M2 Pro):
- Edge Craft HUD harness: **2.5 ms** average per 360 UI operations (<16 ms budget, UI share 2.5 ms < 3 ms target).
- Babylon GUI baseline: 4.1 ms.
- WinterCardinal UI baseline: 4.6 ms.

Scene replay (MapViewer idle camera, 256×256 terrain):
- Frame time: 11.6 ms avg, 14.2 ms 95th percentile.
- Babylon render thread: 8.9 ms.
- UI overlay (`DebugOverlay` + placeholders): 2.1 ms.
- Headroom: 4.4 ms before exceeding 60 FPS budget.

Data captured 2025-10-26, stored as JSON in `tests/analysis/browser-benchmark-results.json`.
