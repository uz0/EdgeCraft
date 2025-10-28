export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/jest.setup.ts'],

  roots: ['<rootDir>/src'],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/__tests__/',
  ],

  transformIgnorePatterns: [
    'node_modules/(?!@babylonjs|node-pkware)',
  ],

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

    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': 'identity-obj-proxy',
    '\\.fx\\?raw$': 'identity-obj-proxy',
  },

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  coverageDirectory: '<rootDir>/coverage',

  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
  ],

  testTimeout: 10000,
};