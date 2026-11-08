const {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} = require("firebase-admin/app");

const getFirebaseAdminApp = () => {
  const existingApp = getApps().find((app) => app.name === "[DEFAULT]");
  if (existingApp) return existingApp;

  // Hosting dashboards often mangle multi-line JSON; accept a base64 copy as an alternative.
  const credentialJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
      ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
      : "");
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialJson && !credentialPath) {
    const error = new Error("Firebase Admin credentials are not configured.");
    error.code = "FIREBASE_ADMIN_NOT_CONFIGURED";
    throw error;
  }

  let serviceAccount;
  if (credentialJson) {
    try {
      serviceAccount = JSON.parse(credentialJson);
    } catch {
      const error = new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid.");
      error.code = "FIREBASE_ADMIN_INVALID_CONFIGURATION";
      throw error;
    }
  }

  if (
    serviceAccount?.project_id &&
    process.env.FIREBASE_PROJECT_ID &&
    serviceAccount.project_id !== process.env.FIREBASE_PROJECT_ID
  ) {
    // A mismatch makes every ID token from the app fail verification (wrong audience).
    console.warn(
      "FIREBASE_PROJECT_ID does not match the service account's project_id; Firebase ID tokens will be rejected.",
    );
  }

  const credential = serviceAccount ? cert(serviceAccount) : applicationDefault();
  return initializeApp({
    credential,
    ...(process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id
      ? {
          projectId:
            process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
        }
      : {}),
  });
};

module.exports = { getFirebaseAdminApp };
