import * as SecureStore from "@/utils/secureStorage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { Colors } from "../constants/theme";
import { getApiBase } from "../utils/api";
import {
  completeFirebaseSignIn,
  getFirebaseAuthApi,
  getFirebaseAuthErrorMessage,
} from "../utils/firebaseAuth";
import { postAuth, storeUserSession } from "../utils/otpApi";

const SignIn = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    const check = async () => {
      const adminToken = await SecureStore.getItemAsync("admin_token");
      if (adminToken) {
        router.replace("/admin/dashboard");
        return;
      }
      const userToken = await SecureStore.getItemAsync("user_token");
      if (userToken) router.replace("/Splash-carousel");
    };
    check();
  }, [router]);

  const handleContinue = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Please enter email and password");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError("Enter a valid email");
      return;
    }

    try {
      setIsSigningIn(true);

      const adminResponse = await fetch(getApiBase() + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (adminResponse.ok) {
        const adminJson = await adminResponse.json();

        await SecureStore.deleteItemAsync("user_token");
        await SecureStore.deleteItemAsync("user_account");
        await SecureStore.deleteItemAsync("user_profile");
        await SecureStore.setItemAsync("admin_token", adminJson.token);
        await SecureStore.setItemAsync(
          "admin_user",
          JSON.stringify(adminJson.admin),
        );
        setError("");
        router.replace("/admin/dashboard");
        return;
      }

      // Accounts created with email OTP sign in against the Mawaddat backend.
      try {
        const session = await postAuth("user-login", {
          email: normalizedEmail,
          password,
        });
        await storeUserSession(session);
        setError("");
        router.replace("/Splash-carousel");
        return;
      } catch (backendError) {
        if (backendError.status !== 401) throw backendError;
      }

      // Older accounts created through Firebase Auth still sign in via Firebase.
      let firebaseAuth;
      try {
        firebaseAuth = await getFirebaseAuthApi();
      } catch {
        setError(
          "Invalid email or password. Forgot your password? Use 'Forgot password' to set a new one.",
        );
        return;
      }
      const auth = firebaseAuth.getAuth();
      const { user } = await firebaseAuth.signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      if (!user.emailVerified) {
        setError(
          "This email was never verified. Sign up again to verify it with a code.",
        );
        return;
      }

      await completeFirebaseSignIn(user);
      setError("");
      router.replace("/Splash-carousel");
    } catch (err) {
      setError(err.code ? getFirebaseAuthErrorMessage(err) : err.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
        <View style={styles.header}>
          <Image
            source={require("./assets/images/mawaddat-app-icon.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityLabel="Mawaddat logo"
          />
          <Text style={styles.brandName}>Mawaddat</Text>
          <Text style={styles.tagline}>Poetry, devotion, and community</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Login using your email and password
          </Text>
        </View>

        <View style={styles.innerContainer}>
          <View style={styles.formContent}>
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
              />
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter password"
                placeholderTextColor="#999"
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <GoogleAuthButton />

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => router.push("/Forgot-password")}
              accessibilityRole="button"
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.continueBtn, isSigningIn && styles.disabledBtn]}
              activeOpacity={0.8}
              onPress={handleContinue}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <ActivityIndicator color={Colors.light.background} />
              ) : (
                <Text style={styles.continueText}>Continue</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signup}>
              <Text style={styles.signupLabel}>Don’t have an account?</Text>
              <TouchableOpacity onPress={() => router.push("/signup")}>
                <Text style={styles.signupText}> Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  formContainer: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 22,
  },
  brandLogo: {
    width: 84,
    height: 84,
    marginBottom: 8,
    borderRadius: 22,
  },
  brandName: {
    color: Colors.light.text,
    fontSize: wp("5.5%"),
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  tagline: {
    color: Colors.light.textSecondary,
    fontSize: wp("3.4%"),
    marginTop: 4,
    marginBottom: 22,
  },
  title: {
    fontSize: hp("3.6%"),
    fontWeight: "800",
    color: Colors.light.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: wp("3.6%"),
    color: Colors.light.textSecondary,
    marginTop: 7,
    textAlign: "center",
  },
  innerContainer: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  formContent: {
    paddingBottom: 8,
  },
  label: {
    fontSize: wp("3.6%"),
    fontWeight: "600",
    marginBottom: 6,
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
  forgotPasswordButton: {
    alignSelf: "flex-end",
    paddingVertical: 10,
  },
  forgotPasswordText: {
    color: Colors.light.text,
    fontSize: wp("3.4%"),
    fontWeight: "600",
  },
  error: {
    color: "#D32F2F",
    fontSize: wp("3.2%"),
    marginTop: 8,
  },
  footer: {
    paddingBottom: 16,
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
  signup: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupLabel: {
    color: Colors.light.textSecondary,
  },
  signupText: {
    color: Colors.light.text,
    fontWeight: "700",
  },
});

export default SignIn;
