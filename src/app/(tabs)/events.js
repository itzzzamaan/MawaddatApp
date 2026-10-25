import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import Navbar from "../../components/Navbar";
import { Colors } from "../../constants/theme";
import { useSavedPosts } from "../../contexts/SavedPostsContext";
import { getApiBase } from "../../utils/api";

const ACCENT = "#C49A32";
const TEXT_PRIMARY = Colors.light.text;
const TEXT_MUTED = Colors.light.textSecondary;
const PAGE_BG = Colors.light.background;
const CARD_BG = Colors.light.backgroundElement;
const PANEL = Colors.light.backgroundSelected;
const BROWN = Colors.light.textSecondary;

const CATEGORIES = [
  "All",
  "Love",
  "Sad",
  "Friendship",
  "Motivational",
  "Life",
  "Ghazal",
];

const SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

function EventCard({ item, favorite, onFavorite, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.eventCard, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: item.image
              ? `${getApiBase()}${item.image}`
              : "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200",
          }}
          style={styles.eventImage}
        />

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category || "Event"}</Text>
        </View>

        <Pressable
          style={styles.favoriteButton}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onFavorite(item._id || item.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={
            favorite ? "Remove event from favorites" : "Add event to favorites"
          }
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={21}
            color={favorite ? "#E54868" : TEXT_PRIMARY}
          />
        </Pressable>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.eventSubtitle} numberOfLines={2}>
          {item.subtitle || item.description}
        </Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={ACCENT} />
          <Text style={styles.infoText}>{item.date || "TBA"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={ACCENT} />
          <Text style={styles.infoText}>{item.time || "TBA"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={ACCENT} />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.venue || "Venue TBD"}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.hostText} numberOfLines={1}>
            Hosted by {item.host || "Unknown"}
          </Text>

          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View program</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function ShayariEvents() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { savedPrograms, toggleSavedProgram, isProgramSaved } = useSavedPosts();

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/events`);
        const json = await res.json();
        setEvents(Array.isArray(json) ? json : []);
      } catch (err) {
        console.log("Failed to load events", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((item) => {
      const matchesCategory =
        activeCategory === "All" ||
        (item.category || "") === activeCategory;
      const matchesSearch =
        !query ||
        ((item.title || "").toLowerCase().includes(query) ||
          (item.subtitle || "").toLowerCase().includes(query) ||
          (item.venue || "").toLowerCase().includes(query));
      const matchesFavorite = !favoritesOnly || isProgramSaved(item._id || item.id);
      return matchesCategory && matchesSearch && matchesFavorite;
    });
  }, [activeCategory, events, favoritesOnly, isProgramSaved, search]);

  const toggleFavorite = (id) => {
    const event = events.find((item) => (item._id || item.id) === id);
    if (!event) return;
    toggleSavedProgram(event);
  };

  const handleOpen = (event) => {
    router.push({
      pathname: "/eventsdetail",
      params: { eventId: String(event._id || event.id) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Navbar />
      <View style={styles.page}>
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              <View style={styles.hero}>
                <Text style={styles.heroTitle}>Explore Programs</Text>
                <Text style={styles.heroDescription}>
                  Discover soulful gatherings, poetry circles, and cultural experiences shaped by words and emotion.
                </Text>
              </View>

              {/* <View style={styles.headerRow}>
                <Text style={styles.pageTitle}>Poetry Programs</Text>

                <View style={styles.toggleGroup}>
                  <Pressable
                    onPress={() => setFavoritesOnly(false)}
                    style={[
                      styles.toggleButton,
                      !favoritesOnly && styles.toggleButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        !favoritesOnly && styles.toggleButtonTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setFavoritesOnly(true)}
                    style={[
                      styles.toggleButton,
                      favoritesOnly && styles.toggleButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        favoritesOnly && styles.toggleButtonTextActive,
                      ]}
                    >
                      Saved
                    </Text>
                  </Pressable>
                </View>
              </View> */}

              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#7B6C61" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search programs, venues, or hosts"
                  placeholderTextColor="#9B8E82"
                  style={styles.searchInput}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {CATEGORIES.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => setActiveCategory(category)}
                    style={[
                      styles.categoryButton,
                      activeCategory === category && styles.categoryButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        activeCategory === category && styles.categoryTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No events scheduled yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <EventCard
              item={item}
              favorite={Boolean(isProgramSaved(item._id || item.id))}
              onFavorite={toggleFavorite}
              onPress={() => handleOpen(item)}
            />
          )
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={ACCENT} />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG, marginTop: -31,},
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
    paddingHorizontal: 16,
    paddingTop: 8,
    
  },
  hero: {
    backgroundColor: "#E8D8C0",
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.06)",
    ...SHADOW,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  heroDescription: {
    marginTop: 6,
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT_PRIMARY,
  },
  toggleGroup: {
    flexDirection: "row",
    backgroundColor: PANEL,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.04)",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: ACCENT,
  },
  toggleButtonText: {
    color: TEXT_PRIMARY,
    fontWeight: "700",
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.06)",
    ...SHADOW,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 8,
    color: TEXT_PRIMARY,
    fontSize: 14,
  },
  categoryRow: {
    paddingBottom: 12,
  },
  categoryButton: {
    backgroundColor: PANEL,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.04)",
  },
  categoryButtonActive: {
    backgroundColor: ACCENT,
  },
  categoryText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingBottom: 36,
    paddingTop: 4,
  },
  eventCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1E7DF",
    ...SHADOW,
  },
  cardPressed: {
    opacity: 0.96,
  },
  imageContainer: {
    position: "relative",
  },
  eventImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#ddd",
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    padding: 14,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_PRIMARY,
  },
  eventSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 6,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hostText: {
    color: TEXT_MUTED,
    fontSize: 11,
    flex: 1,
    marginRight: 12,
  },
  viewButton: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  viewButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginRight: 4,
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
});

