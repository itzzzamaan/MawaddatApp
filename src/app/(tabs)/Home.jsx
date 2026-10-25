import {
  SafeAreaView,
  StyleSheet,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
} from "react-native-reanimated";

import Navbar from "../../components/Navbar";

// Home components
import Categories from "../../components/home/feedshome";
import Explore from "../../components/home/poetshome";
import HomeCarousel from "../../components/home/home-csrousel";

// ✅ Tab bar scroll context
import { useTabBarScroll } from "../../contexts/TabBarScrollContext";

const THEME = {
  bg: '#F8F6F2',
  surface: '#FFFDF9',
  panel: '#F0EAE3',
  text: '#2C1810',
  muted: '#5B493D',
  accent: '#C49A32',
  brown: '#8A6A53',
};

const Home = () => {
  const scrollY = useTabBarScroll();

  // ✅ Detect scroll for tab bar hide/show
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <Navbar />

      <Animated.FlatList
        data={[]}
        keyExtractor={() => "home-header"}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            <HomeCarousel />
            <Explore />
            <Categories />
          </>
        }
        contentContainerStyle={styles.homeScreen}
        renderItem={null}
      />
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  homeScreen: {
    paddingBottom: 28,
    backgroundColor: THEME.bg,
    paddingTop: 8,
  },
});
