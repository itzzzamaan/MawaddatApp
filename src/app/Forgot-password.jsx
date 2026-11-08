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
import { useCountdown } from "../hooks/use-countdown";
import { postAuth } from "../utils/otpApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

const COPY = {
  email: {
    icon: "lock-closed-outline",
    title: "Reset your password",
    description:
      "Enter the email address linked to your Mawaddat account. We will email you a 6-digit verification code.",
  },
  otp: {
    icon: "mail-outline",
    title: "Enter your code",
    description: "If an account exists for {email}, we sent a 6-digit code. It expires in 10 minutes.",
  },
  password: {
    icon: "key-outline",
    title: "Choose a new password",
    description: "Your code is verified. Set a new password of at least 8 characters.",
  },
  done: {
    icon: "checkmark",
    title: "Password updated",
    description: "You can now sign in with your new password.",
  },
};

export default function ForgetPassword() {
  const router = useRouter();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, startCooldown] = useCountdown(0);

  const run = async (action) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (requestError) {
      if (requestError.retryAfter) startCooldown(requestError.retryAfter);
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (isResend = false) =>
    run(async () => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw new Error("Enter a valid email address.");
      }
      const result = await postAuth("forgot-password/send-otp", { email: normalizedEmail });
      setEmail(normalizedEmail);
      startCooldown(result.resendAfterSeconds || 60);
      if (isResend) {
        setOtp("");
        setMessage(`A new code was requested for ${normalizedEmail}.`);
      }
      setStep("otp");
    });

  const verifyCode = () =>
    run(async () => {
      if (otp.length !== OTP_LENGTH) {
        throw new Error(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      }
      const result = await postAuth("forgot-password/verify-otp", { email, otp });
      setResetToken(result.resetToken);
      setStep("password");
    });

  const resetPassword = () =>
    run(async () => {
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      await postAuth("forgot-password/reset", { resetToken, password });
      setPassword("");
      setResetToken("");
      setStep("done");
    });

  const primary = {
    email: { label: "Send verification code", onPress: () => sendCode(false) },
    otp: { label: "Verify code", onPress: verifyCode },
    password: { label: "Update password", onPress: resetPassword },
    done: { label: "Back to sign in", onPress: () => router.replace("/signin") },
  }[step];
  const copy = COPY[step];

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
              <Ionicons name={copy.icon} size={27} color={Colors.light.text} />
            </View>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.description}>{copy.description.replace("{email}", email)}</Text>

            {step === "email" ? (
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

            {step === "otp" ? (
              <View style={styles.field}>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  value={otp}
                  onChangeText={(value) => {
                    setOtp(value.replace(/\D/g, "").slice(0, OTP_LENGTH));
                    setError("");
                  }}
                  placeholder="••••••"
                  placeholderTextColor="#B8AEA3"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={OTP_LENGTH}
                  style={[styles.input, styles.otpInput]}
                />
              </View>
            ) : null}

            {step === "password" ? (
              <View style={styles.field}>
                <Text style={styles.label}>New password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#8B8178"
                  secureTextEntry
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            ) : null}

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.disabledButton]}
              onPress={primary.onPress}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color={Colors.light.background} />
              ) : (
                <Text style={styles.primaryButtonText}>{primary.label}</Text>
              )}
            </TouchableOpacity>

            {step === "otp" ? (
              <TouchableOpacity
                style={[styles.secondaryButton, (busy || cooldown > 0) && styles.disabledButton]}
                onPress={() => sendCode(true)}
                disabled={busy || cooldown > 0}
              >
                <Text style={styles.secondaryButtonText}>
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </Text>
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
  otpInput: {
    textAlign: "center",
    letterSpacing: 10,
    fontSize: 24,
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
