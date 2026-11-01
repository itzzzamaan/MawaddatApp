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
  getFirebaseAuthApi,
  getFirebaseAuthErrorMessage,
} from "../utils/firebaseAuth";

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
    if (!webClientId) {
      setError(
        "Google sign-in is not configured yet. Add the Google Web OAuth client ID to the app and backend environment.",
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
      GoogleOneTapSignIn.configure({ webClientId });
      await GoogleOneTapSignIn.checkPlayServices();

      let result = await GoogleOneTapSignIn.signIn();
      if (isNoSavedCredentialFoundResponse(result)) {
        result = await GoogleOneTapSignIn.createAccount();
      }
      if (isNoSavedCredentialFoundResponse(result)) {
        result = await GoogleOneTapSignIn.presentExplicitSignIn();
      }
      if (isCancelledResponse(result)) return;
      if (!isSuccessResponse(result) || !result.data.idToken) {
        throw new Error(
          "Google did not return an ID token. Check the Web OAuth client configuration.",
        );
      }

      const firebaseAuth = await getFirebaseAuthApi();
      const credential = firebaseAuth.GoogleAuthProvider.credential(
        result.data.idToken,
      );
      const auth = firebaseAuth.getAuth();
      const { user } = await firebaseAuth.signInWithCredential(auth, credential);
      await completeFirebaseSignIn(user);
      router.replace("/Splash-carousel");
    } catch (signInError) {
      if (
        signInError?.code === "SIGN_IN_CANCELLED" ||
        signInError?.code === "CANCELLED"
      ) {
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
