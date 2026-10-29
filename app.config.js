const fs = require("node:fs");
const path = require("node:path");
const projectRoot = path.dirname(require.resolve("./app.json"));
const staticConfig = require("./app.json").expo;

const resolveConfigFile = (environmentVariable, defaultPath) => {
  const configuredPath = process.env[environmentVariable] || defaultPath;
  const absolutePath = path.resolve(projectRoot, configuredPath);
  return fs.existsSync(absolutePath) ? absolutePath : null;
};

const toExpoPath = (absolutePath) =>
  `./${path.relative(projectRoot, absolutePath).replace(/\\/g, "/")}`;

module.exports = ({ config }) => {
  const expoConfig = {
    ...config,
    ...staticConfig,
    plugins: [...(staticConfig.plugins || [])],
  };
  const androidGoogleServices = resolveConfigFile(
    "GOOGLE_SERVICES_JSON",
    "google-services.json",
  );
  const iosGoogleServices = resolveConfigFile(
    "GOOGLE_SERVICE_INFO_PLIST",
    "GoogleService-Info.plist",
  );
  const firebaseConfigured = Boolean(
    androidGoogleServices && iosGoogleServices,
  );
  const firebaseIosConfigured = Boolean(iosGoogleServices);
  const firebasePlugins = new Set([
    "@react-native-firebase/app",
    "@react-native-firebase/messaging",
  ]);

  expoConfig.plugins = expoConfig.plugins.filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return !firebasePlugins.has(pluginName);
  });
  expoConfig.extra = {
    ...expoConfig.extra,
    firebaseConfigured,
    firebaseAndroidConfigured: Boolean(androidGoogleServices),
    firebaseIosConfigured,
  };

  if (androidGoogleServices) {
    expoConfig.android = {
      ...expoConfig.android,
      googleServicesFile: toExpoPath(androidGoogleServices),
    };
    expoConfig.plugins.push([
      "./plugins/withAndroidFirebase",
      { configureGoogleServices: !firebaseConfigured },
    ]);
  }

  if (firebaseIosConfigured) {
    expoConfig.ios = {
      ...expoConfig.ios,
      googleServicesFile: toExpoPath(iosGoogleServices),
      entitlements: {
        ...expoConfig.ios?.entitlements,
        "aps-environment": "production",
      },
      infoPlist: {
        ...expoConfig.ios?.infoPlist,
        UIBackgroundModes: [
          ...new Set([
            ...(expoConfig.ios?.infoPlist?.UIBackgroundModes || []),
            "remote-notification",
          ]),
        ],
      },
    };
    expoConfig.plugins.push(
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
    );
    expoConfig.plugins = expoConfig.plugins.map((plugin) => {
      const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
      return pluginName === "expo-build-properties"
        ? ["expo-build-properties", { ios: { useFrameworks: "dynamic" } }]
        : plugin;
    });
  }

  return expoConfig;
};
