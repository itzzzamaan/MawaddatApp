import { useRouter } from "expo-router";
import { useEffect } from "react";
import * as SecureStore from "@/utils/secureStorage";
import {
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";


function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
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
        router.replace("/signin");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          style={styles.logoStyles}
          resizeMode="contain"
          source={require("../app/assets/images/Mawaddatlogo.png")}
        />
      </View>
    </SafeAreaView>
  );
}

export default SplashScreen;

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2C1810",
  },
  logoContainer: {
    flex: 1,
    width,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C1810",
  },
  logoStyles: {
    height: "60%",
    width: "60%",
    alignSelf: "center",
  },
});
