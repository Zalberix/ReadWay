const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
    ...config.resolver,
    assetExts: (() => {
        const exts = config.resolver.assetExts.filter((ext) => ext !== "svg");
        if (!exts.includes('wasm')) exts.push('wasm');
        return exts;
    })(),
    sourceExts: [...config.resolver.sourceExts, "svg"],
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16})