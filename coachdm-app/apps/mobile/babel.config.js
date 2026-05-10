module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated DOIT être en dernier
      'react-native-reanimated/plugin',
    ],
  };
};
