export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  setupFiles: ['<rootDir>/jest.setup.cjs'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],

  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Exclude E2E tests (Playwright) and WebGL-dependent integration tests from Jest
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',
    '/tests/e2e-fixtures/',
    'tests/integration', // Skip WebGL-dependent tests (no leading slash)
    'comprehensive\\.test\\.(ts|tsx)$', // Skip all comprehensive tests
    'MapPreview.*\\.test\\.(ts|tsx)$', // Skip MapPreview tests (require Babylon.js WebGL)
  ],

  transformIgnorePatterns: [
    'node_modules/(?!@babylonjs|node-pkware)',
  ],

  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],

  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.js$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        jsx: 'react-jsx',
      },
    }],
  },

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@engine/(.*)$': '<rootDir>/src/engine/$1',
    '^@formats/(.*)$': '<rootDir>/src/formats/$1',
    '^@gameplay/(.*)$': '<rootDir>/src/gameplay/$1',
    '^@networking/(.*)$': '<rootDir>/src/networking/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',

    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/mocks/__mocks__/fileMock.js',
    // Mock shader files
    '\\.fx\\?raw$': '<rootDir>/tests/__mocks__/shaderMock.js',
  },

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  coverageDirectory: '<rootDir>/coverage',

  testTimeout: 10000,
};