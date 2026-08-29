module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  // The domain package is TypeScript source consumed directly, exactly as the
  // apps consume it, so a test and the server agree about what they are
  // running. Compiling it separately would let this suite pass against a build
  // that no longer matches the source.
  moduleNameMapper: { '^@keys/domain$': '<rootDir>/../../packages/domain/src/index.ts' },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { allowImportingTsExtensions: true, noEmit: true } }],
  },
};
