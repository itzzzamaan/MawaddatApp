import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  TouchableOpacity,
  View,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import {
  completeFirebaseSignIn,
  completeGoogleSignIn,
  getFirebaseAuthApi,
  getFirebaseAuthErrorMessage,
} from "../utils/firebaseAuth";

// Firebase is the primary path (links the Firebase uid). If the Firebase step cannot run
// (module missing, provider disabled, Admin SDK not configured on the backend) the Google
// ID token is exchanged directly via /api/auth/google. Both link accounts by email, so a
// returning user never gets a duplicate record. Connectivity errors are not retried.
async function signInToMawaddat(googleIdToken) {
  try {
    const firebaseAuth = await getFirebaseAuthApi();
    const credential = firebaseAuth.GoogleAuthProvider.credential(googleIdToken);
    const { user } = await firebaseAuth.signInWithCredential(firebaseAuth.getAuth(), credential);
    await completeFirebaseSignIn(user);
  } catch (firebaseError) {
    if (
      firebaseError?.code === "BACKEND_UNREACHABLE" ||
      firebaseError?.code === "auth/network-request-failed"
    ) {
      throw firebaseError;
    }
    console.warn("Firebase Google sign-in failed, using backend Google verification:", firebaseError?.code || firebaseError?.name);
    await completeGoogleSignIn(googleIdToken);
  }
}

const GoogleAuthButton = () => {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    if (Platform.OS === "web") {
      setError("Google sign-in is available in the installed mobile app.");
      return;
    }

    const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
    const iosClientId = Constants.expoConfig?.extra?.googleIosClientId;
    if (!webClientId) {
      setError(
        "Google sign-in is not configured yet. Add the Google Web OAuth client ID to the app and backend environment.",
      );
      return;
    }
    if (Platform.OS === "ios" && !iosClientId) {
      setError(
        "Google sign-in is not configured for iOS. Add the iOS OAuth client ID for this app's bundle identifier.",
      );
      return;
    }

    if (!TurboModuleRegistry.get("NitroModules")) {
      setError(
        "This installed app does not include Google Credential Manager. Install a fresh Mawaddat development build; Expo Go and older app builds cannot provide this native module.",
      );
      return;
    }

    try {
      setIsSigningIn(true);
      setError("");

      const {
        GoogleOneTapSignIn,
        isCancelledResponse,
        isNoSavedCredentialFoundResponse,
        isSuccessResponse,
      } = await import("react-native-nitro-google-signin");
      GoogleOneTapSignIn.configure({
        webClientId,
        ...(Platform.OS === "ios" ? { iosClientId } : {}),
      });
      await GoogleOneTapSignIn.checkPlayServices();

      let result = await GoogleOneTapSignIn.signIn();
      if (isNoSavedCredentialFoundResponse(result)) {
        result = await GoogleOneTapSignIn.createAccount();
      }
      if (isNoSavedCredentialFoundResponse(result)) {
        result = await GoogleOneTapSignIn.presentExplicitSignIn();
      }
      if (isCancelledResponse(result)) {
        // Android also reports a *misconfigured* OAuth client (missing SHA-1 / Android
        // client) as "cancelled" after the account is picked, so never fail silently.
        console.warn(
          "Google sign-in returned 'cancelled'. If an account was selected, check the Android OAuth client (package name + SHA-1) in Firebase/Google Cloud.",
        );
        setError(
          "Google sign-in didn't complete. Please try again. If you picked an account and this keeps happening, the app's Google configuration needs attention.",
        );
        return;
      }
      if (!isSuccessResponse(result) || !result.data.idToken) {
        throw new Error(
          "Google did not return an ID token. Check the Web OAuth client configuration.",
        );
      }

      await signInToMawaddat(result.data.idToken);
      router.replace("/Splash-carousel");
    } catch (signInError) {
      if (signInError?.code === "SIGN_IN_CANCELLED" || signInError?.code === "CANCELLED") {
        return;
      }

      if (signInError?.code === "DEVELOPER_ERROR") {
        setError(
          "Google sign-in isn't set up for this build yet (missing SHA-1 / OAuth client). Please contact support.",
        );
        return;
      }
      if (signInError?.code === "PLAY_SERVICES_NOT_AVAILABLE") {
        setError("Google Play Services is missing or out of date on this device.");
        return;
      }

      const errorMessage = getFirebaseAuthErrorMessage(signInError);
      if (
        errorMessage.includes("Nitro") ||
        errorMessage.includes("TurboModuleRegistry") ||
        errorMessage.includes("NativeNitroModules") ||
        errorMessage.includes("NativeRNFBTurboAuth")
      ) {
        setError(
          "Google sign-in needs the latest Mawaddat development build. Expo Go and older app builds do not include the Firebase Auth and Credential Manager modules. Rebuild and install the app, then start Metro with `npx expo start --dev-client`.",
        );
        return;
      }
      setError(errorMessage || "Unable to sign in with Google.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>
      <TouchableOpacity
        style={[styles.button, isSigningIn && styles.disabled]}
        activeOpacity={0.8}
        onPress={handleGoogleSignIn}
        disabled={isSigningIn}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        {isSigningIn ? (
          <ActivityIndicator color="#202124" />
        ) : (
          <AntDesign name="google" size={19} color="#4285F4" />
        )}
        <Text style={styles.buttonText}>
          {isSigningIn ? "Connecting..." : "Continue with Google"}
        </Text>
      </TouchableOpacity>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  dividerLine: {
    backgroundColor: "#DADCE0",
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: "#777",
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 12,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DADCE0",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#202124",
    fontSize: 15,
    fontWeight: "600",
  },
  error: {
    color: "#D32F2F",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
});

export default GoogleAuthButton;
