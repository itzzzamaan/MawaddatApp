import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

const ACCENT = "#2C1810";

import { getApiBase, normalizeImageUrl } from "../utils/api";

export default function ShayariEventDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const eventId = Array.isArray(params.eventId)
    ? params.eventId[0]
    : params.eventId;

  const [isFavorite, setIsFavorite] = useState(false);
  const [activeSection, setActiveSection] = useState("About");
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const response = await fetch(`${getApiBase()}/api/events`);
        const data = await response.json();
        const matches = Array.isArray(data)
          ? data.find((item) => String(item._id || item.id) === String(eventId))
          : null;
        setEvent(matches || null);
      } catch (err) {
        console.log("Failed to load event", err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) loadEvent();
  }, [eventId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <Ionicons name="calendar-outline" size={46} color="#A0A5AF" />
          <Text style={styles.notFoundTitle}>Event not found</Text>
          <Text style={styles.notFoundText}>
            This event may have been removed or the link may be invalid.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${event.title}\n${event.subtitle}\n${event.date}\n${event.time}\n${event.venue}`,
      });
    } catch {
      Alert.alert("Unable to share", "Please try again.");
    }
  };

  const handleRegisterInterest = () => {
    Alert.alert(
      "Interested in this event?",
      `You've selected ${event.title}. Connect with the event organizer at the venue or through your app's registration service to confirm attendance.`,
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: event.image
                ? normalizeImageUrl(event.image)
                : "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200",
            }}
            style={styles.heroImage}
          />
          <View style={styles.heroShade} />

          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={23} color="#222" />
          </Pressable>

          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={21} color="#222" />
          </Pressable>

          <View style={styles.heroTextContainer}>
            <View style={styles.heroCategory}>
              <Text style={styles.heroCategoryText}>
                {(event.category || "EVENT").toUpperCase()}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{event.title}</Text>
            <Text style={styles.heroSubtitle}>
              {event.subtitle || "Poetry event"}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextContainer}>
              <Text style={styles.eventName}>{event.title}</Text>
              <Text style={styles.hostName}>
                Hosted by {event.host || "TBA"}
              </Text>
            </View>

            <Pressable
              style={styles.favoriteLarge}
              onPress={() => setIsFavorite((value) => !value)}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={23}
                color={isFavorite ? "#E54868" : "#505562"}
              />
            </Pressable>
          </View>

          <View style={styles.quickInfoGrid}>
            <InfoCard
              icon="calendar-outline"
              label="DATE"
              value={event.date || "TBA"}
            />
            <InfoCard icon="time-outline" label="TIME" value={event.time || "TBA"} />
            <InfoCard
              icon="location-outline"
              label="VENUE"
              value={event.venue || "Venue TBD"}
            />
          </View>

          <View style={styles.sectionTabs}>
            {["About", "Highlights"].map((section) => (
              <Pressable
                key={section}
                onPress={() => setActiveSection(section)}
                style={[
                  styles.tab,
                  activeSection === section && styles.tabActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeSection === section && styles.tabTextActive,
                  ]}
                >
                  {section}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionCard}>
            {activeSection === "About" ? (
              <Text style={styles.bodyText}>
                {event.description || "No description available."}
              </Text>
            ) : (
              <View style={styles.highlightList}>
                {(Array.isArray(event.highlights) ? event.highlights : []).length ? (
                  Array.isArray(event.highlights) ? (
                    event.highlights.map((item) => (
                      <View key={item} style={styles.highlightItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#228B22"
                        />
                        <Text style={styles.highlightText}>{item}</Text>
                      </View>
                    ))
                  ) : null
                ) : (
                  <Text style={styles.bodyText}>No highlights available.</Text>
                )}
              </View>
            )}
          </View>

          <Pressable style={styles.primaryButton} onPress={handleRegisterInterest}>
            <Text style={styles.primaryButtonText}>Register interest</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icon} size={18} color={ACCENT} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F2EC" },
  scrollContent: { paddingBottom: 24 },
  heroContainer: { position: "relative", height: 340 },
  heroImage: { width: "100%", height: "100%" },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 12, 8, 0.34)",
  },
  backButton: {
    position: "absolute",
    top: 18,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  shareButton: {
    position: "absolute",
    top: 18,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  heroTextContainer: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 22,
    zIndex: 2,
  },
  heroCategory: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  heroCategoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -18,
    backgroundColor: "#F7F2EC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  titleTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  eventName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F1A17",
  },
  hostName: {
    color: "#5D554F",
    fontSize: 12,
    marginTop: 4,
  },
  favoriteLarge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  quickInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  infoCard: {
    width: "31.5%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEE1D7",
  },
  infoLabel: {
    marginTop: 8,
    fontSize: 10,
    color: "#7E6A5A",
    fontWeight: "700",
  },
  infoValue: {
    marginTop: 6,
    fontSize: 12,
    color: "#1F1A17",
    fontWeight: "700",
  },
  sectionTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    backgroundColor: "#EDE4DA",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D8C4",
  },
  tabActive: {
    backgroundColor: ACCENT,
  },
  tabText: {
    color: ACCENT,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#fff",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE1D7",
  },
  bodyText: {
    color: "#1F1A17",
    lineHeight: 22,
  },
  highlightList: {
    gap: 12,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  highlightText: {
    flex: 1,
    lineHeight: 22,
    color: "#1F1A17",
  },
  primaryButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1A17",
    marginTop: 14,
  },
  notFoundText: {
    marginTop: 8,
    color: "#5D554F",
    textAlign: "center",
    lineHeight: 20,
  },
});

