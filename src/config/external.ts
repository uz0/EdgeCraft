/**
 * External Repository Configuration
 *
 * CRITICAL: These external dependencies are REQUIRED for full functionality
 * - Multiplayer: https://github.com/uz0/core-edge
 * - Launcher: https://github.com/uz0/index.edgecraft
 */

export interface ExternalConfig {
  multiplayer: {
    dev: string;
    prod: string;
    repo: string;
    docs: string;
  };
  launcher: {
    dev: string;
    prod: string;
    repo: string;
    autoLoad: boolean;
  };
}

export const EXTERNAL_REPOS: ExternalConfig = {
  // Multiplayer server configuration
  multiplayer: {
    dev: 'http://localhost:2567',
    prod: 'wss://core-edge.edgecraft.game',
    repo: 'https://github.com/uz0/core-edge',
    docs: 'https://github.com/uz0/core-edge/wiki',
  },

  // Launcher map configuration
  launcher: {
    dev: './mocks/launcher-map/index.edgecraft',
    prod: 'https://cdn.edgecraft.game/maps/index.edgecraft',
    repo: 'https://github.com/uz0/index.edgecraft',
    autoLoad: true, // ALWAYS loads on startup
  },
};

/**
 * Get the appropriate endpoint based on environment
 */
export function getMultiplayerEndpoint(): string {
  const isDevelopment = process.env['NODE_ENV'] === 'development';

  // Check if core-edge is running locally
  if (isDevelopment) {
    // Try to detect if real core-edge server is running
    return process.env['CORE_EDGE_URL'] || EXTERNAL_REPOS.multiplayer.dev;
  }

  return EXTERNAL_REPOS.multiplayer.prod;
}

/**
 * Get the launcher map path based on environment
 */
export function getLauncherPath(): string {
  const isDevelopment = process.env['NODE_ENV'] === 'development';

  // Check if full index.edgecraft is available
  if (isDevelopment) {
    // Try to use full launcher if linked
    return process.env['LAUNCHER_PATH'] || EXTERNAL_REPOS.launcher.dev;
  }

  return EXTERNAL_REPOS.launcher.prod;
}

/**
 * Validate external dependencies are configured
 */
export function validateExternalDependencies(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check multiplayer configuration
  if (!EXTERNAL_REPOS.multiplayer.repo) {
    errors.push('Multiplayer repository not configured');
  }

  // Check launcher configuration
  if (!EXTERNAL_REPOS.launcher.repo) {
    errors.push('Launcher repository not configured');
  }

  if (!EXTERNAL_REPOS.launcher.autoLoad) {
    errors.push('Launcher must have autoLoad enabled');
  }

  // Warnings for development
  if (process.env['NODE_ENV'] === 'development') {
    if (!process.env['CORE_EDGE_URL']) {
      warnings.push(
        'Using mock multiplayer server. For full functionality, clone and run: ' +
          EXTERNAL_REPOS.multiplayer.repo
      );
    }

    if (!process.env['LAUNCHER_PATH']) {
      warnings.push(
        'Using mock launcher map. For full functionality, clone and build: ' +
          EXTERNAL_REPOS.launcher.repo
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log external dependency status on startup
 */
export function logExternalStatus(): void {
  const multiplayerEndpoint = getMultiplayerEndpoint();
  const isUsingMockServer = multiplayerEndpoint.includes('localhost');

  if (isUsingMockServer) {
  }

  const launcherPath = getLauncherPath();
  const isUsingMockLauncher = launcherPath.includes('mocks');

  if (isUsingMockLauncher) {
  }

  const validation = validateExternalDependencies();

  if (validation.warnings.length > 0) {
    validation.warnings.forEach((warning) => {});
  }

  if (!validation.valid) {
    validation.errors.forEach((error) => {});
    throw new Error('External dependency configuration invalid');
  }
}

// Auto-load launcher configuration
export const LAUNCHER_CONFIG = {
  // The game MUST always load this map on startup
  DEFAULT_MAP: '/maps/index.edgecraft',

  // Fallback if launcher fails to load
  FALLBACK_SCENE: 'emergency-menu',

  // Retry configuration
  LOAD_RETRIES: 3,
  RETRY_DELAY: 1000, // ms

  // Validation
  REQUIRED_SCENES: ['main-menu', 'map-browser', 'settings'],
};
