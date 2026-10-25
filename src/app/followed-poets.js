import React, { useMemo } from "react";
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

export default function FollowedPoetsScreen() {
  const router = useRouter();
  const { followedPoets } = useSavedPosts();

  const poems = useMemo(() => followedPoets || [], [followedPoets]);

  const openPoet = (poet) => {
    const poetId = poet?.id;
    if (!poetId) return;

    router.push({
      pathname: "/poet/[id]",
      params: { id: String(poetId) },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Navbar />

      <View style={styles.headingContainer}>
        <Text style={styles.heading}>Followed Poets</Text>
        <Text style={styles.subtitle}>Your favorite poets, all in one place</Text>
      </View>

      {poems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="person-add-outline" size={48} color={TEXT_MUTED} />
          <Text style={styles.emptyTitle}>No followed poets yet</Text>
          <Text style={styles.emptySubtitle}>
            Follow a poet from their profile to see them here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={poems}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.card}
              onPress={() => openPoet(item)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatarWrap}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Ionicons name="person" size={18} color={ACCENT} />
                    </View>
                  )}
                </View>

                <View style={styles.textWrap}>
                  <Text style={styles.poetName}>{item.name}</Text>
                  <Text style={styles.poetMeta}>{item.years || "Poet"}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
              </View>

              <Text style={styles.biography} numberOfLines={3}>
                {item.biography || "Poet profile available."}
              </Text>
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
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0E5D7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarWrap: {
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8EAD2",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  poetName: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "700",
  },
  poetMeta: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  biography: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    lineHeight: 20,
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
