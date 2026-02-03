/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.animate.html',
  appName: 'Adobe Animate',
  webDir: 'www',

  bundledWebRuntime: false,

  android: {
    allowMixedContent: true
  },

  server: {
    androidScheme: 'https'
  }
};

module.exports = config;