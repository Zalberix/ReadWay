module.exports = function (api) {
    api.cache(false);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            // "react-native-worklets/plugin",
            "react-native-reanimated/plugin",
        ]
    };
};