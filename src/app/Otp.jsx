import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";
import * as SecureStore from "@/utils/secureStorage";
import {
  completeFirebaseSignIn,
  getFirebaseAuthApi,
  getFirebaseAuthErrorMessage,
} from "../utils/firebaseAuth";

export default function VerifyEmail() {
  const router = useRouter();
  const { email: routeEmail, mailError: routeMailError } = useLocalSearchParams();
  const email = Array.isArray(routeEmail) ? routeEmail[0] : routeEmail || "";
  const mailError = Array.isArray(routeMailError)
    ? routeMailError[0]
    : routeMailError || "";
  const [error, setError] = useState(mailError);
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");

  useEffect(() => {
    const clearLegacySignupData = async () => {
      await SecureStore.deleteItemAsync("pending_signup");
    };
    clearLegacySignupData();
  }, []);

  const getCurrentUser = async () => {
    const firebaseAuth = await getFirebaseAuthApi();
    const auth = firebaseAuth.getAuth();
    const user = auth.currentUser;

    if (!user || user.email?.toLowerCase() !== email.toLowerCase()) {
      throw new Error(
        "Your signup session expired. Sign in with this email to continue verification.",
      );
    }

    return { firebaseAuth, user };
  };

  const checkVerification = async () => {
    setBusyAction("check");
    setError("");
    setMessage("");

    try {
      const { firebaseAuth, user } = await getCurrentUser();
      await firebaseAuth.reload(user);

      if (!user.emailVerified) {
        setError("Your email is not verified yet. Open the link in your email, then try again.");
        return;
      }

      await completeFirebaseSignIn(user);
      router.replace("/Splash-carousel");
    } catch (verificationError) {
      setError(getFirebaseAuthErrorMessage(verificationError));
    } finally {
      setBusyAction("");
    }
  };

  const resendVerification = async () => {
    setBusyAction("resend");
    setError("");
    setMessage("");

    try {
      const { firebaseAuth, user } = await getCurrentUser();
      await firebaseAuth.sendEmailVerification(user);
      setMessage(`A new verification link was sent to ${email}.`);
    } catch (verificationError) {
      setError(getFirebaseAuthErrorMessage(verificationError));
    } finally {
      setBusyAction("");
    }
  };

  const button = (label, action, onPress, secondary = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.8}
      disabled={Boolean(busyAction)}
      onPress={onPress}
      style={[
        secondary ? styles.secondaryButton : styles.primaryButton,
        busyAction && styles.disabledButton,
      ]}
    >
      {busyAction === action ? (
        <ActivityIndicator color={secondary ? Colors.light.text : Colors.light.background} />
      ) : (
        <Text style={secondary ? styles.secondaryButtonText : styles.primaryButtonText}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace("/signin")}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify your email</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={28} color={Colors.light.text} />
          </View>
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.description}>
            We sent a verification link to{"\n"}
            <Text style={styles.email}>{email}</Text>
            {"\n\n"}Open the link, return to Mawaddat, then confirm below.
          </Text>

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {button("I’ve verified my email", "check", checkVerification)}
          {button(
            "Resend verification email",
            "resend",
            resendVerification,
            true,
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  flex: { flex: 1 },
  header: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D6",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    marginLeft: 8,
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.backgroundSelected,
    marginBottom: 20,
  },
  title: {
    color: Colors.light.text,
    fontSize: 26,
    fontWeight: "800",
  },
  description: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 26,
  },
  email: {
    color: Colors.light.text,
    fontWeight: "700",
  },
  error: {
    color: "#B42318",
    fontSize: 13,
    marginBottom: 12,
  },
  message: {
    color: "#18794E",
    fontSize: 13,
    marginBottom: 12,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: Colors.light.text,
    marginTop: 6,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D9D0C6",
    marginTop: 10,
  },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: {
    color: Colors.light.background,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
