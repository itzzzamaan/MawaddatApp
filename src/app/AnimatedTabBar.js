import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { View, StyleSheet } from "react-native";

const HIDE_DISTANCE = 120;
const HIDE_THRESHOLD = 20;

export default function AnimatedTabBar({ scrollY, ...props }) {
  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY) {
      return {
        transform: [{ translateY: 0 }],
      };
    }

    // 👇 scroll down → smooth hide
    if (scrollY.value > HIDE_THRESHOLD) {
      return {
        transform: [
          {
            translateY: withTiming(HIDE_DISTANCE, { duration: 120 }),
          },
        ],
      };
    }

    // 👆 scroll up → INSTANT show (no animation)
    return {
      transform: [{ translateY: 0 }],
    };
  });

  return (
    <Animated.View style={[animatedStyle, styles.container]}>
      {props.children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
