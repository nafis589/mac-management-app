import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest/presets/default-esm',

  testEnvironment: 'node',

  // Fichiers test dans le dossier tests/
  roots: ['<rootDir>/tests'],

  // Pattern de fichiers de test
  testMatch: ['**/*.test.ts'],

  // Transformer les fichiers .ts avec ts-jest (ESM)
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  // Résolution des imports .js → .ts (convention ESM Node)
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Nettoyage automatique des mocks entre les tests
  clearMocks: true,
  restoreMocks: true,

  // Timeout généreux pour les tests async
  testTimeout: 10000,

  // Verbose output pour debug
  verbose: true,
};

export default config;
