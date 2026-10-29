import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "../utils/secureStorage";
import { getApiBase } from "../utils/api";
import { openNotificationTarget } from "../utils/notifications";

const COLORS = {
  background: "#F8F6F2",
  card: "#FFFDF9",
  text: "#2C1810",
  muted: "#5B493D",
  accent: "#C49A32",
  border: "#E9DCC7",
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("user_token");
      setLoading(true);
      setError("");
      if (!token) {
        setError("Sign in to see your notifications.");
        setNotifications([]);
        return;
      }

      const response = await fetch(`${getApiBase()}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to load notifications (${response.status})`);
      }
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error("Failed to load notifications:", loadError);
      setError("Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
    loadNotifications();
    }, [loadNotifications]),
  );

  const openNotification = async (notification) => {
    if (!notification.read) {
      try {
        const token = await SecureStore.getItemAsync("user_token");
        const response = await fetch(
          `${getApiBase()}/api/notifications/${encodeURIComponent(notification._id)}/read`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to mark notification read (${response.status})`);
        }
        setNotifications((current) =>
          current.map((item) =>
            item._id === notification._id ? { ...item, read: true } : item,
          ),
        );
      } catch (readError) {
        console.error("Failed to mark notification read:", readError);
        Alert.alert(
          "Notification not updated",
          "We could not mark this notification as read. Its destination will still open.",
        );
      }
    }

    openNotificationTarget(notification);
  };

  const markAllRead = async () => {
    setUpdating(true);
    try {
      const token = await SecureStore.getItemAsync("user_token");
      const response = await fetch(
        `${getApiBase()}/api/notifications/read-all`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to update notifications (${response.status})`);
      }
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true })),
      );
    } catch (readError) {
      console.error("Failed to mark all notifications read:", readError);
      Alert.alert("Unable to update", "Please try marking notifications read again.");
    } finally {
      setUpdating(false);
    }
  };

  const renderNotification = ({ item }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => openNotification(item)}
      style={[styles.notification, !item.read && styles.unreadNotification]}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={item.type === "event" ? "calendar-outline" : "create-outline"}
          size={21}
          color={COLORS.accent}
        />
      </View>
      <View style={styles.messageWrap}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.date}>
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
        </Text>
      </View>
      {!item.read ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={23} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable
            disabled={updating}
            onPress={markAllRead}
            accessibilityRole="button"
          >
            <Text style={styles.markAll}>{updating ? "Saving..." : "Read all"}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
          {error.startsWith("Sign in") ? (
            <Pressable onPress={() => router.push("/signin")} style={styles.retryButton}>
              <Text style={styles.retryText}>Sign in</Text>
            </Pressable>
          ) : (
            <Pressable onPress={loadNotifications} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No notifications yet.</Text>
          }
          showsVerticalScrollIndicator={false}
          onRefresh={loadNotifications}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0EAE3",
  },
  headerTitleWrap: { flex: 1, marginLeft: 12 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  markAll: { color: COLORS.accent, fontSize: 13, fontWeight: "700" },
  listContent: { padding: 16, gap: 10 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  notification: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  unreadNotification: { borderColor: COLORS.accent },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F0EAE3",
    alignItems: "center",
    justifyContent: "center",
  },
  messageWrap: { flex: 1 },
  notificationTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  message: { color: COLORS.muted, fontSize: 13, marginTop: 4, lineHeight: 19 },
  date: { color: COLORS.muted, fontSize: 11, marginTop: 7 },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  emptyText: { color: COLORS.muted, fontSize: 15, textAlign: "center" },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: COLORS.text,
    borderRadius: 10,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
});
