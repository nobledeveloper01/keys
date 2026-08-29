/**
 * Jest for the app.
 *
 * `transformIgnorePatterns` has to let React Native and its ecosystem through
 * Babel: they ship untranspiled ESM, and the default of ignoring all of
 * `node_modules` makes every import of them fail with a syntax error that
 * points at their source rather than at this setting.
 */
module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|react-native-svg|react-native-safe-area-context|@react-native-async-storage)/)',
  ],
  testMatch: ['<rootDir>/__tests__/**/*.test.tsx', '<rootDir>/__tests__/**/*.test.ts'],
};
