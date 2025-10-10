/**
 * Rendering module exports
 *
 * Provides rendering systems for Edge Craft:
 * - GPU instancing and animation system for high-performance unit rendering
 * - Cascaded Shadow Maps (CSM) for high-quality shadows
 * - Blob shadows for performance-critical scenarios
 * - Intelligent shadow management
 */

export * from './types';

// GPU Instancing & Animation
export * from './InstancedUnitRenderer';
export * from './UnitInstanceManager';
export * from './BakedAnimationSystem';
export * from './UnitAnimationController';
export * from './UnitPool';

// Shadow Systems
export * from './CascadedShadowSystem';
export * from './BlobShadowSystem';
export * from './ShadowCasterManager';
export * from './ShadowQualitySettings';
