export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/jest.setup.ts'],

  roots: ['<rootDir>/src'],

  // Exclude EVERYTHING in tests/ - those are Playwright E2E tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/',           // All Playwright E2E tests
    '/__tests__/',       // No __tests__ directories allowed (FORBIDDEN)
  ],

  transformIgnorePatterns: [
    'node_modules/(?!@babylonjs|node-pkware)',
  ],

  // ONLY match unit tests (*.unit.ts) - co-located with source files
  testMatch: [
    '**/*.unit.ts',
    '**/*.unit.tsx',
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