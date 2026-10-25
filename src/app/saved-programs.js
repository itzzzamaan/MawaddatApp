import React from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Navbar from "../components/Navbar";
import { useSavedPosts } from "../contexts/SavedPostsContext";

const PAGE_BG = "#F8F6F2";
const CARD_BG = "#FFFDF9";
const TEXT_PRIMARY = "#2C1810";
const TEXT_MUTED = "#5B493D";
const PANEL = "#F0EAE3";
const ACCENT = "#C49A32";

export default function SavedProgramsScreen() {
  const router = useRouter();
  const { savedPrograms } = useSavedPosts();

  const openProgram = (program) => {
    if (!program?.id) return;

    router.push({
      pathname: "/eventsdetail",
      params: { eventId: String(program.id) },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Navbar />

      <View style={styles.headingContainer}>
        <Text style={styles.heading}>Saved Programs</Text>
        <Text style={styles.subtitle}>Your saved poetry programs and gatherings</Text>
      </View>

      {savedPrograms.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark-outline" size={48} color={TEXT_MUTED} />
          <Text style={styles.emptyTitle}>No saved programs yet</Text>
          <Text style={styles.emptySubtitle}>
            Save it from the Programs page to see them here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedPrograms}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.card}
              onPress={() => openProgram(item)}
            >
              <View style={styles.imageContainer}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.image} />
                ) : (
                  <View style={styles.imageFallback}>
                    <Ionicons name="calendar" size={28} color={ACCENT} />
                  </View>
                )}
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category || "Program"}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitleText}>{item.subtitle || item.description}</Text>

                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={16} color={ACCENT} />
                  <Text style={styles.infoText}>{item.date}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color={ACCENT} />
                  <Text style={styles.infoText}>{item.time}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
    marginTop: -32,
  },
  headingContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: PANEL,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 5,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0E5D7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 120,
  },
  imageFallback: {
    width: "100%",
    height: 120,
    backgroundColor: "#F8EAD2",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  cardBody: {
    padding: 14,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitleText: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    flexShrink: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
  },
});
