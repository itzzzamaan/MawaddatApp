
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
  TouchableOpacity,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { Colors } from "../../constants/theme";
import { useCurrentLocation } from "../../contexts/LocationContext";
import { useSavedPosts } from "../../contexts/SavedPostsContext";
import { getApiBase, normalizeImageUrl } from "../../utils/api";

const ACCENT = "#C49A32";
const BROWN = "#2C1810";
const CREAM = "#F7F2EC";
const TEXT_PRIMARY = BROWN;
const TEXT_MUTED = "#817165";
const PAGE_BG = CREAM;
const CARD_BG = "#FFFCF8";
const PANEL = "#EFE5D8";
const BORDER = "#E8DCCF";

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
  shadowColor: "#2C1810",
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.09,
  shadowRadius: 12,
  elevation: 4,
};

function EventCard({ item, favorite, onFavorite, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.eventCard,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: item.image
              ? normalizeImageUrl(item.image)
              : "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200",
          }}
          style={styles.eventImage}
          resizeMode="cover"
        />

        <View style={styles.imageOverlay} />

        <View style={styles.categoryBadge}>
          <Ionicons name="sparkles-outline" size={12} color="#F7D995" />
          <Text style={styles.categoryBadgeText}>
            {item.category || "Event"}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.favoriteButton,
            pressed && styles.favoritePressed,
          ]}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onFavorite(item._id || item.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={
            favorite
              ? "Remove event from favorites"
              : "Add event to favorites"
          }
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={21}
            color={favorite ? "#D94C60" : BROWN}
          />
        </Pressable>

        <View style={styles.imageCaption}>
          <Text style={styles.imageCaptionEyebrow}>
            WORDS • EMOTIONS • CONNECTIONS
          </Text>
          <Text style={styles.imageCaptionTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>      

        {/* Date and time stay on the same line */}
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeItem}>
            <View style={styles.infoIconBox}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={ACCENT}
              />
            </View>
            <View style={styles.dateTimeTextContainer}>
              <Text style={styles.infoLabel}>DATE</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {item.date || "TBA"}
              </Text>
            </View>
          </View>

          <View style={styles.dateTimeDivider} />

          <View style={styles.dateTimeItem}>
            <View style={styles.infoIconBox}>
              <Ionicons name="time-outline" size={16} color={ACCENT} />
            </View>
            <View style={styles.dateTimeTextContainer}>
              <Text style={styles.infoLabel}>TIME</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {item.time || "TBA"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.venueRow}>
          <View style={styles.venueIcon}>
            <Ionicons name="location-outline" size={17} color={BROWN} />
          </View>

          <View style={styles.venueTextContainer}>
            <Text style={styles.infoLabel}>VENUE</Text>
            <Text style={styles.venueText} numberOfLines={2}>
              {item.venue || "Venue TBD"}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={17} color="#B4A393" />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.hostContainer}>
            <View style={styles.hostIcon}>
              <Ionicons name="person-outline" size={16} color={BROWN} />
            </View>

            <View style={styles.hostTextContainer}>
              <Text style={styles.hostLabel}>PRESENTED BY</Text>
              <Text style={styles.hostText} numberOfLines={1}>
                {item.host || "Unknown"}
              </Text>
            </View>
          </View>

          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>Explore</Text>
            <Ionicons name="arrow-forward" size={16} color={CREAM} />
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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [heroPressed, setHeroPressed] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
  

  const { currentCity } = useCurrentLocation();
  const { savedPrograms, toggleSavedProgram, isProgramSaved } =
    useSavedPosts();

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      setLoading(true);
      setLoadError(false);

      try {
        const res = await fetch(`${getApiBase()}/api/events`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();

        if (active) setEvents(Array.isArray(json) ? json : []);
      } catch (err) {
        console.log("Failed to load events", err);
        if (active) {
          setEvents([]);
          setLoadError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadEvents();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((item) => {
      // Without a detected city (web, permission denied) show every event.
      const matchesCity =
        !currentCity ||
        (item.venue || "").toLowerCase().includes(currentCity.toLowerCase());

      const matchesCategory =
        activeCategory === "All" || (item.category || "") === activeCategory;

      const matchesSearch =
        !query ||
        (item.title || "").toLowerCase().includes(query) ||
        (item.subtitle || "").toLowerCase().includes(query) ||
        (item.venue || "").toLowerCase().includes(query);

      const matchesFavorite =
        !favoritesOnly || isProgramSaved(item._id || item.id);

      return (
        matchesCity &&
        matchesCategory &&
        matchesSearch &&
        matchesFavorite
      );
    });
  }, [
    activeCategory,
    currentCity,
    events,
    favoritesOnly,
    isProgramSaved,
    search,
  ]);

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
            <View>
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
                               <Text style={styles.heroTitle}>Explore Programs</Text>
                               <Text style={styles.heroDescription}>
                                 Discover legendary voices and literary figures whose words
                                 continue to inspire generations.
                               </Text>
                             </TouchableOpacity>

              <View style={styles.searchBox}>
                <View style={styles.searchIconBox}>
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color={BROWN}
                  />
                </View>

                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search programs, venues, or hosts"
                  placeholderTextColor="#A39385"
                  style={styles.searchInput}
                  returnKeyType="search"
                  accessibilityLabel="Search programs"
                />

                {search.length > 0 && (
                  <Pressable
                    onPress={() => setSearch("")}
                    hitSlop={10}
                    style={styles.clearSearchButton}
                    accessibilityLabel="Clear search"
                  >
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color="#998879"
                    />
                  </Pressable>
                )}
              </View>

              <View style={styles.categoryHeader}>
                <Text style={styles.categoryHeading}>Browse by mood</Text>
                <Text style={styles.categoryHint}>Choose your vibe</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {CATEGORIES.map((category) => {
                  const selected = activeCategory === category;

                  return (
                    <Pressable
                      key={category}
                      onPress={() => setActiveCategory(category)}
                      style={({ pressed }) => [
                        styles.categoryButton,
                        selected && styles.categoryButtonActive,
                        pressed && styles.categoryPressed,
                      ]}
                    >
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={CREAM}
                        />
                      )}

                      <Text
                        style={[
                          styles.categoryText,
                          selected && styles.categoryTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.resultsHeader}>
                <View>
                  <Text style={styles.resultsTitle}>
                    {activeCategory === "All"
                      ? "Upcoming Programs"
                      : `${activeCategory} programs`}
                  </Text>
                  <Text style={styles.resultsSubtitle}>
                    A little inspiration for your day
                  </Text>
                </View>

                <Ionicons
                  name="sparkles-outline"
                  size={22}
                  color={ACCENT}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name={loadError ? "cloud-offline-outline" : "calendar-outline"}
                    size={32}
                    color={BROWN}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  {loadError ? "Couldn't load programs" : "No programs found"}
                </Text>

                <Text style={styles.emptyText}>
                  {loadError
                    ? "Please check your connection and try again."
                    : currentCity
                      ? `No programs scheduled in ${currentCity} match your selection. Try another category or search.`
                      : "No programs match your selection. Try another category or search."}
                </Text>

                {loadError && (
                  <Pressable
                    style={styles.resetButton}
                    onPress={() => setReloadKey((key) => key + 1)}
                  >
                    <Text style={styles.resetButtonText}>Try again</Text>
                  </Pressable>
                )}

                {search.length > 0 && (
                  <Pressable
                    style={styles.resetButton}
                    onPress={() => {
                      setSearch("");
                      setActiveCategory("All");
                    }}
                  >
                    <Text style={styles.resetButtonText}>Clear filters</Text>
                  </Pressable>
                )}
              </View>
            )
          }
          renderItem={({ item }) => (
            <EventCard
              item={item}
              favorite={Boolean(isProgramSaved(item._id || item.id))}
              onFavorite={toggleFavorite}
              onPress={() => handleOpen(item)}
            />
          )}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={styles.loadingText}>
                  Finding beautiful experiences...
                </Text>
              </View>
            ) : filteredEvents.length > 0 ? (
              <View style={styles.footerNote}>
                <Ionicons name="heart" size={15} color={ACCENT} />
                <Text style={styles.footerNoteText}>
                  Made for moments worth remembering
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
    marginTop: -31,
    
  },

  page: {
    marginBottom: 94,
    backgroundColor: PAGE_BG,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  

 hero: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    marginBottom: 10,
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

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingHorizontal: 2,
  },

  sectionEyebrow: {
    color: ACCENT,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
    marginBottom: 5,
  },

  sectionTitle: {
    color: BROWN,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  countBadge: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: BROWN,
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    color: CREAM,
    fontSize: 14,
    fontWeight: "800",
  },

  searchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 17,
    paddingHorizontal: 9,
    marginBottom: 21,
    borderWidth: 1,
    borderColor: BORDER,
    ...SHADOW,
  },

  searchIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: PANEL,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInput: {
    flex: 1,
    color: BROWN,
    
    paddingHorizontal: 10,
    fontSize: 12,
  },

  clearSearchButton: {
    padding: 5,
  },

  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
    paddingHorizontal: 2,
  },

  categoryHeading: {
    color: BROWN,
    fontSize: 15,
    fontWeight: "800",
  },

  categoryHint: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: "500",
  },

  categoryRow: {
    paddingBottom: 21,
    paddingRight: 5,
    gap: 8,
  },

  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: CARD_BG,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: BORDER,
  },

  categoryButtonActive: {
    backgroundColor: BROWN,
    borderColor: BROWN,
  },

  categoryPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },

  categoryText: {
    color: BROWN,
    fontSize: 11,
    fontWeight: "700",
  },

  categoryTextActive: {
    color: CREAM,
  },

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
    paddingHorizontal: 2,
  },

  resultsTitle: {
    color: BROWN,
    fontSize: 17,
    fontWeight: "800",
  },

  resultsSubtitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  eventCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 19,
    borderWidth: 1,
    borderColor: BORDER,
    ...SHADOW,
  },

  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  },

  imageContainer: {
    position: "relative",
    backgroundColor: PANEL,
  },

  eventImage: {
    width: "100%",
    height: 205,
    backgroundColor: PANEL,
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25,13,8,0.13)",
  },

  categoryBadge: {
    position: "absolute",
    top: 13,
    left: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(44,24,16,0.88)",
    borderRadius: 30,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  categoryBadgeText: {
    color: "#FFF8EE",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FFF9F0",
    borderRadius: 15,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.08)",
    elevation: 3,
  },

  favoritePressed: {
    transform: [{ scale: 0.9 }],
  },

  imageCaption: {
    position: "absolute",
    bottom: 15,
    left: 15,
    right: 15,
  },

  imageCaptionEyebrow: {
    color: "#F1D49A",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  imageCaptionTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },

  cardContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 14,
  },

  eventSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 19,
    marginBottom: 15,
  },

  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F0E6",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 11,
    marginBottom: 11,
  },

  dateTimeItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#FFFCF7",
    alignItems: "center",
    justifyContent: "center",
  },

  dateTimeTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  infoLabel: {
    color: "#9A8875",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },

  infoText: {
    color: BROWN,
    fontSize: 11,
    fontWeight: "700",
  },

  dateTimeDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#DFD0BF",
    marginHorizontal: 10,
  },

  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },

  venueIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: PANEL,
    alignItems: "center",
    justifyContent: "center",
  },

  venueTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  venueText: {
    color: BROWN,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },

  cardDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginTop: 12,
    marginBottom: 12,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  hostContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  hostIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: PANEL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  hostTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  hostLabel: {
    color: "#9A8875",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  hostText: {
    color: BROWN,
    fontSize: 11,
    fontWeight: "700",
  },

  viewButton: {
    backgroundColor: BROWN,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  viewButtonText: {
    color: CREAM,
    fontSize: 11,
    fontWeight: "800",
  },

  loadingBox: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 180,
    gap: 13,
  },

  loadingText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  emptyBox: {
    paddingHorizontal: 22,
    paddingVertical: 34,
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 3,
  },

  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: PANEL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    color: BROWN,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  emptyText: {
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
  },

  resetButton: {
    backgroundColor: BROWN,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 17,
  },

  resetButtonText: {
    color: CREAM,
    fontSize: 12,
    fontWeight: "800",
  },

  footerNote: {
    flexDirection: "row",
    marginTop: -9,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 15,
  },

  footerNoteText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "600",
  },
});
