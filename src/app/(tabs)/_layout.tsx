import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

const TAB_ACTIVE = "#C49A32";
const TAB_INACTIVE = "#5B493D";
const TAB_BG = "#F8F6F2";
const TAB_BORDER = "#E9DCC7";

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 70 : 78,
          paddingBottom: Platform.OS === "ios" ? 4 : 4,
          paddingTop: 4,
          backgroundColor: TAB_BG,
          borderTopColor: TAB_BORDER,
          borderTopWidth: 1,
          ...(Platform.OS === "android" ? { elevation: 12 } : {}),
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="poets"
        options={{
          title: "Directory",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      {/* <Tabs.Screen
        name="storehome"
        options={{
          title: "Store",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      /> */}

      <Tabs.Screen
        name="events"
        options={{
          title: "Programs",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="calendar-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="bookmark"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="recently-viewed"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="panditji"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="EditProfile"
        options={{
          href: null,
        }}
      />

    </Tabs>
  );
}

