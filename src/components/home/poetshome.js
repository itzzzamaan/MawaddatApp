import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { getApiBase, normalizeImageUrl } from "../../utils/api";

export default function Explore() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPoets = async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/poets`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.log("Failed to load poets", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadPoets();
  }, []);

  const openPoetProfile = (poet) => {
    router.push({
      pathname: "/poet/[id]",
      params: { id: String(poet._id || poet.id || poet.name) },
    });
  };

  const handleViewAll = () => {
    router.push("/poets");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Famous Shayar Profiles</Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2C1810" />
        </View>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.header}>Famous Shayar Profiles</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAll}
            activeOpacity={0.8}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No poets added yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Text style={styles.header}>Famous Shayar Profiles</Text>
          <Text style={styles.subHeader}>
            Explore the world of Shayari and discover poets
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={handleViewAll}
          activeOpacity={0.8}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items.slice(0, 8)}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item._id || item.id || item.name)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openPoetProfile(item)}
            style={styles.item}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={{
                  uri:
                    normalizeImageUrl(item.image) ||
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500",
                }}
                style={styles.image}
              />
            </View>

            <Text style={styles.label} numberOfLines={2}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: hp(2),
    paddingBottom: hp(1),
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 69, 19, 0.1)",
  },
  headerLeft: {
    flex: 1,
    paddingRight: wp(2),
  },
  header: {
    fontSize: wp(4.5),
    fontWeight: "700",
    color: "#2C1810",
    letterSpacing: -0.3,
  },
  subHeader: {
    fontSize: wp(3.1),
    color: "#666666",
    marginTop: hp(0.5),
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C1810",
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.9),
    borderRadius: wp(5),
  },
  viewAllText: {
    color: "#FFFFFF",
    fontSize: wp(3.1),
    fontWeight: "600",
    marginRight: wp(1),
  },
  list: {
    paddingHorizontal: wp(4),
    paddingRight: wp(2),
  },
  item: {
    alignItems: "center",
    width: wp(20),
    marginRight: wp(3),
  },
  imageWrapper: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    borderWidth: 2,
    borderColor: "#2C1810",
    overflow: "hidden",
    backgroundColor: "#D9E1EA",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  label: {
    marginTop: hp(0.8),
    fontSize: wp(3),
    textAlign: "center",
    color: "#222222",
    lineHeight: wp(4),
    fontWeight: "600",
  },
  emptyContainer: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
  },
  emptyText: {
    color: "#5B493D",
    fontSize: wp(3.3),
  },
  loadingBox: {
    paddingVertical: hp(2),
    alignItems: "center",
  },
});

