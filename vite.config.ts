import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import checker from 'vite-plugin-checker';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

/**
 * Vite Configuration
 *
 * Build configuration for Edge Craft using Vite.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const shouldAutoOpen = (env.VITE_OPEN_BROWSER ?? 'true') !== 'false';
  const isCI = process.env.CI === 'true';

  return {
    // Base configuration
    base: '/',
    publicDir: 'public',

    // Plugins
    plugins: [
      // Node.js polyfills for browser
      nodePolyfills({
        // Enable specific polyfills needed by decompression libraries and mdx-m3-viewer
        include: ['stream', 'buffer', 'util', 'path', 'os'],
        // Exclude fs - not available in browser
        exclude: ['fs'],
        globals: {
          Buffer: true, // Inject Buffer global
          process: true // Inject process global
        }
      }),

      // WASM support (MUST be before other plugins)
      wasm(),
      topLevelAwait(),

      // React with Fast Refresh
      react({
        fastRefresh: true,
        jsxRuntime: 'automatic'
      }),

      // TypeScript path resolution
      tsconfigPaths(),

      // Type checking in separate process
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint . --ext ts,tsx',
          useFlatConfig: true, // ESLint 9 flat config
          dev: { logLevel: ['error'], overlay: false } // Disable overlay in tests
        },
        overlay: false // Disable error overlay (prevents blocking canvas in tests)
      })
    ],

    // Path resolution
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@engine': path.resolve(__dirname, './src/engine'),
        '@formats': path.resolve(__dirname, './src/formats'),
        '@gameplay': path.resolve(__dirname, './src/gameplay'),
        '@networking': path.resolve(__dirname, './src/networking'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@ui': path.resolve(__dirname, './src/ui'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@types': path.resolve(__dirname, './src/types')
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
    },

    // Development server
    server: {
      port: env.PORT ? parseInt(env.PORT) : 3000, // Use PORT env var or default to 3000
      host: true,
      open: shouldAutoOpen && !isCI,

      // Disable caching in development to prevent stale code issues
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      },

      // Hot Module Replacement
      hmr: {
        overlay: true,
        protocol: 'ws'
      },

      // CORS configuration
      cors: true,

      // File watching
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**']
      }
    },

    // Build configuration
    build: {
      // Output directory
      outDir: 'dist',
      assetsDir: 'assets',

      // Source maps
      sourcemap: mode === 'development' ? 'inline' : true,

      // Minification
      minify: mode === 'production',

      // Target browsers
      target: 'es2020',

      // Chunk size warnings
      chunkSizeWarningLimit: 1000, // KB

      // Rollup options
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },

        output: {
          // Manual chunks for better caching
          manualChunks: (id) => {
            // Babylon.js in separate chunk
            if (id.includes('@babylonjs')) {
              return 'babylon';
            }

            // React in separate chunk
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }

            // Node modules vendor chunk
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },

          // Asset file naming
          assetFileNames: (assetInfo) => {
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash][extname]`;
            }

            if (/\.(woff2?|ttf|otf|eot)$/i.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }

            return `assets/[name]-[hash][extname]`;
          },

          // Chunk file naming
          chunkFileNames: 'js/[name]-[hash].js',

          // Entry file naming
          entryFileNames: 'js/[name]-[hash].js'
        },

        // Tree shaking
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false
        }
      },

      // CSS code splitting
      cssCodeSplit: true,

      // Asset inlining threshold
      assetsInlineLimit: 4096, // 4KB

      // Manifest for asset tracking
      manifest: true,

      // Report compressed size
      reportCompressedSize: true,

      // Empty outDir on build
      emptyOutDir: true
    },

    // Optimization
    optimizeDeps: {
      // Pre-bundle heavy dependencies
      include: [
        '@babylonjs/core',
        '@babylonjs/loaders',
        'react',
        'react-dom'
      ],

      // Exclude from pre-bundling (special modules only)
      exclude: [
        '@babylonjs/inspector'
      ],

      // ESBuild options for dependency optimization
      esbuildOptions: {
        // Handle both CommonJS and ESM
        mainFields: ['module', 'main'],
        // Inject shims for Node.js globals
        inject: [],
        // Target modern browsers
        target: 'es2020'
      }
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: mode === 'development',
      // Polyfill process.env.NODE_ENV for compatibility
      'process.env.NODE_ENV': JSON.stringify(mode)
    },

    // CSS configuration
    css: {
      modules: {
        localsConvention: 'camelCase',
        scopeBehaviour: 'local',
        generateScopedName: mode === 'production'
          ? '[hash:base64:5]'
          : '[name]__[local]__[hash:base64:5]'
      },
      devSourcemap: true
    },

    // JSON handling
    json: {
      namedExports: true,
      stringify: false
    },

    // Asset handling (WebGL/Babylon.js assets)
    assetsInclude: [
      '**/*.gltf',
      '**/*.glb',
      '**/*.hdr',
      '**/*.ktx2',
      '**/*.wasm',
      '**/*.basis'
    ],

    // Worker configuration
    worker: {
      format: 'es',
      plugins: () => [
        wasm(),
        topLevelAwait(),
        tsconfigPaths()
      ]
    },

    // Preview server (for production testing)
    preview: {
      port: 4173,
      strictPort: false,
      open: shouldAutoOpen && !isCI
    },

    // Logging
    logLevel: 'info',
    clearScreen: true
  };
});
