import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  DeviceEventEmitter,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { widthPercentageToDP } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCurrentLocation } from "../contexts/LocationContext";
import { useSavedPosts } from "../contexts/SavedPostsContext";
import * as SecureStore from "../utils/secureStorage";
import { getApiBase } from "../utils/api";
import {
  registerPushDevice,
  syncFollowedPoets,
} from "../utils/notifications";
import Sidebar from "./Sidebar";

const windowWidth = Dimensions.get("window").width;

const NAV_BG = "#F8F6F2";
const ICON_COLOR = "#2C1810";
const MUTED = "#5B493D";
const ACCENT = "#C49A32";

export default function Navbar() {
  const Icon = Ionicons;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { locationName } = useCurrentLocation();
  const { followedPoets } = useSavedPosts();
  const pushSetupUser = useRef(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const refreshUnreadCount = async () => {
        const token = await SecureStore.getItemAsync("user_token");
        if (!token) {
          if (active) setUnreadCount(0);
          return;
        }
        const response = await fetch(
          `${getApiBase()}/api/notifications/unread-count`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          throw new Error(`Failed to load unread count (${response.status})`);
        }
        const result = await response.json();
        if (active) setUnreadCount(Number(result.count) || 0);
      };
      const refreshNotifications = async () => {
        try {
          const token = await SecureStore.getItemAsync("user_token");
          if (!token) {
            if (active) setUnreadCount(0);
            return;
          }

          await syncFollowedPoets(followedPoets, token);
          await refreshUnreadCount();

          if (pushSetupUser.current !== token) {
            const registered = await registerPushDevice(token);
            if (registered) pushSetupUser.current = token;
          }
        } catch (error) {
          console.error("Failed to refresh notification status:", error);
        }
      };
      const notificationListener = DeviceEventEmitter.addListener(
        "mawaddat-notification-received",
        () => {
          refreshUnreadCount().catch((error) =>
            console.error("Failed to refresh unread notification count:", error),
          );
        },
      );

      refreshNotifications();
      return () => {
        active = false;
        notificationListener.remove();
      };
    }, [followedPoets]),
  );

  return (
    <>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            {/* LEFT: MENU + LOCATION */}
            <View style={styles.locationRow}>
              <Pressable onPress={() => setSidebarOpen(true)}>
                <Icon name="menu" size={28} color={ICON_COLOR} />
              </Pressable>

              <View style={styles.brandBox}>
                <Image
                  source={require("../app/assets/images/Mawaddatlogo.png")}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.yourLocation}>
                <Text style={styles.locationLabel}>
                  Your Location
                </Text>

                <View style={styles.location}>
                  <Text style={styles.heading1} numberOfLines={1}>
                    {locationName ?? "Not Available"}
                  </Text>

                  <Icon
                    name="chevron-down-outline"
                    size={17}
                    color={ICON_COLOR}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.notifyContainer}
              onPress={() => router.push("/notifications")}
              accessibilityRole="button"
              accessibilityLabel={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : "Notifications"
              }
            >
              <Icon
                name="notifications"
                size={24}
                color={ICON_COLOR}
              />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* SIDEBAR */}
      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: NAV_BG,
  },

  container: {
    paddingTop:
      Platform.OS === "android" ? StatusBar.currentHeight : 0,
    backgroundColor: NAV_BG,
  },

  /* HEADER */
  header: {
    width: windowWidth,
    marginVertical: Platform.OS === "android" ? -14 : -36,
    marginBottom: 9,
    flexDirection: "row",
    paddingHorizontal: 10,
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    backgroundColor: NAV_BG,
  },

  /* LEFT: MENU + LOCATION */
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    flex: 1,
  },

  brandBox: {
    width: 56,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#2C1810",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },

  brandLogo: {
    width: "100%",
    height: "100%",
  },

  yourLocation: {
    rowGap: 3,
    flexShrink: 1,
    maxWidth: 175,
  },

  locationLabel: {
    color: MUTED,
    fontSize: 14,
  },

  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  heading1: {
    fontSize: widthPercentageToDP(3.4),
    fontWeight: "600",
    color: ICON_COLOR,
    flexShrink: 1,
  },

  /* CENTER LOGO */
  logoContainer: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  logoImage: {
    width: 56,
    height: 56,
  },

  /* NOTIFICATION */
  notifyContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EAE3",
    borderRadius: 7,
    marginLeft: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#B3261E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: NAV_BG,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
