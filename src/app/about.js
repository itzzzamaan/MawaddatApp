import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const GOLD = "#C49A32";
const DARK = "#2C1810";
const BACKGROUND = "#F8F6F2";

const SLIDES = [
  {
    id: "1",
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1480&q=85",
    title: "Every feeling deserves\na beautiful verse",
    subtitle: "Shayari • Emotions • Stories",
  },
  {
    id: "2",
    image:
      "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1480&q=85",
    title: "Discover the beauty\nof timeless poetry",
    subtitle: "Ghazals • Nazms • Poetry",
  },
  {
    id: "3",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1480&q=85",
    title: "Your city, your stage,\nyour poetic community",
    subtitle: "Mushairas • Open Mics • Events",
  },
  {
    id: "4",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1480&q=85",
    title: "Words connect hearts\nbeyond every boundary",
    subtitle: "Write • Share • Connect",
  },
];

export default function About() {
  const router = useRouter();
  const sliderRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  /* AUTO SLIDE */
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeIndex + 1) % SLIDES.length;

      sliderRef.current?.scrollToIndex({
        index: next,
        animated: true,
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [activeIndex]);

  /* FADE TEXT */
  useEffect(() => {
    fadeAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, fadeAnim]);

  const onScroll = (event) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / width
    );

    if (index >= 0 && index < SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const navigateTo = (route) => {
    router.push(route);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={DARK} />
        </Pressable>

        <Text style={styles.headerTitle}>About Mawaddat</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOP POETRY SLIDER */}
        <View style={styles.sliderContainer}>
          <FlatList
            ref={sliderRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onScrollToIndexFailed={() => {
              sliderRef.current?.scrollToOffset({
                offset: activeIndex * width,
                animated: true,
              });
            }}
            renderItem={({ item }) => (
              <View style={styles.slide}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.image}
                  resizeMode="cover"
                />

                <LinearGradient
                  colors={[
                    "transparent",
                    "rgba(0,0,0,0.45)",
                    "rgba(0,0,0,0.88)",
                  ]}
                  style={styles.overlay}
                />

                <Animated.View
                  style={[
                    styles.textBox,
                    { opacity: fadeAnim },
                  ]}
                >
                  <View style={styles.slideBadge}>
                    <Ionicons
                      name="sparkles"
                      size={13}
                      color={GOLD}
                    />
                    <Text style={styles.slideBadgeText}>
                      THE ART OF WORDS
                    </Text>
                  </View>

                  <Text style={styles.slideTitle}>
                    {item.title}
                  </Text>

                  <Text style={styles.slideSubtitle}>
                    {item.subtitle}
                  </Text>
                </Animated.View>
              </View>
            )}
          />

          {/* SLIDER DOTS */}
          <View style={styles.dots}>
            {SLIDES.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  sliderRef.current?.scrollToIndex({
                    index,
                    animated: true,
                  })
                }
                style={[
                  styles.dot,
                  activeIndex === index && styles.activeDot,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${index + 1}`}
              />
            ))}
          </View>
        </View>

        {/* ABOUT MAWADDAT */}
        <View style={styles.content}>
          <View style={styles.eyebrow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrowText}>OUR STORY</Text>
            <View style={styles.eyebrowLine} />
          </View>

          <Text style={styles.heading}>
            About <Text style={styles.brandText}>Mawaddat</Text>
          </Text>

          <Text style={styles.paragraph}>
            Mawaddat is a home for people who find meaning in words
            and beauty in emotions. Discover heartfelt shayari,
            soulful ghazals, timeless poetry, and the voices of
            talented writers and legendary poets.
          </Text>

          <Text style={styles.paragraph}>
            From reading verses that speak to your heart to sharing
            your own creations and discovering poetry events in your
            city, Mawaddat brings poetry lovers together through
            the universal language of words.
          </Text>

          {/* MAIN FEATURE CARDS */}
          <Text style={styles.sectionHeading}>
            Explore Mawaddat
          </Text>

          <View style={styles.cardGrid}>
            <FeatureCard
              icon="heart-outline"
              title="Shayari & Poetry"
              desc="Love, heartbreak, friendship and life"
              onPress={() => navigateTo("/poets")}
            />

            <FeatureCard
              icon="book-outline"
              title="Ghazal Collection"
              desc="Explore soulful verses and timeless ghazals"
              onPress={() => navigateTo("/poets")}
            />

            <FeatureCard
              icon="calendar-outline"
              title="Nearby Events"
              desc="Find mushairas and poetry events around you"
              onPress={() => navigateTo("/events")}
            />

            <FeatureCard
              icon="create-outline"
              title="Share Your Words"
              desc="Express yourself and share your poetry"
              onPress={() => navigateTo("/create-post")}
            />
          </View>

          {/* OUR MISSION */}
          <View style={styles.section}>
            <SectionHeader
              icon="flag-outline"
              title="Our Mission"
            />

            <Text style={styles.sectionText}>
              Our mission is to bring poetry closer to everyone.
              We want to create a welcoming space where emotions
              become words, writers find their audience, and people
              connect through shayari, ghazals, and meaningful
              conversations.
            </Text>
          </View>

          {/* CITY-WISE EVENTS */}
          <View style={styles.section}>
            <SectionHeader
              icon="location-outline"
              title="Poetry Events in Your City"
            />

            <Text style={styles.sectionText}>
              Discover literary gatherings, mushairas, ghazal
              evenings, open mics, poetry workshops, and cultural
              events happening in cities across India.
            </Text>

            <View style={styles.eventTypes}>
              <EventType
                icon="mic-outline"
                title="Open Mics"
                desc="Perform your poetry"
              />

              <EventType
                icon="musical-notes-outline"
                title="Ghazal Nights"
                desc="Enjoy soulful performances"
              />

              <EventType
                icon="people-outline"
                title="Mushairas"
                desc="Meet poetry lovers"
              />

              <EventType
                icon="calendar-outline"
                title="Literary Meets"
                desc="Learn and connect"
              />
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={() => navigateTo("/events")}
            >
              <Ionicons
                name="location-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text style={styles.primaryButtonText}>
                Explore Poetry Events
              </Text>

              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
              />
            </Pressable>

            <Text style={styles.helperText}>
              Event listings and availability depend on the
              information published for each city.
            </Text>
          </View>

          {/* OUR SERVICES */}
          <View style={styles.section}>
            <SectionHeader
              icon="apps-outline"
              title="What You Can Do"
            />

            <View style={styles.servicesGrid}>
              <ServiceCard
                icon="book"
                title="Read Poetry"
                desc="Discover words that express your feelings"
              />

              <ServiceCard
                icon="pencil"
                title="Write & Share"
                desc="Publish your own shayari and verses"
              />

              <ServiceCard
                icon="people"
                title="Meet Poets"
                desc="Discover poets and their creations"
              />

              <ServiceCard
                icon="location"
                title="Find Events"
                desc="Explore poetry gatherings near you"
              />
            </View>
          </View>

          {/* WHY CHOOSE US */}
          <View style={styles.section}>
            <SectionHeader
              icon="star-outline"
              title="Why Mawaddat?"
            />

            <View style={styles.featuresList}>
              <Benefit
                text="A variety of shayari, ghazals, and poetry"
              />

              <Benefit
                text="Discover emerging writers and legendary poets"
              />

              <Benefit
                text="Share your original poetry with the community"
              />

              <Benefit
                text="Explore poetry events across different cities"
              />

              <Benefit
                text="Connect with people who share your love of words"
              />
            </View>
          </View>

          {/* OUR VALUES */}
          <View style={styles.section}>
            <SectionHeader
              icon="heart-outline"
              title="Our Values"
            />

            <View style={styles.valuesContainer}>
              <ValueCard
                icon="heart"
                title="Emotion"
                desc="Every feeling has a voice"
              />

              <ValueCard
                icon="feather"
                title="Creativity"
                desc="Celebrate original expression"
              />

              <ValueCard
                icon="people"
                title="Community"
                desc="Bring people together"
              />

              <ValueCard
                icon="book"
                title="Heritage"
                desc="Respect poetic traditions"
              />

              <ValueCard
                icon="chatbubbles"
                title="Connection"
                desc="Build bonds through words"
              />

              <ValueCard
                icon="sparkles"
                title="Inspiration"
                desc="Discover new perspectives"
              />
            </View>
          </View>

          {/* CLOSING MESSAGE */}
          <View style={styles.closingCard}>
            <Ionicons
              name="heart"
              size={28}
              color={GOLD}
            />

            <Text style={styles.closingTitle}>
              Words that bring hearts closer.
            </Text>

            <Text style={styles.closingText}>
              Read a verse. Write a feeling. Find your people.
              Let your words become part of the Mawaddat story.
            </Text>

            <Pressable
              style={styles.closingButton}
              onPress={() => navigateTo("/poets")}
            >
              <Text style={styles.closingButtonText}>
                Discover Poetry
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color={DARK}
              />
            </Pressable>
          </View>

          {/* FOOTER */}
          <Text style={styles.footer}>
            Mawaddat — a world of shayari, ghazals, poetry, and
            meaningful connections.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* FEATURE CARD */
function FeatureCard({ icon, title, desc, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={24} color={GOLD} />
      </View>

      <Text style={styles.cardTitle}>{title}</Text>

      <Text style={styles.cardDesc}>{desc}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardLink}>Explore</Text>

        <Ionicons
          name="arrow-forward"
          size={15}
          color={GOLD}
        />
      </View>
    </Pressable>
  );
}

/* SECTION HEADER */
function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <Ionicons name={icon} size={22} color={GOLD} />
      </View>

      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/* EVENT CATEGORY */
function EventType({ icon, title, desc }) {
  return (
    <View style={styles.eventType}>
      <View style={styles.eventIcon}>
        <Ionicons name={icon} size={23} color={GOLD} />
      </View>

      <Text style={styles.eventTitle}>{title}</Text>

      <Text style={styles.eventDesc}>{desc}</Text>
    </View>
  );
}

/* SERVICE CARD */
function ServiceCard({ icon, title, desc }) {
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceIcon}>
        <Ionicons name={icon} size={25} color={GOLD} />
      </View>

      <Text style={styles.serviceTitle}>{title}</Text>

      <Text style={styles.serviceDesc}>{desc}</Text>
    </View>
  );
}

/* BENEFIT ITEM */
function Benefit({ text }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons
          name="checkmark-circle"
          size={21}
          color="#3F8F68"
        />
      </View>

      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

/* VALUE CARD */
function ValueCard({ icon, title, desc }) {
  return (
    <View style={styles.valueItem}>
      <View style={styles.valueIconWrapper}>
        <Ionicons name={icon} size={24} color={GOLD} />
      </View>

      <Text style={styles.valueTitle}>{title}</Text>

      <Text style={styles.valueDesc}>{desc}</Text>
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 69, 19, 0.1)",
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: DARK,
    fontFamily: "System",
  },

  headerSpacer: {
    width: 40,
  },

  /* SLIDER */
  sliderContainer: {
    height: width * 1.12,
    maxHeight: 480,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    backgroundColor: "#29201C",
  },

  slide: {
    width,
    height: "100%",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  overlay: {
    position: "absolute",
    bottom: 0,
    height: "78%",
    width: "100%",
  },

  textBox: {
    position: "absolute",
    bottom: 78,
    left: 24,
    right: 24,
  },

  slideBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 15,
    gap: 6,
  },

  slideBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
  },

  slideTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 37,
  },

  slideSubtitle: {
    marginTop: 12,
    color: "#FDE7A4",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
  },

  dots: {
    position: "absolute",
    bottom: 24,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  activeDot: {
    width: 22,
    backgroundColor: GOLD,
  },

  /* CONTENT */
  content: {
    padding: 18,
  },

  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 25,
    marginBottom: 10,
  },

  eyebrowLine: {
    width: 26,
    height: 1,
    backgroundColor: GOLD,
  },

  eyebrowText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: DARK,
    textAlign: "center",
    marginBottom: 14,
  },

  brandText: {
    color: GOLD,
  },

  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: "#5F5A56",
    marginBottom: 13,
    textAlign: "left",
  },

  sectionHeading: {
    fontSize: 21,
    fontWeight: "800",
    color: DARK,
    marginTop: 17,
    marginBottom: 15,
  },

  /* FEATURE GRID */
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48.2%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#F0E9DD",
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: Platform.OS === "ios" ? 0.05 : 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 7,
  },

  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  cardIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBF2DF",
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
    lineHeight: 21,
  },

  cardDesc: {
    marginTop: 6,
    fontSize: 12,
    color: "#77706A",
    lineHeight: 18,
    minHeight: 52,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },

  cardLink: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "700",
  },

  /* SECTIONS */
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#F0E9DD",
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FBF2DF",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: DARK,
    marginLeft: 11,
    flex: 1,
  },

  sectionText: {
    fontSize: 14,
    lineHeight: 23,
    color: "#625B55",
  },

  /* EVENT TYPES */
  eventTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 17,
  },

  eventType: {
    width: "48.5%",
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#FBF8F1",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0E5CF",
  },

  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5E8C9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  eventTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: DARK,
  },

  eventDesc: {
    fontSize: 11,
    color: "#77706A",
    lineHeight: 17,
    marginTop: 5,
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: DARK,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },

  helperText: {
    color: "#8A8178",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },

  /* SERVICES */
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  serviceCard: {
    width: "48.5%",
    backgroundColor: "#FBF8F1",
    borderRadius: 16,
    padding: 14,
    marginBottom: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1E9DA",
  },

  serviceIcon: {
    width: 49,
    height: 49,
    borderRadius: 25,
    backgroundColor: "#F5E8C9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  serviceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: DARK,
    marginTop: 2,
    textAlign: "center",
  },

  serviceDesc: {
    fontSize: 12,
    color: "#77706A",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },

  /* BENEFITS */
  featuresList: {
    marginTop: 3,
  },

  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 13,
  },

  featureIcon: {
    marginRight: 10,
    marginTop: 2,
  },

  featureText: {
    fontSize: 14,
    color: "#5F5A56",
    flex: 1,
    lineHeight: 22,
  },

  /* VALUES */
  valuesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 6,
  },

  valueItem: {
    width: "31%",
    alignItems: "center",
    marginBottom: 20,
  },

  valueIconWrapper: {
    backgroundColor: "#FBF2DF",
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },

  valueTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: DARK,
    textAlign: "center",
    marginBottom: 4,
  },

  valueDesc: {
    fontSize: 10,
    color: "#77706A",
    textAlign: "center",
    lineHeight: 15,
  },

  /* CLOSING CARD */
  closingCard: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 25,
    alignItems: "center",
    backgroundColor: "#2C1810",
    borderRadius: 22,
  },

  closingTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 12,
  },

  closingText: {
    fontSize: 13,
    lineHeight: 21,
    color: "#E4D8CB",
    textAlign: "center",
    marginTop: 10,
  },

  closingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F5DDA5",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 19,
  },

  closingButtonText: {
    color: DARK,
    fontSize: 13,
    fontWeight: "800",
  },

  /* FOOTER */
  footer: {
    marginTop: 23,
    marginBottom: 8,
    fontSize: 12,
    color: "#857B71",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
