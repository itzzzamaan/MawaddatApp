import { Platform, TurboModuleRegistry } from "react-native";
import * as SecureStore from "@/utils/secureStorage";
import { getApiBase, parseApiResponse } from "./api";

export async function getFirebaseAuthApi() {
  if (Platform.OS === "web") {
    throw new Error("Firebase sign-in is available in the installed mobile app.");
  }

  if (!TurboModuleRegistry.get("NativeRNFBTurboAuth")) {
    throw new Error(
      "Firebase Auth is missing from this installed app. Build and install the latest Mawaddat development app.",
    );
  }

  return import("@react-native-firebase/auth");
}

export function getFirebaseAuthErrorMessage(error) {
  const messages = {
    "auth/account-exists-with-different-credential":
      "An account already uses this email. Sign in with email and password first.",
    "auth/credential-already-in-use":
      "This Google account is already linked to another Firebase account.",
    "auth/email-already-in-use": "An account already uses this email. Sign in instead.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/operation-not-allowed":
      "This sign-in method is disabled in Firebase Authentication.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "Invalid email or password.",
    "auth/weak-password": "Choose a password with at least 6 characters.",
    "auth/wrong-password": "Invalid email or password.",
  };

  if (
    error?.message?.includes("NativeRNFBTurboAuth") ||
    error?.message?.includes("TurboModuleRegistry")
  ) {
    return "Firebase Auth is missing from this installed app. Build and install the latest Mawaddat development app.";
  }

  return messages[error?.code] || error?.message || "Firebase authentication failed.";
}

export async function completeFirebaseSignIn(firebaseUser) {
  const firebaseAuth = await getFirebaseAuthApi();
  const idToken = await firebaseAuth.getIdToken(firebaseUser);
  const response = await fetch(`${getApiBase()}/api/auth/firebase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      name: firebaseUser.displayName || "",
      imageUri: firebaseUser.photoURL || "",
    }),
  });
  const data = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(data.message || "Unable to complete sign-in with Mawaddat.");
  }
  if (!data.token || !data.user) {
    throw new Error("The backend returned an incomplete sign-in response.");
  }

  const user = {
    id: data.user.id || null,
    name: data.user.name || firebaseUser.displayName || "",
    fullName: data.user.name || firebaseUser.displayName || "",
    email: data.user.email || firebaseUser.email || "",
    imageUri:
      data.user.imageUri ||
      firebaseUser.photoURL ||
      "https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png",
  };

  await SecureStore.deleteItemAsync("admin_token");
  await SecureStore.deleteItemAsync("admin_user");
  await SecureStore.setItemAsync("user_token", data.token);
  await SecureStore.setItemAsync("user_account", JSON.stringify(user));
  await SecureStore.setItemAsync("user_profile", JSON.stringify(user));

  return user;
}
