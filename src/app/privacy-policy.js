import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GOLD = "#C49A32";
const DARK = "#2C1810";
const BACKGROUND = "#F8F6F2";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    paragraphs: [
      "To provide you with a seamless experience, such as reading lyrics and poetry, discovering nearby events, and managing your account, we may collect the following types of information:",
      "Account & Profile Information: When you sign up or log in, including through Google Sign-In, we collect basic profile details such as your name, email address, and profile photo.",
      "Location Data: With your permission, the app uses your device's location to determine your current city. We store that city with your account to send notifications about posts and events in that city; precise GPS coordinates are not sent to our API. Location access is optional and can be changed in your device settings.",
      "User-Generated Content & Interactions: Content you submit, such as poetry (kalaam), lyrics, community posts, and photos, as well as your interactions and preferences, may be processed to provide app features and personalize your experience.",
    ],
  },
  {
    title: "2. Third-Party Services and SDKs",
    paragraphs: [
      "Mawaddat uses Google Sign-In and Google OAuth to support account sign-in. Firebase Authentication may be used for mobile authentication, and Firebase Cloud Messaging together with Expo Notifications supports device notifications.",
      "The Mawaddat API is hosted by Render. The API uses MongoDB, accessed through Mongoose, to manage application data and uploaded media. Information necessary to provide these services may be processed by these providers under their respective privacy policies.",
      "The app does not currently include a third-party analytics SDK.",
    ],
  },
  {
    title: "3. How We Use Your Information",
    paragraphs: [
      "Account Management: To create and manage your profile, authenticate your identity, and provide access to app features.",
      "Notifications & Updates: To send app updates, announcements, and notifications related to your account or app content when enabled.",
      "Event Discovery: To help show relevant nearby events when you choose to share your location.",
    ],
  },
  {
    title: "4. Data Sharing and Disclosure",
    paragraphs: [
      "We do not sell, trade, or rent your personal information. Information may be processed by the service providers described above only as needed to operate app features. We do not share personal information with external third parties for marketing purposes.",
    ],
  },
  {
    title: "5. Children's Privacy",
    paragraphs: [
      "Mawaddat provides Shia Islamic educational and devotional content, such as Nohas, Salams, poetry, and scholarly profiles, for a general audience. We do not knowingly collect personal information from children under 13 without appropriate parental guidance where applicable.",
    ],
  },
  {
    title: "6. Security of Your Information",
    paragraphs: [
      "We implement reasonable security measures to help protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure.",
    ],
  },
  {
    title: "7. Changes to This Privacy Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically.",
    ],
  },
  {
    title: "8. Contact Us",
    paragraphs: [
      "If you have questions, concerns, or requests regarding this Privacy Policy or your data, contact us at support.mawaddat@gmail.com.",
    ],
  },
  {
    title: "9. Copyright and Intellectual Property",
    paragraphs: [
      "All content available on the Mawaddat application—including but not limited to poetry (shayari), nohas, manqabats, salams, articles, quotes, scholarly writings (tahreer), images, graphics, posters, and user interface designs—is protected under applicable copyright and intellectual property laws.",
      "Content Ownership: The devotional and literary content featured in the app, contributed by or dedicated to various poets, reciters/nauhakhwans, anjumans, and olema, belongs to its respective copyright holders, creators, or authorized representatives. It is hosted or displayed within the application for personal, non-commercial, and devotional reading and viewing purposes only.",
      "Poster and Event Uploads: All posters, shayari, and event details on the app are exclusively uploaded and published by the Admin. Users cannot directly upload content or posters into the app. If a user wishes to post an event or poster, they must contact the administrator directly.",
    ],
  },
  {
    title: "10. Restrictions and Copyright Infringement Claims",
    paragraphs: [
      "Restrictions: You may not copy, reproduce, republish, download, redistribute, or exploit any text, posters, graphic content, or materials from this application for commercial use without prior written permission from the respective copyright owners or app administration.",
      "Copyright Infringement Claims: Mawaddat respects the intellectual property rights of others. If you believe that any content displayed within the application infringes upon your copyright, please contact us at support.mawaddat@gmail.com with the relevant details so that we can review your claim.",
    ],
  },
  {
    title: "11. Optional Information (Contact Number and Address)",
    paragraphs: [
      "You may optionally choose to provide your phone number and physical address within the app. Providing this information is entirely voluntary, and it is collected only if you choose to share it with us to enhance your profile or service experience.",
    ],
  },
];

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={DARK} />
        </Pressable>

        <Text style={styles.headerTitle}>Privacy Policy</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={30} color={GOLD} />
          </View>
          <Text style={styles.brand}>Mawaddat</Text>
          <Text style={styles.introTitle}>Privacy Policy for Mawaddat</Text>
          <Text style={styles.introText}>
            Mawaddat (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
            committed to protecting your privacy. This Privacy Policy explains
            how our mobile application collects, uses, and safeguards your
            information.
          </Text>
          <Text style={styles.introText}>
            By accessing or using the Mawaddat app, you agree to this Privacy
            Policy. If you do not agree with these practices, please do not use
            the application.
          </Text>
          <Text style={styles.updated}>Effective Date: November 7, 2026</Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
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
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  introCard: {
    alignItems: "center",
    padding: 22,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F0E2",
    marginBottom: 10,
  },
  brand: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  introTitle: {
    color: DARK,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  introText: {
    color: "#5B493D",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 8,
  },
  updated: {
    color: "#8A7B70",
    fontSize: 12,
    marginTop: 14,
  },
  section: {
    padding: 18,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 9,
  },
  paragraph: {
    color: "#5B493D",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 7,
  },
});
