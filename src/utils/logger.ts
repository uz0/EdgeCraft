/**
 * Simple logger utility to suppress debug logs in production
 *
 * Usage:
 * - logger.log() - Debug logs (only in DEV mode)
 * - logger.warn() - Warnings (always shown)
 * - logger.error() - Errors (always shown)
 */

const IS_DEV = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]): void => {
    if (IS_DEV) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
