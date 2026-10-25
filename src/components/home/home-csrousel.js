import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { widthPercentageToDP } from "react-native-responsive-screen";

const windowWidth = Dimensions.get("window").width;

const getApiBase = () => {
  const envHost = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envHost) return envHost.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location)
    return `http://${window.location.hostname}:4000`;
  return "http://localhost:4000";
};

function HomeCarousel() {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/carousels`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.log("Failed to load carousel slides", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadSlides();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % items.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentIndex, items.length]);

  if (loading) {
    return (
      <View style={[styles.container, styles.emptyState]}>
        <ActivityIndicator color="#2C1810" />
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={[styles.container, styles.emptyState]}>
        <Text style={styles.emptyText}>No featured slides yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(item, index) => String(item._id || index)}
        renderItem={({ item }) => (
          <ImageBackground
            source={item.image ? { uri: `${getApiBase()}${item.image}` } : null}
            style={styles.carouselImage}
            imageStyle={{ resizeMode: "cover" }}
          >
            <View style={styles.overlayBackground}>
              <View style={styles.textContainer}>
                <Text style={styles.heading}>
                  {item.title || item.label || "Mawaddat"}
                </Text>
                <Text style={styles.subHeading}>
                  {item.subtitle ||
                    item.description ||
                    "Explore beautiful poetry"}
                </Text>
              </View>
            </View>
          </ImageBackground>
        )}
      />
    </View>
  );
}

export default HomeCarousel;

const styles = StyleSheet.create({
  container: {
    height: widthPercentageToDP(50),
    width: "90%",
    alignSelf: "center",
    marginTop: 5,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E9ECEF",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#5B493D",
    fontSize: 13,
    fontWeight: "600",
  },
  carouselImage: {
    width: windowWidth * 0.9,
    height: "100%",
    justifyContent: "center",
    backgroundColor: "#ddd",
  },
  overlayBackground: {
    backgroundColor: "#00000040",
    flex: 1,
    justifyContent: "center",
  },
  textContainer: {
    padding: 20,
    width: "75%",
  },
  heading: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#F4C10F",
    marginBottom: 6,
  },
  subHeading: {
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 16,
  },
});
