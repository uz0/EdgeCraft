import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths() // Enables path aliases
  ],

  esbuild: {
    // Use esbuild for faster builds in dev
    tsconfigRaw: {
      compilerOptions: {
        jsx: 'react-jsx'
      }
    }
  },

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
      '@types': path.resolve(__dirname, './src/types'),
    },
  },

  server: {
    port: 3000,
    open: true,
    cors: true,

    // Proxy for development API/WebSocket
    proxy: {
      '/api': {
        target: 'http://localhost:2567',
        changeOrigin: true,
      },
      '/colyseus': {
        target: 'ws://localhost:2567',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,

    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'babylon': ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/materials'],
          'react': ['react', 'react-dom'],
          'networking': ['colyseus.js'],
        },
      },
    },

    // Performance optimizations
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  optimizeDeps: {
    include: [
      '@babylonjs/core',
      '@babylonjs/loaders',
      'react',
      'react-dom',
      'colyseus.js',
    ],
  },

  // Enable WASM support for potential future use
  assetsInclude: ['**/*.wasm'],
});