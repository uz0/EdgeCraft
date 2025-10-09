# Benchmark Performance

Run comprehensive performance benchmarks on Edge Craft engine to ensure it meets target specifications.

## Benchmark Suite

### 1. Rendering Performance
Test Babylon.js rendering under various loads:
- Baseline: Empty scene with camera
- Terrain: 256x256 heightmap with multi-texturing
- Units: Incrementally add units (100, 500, 1000, 2000)
- Effects: Particle systems and animations
- UI: React overlay performance impact

### 2. Memory Usage
Monitor memory consumption:
- Initial load memory
- Memory per unit
- Memory per terrain chunk
- Texture memory usage
- Memory leaks over time

### 3. Network Performance
Test multiplayer metrics:
- Command latency
- Bandwidth usage per player
- State synchronization time
- Desync detection

### 4. File Loading
Measure load times:
- MPQ extraction speed
- Map parsing time
- Asset loading (models, textures)
- Initial scene setup

## Implementation Steps

1. **Setup Benchmark Environment**
   - Create controlled test scenarios
   - Disable unnecessary features
   - Use performance.now() for timing

2. **Run Test Suites**
   ```typescript
   const benchmarks = [
     new RenderingBenchmark(),
     new MemoryBenchmark(),
     new NetworkBenchmark(),
     new LoadingBenchmark()
   ];

   for (const benchmark of benchmarks) {
     await benchmark.run();
     benchmark.report();
   }
   ```

3. **Collect Metrics**
   - FPS (min, max, average, 1% low)
   - Frame time (ms)
   - GPU usage
   - CPU usage per core
   - Network round-trip time

4. **Generate Report**

## Expected Output
```
Edge Craft Performance Benchmark Report
=======================================
Date: 2024-01-20
Version: 0.1.0
Platform: Chrome 120, Windows 11, RTX 3060

RENDERING PERFORMANCE
--------------------
Empty Scene:        144 FPS (6.9ms)
Terrain (256x256):   92 FPS (10.9ms)
100 Units:           88 FPS (11.4ms)
500 Units:           61 FPS (16.4ms)
1000 Units:          34 FPS (29.4ms)
2000 Units:          18 FPS (55.6ms)

✅ Target Met: 60 FPS with 500 units

MEMORY USAGE
------------
Initial Load:        245 MB
Per Unit:            0.8 MB
Per Terrain Chunk:   2.3 MB
After 1 Hour:        412 MB
Memory Leaked:       0 MB

✅ No memory leaks detected

NETWORK PERFORMANCE
------------------
Avg Latency:         43ms
Bandwidth/Player:    4.2 KB/s
Sync Time:           12ms
Desyncs in 1hr:      0

✅ All network targets met

FILE LOADING
------------
MPQ (50MB):          1.2s
Map Parse:           0.8s
100 Models:          2.3s
Scene Setup:         0.4s
Total Load:          4.7s

✅ Map loads in < 10s

OVERALL RESULT: PASS
All performance targets achieved.
```

## Configuration
Benchmarks can be configured in `benchmark.config.json`:
```json
{
  "targets": {
    "fps": 60,
    "maxUnits": 500,
    "maxMemory": 2048,
    "maxLoadTime": 10000,
    "maxLatency": 100
  },
  "scenarios": {
    "stress": true,
    "endurance": true,
    "edge_cases": true
  }
}
```

## Usage
```bash
# Run all benchmarks
/benchmark-performance

# Run specific benchmark
/benchmark-performance --only=rendering

# Run with custom config
/benchmark-performance --config=benchmark.stress.json
```

Regular benchmarking ensures Edge Craft maintains performance standards as features are added.