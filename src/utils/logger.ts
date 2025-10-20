/**
 * Simple logger utility to suppress debug logs in production
 */

const DEBUG = import.meta.env.VITE_DEBUG === 'true';

export const logger = {
  log: (...args: unknown[]): void => {
    if (DEBUG) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
