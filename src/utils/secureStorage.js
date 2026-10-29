import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store has no web implementation, so fall back to localStorage there.
const isWeb = Platform.OS === "web";

const webStorage = () => {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
};

export const getItemAsync = async (key, options) => {
  if (!isWeb) return SecureStore.getItemAsync(key, options);
  return webStorage()?.getItem(key) ?? null;
};

export const setItemAsync = async (key, value, options) => {
  if (!isWeb) return SecureStore.setItemAsync(key, value, options);
  webStorage()?.setItem(key, value);
};

export const deleteItemAsync = async (key, options) => {
  if (!isWeb) return SecureStore.deleteItemAsync(key, options);
  webStorage()?.removeItem(key);
};
