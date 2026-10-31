const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const expoStatePath = path
  .resolve(__dirname, ".expo")
  .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = [
  ...config.resolver.blockList,
  new RegExp(`${expoStatePath}[\\\\/].*`),
];

const knownModules = new Map([
  ["@expo/metro-runtime", require.resolve("@expo/metro-runtime")],
  ["react/jsx-runtime", require.resolve("react/jsx-runtime")],
  ["react/jsx-dev-runtime", require.resolve("react/jsx-dev-runtime")],
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const filePath = knownModules.get(moduleName);
  if (filePath) {
    return { type: "sourceFile", filePath };
  }

  if (moduleName.startsWith("@/assets/")) {
    const assetPath = path.resolve(
      __dirname,
      "assets",
      moduleName.slice("@/assets/".length),
    );
    return context.resolveRequest(context, assetPath, platform);
  }

  if (moduleName.startsWith("@/")) {
    const sourcePath = path.resolve(__dirname, "src", moduleName.slice(2));
    return context.resolveRequest(context, sourcePath, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
