import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import Constants from "expo-constants";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Colors } from "../constants/theme";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "@/utils/secureStorage";

const getApiBase = () => {
  // Dev web: the backend runs on the page's own host; a LAN IP baked into
  // EXPO_PUBLIC_API_URL is usually unreachable from the browser.
  if (Platform.OS === "web" && __DEV__ && typeof window !== "undefined") {
    return `http://${window.location.hostname}:4000`;
  }

  const envHost = process.env.EXPO_PUBLIC_API_URL;
  if (envHost) return envHost.replace(/\/$/, "");

  if (Platform.OS === "web") return "http://localhost:4000";

  const debuggerHost =
    Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  let host = "10.0.2.2";

  if (debuggerHost) {
    host = debuggerHost.split(":")[0];
  } else if (Platform.OS === "android") {
    host = "10.0.2.2";
  }

  return `http://${host}:4000`;
};

// On web, a press-handling wrapper blurs the input as soon as it is clicked,
// so only dismiss the keyboard on tap for native.
const DismissKeyboard = ({ children }) =>
  Platform.OS === "web" ? (
    children
  ) : (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  );

export default function SignUp() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    const checkLogged = async () => {
      const t = await SecureStore.getItemAsync("user_token");
      if (t) router.replace("(tabs)/Home");
    };
    checkLogged();
  }, []);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError("Please fill all fields");
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Enter a valid email");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setIsSendingOtp(true);
      setError("");

      const base = getApiBase();
      const response = await fetch(`${base}/api/auth/send-signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to send OTP");
      }

      const pending = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        otp: data.otp || null,
        createdAt: Date.now(),
      };

      await SecureStore.setItemAsync("pending_signup", JSON.stringify(pending));
      router.push({ pathname: "/Otp", params: { email: pending.email } });
    } catch (err) {
      setError(err.message || "Unable to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DismissKeyboard>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* ================= HEADER ================= */}
          <View style={styles.header}>
            <Text style={styles.heading}>Welcome New User</Text>
            <Text style={styles.subheading}>
              Create your account to continue
            </Text>
          </View>

          {/* ================= FORM CARD ================= */}
          <View style={styles.card}>
            {/* Full Name */}
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter your name"
                placeholderTextColor="#999"
                style={styles.input}
                value={name}
                onChangeText={setName}
                returnKeyType="done"
              />
            </View>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter email"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                returnKeyType="done"
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Create a password"
                placeholderTextColor="#999"
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* ================= BOTTOM ================= */}
            <View style={styles.bottomContainer}>
              <TouchableOpacity
                style={[styles.continueBtn, isSendingOtp && styles.disabledBtn]}
                activeOpacity={0.8}
                onPress={handleSignup}
                disabled={isSendingOtp}
              >
                <Text style={styles.continueText}>
                  {isSendingOtp ? "Sending OTP..." : "Create Account"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.bottomText}>
                Already have an account?{" "}
                <Text
                  style={styles.signinText}
                  onPress={() => router.push("signin")}
                >
                  Sign In
                </Text>
              </Text>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </DismissKeyboard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: -12,
  },

  scrollContent: {
    flexGrow: 1,
  },

  /* ---------- Header ---------- */
  header: {
    paddingHorizontal: 20,
    paddingVertical: hp("5%"),
  },
  heading: {
    fontSize: hp("4%"),
    fontWeight: "700",
    color: Colors.light.textSecondary,
  },
  subheading: {
    fontSize: wp("3.6%"),
    color: Colors.light.textSecondary,
    marginTop: 6,
  },

  /* ---------- Card ---------- */
  card: {
    flex: 1,
    minHeight: 420,
    backgroundColor: Colors.light.backgroundElement,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
    justifyContent: "space-between",
  },

  label: {
    fontSize: wp("3.6%"),
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 16,
    color: Colors.light.text,
  },

  inputContainer: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  input: {
    fontSize: wp("3.6%"),
    paddingVertical: hp("1.4%"),
    color: Colors.light.text,
  },

  error: {
    color: "#D32F2F",
    fontSize: wp("3.2%"),
    marginTop: 10,
  },

  /* ---------- Bottom ---------- */
  bottomContainer: {
    marginTop: "auto",
  },

  continueBtn: {
    backgroundColor: Colors.light.text,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  disabledBtn: {
    opacity: 0.75,
  },

  continueText: {
    textAlign: "center",
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.light.background,
  },

  bottomText: {
    textAlign: "center",
    fontSize: wp("3.4%"),
    color: Colors.light.textSecondary,
    marginTop: 14,
  },

  signinText: {
    color: Colors.light.textSecondary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
