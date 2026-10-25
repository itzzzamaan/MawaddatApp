import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GOLD = "#C49A32";
const DARK = "#2C1810";
const BACKGROUND = "#F8F6F2";
const SUPPORT_EMAIL = "support.mawaddat@gmail.com";

const FAQS = [
  {
    question: "How can I contact Mawaddat support?",
    answer:
      "You can contact our support team by emailing support.mawaddat@gmail.com. Please include a description of your issue so we can assist you.",
  },
  {
    question: "How can I share my own shayari or poetry?",
    answer:
      "Open the poetry posting option in the app, write your shayari, ghazal, or poem, and follow the instructions on the screen to publish it.",
  },
  {
    question: "How can I find poetry events in my city?",
    answer:
      "Visit the Events section to explore available mushairas, ghazal nights, open mics, and other literary gatherings. Event availability depends on the listings published in the app.",
  },
  {
    question: "What should I do if the app is not working?",
    answer:
      "First, check your internet connection and reopen the app. If the problem continues, email our support team with a description of the issue and your device details.",
  },
  {
    question: "How can I report inappropriate content?",
    answer:
      "Contact our support email with details about the content and where you found it. Please include a screenshot or post link when available.",
  },
];

export default function HelpAndSupport() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState(null);

  const openEmail = async (subject = "Mawaddat Support Request") => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Email unavailable",
          `Please email us directly at ${SUPPORT_EMAIL}`
        );
      }
    } catch {
      Alert.alert(
        "Contact Mawaddat",
        `Please email us directly at ${SUPPORT_EMAIL}`
      );
    }
  };

  const copyOrOpenEmail = () => {
    openEmail("Help and Support - Mawaddat");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={DARK} />
        </Pressable>

        <Text style={styles.headerTitle}>Help & Support</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="headset-outline"
              size={38}
              color={GOLD}
            />
          </View>

          <Text style={styles.brand}>Mawaddat</Text>

          <Text style={styles.heroTitle}>
            How can we help you?
          </Text>

          <Text style={styles.heroDescription}>
            We are here to help you enjoy your poetry journey.
            Contact us if you need assistance with your account,
            posts, events, or anything else about Mawaddat.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={copyOrOpenEmail}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>
              Contact Support
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* CONTACT DETAILS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Contact Us
          </Text>

          <Text style={styles.sectionDescription}>
            Get in touch with the Mawaddat support team.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.contactCard,
              pressed && styles.cardPressed,
            ]}
            onPress={copyOrOpenEmail}
          >
            <View style={styles.contactIcon}>
              <Ionicons
                name="mail"
                size={23}
                color={GOLD}
              />
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>
                Email Support
              </Text>

              <Text style={styles.emailText}>
                {SUPPORT_EMAIL}
              </Text>

              <Text style={styles.contactHint}>
                Tap to open your email app
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#9A9186"
            />
          </Pressable>

          <View style={styles.contactCard}>
            <View style={styles.contactIcon}>
              <Ionicons
                name="chatbubbles-outline"
                size={23}
                color={GOLD}
              />
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>
                What We Can Help With
              </Text>

              <Text style={styles.contactDescription}>
                Account assistance, poetry posts, technical
                issues, content reports, and event-related queries.
              </Text>
            </View>
          </View>

          <View style={styles.contactCard}>
            <View style={styles.contactIcon}>
              <Ionicons
                name="heart-outline"
                size={23}
                color={GOLD}
              />
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>
                Our Community
              </Text>

              <Text style={styles.contactDescription}>
                We want Mawaddat to be a welcoming place for
                shayari, ghazals, poetry, and creative expression.
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Frequently Asked Questions
          </Text>

          <Text style={styles.sectionDescription}>
            Find answers to common questions.
          </Text>

          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;

            return (
              <View key={faq.question} style={styles.faqItem}>
                <Pressable
                  style={styles.faqQuestion}
                  onPress={() =>
                    setExpandedFaq(isExpanded ? null : index)
                  }
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <Text style={styles.questionText}>
                    {faq.question}
                  </Text>

                  <Ionicons
                    name={
                      isExpanded
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color={GOLD}
                  />
                </Pressable>

                {isExpanded && (
                  <Text style={styles.answerText}>
                    {faq.answer}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* FINAL SUPPORT CTA */}
        <View style={styles.bottomCard}>
          <Ionicons
            name="mail-unread-outline"
            size={30}
            color={GOLD}
          />

          <Text style={styles.bottomTitle}>
            Still need help?
          </Text>

          <Text style={styles.bottomDescription}>
            Send us an email and tell us how we can assist you.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() =>
              openEmail("Help and Support - Mawaddat")
            }
          >
            <Text style={styles.secondaryButtonText}>
              Email Mawaddat Support
            </Text>
          </Pressable>

          <Text style={styles.footer}>
            Mawaddat — Where words connect hearts.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    paddingBottom: 25,
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
    borderBottomColor: "#EEE5D7",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: DARK,
  },

  headerSpacer: {
    width: 40,
  },

  /* HERO */
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 28,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  heroIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBF2DF",
    borderWidth: 1,
    borderColor: "#EEDDB8",
    marginBottom: 16,
  },

  brand: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2,
  },

  heroTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    color: DARK,
    textAlign: "center",
    marginTop: 10,
  },

  heroDescription: {
    fontSize: 14,
    lineHeight: 23,
    color: "#71685F",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 22,
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
    backgroundColor: DARK,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
  },

  primaryButtonText: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.8,
  },

  /* SECTIONS */
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 17,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F0E9DD",
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: DARK,
  },

  sectionDescription: {
    fontSize: 13,
    color: "#82786E",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 14,
  },

  /* CONTACT CARDS */
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    backgroundColor: "#FCFAF6",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F0E9DD",
    marginBottom: 11,
  },

  cardPressed: {
    opacity: 0.75,
  },

  contactIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7ECD3",
    marginRight: 12,
  },

  contactInfo: {
    flex: 1,
  },

  contactLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: DARK,
    marginBottom: 5,
  },

  emailText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A67C1E",
    lineHeight: 19,
  },

  contactHint: {
    fontSize: 11,
    color: "#8A8178",
    marginTop: 4,
  },

  contactDescription: {
    fontSize: 12,
    color: "#71685F",
    lineHeight: 19,
  },

  /* FAQ */
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEE7DC",
  },

  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 12,
  },

  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: DARK,
    lineHeight: 21,
  },

  answerText: {
    fontSize: 13,
    lineHeight: 21,
    color: "#71685F",
    paddingBottom: 16,
    paddingRight: 12,
  },

  /* BOTTOM CTA */
  bottomCard: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 25,
    alignItems: "center",
    backgroundColor: DARK,
    borderRadius: 22,
  },

  bottomTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 12,
  },

  bottomDescription: {
    fontSize: 13,
    lineHeight: 21,
    color: "#E4D8CB",
    textAlign: "center",
    marginTop: 9,
  },

  secondaryButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5DDA5",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 13,
    marginTop: 19,
  },

  secondaryButtonText: {
    color: DARK,
    fontSize: 14,
    fontWeight: "800",
  },

  footer: {
    marginTop: 20,
    fontSize: 11,
    color: "#D6C5B3",
    textAlign: "center",
    lineHeight: 18,
  },
});