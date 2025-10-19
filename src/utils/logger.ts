/**
 * Simple logger utility to suppress debug logs in production
 */

const DEBUG = import.meta.env.VITE_DEBUG === 'true';

export const logger = {
  log: (...args: unknown[]) => {
    if (DEBUG) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
