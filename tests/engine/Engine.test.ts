/**
 * Edge Craft Engine tests
 *
 * Note: These tests require full WebGL support which is not available in CI environments.
 * They are skipped for now and should be run in a browser environment for integration testing.
 */

import { EdgeCraftEngine } from '@/engine/core/Engine';

describe('EdgeCraftEngine', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
  });

  afterEach(() => {
    // Cleanup
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });

  it('should create engine instance', () => {
    const engine = new EdgeCraftEngine(canvas);
    expect(engine).toBeDefined();
    expect(engine.engine).toBeDefined();
    expect(engine.scene).toBeDefined();
    engine.dispose();
  });

  it('should start and stop render loop', () => {
    const engine = new EdgeCraftEngine(canvas);

    engine.startRenderLoop();
    const state1 = engine.getState();
    expect(state1.isRunning).toBe(true);

    engine.stopRenderLoop();
    const state2 = engine.getState();
    expect(state2.isRunning).toBe(false);

    engine.dispose();
  });

  it('should handle resize', () => {
    const engine = new EdgeCraftEngine(canvas);

    canvas.width = 1024;
    canvas.height = 768;

    expect(() => engine.resize()).not.toThrow();

    engine.dispose();
  });

  it('should dispose properly', () => {
    const engine = new EdgeCraftEngine(canvas);
    engine.startRenderLoop();

    expect(() => engine.dispose()).not.toThrow();

    const state = engine.getState();
    expect(state.isRunning).toBe(false);
  });

  it('should track engine state', () => {
    const engine = new EdgeCraftEngine(canvas);

    const state = engine.getState();
    expect(state).toHaveProperty('isRunning');
    expect(state).toHaveProperty('fps');
    expect(state).toHaveProperty('deltaTime');

    engine.dispose();
  });
});
