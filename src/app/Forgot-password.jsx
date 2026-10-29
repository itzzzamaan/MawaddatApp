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
import { getApiBase } from "../utils/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgetPassword() {
  const router = useRouter();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${getApiBase()}/api/auth/forgot-password/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send a code.");

      setEmail(normalizedEmail);
      setStep("otp");
    } catch (requestError) {
      setError(requestError.message || "Unable to send a code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const enteredOtp = otp.trim();
    if (!/^\d{6}$/.test(enteredOtp)) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${getApiBase()}/api/auth/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: enteredOtp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Code verification failed.");

      setResetToken(data.resetToken);
      setStep("password");
    } catch (requestError) {
      setError(requestError.message || "Code verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${getApiBase()}/api/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update password.");
      setStep("complete");
    } catch (requestError) {
      setError(requestError.message || "Unable to update password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const stepContent = {
    email: {
      title: "Reset your password",
      description: "Enter the email address linked to your Mawaddat account.",
    },
    otp: {
      title: "Check your email",
      description: `Enter the 6-digit verification code sent to ${email}.`,
    },
    password: {
      title: "Create a new password",
      description: "Choose a new password for your account.",
    },
    complete: {
      title: "Password updated",
      description: "Your password has been changed. Sign in with your new password.",
    },
  }[step];

  const goBack = () => {
    if (step === "password") {
      setStep("otp");
      setResetToken("");
    } else if (step === "otp") {
      setStep("email");
    } else {
      router.back();
    }
    setError("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={goBack}
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
                name={step === "complete" ? "checkmark" : "lock-closed-outline"}
                size={27}
                color={Colors.light.text}
              />
            </View>
            <Text style={styles.title}>{stepContent.title}</Text>
            <Text style={styles.description}>{stepContent.description}</Text>

            {step === "email" ? (
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : null}

            {step === "otp" ? (
              <Field
                label="Verification code"
                value={otp}
                onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                keyboardType="number-pad"
                maxLength={6}
              />
            ) : null}

            {step === "password" ? (
              <>
                <Field
                  label="New password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  secureTextEntry
                />
                <Field
                  label="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Enter the password again"
                  secureTextEntry
                />
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {step === "email" ? (
              <ActionButton title="Send verification code" busy={busy} onPress={sendCode} />
            ) : null}
            {step === "otp" ? (
              <>
                <ActionButton title="Verify code" busy={busy} onPress={verifyCode} />
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={sendCode}
                  disabled={busy}
                >
                  <Text style={styles.secondaryButtonText}>Resend code</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {step === "password" ? (
              <ActionButton title="Update password" busy={busy} onPress={savePassword} />
            ) : null}
            {step === "complete" ? (
              <ActionButton
                title="Back to sign in"
                onPress={() => router.replace("/signin")}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor="#8B8178"
        autoCorrect={false}
      />
    </View>
  );
}

function ActionButton({ title, busy, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, busy && styles.disabledButton]}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.8}
    >
      {busy ? (
        <ActivityIndicator color={Colors.light.background} />
      ) : (
        <Text style={styles.primaryButtonText}>{title}</Text>
      )}
    </TouchableOpacity>
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
  disabledButton: { opacity: 0.65 },
  primaryButtonText: {
    color: Colors.light.background,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    alignSelf: "center",
    padding: 12,
    marginTop: 5,
  },
  secondaryButtonText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: "600",
  },
});