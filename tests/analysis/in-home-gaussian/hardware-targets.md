# Target Device Matrix

| Segment | Devices | Browser | Notes |
|---------|---------|---------|-------|
| Desktop Tier 1 | Windows 11 (RTX 3060), macOS 14 (M2 Pro) | Chrome 129, Edge 129, Safari 17.4 | Capture via WebRTC + WebCodecs; reconstruction trigger from desktop portal |
| Desktop Tier 2 | Windows 11 (Iris Xe), macOS 13 (M1) | Chrome 129, Safari 17.4 | Offer 30 fps capture fallback, disable real-time preview |
| Mobile Flagship | iPhone 15 Pro, Pixel 9 Pro | Safari 17, Chrome 129 | Use ARKit/ARCore for pose hints; limit session to 12 minutes |
| Mobile Mid | iPhone 13, Samsung S21 | Safari 17, Chrome 129 | Auto-reduce bitrate to 120 Mbps, warn about thermal throttling |
| Tablet | iPad Pro (M2), Galaxy Tab S9 | Safari 17, Chrome 129 | Support LiDAR depth map import when available |

All profiles validated with quick soak tests (5 min capture) on 2025-10-24; telemetry stored in `tests/analysis/in-home-gaussian/device-soak.csv`.
