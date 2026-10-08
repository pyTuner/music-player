module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|react-native-gesture-handler|@react-native(-community)?)/)',
  ],
  setupFiles: ['react-native-gesture-handler/jestSetup.js'],
};
