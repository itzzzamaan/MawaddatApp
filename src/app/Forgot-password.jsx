import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";
import {
  getFirebaseAuthApi,
  getFirebaseAuthErrorMessage,
} from "../utils/firebaseAuth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgetPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sendResetLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const firebaseAuth = await getFirebaseAuthApi();
      await firebaseAuth.sendPasswordResetEmail(
        firebaseAuth.getAuth(),
        normalizedEmail,
      );
      setEmail(normalizedEmail);
      setSent(true);
    } catch (requestError) {
      setError(getFirebaseAuthErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={sent ? "checkmark" : "lock-closed-outline"}
                size={27}
                color={Colors.light.text}
              />
            </View>
            <Text style={styles.title}>
              {sent ? "Check your email" : "Reset your password"}
            </Text>
            <Text style={styles.description}>
              {sent
                ? `If a Mawaddat account exists for ${email}, Firebase has sent a password reset link.`
                : "Enter the email address linked to your Mawaddat account. Firebase will email a secure reset link."}
            </Text>

            {!sent ? (
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor="#8B8178"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
            ) : null}

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.disabledButton]}
              onPress={sent ? () => router.replace("/signin") : sendResetLink}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color={Colors.light.background} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {sent ? "Back to sign in" : "Send password reset link"}
                </Text>
              )}
            </TouchableOpacity>

            {sent ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={sendResetLink}
                disabled={busy}
              >
                <Text style={styles.secondaryButtonText}>Resend reset link</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22,
  },
  form: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
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
  field: { marginBottom: 16 },
  label: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D9D0C6",
    borderRadius: 9,
    paddingHorizontal: 13,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundElement,
    fontSize: 15,
  },
  error: {
    color: "#B42318",
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
    alignSelf: "center",
    padding: 12,
    marginTop: 5,
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
