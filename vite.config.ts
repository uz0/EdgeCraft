import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import checker from 'vite-plugin-checker';
import path from 'path';

/**
 * Rolldown-Vite Configuration
 *
 * This configuration uses Rolldown-Vite, a Rust-powered bundler that's 3-16x faster
 * than standard Vite. It provides unified dev/production pipeline with significantly
 * better performance and lower memory usage.
 *
 * Key Benefits:
 * - 3-16x faster production builds
 * - <100ms HMR (vs 1s with standard Vite)
 * - 100x lower memory usage
 * - Unified Rust bundler for dev and production
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Base configuration
    base: '/',
    publicDir: 'public',

    // Plugins - Rolldown-compatible
    plugins: [
      // React with Fast Refresh (fully supported by Rolldown)
      react({
        fastRefresh: true,
        jsxRuntime: 'automatic'
      }),

      // TypeScript path resolution
      tsconfigPaths(),

      // Type checking in separate process
      checker({
        typescript: true
        // Temporarily disabled ESLint to test MPQ parser fixes
        // eslint: {
        //   lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
        //   dev: { logLevel: ['error'] }
        // }
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

    // Development server (optimized by Rolldown)
    server: {
      port: parseInt(env.PORT) || 3000,
      host: true,
      open: true,

      // Hot Module Replacement (super fast with Rolldown)
      hmr: {
        overlay: true,
        protocol: 'ws'
      },

      // CORS configuration
      cors: true,

      // Proxy configuration for backend
      proxy: {
        '/api': {
          target: 'http://localhost:2567',
          changeOrigin: true,
          secure: false
        },
        '/colyseus': {
          target: 'ws://localhost:2567',
          ws: true,
          changeOrigin: true
        }
      },

      // File watching
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**']
      }
    },

    // Build configuration (powered by Rolldown - 3-16x faster!)
    build: {
      // Output directory
      outDir: 'dist',
      assetsDir: 'assets',

      // Source maps
      sourcemap: mode === 'development' ? 'inline' : true,

      // Rolldown handles minification natively (faster than terser)
      minify: mode === 'production',

      // Target browsers
      target: 'es2020',

      // Chunk size warnings
      chunkSizeWarningLimit: 1000, // KB

      // Rolldown options (replaces both esbuild and rollup)
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

            // Networking libraries
            if (id.includes('colyseus') || id.includes('socket')) {
              return 'networking';
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

        // Tree shaking (optimized by Rolldown)
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

    // Optimization (Rolldown pre-bundles dependencies faster)
    optimizeDeps: {
      // Pre-bundle heavy dependencies
      include: [
        '@babylonjs/core',
        '@babylonjs/loaders',
        '@babylonjs/materials',
        '@babylonjs/gui',
        'react',
        'react-dom',
        'colyseus.js'
      ],

      // Exclude from pre-bundling
      exclude: ['@babylonjs/inspector']
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: mode === 'development',
      __ROLLDOWN__: true
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
      plugins: () => [tsconfigPaths()]
    },

    // Preview server (for production testing)
    preview: {
      port: 4173,
      strictPort: false,
      open: true
    },

    // Logging
    logLevel: 'info',
    clearScreen: true
  };
});