/**
 * Shadow Quality Settings tests
 */

import * as BABYLON from '@babylonjs/core';
import {
  ShadowQuality,
  getQualityPreset,
  autoDetectQuality,
  SHADOW_QUALITY_PRESETS
} from '@/engine/rendering/ShadowQualitySettings';

describe('ShadowQualitySettings', () => {
  describe('Quality Presets', () => {
    it('should have LOW preset', () => {
      const preset = SHADOW_QUALITY_PRESETS[ShadowQuality.LOW];

      expect(preset).toBeDefined();
      expect(preset.shadowMapSize).toBe(1024);
      expect(preset.numCascades).toBe(2);
      expect(preset.enablePCF).toBe(false);
      expect(preset.cascadeBlendPercentage).toBe(0.05);
      expect(preset.maxShadowCasters).toBe(20);
    });

    it('should have MEDIUM preset', () => {
      const preset = SHADOW_QUALITY_PRESETS[ShadowQuality.MEDIUM];

      expect(preset).toBeDefined();
      expect(preset.shadowMapSize).toBe(2048);
      expect(preset.numCascades).toBe(3);
      expect(preset.enablePCF).toBe(true);
      expect(preset.cascadeBlendPercentage).toBe(0.1);
      expect(preset.maxShadowCasters).toBe(50);
    });

    it('should have HIGH preset', () => {
      const preset = SHADOW_QUALITY_PRESETS[ShadowQuality.HIGH];

      expect(preset).toBeDefined();
      expect(preset.shadowMapSize).toBe(2048);
      expect(preset.numCascades).toBe(4);
      expect(preset.enablePCF).toBe(true);
      expect(preset.cascadeBlendPercentage).toBe(0.15);
      expect(preset.maxShadowCasters).toBe(100);
    });

    it('should have ULTRA preset', () => {
      const preset = SHADOW_QUALITY_PRESETS[ShadowQuality.ULTRA];

      expect(preset).toBeDefined();
      expect(preset.shadowMapSize).toBe(4096);
      expect(preset.numCascades).toBe(4);
      expect(preset.enablePCF).toBe(true);
      expect(preset.cascadeBlendPercentage).toBe(0.2);
      expect(preset.maxShadowCasters).toBe(200);
    });

    it('should have increasing quality from LOW to ULTRA', () => {
      const low = SHADOW_QUALITY_PRESETS[ShadowQuality.LOW];
      const medium = SHADOW_QUALITY_PRESETS[ShadowQuality.MEDIUM];
      const high = SHADOW_QUALITY_PRESETS[ShadowQuality.HIGH];
      const ultra = SHADOW_QUALITY_PRESETS[ShadowQuality.ULTRA];

      // Shadow map size should increase or stay the same
      expect(medium.shadowMapSize).toBeGreaterThanOrEqual(low.shadowMapSize);
      expect(high.shadowMapSize).toBeGreaterThanOrEqual(medium.shadowMapSize);
      expect(ultra.shadowMapSize).toBeGreaterThanOrEqual(high.shadowMapSize);

      // Cascade count should increase or stay the same
      expect(medium.numCascades).toBeGreaterThanOrEqual(low.numCascades);
      expect(high.numCascades).toBeGreaterThanOrEqual(medium.numCascades);
      expect(ultra.numCascades).toBeGreaterThanOrEqual(high.numCascades);

      // Max shadow casters should increase
      expect(medium.maxShadowCasters).toBeGreaterThan(low.maxShadowCasters);
      expect(high.maxShadowCasters).toBeGreaterThan(medium.maxShadowCasters);
      expect(ultra.maxShadowCasters).toBeGreaterThan(high.maxShadowCasters);
    });
  });

  describe('getQualityPreset', () => {
    it('should return LOW preset', () => {
      const preset = getQualityPreset(ShadowQuality.LOW);

      expect(preset).toBeDefined();
      expect(preset.shadowMapSize).toBe(1024);
    });

    it('should return MEDIUM preset', () => {
      const preset = getQualityPreset(ShadowQuality.MEDIUM);

      expect(preset).toBeDefined();
      expect(preset.shadowMapSize).toBe(2048);
    });

    it('should return HIGH preset', () => {
      const preset = getQualityPreset(ShadowQuality.HIGH);

      expect(preset).toBeDefined();
      expect(preset.shadowMapSize).toBe(2048);
      expect(preset.numCascades).toBe(4);
    });

    it('should return ULTRA preset', () => {
      const preset = getQualityPreset(ShadowQuality.ULTRA);

      expect(preset).toBeDefined();
      expect(preset.shadowMapSize).toBe(4096);
    });
  });

  describe('autoDetectQuality', () => {
    let engine: BABYLON.Engine;
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
      canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      engine = new BABYLON.Engine(canvas, true);
    });

    afterEach(() => {
      engine.dispose();
    });

    it('should detect quality based on capabilities', () => {
      const quality = autoDetectQuality(engine);

      expect(quality).toBeDefined();
      expect([
        ShadowQuality.LOW,
        ShadowQuality.MEDIUM,
        ShadowQuality.HIGH,
        ShadowQuality.ULTRA
      ]).toContain(quality);
    });

    it('should return LOW for limited texture size', () => {
      // Mock limited capabilities
      const caps = engine.getCaps();
      jest.spyOn(engine, 'getCaps').mockReturnValue({
        ...caps,
        maxTextureSize: 1024, // Less than 2048
        textureFloatRender: true
      });

      const quality = autoDetectQuality(engine);
      expect(quality).toBe(ShadowQuality.LOW);
    });

    it('should return LOW without float texture support', () => {
      const caps = engine.getCaps();
      jest.spyOn(engine, 'getCaps').mockReturnValue({
        ...caps,
        maxTextureSize: 4096,
        textureFloatRender: false
      });

      const quality = autoDetectQuality(engine);
      expect(quality).toBe(ShadowQuality.LOW);
    });

    it('should consider FPS in quality detection', () => {
      const caps = engine.getCaps();
      jest.spyOn(engine, 'getCaps').mockReturnValue({
        ...caps,
        maxTextureSize: 4096,
        textureFloatRender: true
      });

      // Mock high FPS
      jest.spyOn(engine, 'getFps').mockReturnValue(60);
      jest.spyOn(engine, 'getHardwareScalingLevel').mockReturnValue(1);

      const quality = autoDetectQuality(engine);
      expect(quality).toBe(ShadowQuality.HIGH);
    });
  });

  describe('Preset Validation', () => {
    it('should have valid shadow map sizes (powers of 2)', () => {
      const presets = Object.values(SHADOW_QUALITY_PRESETS);

      presets.forEach(preset => {
        const size = preset.shadowMapSize;
        // Check if power of 2
        expect(Math.log2(size) % 1).toBe(0);
        // Check reasonable range
        expect(size).toBeGreaterThanOrEqual(512);
        expect(size).toBeLessThanOrEqual(8192);
      });
    });

    it('should have valid cascade counts', () => {
      const presets = Object.values(SHADOW_QUALITY_PRESETS);

      presets.forEach(preset => {
        expect(preset.numCascades).toBeGreaterThanOrEqual(1);
        expect(preset.numCascades).toBeLessThanOrEqual(8);
      });
    });

    it('should have valid blend percentages', () => {
      const presets = Object.values(SHADOW_QUALITY_PRESETS);

      presets.forEach(preset => {
        expect(preset.cascadeBlendPercentage).toBeGreaterThanOrEqual(0);
        expect(preset.cascadeBlendPercentage).toBeLessThanOrEqual(1);
      });
    });

    it('should have positive max shadow casters', () => {
      const presets = Object.values(SHADOW_QUALITY_PRESETS);

      presets.forEach(preset => {
        expect(preset.maxShadowCasters).toBeGreaterThan(0);
      });
    });
  });
});
