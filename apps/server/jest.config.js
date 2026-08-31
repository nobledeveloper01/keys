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
  /*
    One worker when there is a real database, many when there is not.

    The Postgres-backed suites share one schema and each clears it before it
    starts. In parallel workers that is two `TRUNCATE ... CASCADE` statements
    racing over the same tables, which Postgres resolves by killing one of them
    — and it surfaced as `deadlock detected` the moment a second Postgres suite
    existed, not when the first one was written.

    A schema per worker would be faster and is the right answer if this ever
    hurts. Serial is the answer that cannot be subtly wrong: the suites test
    withdrawal cascades, and a cascade is exactly the thing that goes wrong
    when two of them share a table and neither knows it.
  */
  ...(process.env.KEYS_TEST_DATABASE_URL ? { maxWorkers: 1 } : {}),
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { allowImportingTsExtensions: true, noEmit: true } }],
  },
};
