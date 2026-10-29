
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiBase } from "../utils/api";

const ACCENT = "#2C1810";
const BACKGROUND = "#F7F2EC";
const MUTED = "#7E6A5A";
const CARD_BORDER = "#EEE1D7";

const normalizeImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const cleaned = trimmed.replace(/\\/g, "/");
  const filename = cleaned.includes("/uploads/")
    ? cleaned.split("/uploads/").pop()
    : cleaned.split("/").filter(Boolean).pop();

  if (!filename) return "";

  return `${getApiBase()}/uploads/${filename}`;
};

const getStaticMapUrl = (event) => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const location = event.completeAddress || event.venue;

  if (!apiKey || !location || location === "Venue TBD") return null;

  return (
    "https://maps.googleapis.com/maps/api/staticmap" +
    `?center=${encodeURIComponent(location)}` +
    "&zoom=15&size=900x360&scale=2" +
    "&markers=color:0x2C1810%7C" +
    encodeURIComponent(location) +
    `&key=${apiKey}`
  );
};

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

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();

        const matches = Array.isArray(data)
          ? data.find(
              (item) =>
                String(item._id || item.id) === String(eventId)
            )
          : null;

        setEvent(matches || null);
      } catch (err) {
        console.log("Failed to load event", err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    if (!eventId) {
      queueMicrotask(() => {
        setEvent(null);
        setLoading(false);
      });
      return;
    }

    loadEvent();
  }, [eventId]);

  const handleShare = async () => {
    if (!event) return;

    try {
      await Share.share({
        message: `${event.title}\n${event.subtitle || ""}\n${event.date || ""}\n${event.time || ""}\n${event.venue || ""}`,
      });
    } catch {
      Alert.alert("Unable to share", "Please try again.");
    }
  };

  const handleRegisterInterest = () => {
    if (!event) return;

    Alert.alert(
      "Interested in this event?",
      `You've selected ${event.title}. Connect with the event organizer at the venue or through your app's registration service to confirm attendance.`,
      [{ text: "OK" }]
    );
  };

  const handleOpenMaps = async () => {
    const mapsLink = (event?.mapsLink || "").trim();

    if (!/^https?:\/\//i.test(mapsLink)) {
      Alert.alert(
        "Map unavailable",
        "A valid map link has not been provided for this event."
      );
      return;
    }

    try {
      await Linking.openURL(mapsLink);
    } catch {
      Alert.alert(
        "Unable to open map",
        "Please try the map link again."
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Preparing your experience...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <View style={styles.notFoundIcon}>
            <Ionicons
              name="calendar-outline"
              size={38}
              color={ACCENT}
            />
          </View>

          <Text style={styles.notFoundTitle}>Event not found</Text>

          <Text style={styles.notFoundText}>
            This event may have been removed or the link may be invalid.
          </Text>

          <Pressable
            style={[styles.primaryButton, styles.primaryButtonNotFound]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const mapImage = getStaticMapUrl(event);
  const heroImage = event.image
    ? normalizeImageUrl(event.image)
    : "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200";

  const highlights = Array.isArray(event.highlights)
    ? event.highlights
    : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: heroImage }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.heroShade} />

          <View style={styles.heroTopRow}>
            <Pressable
              style={styles.roundButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={ACCENT} />
            </Pressable>

            <View style={styles.heroActions}>
              <Pressable
                style={styles.roundButton}
                onPress={handleShare}
                accessibilityLabel="Share event"
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={ACCENT}
                />
              </Pressable>

              <Pressable
                style={styles.roundButton}
                onPress={() => setIsFavorite((value) => !value)}
                accessibilityLabel={
                  isFavorite ? "Remove favorite" : "Add favorite"
                }
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={21}
                  color={isFavorite ? "#E54868" : ACCENT}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.heroTextContainer}>
            <View style={styles.heroCategory}>
              <View style={styles.categoryDot} />
              <Text style={styles.heroCategoryText}>
                {(event.category || "EVENT").toUpperCase()}
              </Text>
            </View>

            <Text style={styles.heroTitle}>{event.title}</Text>

            <Text style={styles.heroSubtitle} numberOfLines={2}>
              {event.subtitle || "Poetry, expression & unforgettable moments"}
            </Text>

            <View style={styles.heroDivider} />

            <View style={styles.heroFooter}>
              <Ionicons name="person-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroHost} numberOfLines={1}>
                Hosted by {event.host || "TBA"}
              </Text>
            </View>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <View style={styles.sectionEyebrow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrowText}>THE EXPERIENCE</Text>
          </View>

          <View style={styles.titleRow}>
            <View style={styles.titleTextContainer}>
              <Text style={styles.eventName}>{event.title}</Text>
              <Text style={styles.eventIntro}>
                Make memories that stay with you. 
              </Text>
            </View>

            <Pressable
              style={[
                styles.favoriteLarge,
                isFavorite && styles.favoriteSelected,
              ]}
              onPress={() => setIsFavorite((value) => !value)}
              accessibilityLabel={
                isFavorite ? "Remove favorite" : "Add favorite"
              }
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={23}
                color={isFavorite ? "#E54868" : ACCENT}
              />
            </Pressable>
          </View>

          {/* Single-line event information */}
          <View style={styles.infoPanel}>
            <EventInfoRow
              icon="calendar-outline"
              label="DATE"
              value={event.date || "Date to be announced"}
            />

            <View style={styles.infoDivider} />

            <EventInfoRow
              icon="time-outline"
              label="TIME"
              value={event.time || "Time to be announced"}
            />

            <View style={styles.infoDivider} />

            <EventInfoRow
              icon="location-outline"
              label="VENUE"
              value={event.venue || "Venue to be announced"}
            />
          </View>

          {/* Location preview */}
          <View style={styles.locationSection}>
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionTitle}>Find your way</Text>
                <Text style={styles.sectionSubtitle}>
                  Everything starts at the right place.
                </Text>
              </View>

              <View style={styles.locationHeadingIcon}>
                <Ionicons
                  name="navigate-outline"
                  size={19}
                  color={ACCENT}
                />
              </View>
            </View>

            <View style={styles.mapCard}>
              {mapImage ? (
                <Image
                  source={{ uri: mapImage }}
                  style={styles.mapImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.mapPlaceholder}>
                  <View style={styles.mapDecorCircleLarge} />
                  <View style={styles.mapDecorCircleSmall} />

                  <View style={styles.mapPinCircle}>
                    <Ionicons
                      name="location"
                      size={32}
                      color={ACCENT}
                    />
                  </View>

                  <Text style={styles.mapPlaceholderTitle}>
                    Your destination
                  </Text>

                  <Text style={styles.mapPlaceholderText}>
                    {event.completeAddress || event.venue || "Location to be announced"}
                  </Text>

                  
                </View>
              )}

              <View style={styles.mapCaption}>
                <View style={styles.mapCaptionIcon}>
                  <Ionicons
                    name="location"
                    size={19}
                    color={ACCENT}
                  />
                </View>

                <View style={styles.mapCaptionContent}>
                  <Text style={styles.mapVenue} numberOfLines={1}>
                    {event.venue || "Venue to be announced"}
                  </Text>

                  <Text style={styles.mapAddress} numberOfLines={2}>
                    {event.completeAddress || "Address details unavailable"}
                  </Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.mapsButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleOpenMaps}
              >
                <Ionicons name="navigate" size={18} color="#FFFFFF" />

                <Text style={styles.mapsButtonText}>
                  Open in Google Maps
                </Text>

                <Ionicons
                  name="arrow-up-right"
                  size={19}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </View>

          {/* About and highlights */}
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>Get to know the event</Text>
              <Text style={styles.sectionSubtitle}>
                A little more about what&apos;s waiting for you.
              </Text>
            </View>
          </View>

          <View style={styles.sectionTabs}>
            {[
              { name: "About", icon: "book-outline" },
              { name: "Highlights", icon: "sparkles-outline" },
            ].map((section) => {
              const selected = activeSection === section.name;

              return (
                <Pressable
                  key={section.name}
                  onPress={() => setActiveSection(section.name)}
                  style={[
                    styles.tab,
                    selected && styles.tabActive,
                  ]}
                >
                  <Ionicons
                    name={section.icon}
                    size={17}
                    color={selected ? "#FFFFFF" : ACCENT}
                  />

                  <Text
                    style={[
                      styles.tabText,
                      selected && styles.tabTextActive,
                    ]}
                  >
                    {section.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sectionCard}>
            {activeSection === "About" ? (
              <View>
                <View style={styles.cardAccent} />

                <Text style={styles.cardEyebrow}>ABOUT THIS EVENT</Text>

                <Text style={styles.bodyText}>
                  {event.description || "No description available."}
                </Text>
              </View>
            ) : (
              <View>
                <View style={styles.cardAccent} />

                <Text style={styles.cardEyebrow}>WHAT TO LOOK FORWARD TO</Text>

                {highlights.length > 0 ? (
                  <View style={styles.highlightList}>
                    {highlights.map((item, index) => (
                      <View
                        key={`${index}-${item}`}
                        style={styles.highlightItem}
                      >
                        <View style={styles.highlightIcon}>
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color="#FFFFFF"
                          />
                        </View>

                        <Text style={styles.highlightText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.bodyText}>
                    No highlights available.
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Existing registration interaction */}
          <View style={styles.bottomNote}>
            <Ionicons
              name="heart-outline"
              size={17}
              color={MUTED}
            />

            <Text style={styles.bottomNoteText}>
              Good moments are even better when shared.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRegisterInterest}
          >
            <View style={styles.registerIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={20}
                color={ACCENT}
              />
            </View>

            <Text style={styles.primaryButtonText}>
              Register interest
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </Pressable>

          <Text style={styles.footerText}>
            MADE FOR MOMENTS THAT MATTER
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EventInfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={20} color={ACCENT} />
      </View>

      <Text style={styles.infoLabel}>{label}</Text>

      <Text
        style={styles.infoValue}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    paddingBottom: 28,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingText: {
    marginTop: 14,
    color: ACCENT,
    fontSize: 14,
    fontWeight: "600",
  },

  heroContainer: {
    position: "relative",
    height: 365,
    backgroundColor: ACCENT,
    overflow: "hidden",
  },

  heroImage: {
    width: "100%",
    height: "100%",
  },

  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 12, 8, 0.48)",
  },

  heroTopRow: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroActions: {
    flexDirection: "row",
    gap: 10,
  },

  roundButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.93)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
  },

  heroTextContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 27,
  },

  heroCategory: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },

  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 7,
  },

  heroCategoryText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "800",
    letterSpacing: -0.6,
  },

  heroSubtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },

  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.32)",
    marginTop: 18,
    marginBottom: 12,
  },

  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  heroHost: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },

  content: {
    paddingHorizontal: 17,
    marginTop: -18,
    backgroundColor: BACKGROUND,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 23,
  },

  sectionEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 9,
  },

  eyebrowLine: {
    width: 25,
    height: 2,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },

  eyebrowText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  titleTextContainer: {
    flex: 1,
    paddingRight: 10,
  },

  eventName: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "800",
    color: "#1F1A17",
    letterSpacing: -0.5,
  },

  eventIntro: {
    color: MUTED,
    fontSize: 12,
    marginTop: 5,
  },

  favoriteLarge: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    justifyContent: "center",
    alignItems: "center",
  },

  favoriteSelected: {
    backgroundColor: "#FCE9ED",
    borderColor: "#F2CCD5",
  },

  infoPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 13,
    paddingVertical: 5,
    marginBottom: 27,
  },

  infoRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  infoIconBox: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: BACKGROUND,
    justifyContent: "center",
    alignItems: "center",
  },

  infoLabel: {
    width: 43,
    color: MUTED,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  infoValue: {
    flex: 1,
    minWidth: 0,
    color: "#1F1A17",
    fontSize: 13,
    fontWeight: "700",
  },

  infoDivider: {
    height: 1,
    backgroundColor: "#F0E7DF",
    marginLeft: 49,
  },

  locationSection: {
    marginBottom: 28,
  },

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: {
    color: "#1F1A17",
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  locationHeadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
  },

  mapImage: {
    width: "100%",
    height: 170,
    backgroundColor: "#EDE4DA",
  },

  mapPlaceholder: {
    height: 170,
    backgroundColor: "#EDE4DA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    overflow: "hidden",
  },

  mapDecorCircleLarge: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "#D9C9B9",
    top: -80,
    left: -35,
  },

  mapDecorCircleSmall: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: "#D9C9B9",
    bottom: -90,
    right: -25,
  },

  mapPinCircle: {
    width: 47,
    height: 47,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  mapPlaceholderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: ACCENT,
    textAlign: "center",
  },

  mapPlaceholderText: {
    color: "#5D554F",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },

  mapSetupHint: {
    color: MUTED,
    fontSize: 9,
    textAlign: "center",
    marginTop: 5,
  },

  mapCaption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },

  mapCaptionIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  mapCaptionContent: {
    flex: 1,
    minWidth: 0,
  },

  mapVenue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F1A17",
  },

  mapAddress: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  mapsButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  mapsButtonText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.82,
  },

  sectionTabs: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 13,
  },

  tab: {
    flex: 1,
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EDE4DA",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E9D8C4",
  },

  tabActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },

  tabText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "800",
  },

  tabTextActive: {
    color: "#FFFFFF",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },

  cardAccent: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginBottom: 13,
  },

  cardEyebrow: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 12,
  },

  bodyText: {
    color: "#41362F",
    fontSize: 13,
    lineHeight: 23,
  },

  highlightList: {
    gap: 15,
  },

  highlightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  highlightIcon: {
    width: 23,
    height: 23,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  highlightText: {
    flex: 1,
    color: "#41362F",
    fontSize: 13,
    lineHeight: 22,
  },

  bottomNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    marginBottom: 13,
  },

  bottomNoteText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
  },

  primaryButton: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: ACCENT,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  registerIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F7F2EC",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  footerText: {
    textAlign: "center",
    color: "#9B897A",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 20,
  },

  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  notFoundIcon: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: "#EDE4DA",
    alignItems: "center",
    justifyContent: "center",
  },

  notFoundTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1F1A17",
    marginTop: 18,
  },

  notFoundText: {
    marginTop: 8,
    color: "#5D554F",
    textAlign: "center",
    lineHeight: 21,
    fontSize: 13,
  },

  primaryButtonNotFound: {
    marginTop: 18,
  },
});
