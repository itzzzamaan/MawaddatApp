import * as SecureStore from "@/utils/secureStorage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ImageBackground,
  Linking,
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
import { getApiBase, normalizeImageUrl } from "../utils/api";

const { width } = Dimensions.get("window");

export default function SplashCarousel() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const router = useRouter();

  const handleAfterCarousel = useCallback(async () => {
    try {
      const adminToken = await SecureStore.getItemAsync("admin_token");
      const userToken = await SecureStore.getItemAsync("user_token");

      if (adminToken) {
        router.replace("/admin/dashboard");
      } else if (userToken) {
        router.replace("/(tabs)/Home");
      } else {
        router.replace("/signin");
      }
    } catch (error) {
      console.error("Unable to resolve post-promotion destination:", error);
      router.replace("/signin");
    }
  }, [router]);

  useEffect(() => {
    let active = true;

    const loadPromotions = async () => {
      try {
        const response = await fetch(`${getApiBase()}/api/promotions`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || "Unable to load promotions.");
        }

        const promotions = Array.isArray(data) ? data : [];
        if (active) setSlides(promotions);
        if (active && !promotions.length) await handleAfterCarousel();
      } catch (error) {
        console.error("Failed to load splash promotions:", error);
        if (active) await handleAfterCarousel();
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPromotions();
    return () => {
      active = false;
    };
  }, [handleAfterCarousel]);

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
    const title = item.title || item.label;
    const subtitle = item.subtitle || item.description;
    const visibleSocials = Object.entries(socialLinks).filter(
      ([, value]) => typeof value === "string" && value.trim().length > 0,
    );
    const imageSource = item.image
      ? { uri: normalizeImageUrl(item.image) }
      : null;

    return (
      <ImageBackground
        source={imageSource}
        style={styles.slide}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleAfterCarousel}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.textWrapper}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
                  ? "Explore Mawaddat"
                  : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentIndex === index && styles.activeDot]}
            />
          ))}
        </View>
      </ImageBackground>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#C49A32" />
        </View>
      </SafeAreaView>
    );
  }

  if (!slides.length) return null;

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
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
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
    backgroundColor: "#2C1810",
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
