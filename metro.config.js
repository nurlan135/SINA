// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.extraNodeModules = {
  ...defaultConfig.resolver.extraNodeModules,
  stream: require.resolve('readable-stream'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  assert: require.resolve('assert'),
  zlib: require.resolve('browserify-zlib'),
  path: require.resolve('path-browserify'),
  os: require.resolve('os-browserify/browser'),
  vm: require.resolve('vm-browserify'),
  crypto: require.resolve('expo-crypto'),
  url: require.resolve('url'),
  net: require.resolve('./emptyMock.js'), // DƏYİŞDİRİLDİ (və ya əlavə edildi)
  tls: require.resolve('./emptyMock.js'), // DƏYİŞDİRİLDİ (və ya əlavə edildi)
  // fs: require.resolve('./emptyMock.js'), // Ehtiyac olarsa
  // dgram: require.resolve('./emptyMock.js'), // Ehtiyac olarsa
};

module.exports = defaultConfig;