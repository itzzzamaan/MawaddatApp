import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/theme";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "@/utils/secureStorage";
import {
  completeFirebaseSignIn,
  getFirebaseAuthApi,
  getFirebaseAuthErrorMessage,
} from "../utils/firebaseAuth";
import { getApiBase } from "../utils/api";
import GoogleAuthButton from "../components/GoogleAuthButton";

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
        await SecureStore.setItemAsync("admin_user", JSON.stringify(adminJson.admin));
        setError("");
        router.replace("/admin/dashboard");
        return;
      }

      const firebaseAuth = await getFirebaseAuthApi();
      const auth = firebaseAuth.getAuth();
      const { user } = await firebaseAuth.signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      if (!user.emailVerified) {
        router.replace({
          pathname: "/Otp",
          params: { email: user.email || normalizedEmail },
        });
        return;
      }

      await completeFirebaseSignIn(user);
      setError("");
      router.replace("/Splash-carousel");
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login using your email and password</Text>
        </View>

        <View style={styles.innerContainer}>
          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
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
          </ScrollView>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  formContainer: {
    flex: 1,
    width: "100%",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: hp("4%"),
  },
  title: {
    fontSize: hp("4%"),
    fontWeight: "700",
    color: Colors.light.textSecondary,
  },
  subtitle: {
    fontSize: wp("3.6%"),
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 20,
    justifyContent: "space-between",
  },
  formContent: {
    paddingBottom: 20,
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
    paddingBottom: 24,
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
