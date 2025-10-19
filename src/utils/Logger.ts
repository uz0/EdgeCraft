/**
 * Logger Utility
 *
 * Centralized logging with debug levels.
 * Replaces all console.log statements throughout the codebase.
 *
 * Usage:
 * ```typescript
 * const logger = Logger.create('MPQParser');
 * logger.debug('Parsing header...', { offset: 0 });
 * logger.info('Successfully parsed MPQ archive');
 * logger.warn('Decompression fallback used');
 * logger.error('Failed to parse MPQ', error);
 * ```
 *
 * Control logging via environment:
 * - `LOG_LEVEL=DEBUG` - Show all logs
 * - `LOG_LEVEL=INFO` - Show info, warn, error
 * - `LOG_LEVEL=WARN` - Show warn, error only
 * - `LOG_LEVEL=ERROR` - Show errors only
 * - `LOG_LEVEL=NONE` - Disable all logs
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LoggerConfig {
  /** Minimum log level to display */
  level: LogLevel;

  /** Enable timestamps */
  timestamps: boolean;

  /** Enable colored output (browser only) */
  colors: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO, // Default to INFO level
  timestamps: true,
  colors: true,
};

/**
 * Parse log level from environment or string
 */
function parseLogLevel(level?: string): LogLevel {
  if (!level) return LogLevel.INFO;

  const normalized = level.toUpperCase();
  switch (normalized) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'NONE':
    case 'SILENT':
      return LogLevel.NONE;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Global logger configuration
 */
class LoggerManager {
  private config: LoggerConfig;

  constructor() {
    // Try to read from environment (Vite exposes import.meta.env)
    const envLevel =
      typeof import.meta !== 'undefined' && import.meta.env
        ? (import.meta.env.VITE_LOG_LEVEL as string | undefined)
        : undefined;

    this.config = {
      ...DEFAULT_CONFIG,
      level: parseLogLevel(envLevel),
    };
  }

  public getConfig(): LoggerConfig {
    return this.config;
  }

  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  public setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

const manager = new LoggerManager();

/**
 * Logger instance
 */
export class Logger {
  private category: string;

  private constructor(category: string) {
    this.category = category;
  }

  /**
   * Create a logger for a specific category
   */
  public static create(category: string): Logger {
    return new Logger(category);
  }

  /**
   * Set global log level
   */
  public static setLevel(level: LogLevel): void {
    manager.setLevel(level);
  }

  /**
   * Set global logger configuration
   */
  public static setConfig(config: Partial<LoggerConfig>): void {
    manager.setConfig(config);
  }

  /**
   * Debug log (verbose, development only)
   */
  public debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Info log (general information)
   */
  public info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Warning log (non-critical issues)
   */
  public warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Error log (critical issues)
   */
  public error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * Internal log implementation
   */
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    const config = manager.getConfig();

    // Check if log level is enabled
    if (level < config.level) {
      return;
    }

    // Format timestamp
    const timestamp = config.timestamps ? new Date().toISOString() : '';

    // Format log level
    const levelLabel = LogLevel[level];

    // Format category
    const categoryLabel = `[${this.category}]`;

    // Build log message
    const parts: string[] = [];
    if (timestamp) parts.push(timestamp);
    parts.push(levelLabel);
    parts.push(categoryLabel);
    parts.push(message);

    const fullMessage = parts.join(' ');

    // Output to console
    if (config.colors && typeof window !== 'undefined') {
      // Browser with colors
      this.logColored(level, fullMessage, ...args);
    } else {
      // No colors (Node.js or colors disabled)
      this.logPlain(level, fullMessage, ...args);
    }
  }

  /**
   * Log with colors (browser)
   */
  private logColored(level: LogLevel, message: string, ...args: unknown[]): void {
    const styles: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: 'color: #888; font-weight: normal;',
      [LogLevel.INFO]: 'color: #2196F3; font-weight: bold;',
      [LogLevel.WARN]: 'color: #FF9800; font-weight: bold;',
      [LogLevel.ERROR]: 'color: #F44336; font-weight: bold;',
      [LogLevel.NONE]: '',
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _style = styles[level]; // Reserved for future browser color styling

    if (args.length > 0) {
    } else {
    }
  }

  /**
   * Log without colors (Node.js)
   */
  private logPlain(level: LogLevel, message: string, ...args: unknown[]): void {
    const consoleMethods = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
      [LogLevel.NONE]: () => {
        // No-op
      },
    };

    const method = consoleMethods[level];

    if (args.length > 0) {
      method(message, ...args);
    } else {
      method(message);
    }
  }
}

/**
 * Export singleton for global configuration
 */
export const logger = {
  setLevel: Logger.setLevel.bind(Logger),
  setConfig: Logger.setConfig.bind(Logger),
  create: Logger.create.bind(Logger),
};
