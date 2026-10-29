import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as SecureStore from "@/utils/secureStorage";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const PAGE_BG = "#F8F6F2";
const PANEL = "#F0EAE3";
const CARD = "#FFFDF9";
const TEXT_PRIMARY = "#2C1810";
const TEXT_MUTED = "#5B493D";
const ACCENT = "#C49A32";

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState({
    name: "Shayari Lover",
    email: "",
    mobile: "",
    address: "",
    imageUri: "https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png",
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync("user_profile");
        const accountRaw = await SecureStore.getItemAsync("user_account");
        const user = raw ? JSON.parse(raw) : accountRaw ? JSON.parse(accountRaw) : null;

        if (user) {
          const resolvedName = user.fullName || user.name || "Shayari Lover";
          setProfile((prev) => ({
            ...prev,
            name: resolvedName,
            email: user.email || prev.email,
            mobile: user.mobile || prev.mobile,
            address: user.address || prev.address,
            imageUri: user.imageUri || user.avatar || prev.imageUri,
          }));
        }
      } catch (error) {
        console.log("Profile load error:", error);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------- Header ---------- */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>

          <Text style={styles.headerTitle}>My Profile</Text>

          <View style={{ width: 24 }} />
        </View>

        {/* ---------- Profile Card ---------- */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: profile.imageUri }}
            style={{ width: 110, height: 110, borderRadius: 55 }}
          />

          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email || "No email added"}</Text>
        </View>

        {/* ---------- Details ---------- */}
        <View style={styles.infoCard}>
          <InfoRow label="Mobile" value={profile.mobile || "Not added yet"} />
          <InfoRow
            label="Address"
            value={profile.address || "Not added yet"}
          />
        </View>

        {/* ---------- Edit Profile ---------- */}
        <Pressable
          style={styles.editBtn}
          onPress={() => router.push("/EditProfile")}
        >
          <Ionicons name="create-outline" size={20} color="#000" />
          <Text style={styles.editText}>Edit Profile</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },

  container: {
    paddingHorizontal: wp(6),
    paddingBottom: 40,
    backgroundColor: PAGE_BG,
  },

  /* ---------- Header ---------- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 30,
  },

  headerTitle: {
    fontSize: wp(4.6),
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },

  /* ---------- Profile Card ---------- */
  profileCard: {
    alignItems: "center",
    backgroundColor: PANEL,
    borderRadius: 20,
    paddingVertical: 30,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E9DCC7",
  },

  name: {
    fontSize: wp(5),
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginTop: 10,
  },

  email: {
    fontSize: wp(3.6),
    color: TEXT_MUTED,
    marginTop: 6,
  },

  /* ---------- Info ---------- */
  infoCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#F0EAE3",
  },

  infoRow: {
    marginBottom: 16,
  },

  infoLabel: {
    fontSize: wp(3.4),
    color: TEXT_MUTED,
    marginBottom: 4,
  },

  infoValue: {
    fontSize: wp(4),
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },

  /* ---------- Edit Button ---------- */
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 18,
    paddingVertical: 14,
  },

  editText: {
    fontSize: wp(4),
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
