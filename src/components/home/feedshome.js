import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useSavedPosts } from "../../contexts/SavedPostsContext";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Constants from "expo-constants";
import { normalizeImageUrl } from "../../utils/api";

const PINK = "#2C1810";
const BACKGROUND = "#F8F6F2";
const CARD = "#FFFDF9";
const MUTED = "#5B493D";
const TEXT = "#2C1810";
const PANEL = "#F0EAE3";

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
  if (!value) return null;
  if (typeof value !== "string") return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const cleaned = value.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
  const match = cleaned.match(/(?:^|\/uploads\/)([^/?#]+\.(?:jpe?g|png|webp))$/i) || cleaned.match(/([^/?#]+\.(?:jpe?g|png|webp))$/i);
  if (match) {
    return normalizeImageUrl(match[0]);
  }

  return normalizeImageUrl(value);
};

const COMMENT_USERS = [
  {
    name: "Ayesha Khan",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
  },
  {
    name: "Hamza Ali",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300",
  },
  {
    name: "Sara Raza",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300",
  },
  {
    name: "Usman Niaz",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300",
  },
];

const getLoggedInUserFallback = (user) => {
  const safeUser = user || {};
  const name =
    safeUser.name ||
    safeUser.fullName ||
    safeUser.username ||
    safeUser.email?.split("@")?.[0] ||
    "User";
  const avatar =
    safeUser.imageUri ||
    safeUser.avatar ||
    safeUser.profileImage ||
    safeUser.image ||
    "";

  return { name, avatar };
};

const normalizeCommentItem = (comment, fallbackIndex = 0, fallbackUser = null) => {
  if (!comment) return null;

  const fallbackProfile = getLoggedInUserFallback(fallbackUser);

  if (typeof comment === "string") {
    return {
      id: `${Date.now()}-${fallbackIndex}`,
      text: comment,
      userName: fallbackProfile.name,
      userAvatar: fallbackProfile.avatar,
    };
  }

  if (typeof comment === "object") {
    const user = comment.user || comment.author || fallbackUser || null;
    const resolvedName =
      comment.userName ||
      comment.username ||
      user?.name ||
      user?.fullName ||
      user?.userName ||
      user?.username ||
      fallbackProfile.name ||
      "Guest User";
    const resolvedAvatar =
      comment.userAvatar ||
      comment.avatar ||
      comment.image ||
      user?.imageUri ||
      user?.avatar ||
      user?.profileImage ||
      user?.image ||
      fallbackProfile.avatar ||
      "";

    return {
      id: String(comment.id || comment._id || `${Date.now()}-${fallbackIndex}`),
      text: comment.text || comment.comment || comment.message || "",
      userName: resolvedName,
      userAvatar: resolvedAvatar,
    };
  }

  return null;
};

const LANGUAGES = [
  { label: "English", value: "roman" },
  { label: "اردو", value: "urdu" },
  { label: "हिन्दी", value: "hindi" },
];

const normalizeBackendFeed = (item = {}, fallbackUser = null) => {
  const content = typeof item.content === "string" ? JSON.parse(item.content || "{}") : (item.content || {});
  const normalizedContent = {
    roman: content.roman || content.text || "",
    urdu: content.urdu || "",
    hindi: content.hindi || "",
  };

  const imageValue = item.image || item.avatar || "";
  const avatarValue = item.avatar || item.image || "";
  const comments = Array.isArray(item.comments)
    ? item.comments
        .map((comment, index) => normalizeCommentItem(comment, index, fallbackUser))
        .filter(Boolean)
    : [];

  const hasImage = !!(imageValue && String(imageValue).trim());
  const resolvedType = hasImage ? "image" : item.type === "video" ? "video" : "text";

  return {
    id: String(item._id || item.id || Date.now() + Math.random()),
    poetId: item.poetId || item.poet || "unknown-poet",
    poet: item.poet || item.poetName || "Unknown Poet",
    born: item.born || "",
    avatar: resolveImageUrl(avatarValue) || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    type: resolvedType,
    category: item.category || "SHAYARI",
    image: resolveImageUrl(imageValue) || "",
    content: normalizedContent,
    likes: Number(item.likes || 0),
    comments,
    liked: Boolean(item.liked),
    following: Boolean(item.following),
    saved: Boolean(item.saved),
    youtubeUrl: item.youtubeUrl || "",
  };
};

const normalizeSavedItem = (item) => {
  const content = item?.content || {};
  const savedImage = typeof item?.image === "string" ? item.image : "";
  const savedYoutubeUrl = typeof item?.youtubeUrl === "string" ? item.youtubeUrl : "";
  const comments = Array.isArray(item?.comments)
    ? item.comments
        .map((comment, index) => normalizeCommentItem(comment, index))
        .filter(Boolean)
    : [];

  return {
    ...item,
    id: String(item?.id || `saved-${Date.now()}`),
    poet: item?.poet || item?.author || "Unknown Poet",
    born: item?.born || "",
    avatar:
      item?.avatar ||
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    image: savedImage,
    youtubeUrl: savedYoutubeUrl,
    type: item?.type === "image" || item?.type === "video" || savedImage ? "image" : "text",
    category: item?.category || "SHAYARI",
    content: {
      roman:
        content.roman ||
        content.urdu ||
        content.hindi ||
        item?.text ||
        "",
      urdu:
        content.urdu ||
        content.roman ||
        content.hindi ||
        item?.text ||
        "",
      hindi:
        content.hindi ||
        content.roman ||
        content.urdu ||
        item?.text ||
        "",
    },
    comments,
    following: Boolean(item?.following),
    liked: Boolean(item?.liked),
    saved: Boolean(item?.saved || item?.isSaved),
    likes: typeof item?.likes === "number" ? item.likes : 0,
  };
};

const POET_PROFILE_MAP = {
  "Mustafa Zaidi": "mustafa-zaidi",
  "Jaun Elia": "jaun-elia",
  "Parveen Shakir": "parveen-shakir",
};

const getPoetId = (post) => post?.poetId || POET_PROFILE_MAP[post?.poet] || null;

const openPoetProfile = (post) => {
  const poetId = getPoetId(post);

  if (!poetId) {
    Alert.alert("Poet profile unavailable", "This profile is not available right now.");
    return;
  }

  router.push({
    pathname: "/poet/[id]",
    params: { id: poetId },
  });
};

const getCommentCount = (item) => {
  if (Array.isArray(item?.comments)) return item.comments.length;
  return Number(item?.comments || 0);
};

export default function Categories({ showOnlySaved = false }) {
  const [posts, setPosts] = useState([]);
  const [language, setLanguage] = useState("roman");
  const [wishlistOnly, setWishlistOnly] = useState(showOnlySaved);
  const [commentPostId, setCommentPostId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const { savedPosts, toggleSavedPost, isPostSaved, addRecentViewedPost, toggleFollowedPoet, isPoetFollowed } = useSavedPosts();

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const profileRaw = await SecureStore.getItemAsync("user_profile");
        const accountRaw = await SecureStore.getItemAsync("user_account");
        const parsed = profileRaw ? JSON.parse(profileRaw) : null;
        const account = accountRaw ? JSON.parse(accountRaw) : null;
        const user = parsed || account || null;
        setCurrentUser(user);
      } catch (error) {
        console.log("Failed to load current user:", error);
      }
    };

    loadCurrentUser();
  }, []);

  const fetchHomeFeeds = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/homefeeds`);
      const json = await response.json();
      const data = Array.isArray(json) ? json.map((item) => normalizeBackendFeed(item, currentUser)) : [];
      setPosts(data);
    } catch (error) {
      console.log("Failed to load home feeds:", error);
      setPosts([]);
    }
  };

  useEffect(() => {
    fetchHomeFeeds();
  }, [currentUser]);

  const allSavedPosts = useMemo(
    () =>
      savedPosts
        .filter((savedPost) => !posts.some((post) => post.id === String(savedPost.id)))
        .map((item) => normalizeSavedItem(item)),
    [savedPosts, posts]
  );

  const handleOpenPoetProfile = (post) => {
    const normalizedItem = normalizeSavedItem(post);
    addRecentViewedPost(normalizedItem);
    openPoetProfile(normalizedItem);
  };

  const visiblePosts = wishlistOnly
    ? [...posts.filter((post) => isPostSaved(post.id)), ...allSavedPosts]
    : posts;

  useEffect(() => {
    setPosts((current) =>
      current.map((post) => ({
        ...post,
        saved: savedPosts.some((p) => String(p.id) === String(post.id)),
        following:
          Boolean(post.following) ||
          Boolean(isPoetFollowed(getPoetId(post) || post.poet)),
      }))
    );
  }, [savedPosts, isPoetFollowed]);

  const updatePost = (id, changes) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === id ? { ...post, ...changes } : post
      )
    );
  };

  const toggleLike = (post) => {
    updatePost(post.id, {
      liked: !post.liked,
      likes: post.likes + (post.liked ? -1 : 1),
    });
  };

  const toggleFollow = (post) => {
    const poetId = getPoetId(post) || post.poet;
    const nextValue = !(post.following || isPoetFollowed(poetId));

    updatePost(post.id, { following: nextValue });

    if (poetId) {
      toggleFollowedPoet({
        id: poetId,
        name: post.poet || "Unknown Poet",
        years: post.born || "",
        location: "",
        image: post.avatar || post.image || "",
        biography: "",
      });
    }
  };

  const toggleSave = (post) => {
    updatePost(post.id, { saved: !post.saved });
  };

  const openComments = (post) => {
    setCommentPostId(post.id);
    setCommentText("");
  };

  const submitComment = async () => {
    if (!commentText.trim() || !commentPostId) {
      Alert.alert("Write a comment", "Please enter a comment first.");
      return;
    }

    const user = currentUser || null;
    const userName = user?.name || user?.fullName || user?.email?.split("@")?.[0] || "User";
    const userAvatar = user?.imageUri || user?.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300";
    const authToken = await SecureStore.getItemAsync("user_token");

    if (!authToken) {
      Alert.alert("Login required", "Please sign in again to comment.");
      return;
    }

    try {
      const response = await fetch(`${getApiBase()}/api/homefeeds/${commentPostId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          text: commentText.trim(),
          userId: user?.id || user?._id || "",
          userName,
          userAvatar,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Failed to post comment");
      }

      const serverComments = Array.isArray(json.comments)
        ? json.comments
            .map((comment, index) => normalizeCommentItem(comment, index))
            .filter(Boolean)
        : [
            normalizeCommentItem({
              id: json.comment?.id || Date.now(),
              text: commentText.trim(),
              userName,
              userAvatar,
            })
          ].filter(Boolean);

      setPosts((current) =>
        current.map((post) =>
          post.id === commentPostId
            ? { ...post, comments: serverComments }
            : post
        )
      );

      setCommentText("");
      setCommentPostId(null);
      Alert.alert("Comment added", "Your comment was saved and is now visible on the post.");
    } catch (error) {
      console.log("Comment submit failed:", error);
      Alert.alert("Unable to add comment", error.message || "Please try again.");
    }
  };

  const sharePost = async (post) => {
    try {
      await Share.share({
        message: `${post.poet}\n\n${post.content[language] || ""}\n\nShared from Shayari`,
      });
    } catch (error) {
      Alert.alert("Unable to share", "Please try again.");
    }
  };

  const openMedia = (item) => {
    const { image, youtubeUrl } = item;

    if (youtubeUrl) {
      Linking.openURL(youtubeUrl).catch(() =>
        Alert.alert("Invalid URL", "The provided URL is not valid.")
      );
    } else if (image) {
      Alert.alert("Image URL", image);
    }
  };

  const renderPost = ({ item }) => {
    const normalizedItem = normalizeSavedItem(item);
    const displayContent = normalizedItem.content?.[language] || normalizedItem.text || "";
    const commentTotal = getCommentCount(normalizedItem);

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenPoetProfile(normalizedItem)}
            style={styles.avatarButton}
          >
            <Image source={{ uri: normalizedItem.avatar }} style={styles.avatar} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenPoetProfile(normalizedItem)}
            style={styles.poetInfo}
          >
            <Text style={styles.poetName}>{normalizedItem.poet}</Text>
            <Text style={styles.poetBorn}>{normalizedItem.born}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => toggleFollow(normalizedItem)}
            style={[
              styles.followButton,
              normalizedItem.following && styles.followingButton,
            ]}
          >
            <Text
              style={[
                styles.followText,
                normalizedItem.following && styles.followingText,
              ]}
            >
              {normalizedItem.following ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        </View>

        {normalizedItem.type === "image" && normalizedItem.image ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              normalizedItem.youtubeUrl
                ? Linking.openURL(normalizedItem.youtubeUrl)
                : null
            }
            style={styles.photoPost}
          >
            <ImageBackground
              source={{ uri: normalizedItem.image }}
              style={styles.postImage}
              imageStyle={styles.postImageStyle}
            >
              <View style={styles.photoOverlay}>
                <Text style={styles.photoLogo}>Mawaddat</Text>

                {normalizedItem.youtubeUrl ? (
                  <View style={styles.playButtonOverlay}>
                    <Ionicons name="play" size={28} color="#FFFFFF" />
                  </View>
                ) : null}

                <View style={styles.photoQuoteContainer}>
                  <Text
                    style={[
                      styles.photoQuote,
                      language === "urdu" && styles.urduText,
                    ]}
                  >
                    {displayContent}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ) : (
          <View style={styles.textPost}>
            <View style={styles.categoryChip}>
              <Text style={styles.category}>{normalizedItem.category}</Text>
            </View>

            <Text
              style={[
                styles.shayariText,
                language === "urdu" && styles.urduText,
              ]}
            >
              {displayContent}
            </Text>
          </View>
        )}

        <View style={styles.languageRow}>
          <Text style={styles.languageLabel}>Read in</Text>

          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.value}
              onPress={() => setLanguage(lang.value)}
              style={[
                styles.languageButton,
                language === lang.value && styles.activeLanguage,
              ]}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === lang.value && styles.activeLanguageText,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleLike(normalizedItem)}
          >
            <Ionicons
              name={normalizedItem.liked ? "heart" : "heart-outline"}
              size={24}
              color={normalizedItem.liked ? "#D64B4B" : "#2C1810"}
            />

            <Text style={[styles.actionCount, normalizedItem.liked && { color: "#D64B4B" }]}>
              {normalizedItem.likes >= 1000
                ? `${(normalizedItem.likes / 1000).toFixed(1)}K`
                : normalizedItem.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openComments(normalizedItem)}
          >
            <Ionicons name="chatbubble-outline" size={23} color="#2C1810" />
            <Text style={styles.actionCount}>{commentTotal || ""}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => sharePost(normalizedItem)}
          >
            <Ionicons name="paper-plane-outline" size={23} color="#2C1810" />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              const wasSaved = normalizedItem.saved || isPostSaved(normalizedItem.id);
              toggleSave(normalizedItem);
              toggleSavedPost(normalizedItem);

              Alert.alert(
                wasSaved ? "Removed from Wishlist" : "Saved to Wishlist",
                wasSaved
                  ? "This Shayari was removed from your saved posts."
                  : "This Shayari was added to your saved posts."
              );
            }}
          >
            <Ionicons
              name={normalizedItem.saved || isPostSaved(normalizedItem.id) ? "bookmark" : "bookmark-outline"}
              size={24}
              color={normalizedItem.saved || isPostSaved(normalizedItem.id) ? "#C49A32" : "#2C1810"}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />

      {!showOnlySaved && (
        <View style={styles.feedHeading}>
          <Text style={styles.feedTitle}>Today's Feed</Text>
          <View style={styles.feedBadge}>
            <Text style={styles.feedBadgeText}>Live</Text>
          </View>
        </View>
      )}

      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={44} color={MUTED} />
            <Text style={styles.emptyTitle}>No feed items available</Text>
            <Text style={styles.emptySubtitle}>
              Add content from the admin panel to see it here.
            </Text>
          </View>
        }
      />

      {commentPostId !== null && (
        <Modal
          visible={Boolean(commentPostId)}
          transparent
          animationType="slide"
          onRequestClose={() => setCommentPostId(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Comments</Text>
                <TouchableOpacity
                  onPress={() => setCommentPostId(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={18} color="#2C1810" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={posts.find((post) => post.id === commentPostId)?.comments || []}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUser}>{item.userName}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.commentList}
                ListEmptyComponent={
                  <Text style={styles.emptyCommentText}>
                    No comments yet. Be the first to comment!
                  </Text>
                }
              />

              <View style={styles.commentInputContainer}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Write a comment..."
                  placeholderTextColor="#8A6A53"
                  style={styles.commentInput}
                  multiline
                />
                <TouchableOpacity onPress={submitComment} style={styles.sendButton}>
                  <Ionicons name="send" size={19} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
    paddingHorizontal: wp(3.5),
  },
  feedHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp(2.5),
  },
  feedTitle: {
    fontSize: wp(5.6),
    fontWeight: "800",
    color: TEXT,
    letterSpacing: 0.2,
  },
  feedBadge: {
    backgroundColor: "#EADCC3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(44,24,16,0.06)",
  },
  feedBadgeText: {
    color: "#5B493D",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  feedContent: {
    paddingHorizontal: wp(2.6),
    paddingTop: hp(1.5),
    paddingBottom: hp(2),
  },
  postCard: {
    backgroundColor: CARD,
    
    marginBottom: hp(2.5),
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0E7DD",
    ...SHADOW,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(3.4),
    paddingVertical: hp(1.7),
    borderBottomWidth: 1,
    borderBottomColor: "#F0EAE3",
  },
  avatar: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: "#E7E2DB",
  },
  avatarButton: {
    borderRadius: wp(5),
  },
  poetInfo: {
    flex: 1,
    marginLeft: wp(2.5),
  },
  poetName: {
    fontSize: wp(3.9),
    fontWeight: "800",
    color: TEXT,
  },
  poetBorn: {
    marginTop: 3,
    fontSize: wp(3.1),
    color: MUTED,
  },
  followButton: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9DCC7",
    backgroundColor: "#FFF",
  },
  followingButton: {
    backgroundColor: PANEL,
  },
  followText: {
    fontSize: wp(3.1),
    fontWeight: "700",
    color: PINK,
  },
  followingText: {
    color: "#8A6A53",
  },
  textPost: {
    paddingHorizontal: wp(3.4),
    paddingTop: hp(1.8),
    paddingBottom: hp(2.2),
    minHeight: hp(20),
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: "#F5EADA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: hp(1.3),
  },
  category: {
    fontSize: wp(2.8),
    fontWeight: "800",
    letterSpacing: 2,
    color: "#C49A32",
  },
  shayariText: {
    fontSize: wp(4.15),
    lineHeight: wp(6.4),
    color: TEXT,
    fontFamily: "Roboto",
  },
  urduText: {
    fontSize: wp(5),
    lineHeight: wp(6.2),
    textAlign: "right",
    fontFamily: "Hindi",
  },
  photoPost: {
    paddingHorizontal: wp(3.2),
    paddingTop: hp(1.6),
  },
  postImage: {
    width: "100%",
    height: hp(26),
    borderRadius: 18,
    overflow: "hidden",
  },
  postImageStyle: {
    resizeMode: "cover",
  },
  photoOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  photoLogo: {
    position: "absolute",
    top: 16,
    left: 16,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 1,
  },
  playButtonOverlay: {
    position: "absolute",
    alignSelf: "center",
    top: "38%",
  },
  photoQuoteContainer: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: 12,
  },
  photoQuote: {
    color: "#FFFFFF",
    fontSize: wp(4.1),
    lineHeight: wp(6),
    fontWeight: "600",
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: wp(3.3),
    paddingTop: hp(1.4),
    paddingBottom: hp(0.9),
  },
  languageLabel: {
    fontSize: wp(3.2),
    color: MUTED,
    fontWeight: "700",
  },
  languageButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F4EFE8",
  },
  activeLanguage: {
    backgroundColor: PINK,
  },
  languageButtonText: {
    fontSize: wp(2.8),
    color: TEXT,
    fontWeight: "700",
  },
  activeLanguageText: {
    color: "#FFFFFF",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(3.4),
    paddingVertical: hp(1.3),
    borderTopWidth: 1,
    borderTopColor: "#F0EAE3",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: wp(4),
    paddingVertical: 4,
  },
  actionCount: {
    marginLeft: 6,
    fontSize: wp(3.1),
    color: "#333333",
    fontWeight: "700",
  },
  iconButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "#F7F2EB",
  },
  emptyState: {
    paddingVertical: hp(6),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: wp(4.5),
    fontWeight: "700",
    color: TEXT,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: wp(3.3),
    color: MUTED,
    textAlign: "center",
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 12, 10, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F0E7DD",
    maxHeight: "76%",
    ...SHADOW,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
  },
  commentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#F2E9E0",
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E5E5E5",
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: TEXT,
    lineHeight: 20,
  },
  commentList: {
    maxHeight: 240,
    paddingBottom: 8,
  },
  emptyCommentText: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    marginTop: 8,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1E7DF",
  },
  commentInput: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#EADCC7",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT,
    fontSize: 14,
    backgroundColor: "#FAF7F3",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: PINK,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F4EDE5",
    justifyContent: "center",
    alignItems: "center",
  },
});

