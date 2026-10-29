import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import {
  DeviceEventEmitter,
  Platform,
  TurboModuleRegistry,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "./secureStorage";
import { getApiBase } from "./api";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const firebaseConfig = Constants.expoConfig?.extra;
export const isFirebasePushConfigured =
  Platform.OS === "android"
    ? firebaseConfig?.firebaseAndroidConfigured === true
    : Platform.OS === "ios" &&
      firebaseConfig?.firebaseIosConfigured === true;

let firebaseNativeModulesWarningLogged = false;

const hasFirebaseMessagingNativeModules = () => {
  if (Platform.OS === "web") return false;

  const isAvailable = Boolean(
    TurboModuleRegistry.get("NativeRNFBTurboApp") &&
      TurboModuleRegistry.get("NativeRNFBTurboMessaging"),
  );
  if (!isAvailable && !firebaseNativeModulesWarningLogged) {
    console.warn(
      "Firebase push notifications need a development or production build with React Native Firebase installed. Expo Go and older installed builds do not include these native modules.",
    );
    firebaseNativeModulesWarningLogged = true;
  }
  return isAvailable;
};

const authorizedHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

const saveDeviceToken = async (deviceToken, authToken) => {
  const response = await fetch(`${getApiBase()}/api/notifications/device`, {
    method: "PUT",
    headers: authorizedHeaders(authToken),
    body: JSON.stringify({ token: deviceToken }),
  });
  if (!response.ok) {
    throw new Error(`Failed to register push device (${response.status})`);
  }
};

export const syncFollowedPoets = async (followedPoets, token) => {
  const response = await fetch(`${getApiBase()}/api/notifications/followed-poets`, {
    method: "PUT",
    headers: authorizedHeaders(token),
    body: JSON.stringify({
      followedPoets: followedPoets.map(({ id, name }) => ({ id, name })),
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to sync followed poets (${response.status})`);
  }
};

export const registerPushDevice = async (token) => {
  if (
    !isFirebasePushConfigured ||
    Platform.OS === "web" ||
    !Device.isDevice ||
    !hasFirebaseMessagingNativeModules()
  ) {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Notifications",
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C49A32",
    });
  }

  const permission = await Notifications.getPermissionsAsync();
  const requested =
    permission.status === "granted"
      ? permission
      : await Notifications.requestPermissionsAsync();
  if (requested.status !== "granted") return false;

  const messagingModule = await import("@react-native-firebase/messaging");
  const messaging = messagingModule.getMessaging();
  if (
    Platform.OS === "ios" &&
    !(await messagingModule.isDeviceRegisteredForRemoteMessages(messaging))
  ) {
    await messagingModule.registerDeviceForRemoteMessages(messaging);
  }

  const deviceToken = await messagingModule.getToken(messaging);
  await saveDeviceToken(deviceToken, token);
  return true;
};

export const unregisterPushDevice = async (token) => {
  if (
    !isFirebasePushConfigured ||
    Platform.OS === "web" ||
    !Device.isDevice ||
    !hasFirebaseMessagingNativeModules()
  ) {
    return;
  }

  const messagingModule = await import("@react-native-firebase/messaging");
  const deviceToken = await messagingModule.getToken(
    messagingModule.getMessaging(),
  );
  const response = await fetch(`${getApiBase()}/api/notifications/device`, {
    method: "DELETE",
    headers: authorizedHeaders(token),
    body: JSON.stringify({ token: deviceToken }),
  });
  if (!response.ok) {
    throw new Error(`Failed to unregister push device (${response.status})`);
  }
};

const markPushNotificationRead = async (notificationId) => {
  if (!notificationId) return;
  const token = await SecureStore.getItemAsync("user_token");
  if (!token) return;

  const response = await fetch(
    `${getApiBase()}/api/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PATCH",
      headers: authorizedHeaders(token),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to mark notification read (${response.status})`);
  }
};

export const openNotificationTarget = (data) => {
  const targetId = data?.targetId;
  if (!targetId) return;

  if (data.type === "event") {
    router.push({
      pathname: "/eventsdetail",
      params: { eventId: String(targetId) },
    });
  } else if (data.type === "post") {
    router.push({
      pathname: "/post/[id]",
      params: { id: String(targetId) },
    });
  }
};

const handleNotificationResponse = (data) => {
  markPushNotificationRead(data?.notificationId)
    .catch((error) => console.error("Could not mark push notification read:", error))
    .finally(() => openNotificationTarget(data));
};

export const setupNotificationResponseListeners = async () => {
  if (
    !isFirebasePushConfigured ||
    Platform.OS === "web" ||
    !hasFirebaseMessagingNativeModules()
  ) {
    return () => {};
  }

  const messagingModule = await import("@react-native-firebase/messaging");
  const messaging = messagingModule.getMessaging();
  const foregroundListener = messagingModule.onMessage(
    messaging,
    async (remoteMessage) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || "Mawaddat",
          body: remoteMessage.notification?.body || "",
          data: remoteMessage.data || {},
        },
        trigger: null,
      });
      DeviceEventEmitter.emit("mawaddat-notification-received");
    },
  );
  const openedListener = messagingModule.onNotificationOpenedApp(
    messaging,
    (remoteMessage) => handleNotificationResponse(remoteMessage.data || {}),
  );
  const tokenRefreshListener = messagingModule.onTokenRefresh(
    messaging,
    async (token) => {
      try {
        const authToken = await SecureStore.getItemAsync("user_token");
        if (authToken) await saveDeviceToken(token, authToken);
      } catch (error) {
        console.error("Could not update the push device token:", error);
      }
    },
  );
  const responseListener =
    Notifications.addNotificationResponseReceivedListener((response) =>
      handleNotificationResponse(response.notification.request.content.data),
    );

  messagingModule
    .getInitialNotification(messaging)
    .then((remoteMessage) => {
      if (remoteMessage) {
        handleNotificationResponse(remoteMessage.data || {});
      }
    })
    .catch((error) => {
      console.error("Could not read the initial push notification:", error);
    });

  return () => {
    foregroundListener();
    openedListener();
    tokenRefreshListener();
    responseListener.remove();
  };
};
