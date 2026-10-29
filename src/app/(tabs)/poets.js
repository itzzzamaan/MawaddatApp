import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Navbar from "../../components/Navbar";
import { getApiBase, normalizeImageUrl } from "../../utils/api";

const ACCENT = "#2C1810";
const TEXT_PRIMARY = "#2C1810";
const TEXT_MUTED = "#5B493D";
const BACKGROUND = "#F8F6F2";
const CARD = "#FFFDF9";
const PANEL = "#F0EAE3";

const FILTERS = ["All", "Poet", "Reciter", "Association", "Scholar"];
const CARD_RADIUS = 18;
const SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

export default function BookingScreen() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [poets, setPoets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroPressed, setHeroPressed] = useState(false);

  useEffect(() => {
    const loadPoets = async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/poets`);
        const json = await res.json();
        setPoets(Array.isArray(json) ? json : []);
      } catch (err) {
        console.log("Failed to load poets", err);
        setPoets([]);
      } finally {
        setLoading(false);
      }
    };

    loadPoets();
  }, []);

  const filteredPoets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return poets.filter((poet) => {
      const category = poet.category || "Poet";
      const matchesCategory =
        activeCategory === "All" || category === activeCategory;
      const matchesSearch =
        !query ||
        (poet.name || "").toLowerCase().includes(query) ||
        (poet.location || "").toLowerCase().includes(query) ||
        (category || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, poets, searchQuery]);

  const openProfile = (poet) => {
    router.push({
      pathname: "/poet/[id]",
      params: { id: String(poet._id || poet.id || poet.name) },
    });
  };

  const renderPoetCard = ({ item }) => (
    <TouchableOpacity
      style={styles.poetCard}
      onPress={() => openProfile(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{
          uri: item.image
            ? normalizeImageUrl(item.image)
            : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500",
        }}
        style={styles.poetImage}
      />

      <View style={styles.poetContent}>
        <Text style={styles.poetName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.poetYears}>{item.years || ""}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color="#77675F" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location || "Location not set"}
          </Text>
        </View>

        <View style={styles.tagRow}>
          <Text style={styles.categoryBadgeText}>
            {item.category || "Poet"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.profileBtn}
        onPress={() => openProfile(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.profileBtnText}>View Profile</Text>
        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Navbar />

      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : (
          <FlatList
            data={filteredPoets}
            renderItem={renderPoetCard}
            keyExtractor={(item) => String(item._id || item.id || item.name)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No poets available yet.</Text>
              </View>
            }
            ListHeaderComponent={
              <>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setActiveCategory("All");
                    setSearchQuery("");
                  }}
                  onPressIn={() => setHeroPressed(true)}
                  onPressOut={() => setHeroPressed(false)}
                  style={[styles.hero, heroPressed && styles.heroPressed]}
                >
                  <Text style={styles.heroTitle}>Explore Directory</Text>
                  <Text style={styles.heroDescription}>
                    Discover legendary voices and literary figures whose words
                    continue to inspire generations.
                  </Text>
                </TouchableOpacity>

                <View style={styles.searchviewContainer}>
                  <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#777777" />

                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search poets, places or type"
                      placeholderTextColor="#999999"
                      style={styles.searchInput}
                      returnKeyType="search"
                    />

                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSearchQuery("")}
                        accessibilityLabel="Clear search"
                      >
                        <Ionicons name="close-circle" size={19} color="#999999" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.filtersContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersList}
                  >
                    {FILTERS.map((category) => {
                      const selected = activeCategory === category;

                      return (
                        <TouchableOpacity
                          key={category}
                          onPress={() => setActiveCategory(category)}
                          style={[
                            styles.filterButton,
                            selected && styles.filterButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.filterText,
                              selected && styles.filterTextActive,
                            ]}
                          >
                            {category}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  container: { flex: 1, backgroundColor: BACKGROUND },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  hero: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#F4EEE8",
    borderWidth: 1,
    borderColor: "rgba(44, 24, 16, 0.08)",
    ...SHADOW,
  },
  heroPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: "#EFE5DB",
  },
  heroTitle: { fontSize: 24, fontWeight: "800", color: TEXT_PRIMARY, letterSpacing: 0.15 },
  heroDescription: {
    color: TEXT_MUTED,
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
  },
  searchviewContainer: { marginTop: 10 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.06)",
    ...SHADOW,
  },
  searchInput: { flex: 1, marginLeft: 8, color: TEXT_PRIMARY, fontSize: 13 },
  filtersContainer: { paddingLeft: 18, marginTop: 14, marginBottom: 10 },
  filtersList: { paddingRight: 18 },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: PANEL,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.04)",
  },
  filterButtonActive: { backgroundColor: ACCENT },
  filterText: { color: TEXT_PRIMARY, fontWeight: "700", fontSize: 11.5 },
  filterTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 18, paddingBottom: 52 },
  poetCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    ...SHADOW,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1E7DF",
  },
  poetImage: { width: 72, height: 72, borderRadius: 15, backgroundColor: "#ddd" },
  poetContent: { flex: 1, paddingHorizontal: 10 },
  poetName: { fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY },
  poetYears: { color: TEXT_MUTED, fontSize: 11, marginTop: 3 },
  metaRow: { marginTop: 7, flexDirection: "row", alignItems: "center" },
  locationText: {
    marginLeft: 5,
    color: TEXT_MUTED,
    fontSize: 11,
    flexShrink: 1,
  },
  tagRow: { marginTop: 7 },
  categoryBadgeText: {
    alignSelf: "flex-start",
    backgroundColor: PANEL,
    color: TEXT_PRIMARY,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: "700",
  },
  profileBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 102,
    justifyContent: "center",
  },
  profileBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
    marginRight: 4,
  },
  emptyBox: { paddingVertical: 26, alignItems: "center" },
  emptyText: { color: TEXT_MUTED, fontSize: 13 },
});
