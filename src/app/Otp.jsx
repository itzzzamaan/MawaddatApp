import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";
import { useCountdown } from "../hooks/use-countdown";
import {
  getPendingSignup,
  postAuth,
  setPendingSignup,
  storeUserSession,
} from "../utils/otpApi";

const OTP_LENGTH = 6;

export default function VerifyEmail() {
  const router = useRouter();
  const { email: routeEmail, resendAfter } = useLocalSearchParams();
  const email = Array.isArray(routeEmail) ? routeEmail[0] : routeEmail || "";
  const initialCooldown = Number(Array.isArray(resendAfter) ? resendAfter[0] : resendAfter) || 0;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [cooldown, startCooldown] = useCountdown(initialCooldown);

  const verifyCode = async () => {
    if (otp.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }

    setBusyAction("verify");
    setError("");
    setMessage("");
    try {
      const { signupToken } = await postAuth("verify-signup-otp", { email, otp });
      const session = await postAuth("signup", { email, signupToken });
      await storeUserSession(session);
      setPendingSignup(null);
      router.replace("/Splash-carousel");
    } catch (verificationError) {
      setError(verificationError.message);
      if (verificationError.status === 410 || verificationError.code === "OTP_TOO_MANY_ATTEMPTS") {
        setOtp("");
      }
    } finally {
      setBusyAction("");
    }
  };

  const resendCode = async () => {
    const pending = getPendingSignup();
    if (!pending || pending.email !== email) {
      setError("Your signup session expired. Go back and sign up again.");
      return;
    }

    setBusyAction("resend");
    setError("");
    setMessage("");
    try {
      const result = await postAuth("send-signup-otp", pending);
      setOtp("");
      startCooldown(result.resendAfterSeconds || 60);
      setMessage(`A new code was sent to ${email}.`);
    } catch (resendError) {
      if (resendError.retryAfter) startCooldown(resendError.retryAfter);
      setError(resendError.message);
    } finally {
      setBusyAction("");
    }
  };

  const verifyBusy = busyAction === "verify";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace("/signup")}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to sign up"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify your email</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={28} color={Colors.light.text} />
          </View>
          <Text style={styles.title}>Enter your code</Text>
          <Text style={styles.description}>
            We sent a {OTP_LENGTH}-digit verification code to{"\n"}
            <Text style={styles.email}>{email}</Text>
            {"\n"}The code expires in 10 minutes.
          </Text>

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
            autoComplete="sms-otp"
            maxLength={OTP_LENGTH}
            editable={!busyAction}
            style={styles.otpInput}
            accessibilityLabel="Verification code"
          />

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            disabled={Boolean(busyAction)}
            onPress={verifyCode}
            style={[styles.primaryButton, busyAction && styles.disabledButton]}
          >
            {verifyBusy ? (
              <ActivityIndicator color={Colors.light.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Verify and create account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            disabled={Boolean(busyAction) || cooldown > 0}
            onPress={resendCode}
            style={[styles.secondaryButton, (busyAction || cooldown > 0) && styles.disabledButton]}
          >
            {busyAction === "resend" ? (
              <ActivityIndicator color={Colors.light.text} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </Text>
            )}
          </TouchableOpacity>
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
    marginBottom: 22,
  },
  email: {
    color: Colors.light.text,
    fontWeight: "700",
  },
  otpInput: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: "#D9D0C6",
    borderRadius: 9,
    textAlign: "center",
    letterSpacing: 10,
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundElement,
    marginBottom: 14,
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
