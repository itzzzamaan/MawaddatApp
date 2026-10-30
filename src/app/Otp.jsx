import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import * as SecureStore from "@/utils/secureStorage";
import {
  Dimensions,
  KeyboardAvoidingView,
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Platform } from "react-native";
import {
  heightPercentageToDP,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";
import { getApiBase } from "../utils/api";

const { width } = Dimensions.get("window");
const TEXT_SCALE = 0.87;

const scale = (size) => {
  const factor = width / 300;
  return Math.round(PixelRatio.roundToNearestPixel(size * factor));
};

export default function VerifyOtp() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [contactLabel, setContactLabel] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputs = Array.from({ length: 6 }, () => useRef(null));

  useEffect(() => {
    inputs[0].current?.focus();
    const loadPending = async () => {
      const p = await SecureStore.getItemAsync("pending_signup");
      if (p) {
        const obj = JSON.parse(p);
        setPending(obj);
        setContactLabel(obj.email || null);
      }
    };
    loadPending();
  }, []);

  useEffect(() => {
    if (timer === 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (text, index) => {
    if (/^\d$/.test(text) || text === "") {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);
      setError("");

      if (text && index < inputs.length - 1) {
        inputs[index + 1].current?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const entered = code.join("");

    if (entered.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    if (!pending?.email) {
      setError("Signup session expired. Please sign up again.");
      return;
    }

    try {
      setIsVerifying(true);
      setError("");

      const response = await fetch(
        `${getApiBase()}/api/auth/verify-signup-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: pending.email, otp: entered }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Invalid OTP");
      }

      const signupResponse = await fetch(`${getApiBase()}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pending.name,
          email: pending.email,
          password: pending.password,
        }),
      });

      const signupData = await signupResponse.json();
      if (!signupResponse.ok) {
        throw new Error(signupData?.message || "Signup failed");
      }

      const user = {
        name: pending.name,
        fullName: pending.name,
        email: pending.email,
        imageUri:
          signupData.user?.imageUri ||
          "https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png",
      };

      await SecureStore.setItemAsync("user_account", JSON.stringify(user));
      await SecureStore.setItemAsync("user_profile", JSON.stringify(user));
      if (signupData.token) {
        await SecureStore.setItemAsync("user_token", signupData.token);
      }
      await SecureStore.deleteItemAsync("pending_signup");

      router.replace("/Splash-carousel");
    } catch (err) {
      setError(err.message || "Unable to verify OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!pending?.email) return;

    try {
      setIsResending(true);
      setError("");

      const response = await fetch(`${getApiBase()}/api/auth/send-signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pending.name,
          email: pending.email,
          password: pending.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to resend OTP");
      }

      const updated = {
        ...pending,
        otp: data.otp || null,
        createdAt: Date.now(),
      };
      await SecureStore.setItemAsync("pending_signup", JSON.stringify(updated));
      setPending(updated);
      setTimer(30);
      setCanResend(false);
      setCode(["", "", "", "", "", ""]);
      inputs[0].current?.focus();
    } catch (err) {
      setError(err.message || "Could not resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Verify OTP</Text>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We have sent a 6-digit code to{" "}
              {contactLabel ? "your email" : "your phone"}
            </Text>
          </View>

          <View style={styles.otpContainer}>
            {code.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={inputs[idx]}
                style={styles.otpBox}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChange(text, idx)}
              />
            ))}
          </View>

          <View style={styles.wrongContainer}>
            <Text style={styles.wrongText}>{contactLabel || "+91 9XXXXXXXXX"}</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.wrongLink}>
                {contactLabel ? "Wrong email?" : "Wrong number?"}
              </Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={[styles.verifyBtn, isVerifying && styles.disabledBtn]}
            onPress={handleVerify}
            disabled={isVerifying}
          >
            <Text style={styles.verifyText}>
              {isVerifying ? "Verifying..." : "Verify"}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            {!canResend ? (
              <Text style={styles.resendText}>Resend OTP in {timer}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isResending}>
                <Text style={styles.resendLink}>
                  {isResending ? "Sending..." : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: heightPercentageToDP(2),
    paddingTop: heightPercentageToDP(2),
  },
  headerText: {
    fontSize: wp("4.5%"),
    fontWeight: "600",
    marginLeft: 12,
  },
  titleContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  title: {
    fontSize: wp(7),
    fontWeight: "700",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: wp(3.4),
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    paddingHorizontal: 20,
  },
  otpBox: {
    width: wp(12),
    height: wp(12),
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
    borderRadius: 8,
    textAlign: "center",
    fontSize: scale(18) * TEXT_SCALE,
    backgroundColor: Colors.light.backgroundElement,
  },
  wrongContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  wrongText: {
    fontSize: scale(13) * TEXT_SCALE,
    color: Colors.light.textSecondary,
  },
  wrongLink: {
    fontSize: scale(13) * TEXT_SCALE,
    color: Colors.light.textSecondary,
    marginLeft: 6,
  },
  verifyBtn: {
    backgroundColor: Colors.light.text,
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
  },
  verifyText: {
    color: Colors.light.background,
    fontSize: wp("4%"),
    fontWeight: "600",
    textAlign: "center",
  },
  resendContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  resendText: {
    color: Colors.light.textSecondary,
  },
  resendLink: {
    color: Colors.light.textSecondary,
    fontWeight: "600",
  },
  error: {
    color: "#D32F2F",
    fontSize: wp("3.2%"),
    marginTop: 16,
    marginHorizontal: 20,
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
