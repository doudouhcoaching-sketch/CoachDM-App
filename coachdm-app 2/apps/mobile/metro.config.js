// Configuration Metro pour monorepo (résolution @coachdm/shared)
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch tout le monorepo
config.watchFolders = [workspaceRoot];

// 2. Résoudre les modules depuis le projet ET la racine
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Supporter les symlinks (npm workspaces)
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
