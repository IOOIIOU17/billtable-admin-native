// Metro config -- only adds WEB-ONLY module swaps so the app can also be
// exported for the browser (npx expo export -p web), which is used for local
// testing and screenshots. iOS builds are untouched: every rule below checks
// platform === 'web'.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

const SHIMS = path.join(__dirname, 'src', 'web-shims')
const WEB_SWAPS = {
  'react-native': 'react-native.js',
  // babel-preset-expo turns `import { Alert } from 'react-native'` into a
  // deep import of react-native-web's own Alert before Metro sees it.
  'react-native-web/dist/exports/Alert': 'alert.js',
  'expo-secure-store': 'secure-store.js',
  'expo-notifications': 'notifications.js',
  'expo-local-authentication': 'local-authentication.js',
}

const upstream = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromOwnCode = !context.originModulePath.includes(`${path.sep}node_modules${path.sep}`)
  const fromShim = context.originModulePath.startsWith(SHIMS)
  if (platform === 'web' && fromOwnCode && !fromShim && WEB_SWAPS[moduleName]) {
    return { type: 'sourceFile', filePath: path.join(SHIMS, WEB_SWAPS[moduleName]) }
  }
  return (upstream || context.resolveRequest)(context, moduleName, platform)
}

module.exports = config
