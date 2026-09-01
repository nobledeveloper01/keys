/**
 * The rules, and nothing else.
 *
 * No React, no React Native, no DOM, no database, no clock, no randomness.
 * Enforced by lint and by `scripts/boundary-check.sh`, which injects a
 * violation and fails if the rule stays quiet.
 *
 * Four consumers import this package: the mobile app, the web app, the NestJS
 * server and the tests. That is the whole point. On the previous project the
 * server was C# and every rule existed twice, held together by a generated
 * parity suite; here the server imports the same TypeScript the phone runs, so
 * `is_verified` cannot mean two different things on two surfaces.
 */
export * from './agents.ts';
export * from './capture.ts';
export * from './hashing.ts';
export * from './language.ts';
export * from './inspections.ts';
export * from './listings.ts';
export * from './conversations.ts';
export * from './money.ts';
export * from './phone.ts';
export * from './places.ts';
export * from './search.ts';
export * from './reports.ts';
