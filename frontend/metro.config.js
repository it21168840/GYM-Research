const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimize the Metro bundler configuration
config.maxWorkers = 2; // Reduce number of workers
config.transformer.minifierConfig = {
  compress: false, // Disable compression during development
  mangle: false
};

// Increase heap size for the Metro bundler
process.env.NODE_OPTIONS = '--max_old_space_size=4096';

module.exports = config;