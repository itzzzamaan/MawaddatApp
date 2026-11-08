import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import SafeImage from "../../components/SafeImage";
import { getApiBase, normalizeImageUrl } from "../../utils/api";

const HISTORY_KEY = "mawaddat.search.history";
const MAX_HISTORY_ITEMS = 8;
const FILTERS = [
  "All",
  "Poets",
  "Kalaam",
  "Noha",
  "Salam",
  "Manqabat",
  "Munajat",
  "Articles",
];
const COLORS = {
  background: "#F8F6F2",
  card: "#FFFDF9",
  text: "#2C1810",
  muted: "#76675D",
  accent: "#C49A32",
  border: "#E9DCC7",
  chip: "#F0EAE3",
};

const getTextContent = (item) => {
  const content =
    typeof item?.content === "string"
      ? (() => {
          try {
            return JSON.parse(item.content);
          } catch {
            return { roman: item.content };
          }
        })()
      : item?.content || {};

  return String(content.roman || content.text || item?.text || "");
};

const getFeedCategory = (item) => {
  const values = [
    item?.category,
    item?.type,
    ...(Array.isArray(item?.tags) ? item.tags : []),
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  if (values.some((value) => value.includes("article"))) return "Articles";

  const category = values.find((value) =>
    [
      "kalaam",
      "kalam",
      "noha",
      "nauha",
      "salam",
      "manqabat",
      "munajat",
    ].includes(value),
  );
  if (!category) return "";

  if (category === "kalam") return "Kalaam";
  if (category === "nauha") return "Noha";
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const buildSearchItems = (poets, feeds) => {
  const poetItems = poets.map((poet) => ({
    id: String(poet._id || poet.id || poet.name),
    kind: "poet",
    title: poet.name || "Unknown poet",
    subtitle: [poet.category || "Poet", poet.location]
      .filter(Boolean)
      .join(" · "),
    excerpt: poet.bio || poet.description || "",
    image: normalizeImageUrl(poet.image || poet.avatar),
    searchText: [
      poet.name,
      poet.bio,
      poet.description,
      poet.years,
      poet.location,
      poet.category,
      poet.famousFor,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));

  const feedItems = feeds.map((feed) => {
    const category = getFeedCategory(feed);
    const poetName =
      typeof feed.poet === "string"
        ? feed.poet
        : feed.poet?.name || feed.poetName || "";
    const excerpt = getTextContent(feed);

    return {
      id: String(feed._id || feed.id || ""),
      kind: category === "Articles" ? "article" : "post",
      title: feed.title || poetName || category || "Untitled",
      subtitle: [category || feed.category || "Kalaam", poetName]
        .filter(Boolean)
        .join(" · "),
      excerpt,
      image: normalizeImageUrl(feed.image || ""),
      category,
      searchText: [
        feed.title,
        excerpt,
        poetName,
        feed.category,
        feed.type,
        ...(Array.isArray(feed.tags) ? feed.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });

  return [...poetItems, ...feedItems].filter((item) => item.id);
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [history, setHistory] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const loadSearchData = async () => {
      setLoading(true);
      setLoadError("");

      const results = await Promise.allSettled([
        fetch(`${getApiBase()}/api/poets`),
        fetch(`${getApiBase()}/api/homefeeds`),
        AsyncStorage.getItem(HISTORY_KEY),
      ]);

      if (!active) return;

      const errors = [];
      let poets = [];
      let feeds = [];

      for (const [index, label] of [
        [0, "poets"],
        [1, "posts"],
      ]) {
        const result = results[index];
        if (result.status !== "fulfilled") {
          errors.push(`Could not load ${label}.`);
          continue;
        }
        if (!result.value.ok) {
          errors.push(`Could not load ${label} (HTTP ${result.value.status}).`);
          continue;
        }
        try {
          const data = await result.value.json();
          if (index === 0) poets = Array.isArray(data) ? data : [];
          else feeds = Array.isArray(data) ? data : [];
        } catch {
          errors.push(`Could not read ${label} from the server.`);
        }
      }

      setItems(buildSearchItems(poets, feeds));
      const historyResult = results[2];
      if (historyResult.status === "fulfilled") {
        try {
          const storedHistory = JSON.parse(historyResult.value || "[]");
          setHistory(
            Array.isArray(storedHistory)
              ? storedHistory.filter((entry) => typeof entry === "string")
              : [],
          );
        } catch {
          setLoadError("Your saved search history could not be read.");
        }
      } else {
        setLoadError("Your saved search history could not be loaded.");
      }

      if (errors.length) setLoadError(errors.join(" "));
      setLoading(false);
    };

    loadSearchData();
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return [];

    return items.filter((item) => {
      const matchesQuery = item.searchText.includes(searchTerm);
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Poets"
          ? item.kind === "poet"
          : item.kind !== "poet" && item.category === activeFilter);
      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, items, query]);

  const saveSearch = useCallback(
    async (value) => {
      const normalized = value.trim();
      if (!normalized) return;

      const nextHistory = [
        normalized,
        ...history.filter(
          (entry) => entry.toLowerCase() !== normalized.toLowerCase(),
        ),
      ].slice(0, MAX_HISTORY_ITEMS);
      setHistory(nextHistory);
      try {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      } catch (error) {
        console.error("Failed to save search history:", error);
        setLoadError("Your search could not be saved to history.");
      }
    },
    [history],
  );

  const submitSearch = () => {
    Keyboard.dismiss();
    saveSearch(query);
  };

  const selectHistory = (term) => {
    setQuery(term);
  };

  const clearHistory = async () => {
    setHistory([]);
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error("Failed to clear search history:", error);
      setLoadError("Your search history could not be cleared.");
    }
  };

  const openItem = (item) => {
    if (item.kind === "poet") {
      router.push({
        pathname: "/poet/[id]",
        params: { id: item.id },
      });
      return;
    }
    router.push({
      pathname: "/post/[id]",
      params: { id: item.id },
    });
  };

  const renderResult = ({ item }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => openItem(item)}
      style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}
    >
      {item.image ? (
        <SafeImage uri={item.image} style={styles.resultImage} />
      ) : (
        <View style={styles.resultIcon}>
          <Ionicons
            name={
              item.kind === "poet" ? "person-outline" : "document-text-outline"
            }
            size={22}
            color={COLORS.accent}
          />
        </View>
      )}
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
        {item.excerpt ? (
          <Text style={styles.resultExcerpt} numberOfLines={2}>
            {item.excerpt}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.heading}>Search</Text>
        <Text style={styles.description}>Find poets, kalaam, and articles</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.muted} />
          <TextInput
            accessibilityLabel="Search poets and content"
            autoCapitalize="none"
            autoCorrect={false}
            enterKeyHint="search"
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            placeholder="Search in English or Roman..."
            placeholderTextColor="#9A8D83"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => setQuery("")}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter && styles.filterTextActive,
              ]}
            >
              {filter}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading search content...</Text>
        </View>
      ) : query.trim() ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.results}
          renderItem={renderResult}
          ListHeaderComponent={
            <View>
              {loadError ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {loadError}
                </Text>
              ) : null}
              <Text style={styles.sectionTitle}>
                {filteredItems.length
                  ? `${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"}`
                  : "Search results"}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={36} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptyText}>
                Try another spelling or search in English/Roman text.
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.historyContent}
          keyboardShouldPersistTaps="handled"
        >
          {loadError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {loadError}
            </Text>
          ) : null}
          <View style={styles.historyHeading}>
            <Text style={styles.sectionTitle}>Recent searches</Text>
            {history.length ? (
              <Pressable onPress={clearHistory} accessibilityRole="button">
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          {history.length ? (
            history.map((term) => (
              <Pressable
                key={term}
                onPress={() => selectHistory(term)}
                style={styles.historyRow}
              >
                <Ionicons name="time-outline" size={19} color={COLORS.muted} />
                <Text style={styles.historyTerm} numberOfLines={1}>
                  {term}
                </Text>
                <Ionicons
                  name="arrow-up-outline"
                  size={17}
                  color={COLORS.muted}
                />
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={36} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No search history yet</Text>
              <Text style={styles.emptyText}>
                Your recent searches will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heading: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
  },
  description: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  searchBox: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: COLORS.text,
    fontSize: 15,
  },
  filters: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  filterChip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.chip,
  },
  filterChipActive: {
    backgroundColor: COLORS.text,
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  results: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  resultCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginTop: 10,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#EEE5DA",
  },
  pressed: {
    opacity: 0.75,
  },
  resultImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.chip,
  },
  resultIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.chip,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  resultSubtitle: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  resultExcerpt: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  historyContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  historyHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  clearText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  historyRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  historyTerm: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },
  errorText: {
    color: "#A33A2B",
    fontSize: 13,
    marginBottom: 12,
  },
});
