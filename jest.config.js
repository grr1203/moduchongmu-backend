export default {
  setupFiles: ['./__tests__/env.ts'],
  testPathIgnorePatterns: ['./__tests__/env.ts', './__tests__/testUtil.ts', './src/ts/'],
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.[jt]sx?$': ['ts-jest', { useESM: true }],
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  verbose: true,
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
