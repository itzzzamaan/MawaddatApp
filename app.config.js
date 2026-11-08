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
  // Firebase writes the Web OAuth client (client_type 3) into google-services.json
  // once the Google provider is enabled and an Android SHA-1 is registered.
  let googleServicesWebClientId = "";
  let googleServicesIosClientId = "";
  if (androidGoogleServices) {
    try {
      const googleServices = JSON.parse(
        fs.readFileSync(androidGoogleServices, "utf8"),
      );
      const googleServiceClients = googleServices.client || [];
      googleServicesWebClientId = googleServiceClients
        .flatMap((client) => client.oauth_client || [])
        .find((oauthClient) => oauthClient.client_type === 3)?.client_id || "";
      googleServicesIosClientId = googleServiceClients
        .flatMap(
          (client) =>
            client.services?.appinvite_service?.other_platform_oauth_client ||
            [],
        )
        .find(
          (oauthClient) =>
            oauthClient.client_type === 2 &&
            oauthClient.ios_info?.bundle_id === expoConfig.ios?.bundleIdentifier,
        )?.client_id || "";
    } catch {
      // Fall through to the environment variable / default below.
    }
  }
  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    googleServicesWebClientId ||
    "929703402001-ntnpeoe05rnmdmie89qtq1dojq3sdlsc.apps.googleusercontent.com";
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    googleServicesIosClientId ||
    "";
  const googleIosUrlScheme =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ||
    (googleIosClientId
      ? googleIosClientId.split(".").reverse().join(".").toLowerCase()
      : "");
  const firebasePlugins = new Set([
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
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
    googleWebClientId,
    googleIosClientId,
  };

  const googleSignInOptions = {};
  if (googleIosUrlScheme && !iosGoogleServices) {
    googleSignInOptions.iosUrlScheme = googleIosUrlScheme;
  }
  if (androidGoogleServices) {
    googleSignInOptions.androidGoogleServicesFile = toExpoPath(
      androidGoogleServices,
    );
  }
  if (iosGoogleServices) {
    googleSignInOptions.iosGoogleServicesFile = toExpoPath(iosGoogleServices);
  }
  expoConfig.plugins.push([
    "react-native-nitro-google-signin",
    googleSignInOptions,
  ]);

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
      "@react-native-firebase/auth",
      "@react-native-firebase/messaging",
    );
    expoConfig.plugins = expoConfig.plugins.map((plugin) => {
      const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
      if (pluginName !== "expo-build-properties") return plugin;

      const pluginOptions = Array.isArray(plugin) ? plugin[1] || {} : {};
      return [
        "expo-build-properties",
        {
          ...pluginOptions,
          ios: {
            ...pluginOptions.ios,
            useFrameworks: "dynamic",
          },
        },
      ];
    });
  }

  if (googleIosUrlScheme) {
    const infoPlist = expoConfig.ios?.infoPlist || {};
    const urlTypes = infoPlist.CFBundleURLTypes || [];
    const hasGoogleUrlScheme = urlTypes.some((urlType) =>
      (urlType.CFBundleURLSchemes || []).some(
        (scheme) => scheme.toLowerCase() === googleIosUrlScheme,
      ),
    );

    if (!hasGoogleUrlScheme) {
      expoConfig.ios = {
        ...expoConfig.ios,
        infoPlist: {
          ...infoPlist,
          CFBundleURLTypes: [
            ...urlTypes,
            { CFBundleURLSchemes: [googleIosUrlScheme] },
          ],
        },
      };
    }
  }

  return expoConfig;
};
