/* eslint-disable */
/**
 * Browser-compatible StormJS loader
 *
 * This module loads StormJS from the public directory as a script tag,
 * bypassing ESM/CommonJS module resolution issues.
 */

// Global type declaration for StormLib loaded via script tag
declare global {
  interface Window {
    StormLib?: any;
    StormLibInstance?: any;
    MPQ?: any;
  }
}

let stormLibInstance: any = null;
let isInitialized = false;
let initPromise: Promise<any> | null = null;

/**
 * Load StormJS script dynamically
 */
function loadStormLibScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if we're in dev mode (Vite)
    // For Jest tests, default to production build
    const isDev = process.env['NODE_ENV'] === 'development';
    const scriptPath = isDev
      ? '/vendor/stormjs/stormlib.debug.js'
      : '/vendor/stormjs/stormlib.release.js';

    // Check if already loaded
    if (window.StormLib) {
      resolve();
      return;
    }

    // Create script tag
    const script = document.createElement('script');
    script.src = scriptPath;
    script.async = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = (error) => {
      console.error('[StormJS Browser] Failed to load script:', error);
      reject(new Error(`Failed to load StormJS from ${scriptPath}`));
    };

    document.head.appendChild(script);
  });
}

/**
 * Initialize StormLib WASM module
 */
async function initializeStormLib(): Promise<any> {
  if (isInitialized && stormLibInstance) {
    return stormLibInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise(async (resolve, reject) => {
    try {
      // Load the script first
      await loadStormLibScript();

      // Wait for StormLib global to be available
      if (!window.StormLib) {
        throw new Error('StormLib global not found after script load');
      }

      // Call the Emscripten factory function
      const instance = window.StormLib({
        onRuntimeInitialized: function (this: any) {
          // Remove pseudo-promise
          delete this.then;

          // Add NULLPTR constant
          this.NULLPTR = new this.Ptr();

          if (process.env['NODE_ENV'] === 'development') {
          }

          // Store instance globally for MPQ module to access
          window.StormLibInstance = this;
          stormLibInstance = this;
          isInitialized = true;
          resolve(this);
        },
        onAbort: (error: any) => {
          console.error('[StormJS Browser] ❌ WASM initialization aborted:', error);
          initPromise = null;
          reject(error);
        },
      });

      // Store instance for the ready promise
      if (!instance.then) {
        // If no promise, it's already initialized
        stormLibInstance = instance;
        isInitialized = true;
        resolve(instance);
      }
    } catch (error) {
     
      console.error('[StormJS Browser] ❌ Failed to initialize:', error);
      initPromise = null;
      reject(error);
    }
  });

  return initPromise;
}

/**
 * Load MPQ module (browser-compatible version from public vendor directory)
 */
async function loadMPQModule(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Check if already loaded as global
    if (window.MPQ) {
      resolve(window.MPQ);
      return;
    }

    const script = document.createElement('script');
    script.src = '/vendor/stormjs/mpq-browser.mjs';
    script.type = 'module';

    script.onload = () => {
      // Wait a bit for module to execute and set window.MPQ
      setTimeout(() => {
        if (window.MPQ) {
          resolve(window.MPQ);
        } else {
          reject(new Error('MPQ module loaded but window.MPQ not set'));
        }
      }, 100);
    };

    script.onerror = (error) => {
      console.error('[StormJS Browser] Failed to load MPQ module:', error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

/**
 * Get StormLib FS (filesystem) interface
 */
export async function getFS(): Promise<any> {
  const lib = await initializeStormLib();
  return lib.FS;
}

/**
 * Get MPQ class
 */
export async function getMPQ(): Promise<any> {
  // Ensure StormLib is initialized first
  await initializeStormLib();

  // Load MPQ module
  return loadMPQModule();
}

/**
 * Get File class
 */
export async function getFile(): Promise<any> {
  // For now, return a placeholder
  // File class is typically not needed for basic MPQ extraction
  return null;
}

/**
 * Check if StormJS is ready
 */
export function isReady(): boolean {
  return isInitialized;
}

/**
 * Get the StormLib instance
 */
export function getInstance(): any {
  return stormLibInstance;
}

/**
 * Export unified interface
 */
export const StormJS = {
  getFS,
  getMPQ,
  getFile,
  isReady,
  getInstance,
};

export default StormJS;
