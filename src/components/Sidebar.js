import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import * as SecureStore from "@/utils/secureStorage";
import { unregisterPushDevice } from "../utils/notifications";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(width * 0.82, 340);

const PRIMARY = "#C49A32";
const DARK = "#2C1810";
const MUTED = "#5B493D";
const LIGHT_BG = "#F0EAE3";
const CARD_BG = "#FFFDF9";

const Sidebar = ({ visible, onClose, username: usernameProp }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState(usernameProp || "Shayari Lover");
  const [profileImage, setProfileImage] = useState("");

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -SIDEBAR_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateX, backdropOpacity]);

  useEffect(() => {
    (async () => {
      try {
        const profileRaw = await SecureStore.getItemAsync("user_profile");
        const accountRaw = await SecureStore.getItemAsync("user_account");

        const profile = profileRaw ? JSON.parse(profileRaw) : {};
        const account = accountRaw ? JSON.parse(accountRaw) : {};
        const user = { ...account, ...profile };
        if (profileRaw || accountRaw) {
          const nextName =
            user?.fullName ||
            user?.name ||
            user?.email?.split("@")[0] ||
            "Shayari Lover";
          const nextImage =
            user?.imageUri || user?.avatar || user?.profileImage || user?.image || "";
          setUsername(nextName.trim() || "Shayari Lover");
          setProfileImage(typeof nextImage === "string" ? nextImage : "");
          return;
        }

        setUsername(usernameProp || "Shayari Lover");
        setProfileImage("");
      } catch (e) {
        setUsername(usernameProp || "Shayari Lover");
        setProfileImage("");
      }
    })();
  }, [usernameProp, visible]);

  const navigate = (path) => {
    onClose?.();
    setTimeout(() => {
      router.push(path);
    }, 150);
  };

  const handleLogout = async () => {
    try {
      const userToken = await SecureStore.getItemAsync("user_token");
      if (userToken) {
        try {
          await unregisterPushDevice(userToken);
        } catch (error) {
          console.error("Could not unregister push device on logout:", error);
        }
      }
      await SecureStore.deleteItemAsync("user_token");
      await SecureStore.deleteItemAsync("user_profile");
      await SecureStore.deleteItemAsync("user_account");
      await SecureStore.deleteItemAsync("pending_signup");
      await SecureStore.deleteItemAsync("admin_token");
      await SecureStore.deleteItemAsync("admin_user");
    } catch (error) {
      console.log("Sidebar logout error:", error);
    } finally {
      onClose?.();
      router.replace("/signin");
    }
  };

  const isActive = (paths) =>
    paths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            height,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatar}
                resizeMode="cover"
                accessibilityLabel="Profile picture"
                onError={() => setProfileImage("")}
              />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={27} color={PRIMARY} />
              </View>
            )}

            <View style={styles.profileInfo}>
              <Text style={styles.username} numberOfLines={1}>
                {username}
              </Text>

              <Pressable
                onPress={() => navigate("/EditProfile")}
                hitSlop={8}
              >
                <Text style={styles.viewProfile}>
                  View Profile
                  <Ionicons
                    name="arrow-forward"
                    size={12}
                    color={PRIMARY}
                  />
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityLabel="Close sidebar"
          >
            <Ionicons name="close" size={23} color={DARK} />
          </Pressable>
        </View>

        {/* App Identity */}
        {/* <View style={styles.brandCard}>
          <View style={styles.brandIcon}>
            <MaterialCommunityIcons
              name="format-quote-open"
              size={27}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.brandTextContainer}>
            <Text style={styles.brandTitle}>Shayari</Text>
            <Text style={styles.brandSubtitle}>
              Lafzon mein dil ki baat
            </Text>
          </View>
        </View> */}

        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {/* Explore */}
          <Text style={styles.sectionTitle}>DISCOVER</Text>

          <MenuItem
            icon="home-outline"
            text="Home"
            active={isActive(["/Home", "/home"])}
            onPress={() => navigate("/Home")}
          />

          <MenuItem
            icon="account-star-outline"
            text="Explore Directory"
            active={isActive(["/poets"])}
            onPress={() => navigate("/poets")}
          />

          <MenuItem
            icon="map-marker-outline"
            text="Near by Programs"
            active={isActive(["/events"])}
            onPress={() => navigate("/events")}
          />

          <MenuItem
            icon="information-outline"
            text="About Us"
            active={isActive(["/about"])}
            onPress={() => navigate("/about")}
          />

          {/* My Activity */}
          <Text style={styles.sectionTitle}>MY COLLECTION</Text>

          <MenuItem
            icon="bookmark-outline"
            text="Saved Posts"
            active={isActive(["/Saved", "/saved"])}
            onPress={() => navigate("/Saved")}
          />

          <MenuItem
            icon="history"
            text="Saved Programs"
            active={isActive(["/saved-programs"]) }
            onPress={() => navigate("/saved-programs")}
          />

           <MenuItem
            icon="heart-outline"
            text="Followed Poets"
            active={isActive(["/followed-poets"]) }
            onPress={() => navigate("/followed-poets")}
          />

          {/* Account & Support */}
          <Text style={styles.sectionTitle}>ACCOUNT & SUPPORT</Text>

          <MenuItem
            icon="help-circle-outline"
            text="Help & Support"
            active={isActive(["/helpandsupport"])}
            onPress={() => navigate("/helpandsupport")}
          />

          <MenuItem
            icon="shield-check-outline"
            text="Privacy Policy"
            active={isActive(["/privacy-policy"])}
            onPress={() => navigate("/privacy-policy")}
          />

          <View style={styles.footer}>
            <View style={styles.footerDivider} />

            <Pressable
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={21}
                color="#C0392B"
              />
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>

        
          </View>
        </ScrollView>
      </Animated.View>

      {/* Backdrop */}
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>
    </View>
  );
};

const MenuItem = ({ icon, text, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.menuItem,
      active && styles.menuItemActive,
      pressed && styles.menuItemPressed,
    ]}
  >
    <MaterialCommunityIcons
      name={icon}
      size={19}
      color={active ? PRIMARY : "#686868"}
    />

    <Text
      style={[
        styles.menuText,
        active && styles.menuTextActive,
      ]}
    >
      {text}
    </Text>

    {active && (
      <View style={styles.activeIndicator} />
    )}
  </Pressable>
);

export default Sidebar;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    flexDirection: "row",
  },

  sidebar: {
    width: SIDEBAR_WIDTH,
    maxWidth: 340,
    backgroundColor: "#F8F6F2",
    marginTop: Platform.OS === "android" ? -62 : -32,
    paddingTop: Platform.OS === "android" ? 18 : 20,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === "android" ? 10 : 14,
    elevation: 15,
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    zIndex: 2,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
    zIndex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: LIGHT_BG,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E9DCC7",
  },

  profileInfo: {
    flex: 1,
  },

  username: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
  },

  viewProfile: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },

  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    marginLeft: 8,
  },

  brandCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderRadius: 16,
    marginBottom: 25,
  },

  brandIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  brandTextContainer: {
    marginLeft: 12,
  },

  brandTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  brandSubtitle: {
    color: "#FFF0E3",
    fontSize: 12,
    marginTop: 3,
  },

  menuScroll: {
    flex: 1,
    minHeight: 0,
  },

  menuContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 1.2,
    marginTop: 4,
    marginBottom: 7,
    marginLeft: 4,
  },

  menuItem: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 3,
    gap: 10,
    backgroundColor: "#FFFFFF",
  },

  menuItemActive: {
    backgroundColor: LIGHT_BG,
  },

  menuItemPressed: {
    opacity: 0.75,
  },

  menuText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: DARK,
  },

  menuTextActive: {
    color: PRIMARY,
    fontWeight: "800",
  },

  activeIndicator: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },

  footer: {
    marginTop: 10,
  },

  footerDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginBottom: 10,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#F0EAE3",
    borderRadius: 12,
    paddingVertical: 10,
  },

  logoutText: {
    color: "#A35A00",
    fontWeight: "700",
    fontSize: 13,
  },

  versionText: {
    textAlign: "center",
    color: "#AAAAAA",
    fontSize: 10,
    marginTop: 13,
  },
});
