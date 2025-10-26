# React Component Inventory (2025-10-26)

| Area | Component | Path | Notes |
|------|-----------|------|-------|
| HUD Shell | `MapViewer` | `src/ui/MapViewer.tsx` | Hosts Babylon canvas, minimap placeholder, debug overlay channel |
| HUD Shell | `DebugOverlay` | `src/ui/DebugOverlay.tsx` | Togglable FPS + draw call inspector |
| Gallery | `MapGallery` | `src/ui/MapGallery.tsx` | Grid of map cards with dynamic previews |
| Gallery | `MapPreviewReport` | `src/ui/MapPreviewReport.tsx` | Preview diagnostic panel |
| Gallery | `MapGallery.unit.tsx` | `src/ui/MapGallery.unit.tsx` | Unit tests documenting expected props |
| Canvas | `GameCanvas` | `src/ui/GameCanvas.tsx` | Creates Babylon engine + scene lifecycle |
| Loading | `LoadingScreen` | `src/ui/LoadingScreen.tsx` | Full-screen skeleton while assets load |
| Pages | `IndexPage` | `src/pages/IndexPage.tsx` | Entry shell, includes benchmark harness switch |
| Pages | `MapViewerPage` | `src/pages/MapViewerPage.tsx` | Map viewer page + error states |
| Tooling | `BenchmarkPage` | `src/pages/BenchmarkPage.tsx` | Benchmark harness UI |
