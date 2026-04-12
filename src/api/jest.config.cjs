/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  // Map .js extension imports (used by nodenext tsconfig) to their .ts files
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map uuid to a CJS shim — the real package is ESM-only and breaks Jest
    '^uuid$': '<rootDir>/__mocks__/uuid.cjs',
  },
  clearMocks: true,
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: ['src/**/*.ts'],
};
