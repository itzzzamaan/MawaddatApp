import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
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
import { Colors } from "../constants/theme";

export default function ForgetPassword() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");

  const handleBack = () => {
    router.back();
  };

  const handleSendOtp = () => {
    console.log("Send OTP to", countryCode, mobile);
    router.push("Otp");
  };

  const handleSelectCode = () => {
    console.log("Select country code");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ---------- Header ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Forgot Password</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* ---------- Title ---------- */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Enter your mobile number</Text>
            <Text style={styles.subtitle}>
              We will send you a 6-digit OTP to verify
            </Text>
          </View>

          {/* ---------- Mobile Input ---------- */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.mobileContainer}>
              <TouchableOpacity
                onPress={handleSelectCode}
                style={styles.codeBox}
              >
                <Text style={styles.codeText}>{countryCode}</Text>
                <Feather name="chevron-down" size={18} color={Colors.light.textSecondary} />
              </TouchableOpacity>

              <TextInput
                style={styles.mobileInput}
                placeholder="Enter mobile number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
                maxLength={10}
              />
            </View>
          </View>

          <View style={{ flex: 1 }} />

          {/* ---------- Button ---------- */}
          <TouchableOpacity
            style={styles.sendOtpBtn}
            onPress={handleSendOtp}
            activeOpacity={0.8}
          >
            <Text style={styles.sendOtpText}>Send OTP</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight * 0.4 : 0,
    paddingHorizontal: 20,
  },

  /* ---------- Header ---------- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    padding: 6,
  },
  headerText: {
    fontSize: wp("4%"),
    fontWeight: "600",
    marginLeft: 10,
    color: Colors.light.text,
  },

  /* ---------- Title ---------- */
  titleContainer: {
    marginTop: 24,
  },
  title: {
    fontSize: wp("6.5%"),
    fontWeight: "600",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: wp("3.4%"),
    color: Colors.light.textSecondary,
    marginTop: 6,
  },

  /* ---------- Input ---------- */
  inputSection: {
    marginTop: 24,
  },
  label: {
    fontSize: wp("3.4%"),
    fontWeight: "500",
    marginBottom: 8,
    color: Colors.light.text,
  },
  mobileContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    borderRadius: 10,
    overflow: "hidden",
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderColor: "#e5e5e5",
  },
  codeText: {
    fontSize: wp("3.4%"),
    marginRight: 4,
    color: Colors.light.textSecondary,
  },
  mobileInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: hp("1.4%"),
    fontSize: wp("3.4%"),
    color: Colors.light.text,
  },

  /* ---------- Button ---------- */
  sendOtpBtn: {
    backgroundColor: Colors.light.text,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  sendOtpText: {
    textAlign: "center",
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: Colors.light.background,
  },
});
