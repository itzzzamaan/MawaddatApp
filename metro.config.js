const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

// Support TypeScript and JavaScript extensions
config.resolver.sourceExts = [
  ...new Set([...config.resolver.sourceExts, "ts", "tsx", "js", "jsx"]),
];

// Resolve local aliases
config.resolver.resolveRequest = (context, moduleName, platform) => {
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
