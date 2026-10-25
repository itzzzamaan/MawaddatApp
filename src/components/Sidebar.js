import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  Animated,
  Dimensions,
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

        const raw = profileRaw || accountRaw;
        if (raw) {
          const user = JSON.parse(raw);
          const nextName =
            user?.fullName ||
            user?.name ||
            user?.email?.split("@")[0] ||
            "Shayari Lover";
          setUsername(nextName.trim() || "Shayari Lover");
          return;
        }

        setUsername(usernameProp || "Shayari Lover");
      } catch (e) {
        setUsername(usernameProp || "Shayari Lover");
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
            <View style={styles.avatar}>
              <Ionicons
                name="person"
                size={27}
                color={PRIMARY}
              />
            </View>

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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuContent}
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
      size={21}
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
    paddingHorizontal: 17,
    paddingBottom: Platform.OS === "android" ? 12 : 20,
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
  },

  menuContent: {
    paddingBottom: 10,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 1.2,
    marginTop: 5,
    marginBottom: 10,
    marginLeft: 5,
  },

  menuItem: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 5,
    gap: 13,
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
    fontSize: 13,
    fontWeight: "500",
    color: DARK,
  },

  menuTextActive: {
    color: PRIMARY,
    fontWeight: "800",
  },

  activeIndicator: {
    width: 4,
    height: 23,
    borderRadius: 3,
    backgroundColor: PRIMARY,
  },

  footer: {
    marginTop: 15,
  },

  footerDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginBottom: 15,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#F0EAE3",
    borderRadius: 12,
    paddingVertical: 13,
  },

  logoutText: {
    color: "#A35A00",
    fontWeight: "700",
    fontSize: 14,
  },

  versionText: {
    textAlign: "center",
    color: "#AAAAAA",
    fontSize: 10,
    marginTop: 13,
  },
});

