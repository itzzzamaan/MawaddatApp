const fs = require("node:fs/promises");
const path = require("node:path");
const {
  withAppBuildGradle,
  withDangerousMod,
  withProjectBuildGradle,
} = require("@expo/config-plugins");

const googleServicesCoordinate = "com.google.gms:google-services";
const googleServicesPlugin = "com.google.gms.google-services";
const googleServicesVersion = "4.5.0";
const firebaseBom = "com.google.firebase:firebase-bom:35.1.0";

const insertDependency = (contents, dependency, name) => {
  const dependenciesBlock = /dependencies\s*\{/;
  const match = dependenciesBlock.exec(contents);
  if (!match) {
    throw new Error(`Could not find a Gradle dependencies block for ${name}.`);
  }

  const insertionPoint = match.index + match[0].length;
  return `${contents.slice(0, insertionPoint)}\n    ${dependency}${contents.slice(
    insertionPoint,
  )}`;
};

const addGoogleServicesClasspath = (contents, language) => {
  const classpathPattern =
    /classpath\s*(?:\(\s*)?(['"])com\.google\.gms:google-services:([^'"]+)\1\s*\)?/;
  const existingClasspath = classpathPattern.exec(contents);
  if (existingClasspath) {
    const updatedClasspath = existingClasspath[0].replace(
      `:${existingClasspath[2]}`,
      `:${googleServicesVersion}`,
    );
    return `${contents.slice(0, existingClasspath.index)}${updatedClasspath}${contents.slice(
      existingClasspath.index + existingClasspath[0].length,
    )}`;
  }
  if (contents.includes(googleServicesCoordinate)) return contents;

  const dependency =
    language === "kotlin"
      ? `classpath("${googleServicesCoordinate}:${googleServicesVersion}")`
      : `classpath "${googleServicesCoordinate}:${googleServicesVersion}"`;
  return insertDependency(contents, dependency, "project-level");
};

const applyGoogleServicesPlugin = (contents, language) => {
  if (contents.includes(googleServicesPlugin)) return contents;

  const statement =
    language === "kotlin"
      ? `apply(plugin = "${googleServicesPlugin}")`
      : `apply plugin: '${googleServicesPlugin}'`;
  return `${contents.trimEnd()}\n\n${statement}\n`;
};

const addFirebaseBom = (contents, language) => {
  if (contents.includes(firebaseBom)) return contents;
  if (contents.includes("com.google.firebase:firebase-bom:")) {
    throw new Error(
      "The generated app Gradle file already declares a different Firebase BoM version.",
    );
  }

  const dependency =
    language === "kotlin"
      ? `implementation(platform("${firebaseBom}"))`
      : `implementation platform("${firebaseBom}")`;
  return insertDependency(contents, dependency, "app-level");
};

module.exports = function withAndroidFirebase(config, options = {}) {
  const configureGoogleServices = options.configureGoogleServices !== false;

  config = withProjectBuildGradle(config, (config) => {
    config.modResults.contents = addGoogleServicesClasspath(
      config.modResults.contents,
      config.modResults.language,
    );
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    let contents = addFirebaseBom(
      config.modResults.contents,
      config.modResults.language,
    );
    if (configureGoogleServices) {
      contents = applyGoogleServicesPlugin(
        contents,
        config.modResults.language,
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  if (!configureGoogleServices) return config;

  return withDangerousMod(config, [
    "android",
    async (config) => {
      const googleServicesFile = config.android?.googleServicesFile;
      if (!googleServicesFile) {
        throw new Error(
          "Android Firebase requires android.googleServicesFile in the Expo config.",
        );
      }

      const sourcePath = path.resolve(
        config.modRequest.projectRoot,
        googleServicesFile,
      );
      const destinationPath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "google-services.json",
      );
      await fs.copyFile(sourcePath, destinationPath);
      return config;
    },
  ]);
};
