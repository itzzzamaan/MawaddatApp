import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "@/utils/secureStorage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";

import gradientOverlay from "../app/assets/images/gradientOverlay.png";

const { width } = Dimensions.get("window");

import { normalizeImageUrl } from "../utils/api";


const getApiBase = () => {
  const envHost = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envHost) return envHost.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location)
    return `http://${window.location.hostname}:4000`;
  return "http://localhost:4000";
};

export default function SplashCarousel() {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/carousels`);
        const data = await res.json();
        setSlides(Array.isArray(data) ? data : []);
      } catch (err) {
        console.log("Failed to load splash slides", err);
        setSlides([]);
      }
    };

    loadSlides();
  }, []);

  const handleAfterCarousel = async () => {
    try {
      const adminToken = await SecureStore.getItemAsync("admin_token");
      const userToken = await SecureStore.getItemAsync("user_token");

      if (adminToken) {
        router.replace("/admin/dashboard");
      } else if (userToken) {
        router.replace("/(tabs)/Home");
      } else {
        router.replace("/(tabs)/Home");
      }
    } catch (error) {
      router.replace("/(tabs)/Home");
    }
  };

  const handleContinue = async () => {
    if (!slides.length) {
      await handleAfterCarousel();
      return;
    }

    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      return;
    }

    await handleAfterCarousel();
  };

  const handleSocialPress = async (url) => {
    if (!url || !url.trim()) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.log("Unable to open social link", error);
    }
  };

  const renderItem = ({ item }) => {
    const socialLinks = item.socialLinks || {};
    const visibleSocials = Object.entries(socialLinks).filter(
      ([, value]) => typeof value === "string" && value.trim().length > 0
    );
    const imageSource = item.image ? { uri: normalizeImageUrl(item.image) } : null;

    return (
      <ImageBackground
        source={imageSource || gradientOverlay}
        style={styles.slide}
        resizeMode="cover"
      >
        <Image
          source={gradientOverlay}
          style={styles.gradient}
          resizeMode="stretch"
        />

        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleAfterCarousel}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.textWrapper}>
            <Text style={styles.title}>{item.title || item.label || "Welcome"}</Text>
            <Text style={styles.subtitle}>
              {item.subtitle || item.description || "Explore beautiful poetry."}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            {visibleSocials.length > 0 ? (
              <View style={styles.socialRow}>
                {visibleSocials.map(([key, url]) => {
                  const iconName = {
                    instagram: "logo-instagram",
                    whatsapp: "logo-whatsapp",
                    facebook: "logo-facebook",
                    youtube: "logo-youtube",
                  }[key];

                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.socialIcon}
                      onPress={() => handleSocialPress(url)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={iconName} size={20} color="#fff" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>
                {currentIndex === Math.max(slides.length - 1, 0)
                  ? "Get Started"
                  : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.activeDot,
              ]}
            />
          ))}
        </View>
      </ImageBackground>
    );
  };

  if (!slides.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No welcome slides available yet.</Text>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleAfterCarousel}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item, index) => String(item._id || item.key || index)}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / width
          );
          setCurrentIndex(index);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: "center",
  },
  slide: {
    width,
    height: "100%",
  },

  gradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },

  overlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: wp(6),
    paddingTop: hp(8),
    paddingBottom: hp(4),
  },

  skipBtn: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  skipText: {
    color: "#fff",
    fontWeight: "700",
  },

  textWrapper: {
    maxWidth: "75%",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  continueBtn: {
    backgroundColor: "#C49A32",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },

  continueText: {
    color: "#fff",
    fontWeight: "800",
  },

  dotsContainer: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.4)",
  },

  activeDot: {
    width: 26,
    backgroundColor: "#fff",
  },
});