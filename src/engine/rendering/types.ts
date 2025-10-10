/**
 * Type definitions for rendering systems
 */

/**
 * Configuration for Cascaded Shadow Map system
 */
export interface CSMConfiguration {
  /** Number of shadow cascades (typically 2-4) */
  numCascades: number;
  /** Shadow map resolution (e.g., 1024, 2048, 4096) */
  shadowMapSize: number;
  /** Percentage of overlap between cascades for blending (0.0 - 1.0) */
  cascadeBlendPercentage: number;
  /** Enable Percentage Closer Filtering for soft shadows */
  enablePCF: boolean;
  /** Manual cascade split distances (optional, auto-calculated if not provided) */
  splitDistances?: number[];
}

/**
 * Shadow caster configuration
 */
export interface ShadowCasterConfig {
  /** Type of object casting shadow */
  type: 'hero' | 'building' | 'unit' | 'doodad';
  /** Shadow casting method to use */
  castMethod: 'csm' | 'blob' | 'none';
}

/**
 * Shadow quality preset
 */
export interface QualityPreset {
  /** Shadow map resolution */
  shadowMapSize: number;
  /** Number of shadow cascades */
  numCascades: number;
  /** Enable PCF filtering */
  enablePCF: boolean;
  /** Cascade blend percentage */
  cascadeBlendPercentage: number;
  /** Maximum number of objects casting CSM shadows */
  maxShadowCasters: number;
}

/**
 * Shadow system statistics
 */
export interface ShadowStats {
  /** Number of shadow cascades */
  cascades: number;
  /** Shadow map resolution */
  shadowMapSize: number;
  /** Number of objects casting CSM shadows */
  shadowCasters: number;
  /** Memory usage in bytes */
  memoryUsage: number;
}

/**
 * Shadow caster manager statistics
 */
export interface ShadowCasterStats {
  /** Number of CSM shadow casters */
  csmCasters: number;
  /** Number of blob shadows */
  blobShadows: number;
  /** Total managed objects */
  totalObjects: number;
}

/**
 * Shadow priority levels
 */
export type ShadowPriority = 'high' | 'medium' | 'low';

/**
 * Shadow quality levels
 */
export enum ShadowQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}
