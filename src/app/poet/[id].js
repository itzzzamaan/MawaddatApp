import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Share,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSavedPosts } from "../../contexts/SavedPostsContext";
import Navbar from "../../components/Navbar";
import Constants from "expo-constants";
import { normalizeImageUrl } from "../../utils/api";

const PINK = "#2C1810";
const PAGE_BG = "#F8F6F2";
const CARD_BG = "#FFFDF9";
const TEXT_PRIMARY = "#2C1810";
const TEXT_MUTED = "#5B493D";
const ACCENT = "#C49A32";

const CARD_RADIUS = 18;
const SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

const getApiBase = () => {
  const envHost = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envHost) {
    const normalized = envHost.replace(/\/$/, "");
    return /^https?:\/\//i.test(normalized) ? normalized : `http://${normalized}`;
  }

  const expoHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (expoHost) {
    const host = expoHost.split(":")[0];
    return `http://${host}:4000`;
  }

  if (Platform.OS === "android") return "http://10.0.2.2:4000";
  return "http://localhost:4000";
};

const resolveImageUrl = (value) => {
  if (!value) return "";
  if (typeof value !== "string") return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return normalizeImageUrl(value);
};

const fallbackPoets = {
  "mustafa-zaidi": {
    id: "mustafa-zaidi",
    name: "Mustafa Zaidi",
    years: "1929 - 1970",
    location: "Karachi, Pakistan",
    image: require("../assets/images/jaunelia.jpeg"),
    biography:
      "Also known as Tegh Allahabadi, he was a C.S.P. officer in Pakistan, assassinated in mysterious circumstances.",
  },
  "jaun-elia": {
    id: "jaun-elia",
    name: "Jaun Elia",
    years: "1931 - 2002",
    location: "Amroha, India",
    image: require("../assets/images/jaunelia.jpeg"),
    biography:
      "Jaun Elia was a celebrated Urdu poet known for philosophical thoughts, unconventional expression, and deeply emotional poetry.",
  },
  "mirza-ghalib": {
    id: "mirza-ghalib",
    name: "Mirza Ghalib",
    years: "1797 - 1869",
    location: "Delhi, India",
    image: require("../assets/images/jaunelia.jpeg"),
    biography:
      "One of the most influential poets in Urdu and Persian literature, Mirza Ghalib is remembered for his timeless ghazals.",
  },
  "ahmad-faraz": {
    id: "ahmad-faraz",
    name: "Ahmad Faraz",
    years: "1931 - 2008",
    location: "Islamabad, Pakistan",
    image: require("../assets/images/jaunelia.jpeg"),
    biography:
      "Ahmad Faraz was a renowned Urdu poet known for romantic poetry and socially conscious verse.",
  },
  "parveen-shakir": {
    id: "parveen-shakir",
    name: "Parveen Shakir",
    years: "1952 - 1994",
    location: "Karachi, Pakistan",
    image: require("../assets/images/jaunelia.jpeg"),
    biography:
      "Parveen Shakir was an influential Urdu poet whose work explored love, identity, and relationships.",
  },
};

const normalizePoetRecord = (item = {}) => {
  const imageUrl = resolveImageUrl(item.image || item.avatar || "");

  return {
    id: String(item._id || item.id || item.name || "unknown-poet"),
    name: item.name || "Selected Poet",
    years: item.years || "",
    location: item.location || "",
    image: imageUrl || fallbackPoets[item._id]?.image || fallbackPoets[item.name?.toLowerCase()?.replace(/\s+/g, "-")]?.image || require("../assets/images/jaunelia.jpeg"),
    biography: item.bio || item.description || item.biography || "This poet profile is temporarily unavailable.",
  };
};

const normalizeHomeFeedRecord = (item = {}) => {
  const rawContent =
    typeof item.content === "string"
      ? (() => {
          try {
            return JSON.parse(item.content);
          } catch {
            return { roman: item.content };
          }
        })()
      : item.content || {};

  const content =
    rawContent && typeof rawContent === "object"
      ? rawContent
      : { roman: String(rawContent || "") };

  return {
    id: String(item._id || item.id || `${Date.now()}-${Math.random()}`),
    poetId: item.poetId || item.poet || item.poetName || "unknown-poet",
    poetName: item.poetName || item.poet || item.author || "Unknown Poet",
    type: item.type || item.category || "Kalaam",
    title: item.title || item.category || "Poem",
    source: item.source || item.type || item.category || "Featured",
    duration: item.duration || "05:00",
    image: resolveImageUrl(item.image || item.avatar || "") || "",
    text: item.text || content.roman || content.urdu || content.hindi || "",
    content: {
      roman: content.roman || content.text || item.text || "",
      urdu: content.urdu || "",
      hindi: content.hindi || "",
    },
    likes: Number(item.likes || 0),
    comments: Number(item.comments || 0),
    saved: Boolean(item.saved),
    liked: Boolean(item.liked),
    youtubeUrl: item.youtubeUrl || "",
    category: item.category || item.type || "Kalaam",
  };
};

const categories = [
  "All",
  "Kalaam",
  "Noha",
  "Salam",
  "Manqabat",
  "Munajat",
  "Article",
  "Other",
];

const LANGUAGES = [
  { label: "English", value: "roman" },
  { label: "اردو", value: "urdu" },
  { label: "हिन्दी", value: "hindi" },
];

const formatCount = (number) => {
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(number);
};

const normalizeSavedItem = (item) => {
  const content = item?.content || {};
  const avatar = typeof item?.avatar === "string" ? item.avatar : "";
  const image = typeof item?.image === "string" ? item.image : "";

  return {
    ...item,
    id: String(item?.id || `saved-${Date.now()}`),
    poet: item?.poet || item?.author || "Unknown Poet",
    born: item?.born || "",
    avatar,
    image,
    type: item?.type || "text",
    category: item?.category || "SHAYARI",
    content: {
      roman: content.roman || content.urdu || content.hindi || item?.text || "",
      urdu: content.urdu || content.roman || content.hindi || item?.text || "",
      hindi: content.hindi || content.roman || content.urdu || item?.text || "",
    },
    comments: Array.isArray(item?.comments) ? item.comments : [],
    following: Boolean(item?.following),
    liked: Boolean(item?.liked),
    saved: Boolean(item?.saved || item?.isSaved),
    likes: typeof item?.likes === "number" ? item.likes : 0,
  };
};

const FALLBACK_POET_IMAGE = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500";

const getPoetImageUrl = (value) => {
  if (typeof value === "string" && value.trim()) return value;
  return FALLBACK_POET_IMAGE;
};

export default function PoetProfile() {
  const { id } = useLocalSearchParams();
  const poetId = Array.isArray(id) ? id[0] : id;
  const fallbackPoet = fallbackPoets[poetId] || {
    id: poetId || "unknown-poet",
    name: "Selected Poet",
    years: "",
    location: "",
    image: require("../assets/images/jaunelia.jpeg"),
    biography: "This poet profile is temporarily unavailable.",
  };

  const { savedPosts, toggleSavedPost, isPostSaved, isPoetFollowed, toggleFollowedPoet } = useSavedPosts();

  const [remotePoet, setRemotePoet] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [language, setLanguage] = useState("roman");
  const [following, setFollowing] = useState(Boolean(isPoetFollowed(poetId)));
  const [likedPosts, setLikedPosts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [expandedPost, setExpandedPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postLanguages, setPostLanguages] = useState({});

  useEffect(() => {
    const loadPoet = async () => {
      if (!poetId) return;

      try {
        const res = await fetch(`${getApiBase()}/api/poets/${poetId}`);
        if (!res.ok) return;
        const poetData = await res.json();
        if (poetData) {
          setRemotePoet(normalizePoetRecord(poetData));
        }
      } catch (error) {
        console.log("Failed to load poet details:", error);
      }
    };

    const loadPoetPosts = async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/homefeeds`);
        if (!res.ok) return;
        const feedData = await res.json();
        const items = Array.isArray(feedData) ? feedData : [];
        const mapped = items
          .map(normalizeHomeFeedRecord)
          .filter((post) => {
            const matchesId = String(post.poetId) === String(poetId);
            const matchesName = String(post.poetName || "").toLowerCase() === String(fallbackPoet.name || "").toLowerCase();
            return matchesId || matchesName;
          });

        setPosts(mapped);
      } catch (error) {
        console.log("Failed to load poet feed posts:", error);
        setPosts([]);
      }
    };

    loadPoet();
    loadPoetPosts();
  }, [poetId]);

  useEffect(() => {
    setFollowing(Boolean(isPoetFollowed(poetId)));
  }, [poetId, isPoetFollowed]);

  const setPostLanguage = (postId, nextLanguage) => {
    setPostLanguages((current) => ({
      ...current,
      [postId]: nextLanguage,
    }));
  };

  useEffect(() => {
    setPosts((current) => {
      if (!current.length) return current;

      const next = current.map((post) => ({
        ...post,
        saved: isPostSaved(post.id),
      }));

      return next.some((post, index) => post.saved !== current[index].saved)
        ? next
        : current;
    });
  }, [savedPosts, isPostSaved]);

  const visiblePosts = useMemo(() => {
    if (!posts.length) return [];

    if (activeCategory === "All") {
      return posts;
    }

    const selected = activeCategory.toLowerCase();
    return posts.filter((post) => {
      const type = String(post.type || post.category || "").toLowerCase();
      const category = String(post.category || "").toLowerCase();
      return type === selected || category === selected;
    });
  }, [posts, activeCategory]);

  const poet = remotePoet || fallbackPoet;

  if (!poet) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="person-outline" size={54} color="#999999" />
        <Text style={styles.notFoundTitle}>Poet not found</Text>
        <Text style={styles.notFoundText}>
          This poet profile is not available.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleShare = async (post) => {
    try {
      await Share.share({
        message: `${poet.name}\n\n${post.content?.[postLanguages[post.id] || "roman"] || post.text || post.title}`,
      });
    } catch {
      Alert.alert("Unable to share", "Please try again.");
    }
  };

  const handleLike = (post) => {
    setLikedPosts((current) => ({
      ...current,
      [post.id]: !current[post.id],
    }));
  };

  const handleComment = (post) => {
    Alert.alert(
      "Comments",
      "Connect your comments screen or API here to display and submit comments."
    );
  };

  const handleBookmark = (post) => {
    const wasSaved = Boolean(post.saved) || isPostSaved(post.id);
    const nextSaved = !wasSaved;

    setPosts((current) =>
      current.map((item) =>
        item.id === post.id ? { ...item, saved: nextSaved } : item
      )
    );

    toggleSavedPost({
      ...post,
      id: String(post.id),
      poet: poet.name,
      born: poet.years,
      avatar: getPoetImageUrl(typeof poet.image === "string" ? poet.image : ""),
      image: typeof post.image === "string" ? post.image : "",
      youtubeUrl: typeof post.youtubeUrl === "string" ? post.youtubeUrl : "",
      type: post.image ? "image" : post.type,
      saved: nextSaved,
      text: post.text || post.content?.roman || post.content?.urdu || post.content?.hindi || post.title,
      content: post.content || {
        roman: post.text || "",
        urdu: post.text || "",
        hindi: post.text || "",
      },
    });

    Alert.alert(
      nextSaved ? "Saved to Wishlist" : "Removed from Wishlist",
      nextSaved
        ? "This Shayari was added to your saved posts."
        : "This Shayari was removed from your saved posts."
    );
  };

  const handleFollow = () => {
    const nextFollowed = !following;
    setFollowing(nextFollowed);
    toggleFollowedPoet(poetId);
    Alert.alert(
      nextFollowed ? "Following Poet" : "Unfollowed Poet",
      nextFollowed
        ? `You are now following ${poet.name}.`
        : `You have unfollowed ${poet.name}.`
    );
  };

  const handleMore = () => {
    Alert.alert(poet.name, "Choose an option", [
      {
        text: "Share profile",
        onPress: () =>
          Share.share({
            message: `${poet.name}\n${poet.biography}`,
          }),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#C9D9EA" />
        <Navbar />

        <View style={styles.scrollContainer}>
          <View style={styles.profileHeader}>
            <View style={styles.topActions}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={21} color="#333333" />
              </TouchableOpacity>

              <View style={styles.profileActions}>
                <TouchableOpacity
                  onPress={() => {
                    const nextValue = !following;
                    setFollowing(nextValue);
                    toggleFollowedPoet({
                      id: poet.id,
                      name: poet.name,
                      years: poet.years,
                      location: poet.location,
                      image: typeof poet.image === "string" ? poet.image : "",
                      biography: poet.biography,
                    });
                  }}
                  style={[
                    styles.followButton,
                    following && styles.followingButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.followText,
                      following && styles.followingText,
                    ]}
                  >
                    {following ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleMore}
                  style={styles.moreButton}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color="#333333"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.profileIdentityRow}>
              <Image
                source={typeof poet.image === "string" ? { uri: poet.image } : poet.image}
                style={styles.profileImage}
              />

              <View style={styles.profileTextWrap}>
                <Text style={styles.poetName}>{poet.name}</Text>

                <Text style={styles.poetMeta}>
                  {poet.years} <Text style={styles.metaSeparator}>|</Text> {poet.location}
                </Text>

                <Text style={styles.biography} numberOfLines={3}>{poet.biography}</Text>
              </View>
            </View>
          </View>

          <View style={styles.categoryBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories.map((category) => {
                const selected = activeCategory === category;

                return (
                  <TouchableOpacity
                    key={category}
                    activeOpacity={0.8}
                    onPress={() => setActiveCategory(category)}
                    style={[
                      styles.categoryPill,
                      selected && styles.categoryPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selected && styles.categoryTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.postsContainer}>
            <Text style={styles.sectionHeading}>
              {activeCategory === "All"
                ? `Best of ${poet.name}`
                : `${activeCategory} by ${poet.name}`}
            </Text>

            {visiblePosts.length === 0 ? (
              <View style={styles.emptyPosts}>
                <Ionicons
                  name="document-text-outline"
                  size={42}
                  color="#AAAAAA"
                />
                <Text style={styles.emptyTitle}>No posts found</Text>
                <Text style={styles.emptyText}>
                  There are no posts in this category yet.
                </Text>
              </View>
            ) : (
              visiblePosts.map((post) => {
                const liked = Boolean(likedPosts[post.id]);
                const saved = Boolean(post.saved) || isPostSaved(post.id);
                const likeCount = post.likes + (liked ? 1 : 0);
                const commentCount = Number(post.comments || 0) + (commentCounts[post.id] || 0);
                const currentLanguage = postLanguages[post.id] || "roman";
                const displayText = post.content?.[currentLanguage] || post.text || post.title || "";

                return (
                  <TouchableOpacity
                    key={post.id}
                    activeOpacity={0.96}
                    onPress={() =>
                      post.image && post.youtubeUrl ? Linking.openURL(post.youtubeUrl) : null
                    }
                    style={styles.postCard}
                  >
                    <View style={styles.postHeader}>
                      <View style={styles.sourceIcon}>
                        <Ionicons
                          name={
                            post.type === "Kalaam"
                              ? "musical-notes"
                              : post.type === "Noha"
                                ? "heart-dislike-outline"
                                : post.type === "Salam"
                                  ? "sparkles-outline"
                                  : post.type === "Manqabat"
                                    ? "star-outline"
                                    : post.type === "Munajat"
                                      ? "moon-outline"
                                      : "document-text-outline"
                          }
                          size={18}
                          color="#FFFFFF"
                        />
                      </View>

                      <View style={styles.postHeaderText}>
                        <Text style={styles.postTitle} numberOfLines={2}>
                          {post.title}
                        </Text>
                        <Text style={styles.postSource}>
                          {post.poetName || poet.name} • {post.source || post.type}
                        </Text>
                      </View>
                    </View>

                    {post.image ? (
                      <View>
                        <Image
                          source={{ uri: post.image }}
                          style={styles.videoImage}
                        />
                        <View style={styles.playButton}>
                          <Ionicons
                            name="play"
                            size={24}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationText}>
                            {post.duration}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {displayText ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() =>
                          setExpandedPost((current) =>
                            current === post.id ? null : post.id
                          )
                        }
                        style={styles.poetryContainer}
                      >
                        <Text style={styles.poetryCategory}>
                          {String(post.type).toUpperCase()}
                        </Text>

                        <Text
                          style={styles.poetryText}
                          numberOfLines={
                            expandedPost === post.id ? undefined : 4
                          }
                        >
                          {displayText}
                        </Text>

                        {displayText.length > 100 ? (
                          <Text style={styles.readMore}>
                            {expandedPost === post.id
                              ? "Show less"
                              : "Read more"}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ) : null}

                    <View style={styles.languageRowCard}>
                      <Text style={styles.languageLabelCard}>Read in</Text>
                      {LANGUAGES.map((item) => (
                        <TouchableOpacity
                          key={`${post.id}-${item.value}`}
                          onPress={() => setPostLanguage(post.id, item.value)}
                          style={[
                            styles.languageButton,
                            currentLanguage === item.value && styles.languageButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.languageButtonText,
                              currentLanguage === item.value && styles.languageButtonTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.postActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleLike(post)}
                      >
                        <Ionicons
                          name={liked ? "heart" : "thumbs-up-outline"}
                          size={19}
                          color={liked ? PINK : "#333333"}
                        />
                        <Text style={styles.actionCount}>
                          {formatCount(likeCount)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleComment(post)}
                      >
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={18}
                          color="#333333"
                        />
                        <Text style={styles.actionCount}>
                          {formatCount(commentCount)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleShare(post)}
                      >
                        <Ionicons
                          name="paper-plane-outline"
                          size={18}
                          color="#333333"
                        />
                      </TouchableOpacity>

                      <View style={styles.actionSpacer} />

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleBookmark(post)}
                      >
                        <Ionicons
                          name={saved ? "bookmark" : "bookmark-outline"}
                          size={20}
                          color={saved ? PINK : "#333333"}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
    marginTop: -32,
  },
  screen: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  profileHeader: {
    backgroundColor: "#E8D8C0",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(44,24,16,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.64)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.08)",
  },
  profileActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  followButton: {
    minWidth: 92,
    height: 34,
    borderRadius: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PINK,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  followingButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: PINK,
    shadowOpacity: 0.08,
  },
  followText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  followingText: {
    color: PINK,
  },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.08)",
  },
  profileIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#D4DCE6",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  profileTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  poetName: {
    fontSize: 21,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  poetMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: TEXT_MUTED,
    marginTop: 5,
    fontWeight: "600",
  },
  metaSeparator: {
    color: ACCENT,
  },
  biography: {
    fontSize: 12.5,
    lineHeight: 20,
    color: TEXT_PRIMARY,
    marginTop: 8,
  },
  categoryBar: {
    backgroundColor: PAGE_BG,
    paddingTop: 14,
    paddingBottom: 8,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAE4DD",
    ...SHADOW,
  },
  categoryPillActive: {
    backgroundColor: PINK,
    borderColor: PINK,
    shadowOpacity: 0.12,
  },
  categoryText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  languageButton: {
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  languageButtonActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  languageButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Hindi",
  },
  languageButtonTextActive: {
    color: "#FFFFFF",
  },
  languageLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_MUTED,
    marginRight: 4,
  },
  languageRowCard: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EAE3",
    backgroundColor: "#FBF7F2",
  },
  languageLabelCard: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
    marginRight: 2,
  },
  postsContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#383838",
    marginTop: 4,
    marginBottom: 18,
  },
  postCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    ...SHADOW,
    borderWidth: 1,
    borderColor: "#F1E7DF",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 62,
    backgroundColor: "#FFFDF9",
  },
  sourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  postHeaderText: {
    flex: 1,
  },
  postTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    lineHeight: 18,
  },
  postSource: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
    fontWeight: "600",
  },
  videoImage: {
    width: "100%",
    height: 170,
    backgroundColor: "#D5D5D5",
  },
  playButton: {
    position: "absolute",
    alignSelf: "center",
    top: "35%",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  durationText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  poetryContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAF5EF",
  },
  poetryCategory: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "800",
    color: ACCENT,
    marginBottom: 6,
    marginTop: -2,
  },
  poetryText: {
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_PRIMARY,
    fontFamily: "Hindi",
  },
  readMore: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EAE3",
    gap: 12,
    backgroundColor: "#FFFDF9",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
  },
  actionCount: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: "600",
  },
  actionSpacer: {
    flex: 1,
  },
  emptyPosts: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: "#FFFDF9",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1E6DD",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: PAGE_BG,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    color: TEXT_PRIMARY,
  },
  notFoundText: {
    marginTop: 8,
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: PINK,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

