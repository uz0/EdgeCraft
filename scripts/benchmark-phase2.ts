/**
 * Phase 2 Performance Benchmark
 *
 * Validates:
 * - Post-processing: <4ms @ MEDIUM
 * - Lighting: <6ms @ MEDIUM (8 lights)
 * - Particles: <3ms @ MEDIUM (5,000 particles)
 * - Weather: <3ms total
 * - Decals: <2ms (50 decals)
 * - Minimap: <3ms @ MEDIUM
 * - Total Phase 2: 14-16ms @ MEDIUM ✅
 */

import * as BABYLON from '@babylonjs/core';
import {
  QualityPresetManager,
  QualityPreset,
} from '../src/engine/rendering';

interface BenchmarkResult {
  name: string;
  target: number;
  actual: number;
  passed: boolean;
}

/**
 * Run Phase 2 performance benchmarks
 */
async function runBenchmarks(): Promise<void> {
  console.log('========================================');
  console.log('Phase 2 Performance Benchmarks');
  console.log('========================================\n');

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  document.body.appendChild(canvas);

  // Create engine
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);

  // Add camera
  const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 10, -20), scene);
  camera.setTarget(BABYLON.Vector3.Zero());

  // Initialize Quality Preset Manager
  const manager = new QualityPresetManager(scene);
  await manager.initialize({
    initialQuality: QualityPreset.MEDIUM,
    enableAutoDetect: false,
    enableAutoAdjust: false,
  });

  // Get systems
  const systems = manager.getSystems();

  const results: BenchmarkResult[] = [];

  console.log('Running benchmarks...\n');

  // Run for 5 seconds to warm up
  console.log('Warming up (5s)...');
  await runForDuration(engine, scene, manager, 5000);

  // Get baseline stats
  const stats = manager.getStats();

  console.log('\n📊 System Performance:\n');

  // Post-processing
  results.push({
    name: 'Post-Processing @ MEDIUM',
    target: 4,
    actual: stats.systems.postProcessing,
    passed: stats.systems.postProcessing < 4,
  });

  // Lighting
  results.push({
    name: 'Lighting (8 lights) @ MEDIUM',
    target: 6,
    actual: stats.systems.lighting,
    passed: stats.systems.lighting < 6,
  });

  // Particles
  results.push({
    name: 'Particles (5k) @ MEDIUM',
    target: 3,
    actual: stats.systems.particles,
    passed: stats.systems.particles < 3,
  });

  // Weather
  results.push({
    name: 'Weather @ MEDIUM',
    target: 3,
    actual: stats.systems.weather,
    passed: stats.systems.weather < 3,
  });

  // Decals
  results.push({
    name: 'Decals (50) @ MEDIUM',
    target: 2,
    actual: stats.systems.decals,
    passed: stats.systems.decals < 2,
  });

  // Minimap
  results.push({
    name: 'Minimap (256x256@30fps) @ MEDIUM',
    target: 3,
    actual: stats.systems.minimap,
    passed: stats.systems.minimap < 3,
  });

  // Total Phase 2
  results.push({
    name: 'Total Phase 2 @ MEDIUM',
    target: 16,
    actual: stats.totalFrameTimeMs,
    passed: stats.totalFrameTimeMs < 16,
  });

  // Overall FPS
  results.push({
    name: 'FPS @ MEDIUM',
    target: 60,
    actual: stats.performance.fps,
    passed: stats.performance.fps >= 55, // Allow 5 FPS tolerance
  });

  // Print results
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(
      `${status} ${result.name}: ${result.actual.toFixed(2)}ms (target: <${result.target}ms)`
    );
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log('\n========================================');
  console.log(`Results: ${passed}/${total} benchmarks passed (${percentage}%)`);
  console.log('========================================\n');

  // Hardware info
  console.log('Hardware Info:');
  console.log(`- Quality: ${stats.quality}`);
  console.log(`- Hardware Tier: ${stats.hardwareTier}`);
  console.log(`- Browser: ${stats.browser}`);
  console.log(`- Safari Forced LOW: ${stats.isSafari ? 'Yes' : 'No'}`);

  console.log('\nPerformance Metrics:');
  console.log(`- FPS: ${stats.performance.fps.toFixed(1)}`);
  console.log(`- Frame Time: ${stats.performance.frameTimeMs.toFixed(2)}ms`);
  console.log(`- Draw Calls: ${stats.performance.drawCalls}`);
  console.log(`- Memory: ${stats.performance.memoryMB.toFixed(1)}MB`);

  // Cleanup
  manager.dispose();
  scene.dispose();
  engine.dispose();

  console.log('\n✅ Phase 2 benchmarks complete!\n');
}

/**
 * Run engine for specified duration
 */
async function runForDuration(
  engine: BABYLON.Engine,
  scene: BABYLON.Scene,
  manager: QualityPresetManager,
  durationMs: number
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    engine.runRenderLoop(() => {
      const deltaTime = engine.getDeltaTime() / 1000;
      manager.update(deltaTime);
      scene.render();

      if (Date.now() - startTime >= durationMs) {
        engine.stopRenderLoop();
        resolve();
      }
    });
  });
}

// Run benchmarks
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    runBenchmarks().catch(console.error);
  });
}
