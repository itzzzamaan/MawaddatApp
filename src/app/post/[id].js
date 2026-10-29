import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiBase, normalizeImageUrl } from "../../utils/api";

const COLORS = {
  background: "#F8F6F2",
  card: "#FFFDF9",
  text: "#2C1810",
  muted: "#5B493D",
  accent: "#C49A32",
};

export default function FeedPostDetails() {
  const { id } = useLocalSearchParams();
  const postId = Array.isArray(id) ? id[0] : id;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPost = async () => {
      try {
        const response = await fetch(
          `${getApiBase()}/api/homefeeds/${encodeURIComponent(postId || "")}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to load post (${response.status})`);
        }
        const data = await response.json();
        if (active) setPost(data);
      } catch (error) {
        console.error("Failed to load notification post:", error);
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPost();
    return () => {
      active = false;
    };
  }, [postId]);

  const content =
    typeof post?.content === "string"
      ? { roman: post.content }
      : post?.content || {};
  const poet =
    typeof post?.poet === "string"
      ? post.poet
      : post?.poet?.name || post?.poetName || "Poet";
  const image = post?.image || post?.avatar;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={23} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Poet&apos;s post</Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : failed || !post ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>This post is no longer available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.poetName}>{poet}</Text>
            {post.category ? (
              <Text style={styles.category}>{String(post.category).toUpperCase()}</Text>
            ) : null}
            {image ? (
              <Image
                source={{ uri: normalizeImageUrl(image) }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : null}
            <Text style={styles.poem}>
              {content.roman || content.urdu || content.hindi || post.title || ""}
            </Text>
            {content.urdu ? (
              <Text style={styles.poem} writingDirection="rtl">
                {content.urdu}
              </Text>
            ) : null}
            {content.hindi ? <Text style={styles.poem}>{content.hindi}</Text> : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EAE3",
  },
  headerTitle: { color: COLORS.text, fontSize: 19, fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  poetName: { color: COLORS.text, fontSize: 21, fontWeight: "700" },
  category: { color: COLORS.accent, fontSize: 11, fontWeight: "700" },
  image: { width: "100%", height: 260, borderRadius: 12 },
  poem: { color: COLORS.text, fontSize: 17, lineHeight: 29 },
  errorText: { color: COLORS.muted, fontSize: 15, textAlign: "center" },
});
