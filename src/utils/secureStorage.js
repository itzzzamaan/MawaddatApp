import * as ExpoSecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function getItemAsync(key) {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }

    return await ExpoSecureStore.getItemAsync(key);
  } catch (error) {
    console.error("SecureStore get error:", error);
    return null;
  }
}

export async function setItemAsync(key, value) {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }

    await ExpoSecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error("SecureStore set error:", error);
  }
}

export async function deleteItemAsync(key) {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }

    await ExpoSecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error("SecureStore delete error:", error);
  }
}
