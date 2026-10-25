import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useEffect, useState } from "react";
import { TabBarScrollProvider } from "../contexts/TabBarScrollContext";
import { SavedPostsProvider } from "../contexts/SavedPostsContext";

export default function RootLayout() {
  const [loaded] = useFonts({
    Roboto: require("../app/assets/fonts/Roboto-VariableFont_wdth,wght.ttf"),
    Cairo: require("../app/assets/fonts/Cairo-VariableFont_slnt,wght.ttf"),
    Hindi: require("../app/assets/fonts/Nirmala.ttf"),
  });

  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      // await initLocalization(); // Load language from SecureStore or set Kurdish as default
      setAppReady(true);
    };
    load();
    // registerForPushNotificationsAsync().then((token) => {
    //   console.log("Expo Push Token:", token);
    // });
  }, []);

  if (!appReady || !loaded) {
    return null;
  }

  return (
    <SavedPostsProvider>
      <TabBarScrollProvider>
        <Stack initialRouteName="welcome-screen">
          <Stack.Screen
            name="welcome-screen"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Splash-carousel"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Language" options={{ headerShown: false }} />
          <Stack.Screen name="signin" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="Otp" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="myorders" options={{ headerShown: false }} />
          <Stack.Screen name="savedpujas" options={{ headerShown: false }} />
          <Stack.Screen name="EditProfile" options={{ headerShown: false }} />
          <Stack.Screen name="about" options={{ headerShown: false }} />
          <Stack.Screen name="store/cart" options={{ headerShown: false }} />
          <Stack.Screen name="panditprofile" options={{ headerShown: false }} />
          <Stack.Screen name="store/[productId]" options={{ headerShown: false }} />
          <Stack.Screen name="pandit-profile/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="poet/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="store/index" options={{ headerShown: false }} />
          <Stack.Screen name="eventsdetail" options={{ headerShown: false }} />
          <Stack.Screen name="helpandsupport" options={{ headerShown: false }} />
          <Stack.Screen name="recently-viewed" options={{ headerShown: false }} />
          <Stack.Screen name="saved-programs" options={{ headerShown: false }} />
          <Stack.Screen name="followed-poets" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />

        </Stack>
        <StatusBar style="auto" />
      </TabBarScrollProvider>
    </SavedPostsProvider>
  );
}
