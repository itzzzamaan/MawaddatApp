import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import Categories from "../../components/home/feedshome";

const PAGE_BG = "#F8F6F2";
const CARD_BG = "#FFFDF9";
const TEXT_PRIMARY = "#2C1810";
const TEXT_MUTED = "#5B493D";
const PANEL = "#F0EAE3";

const RADIUS = 18;
const SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

export default function Saved() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Navbar />

      <View style={styles.headingContainer}>
        <Text style={styles.heading}>My Saved Posts</Text>
        <Text style={styles.subtitle}>
          Your favorite Shayari, all in one place
        </Text>
      </View>

      <Categories showOnlySaved={true} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
    marginTop: -32,
  },
  headingContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: PANEL,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
    ...SHADOW,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 5,
  },
});

