const path = require('node:path');

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const workspace = path.resolve(__dirname, '../..');

/**
 * Metro, taught where the monorepo is.
 *
 * The default config watches only this directory, so a change in
 * `packages/domain` would not trigger a reload and — worse — the modules it
 * resolves from `node_modules` here would be different objects from the ones
 * the server imports. Both roots are watched and both `node_modules` are
 * searched, in that order.
 *
 * `pnpm-workspace.yaml` sets `nodeLinker: hoisted` for the same reason: Metro
 * walks `node_modules` directly rather than going through Node's resolver, and
 * does not reliably cope with pnpm's symlinked layout.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspace],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(workspace, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
