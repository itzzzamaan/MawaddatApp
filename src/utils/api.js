import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const getApiBase = () => {
  const envHost = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envHost) {
    const normalized = envHost.replace(/\/$/, "");
    return /^https?:\/\//i.test(normalized)
      ? normalized
      : `http://${normalized}`;
  }

  const expoHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.expoGoConfig?.hostUri;

  if (expoHost) {
    const host = expoHost.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:4000`;
    }
  }

  if (Platform.OS === "android") return "http://10.0.2.2:4000";
  return "http://localhost:4000";
};

export const normalizeImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  let trimmed = value.trim();
  if (!trimmed) return "";

  // 1. Local preview or data URIs should be returned directly
  if (
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://") ||
    trimmed.startsWith("ph://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:image/")
  ) {
    return trimmed;
  }

  // 2. Normalize Windows backslashes
  trimmed = trimmed.replace(/\\/g, "/");

  // 3. Fix accidental duplicate protocol prefixes (e.g. http://...http://...)
  while (/^https?:\/\/[^/]+https?:\/\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^https?:\/\/[^/]+(?=https?:\/\/)/i, "");
  }

  // 4. Any path or URL containing /uploads/ -> extract clean filename
  const uploadMatch = trimmed.match(
    /(?:^|.*?\/uploads\/)([^/?#]+\.(?:jpe?g|png|webp|gif|svg))/i
  );
  if (uploadMatch && uploadMatch[1]) {
    return `${getApiBase()}/uploads/${uploadMatch[1]}`;
  }

  // 5. External HTTP(S) URLs (e.g. unsplash, cloud, cdn)
  if (/^https?:\/\//i.test(trimmed)) {
    // If it points to an uploads directory on an old host or IP
    if (trimmed.includes("/uploads/")) {
      const parts = trimmed.split("/uploads/");
      const fname = parts[parts.length - 1].split("?")[0];
      if (fname) return `${getApiBase()}/uploads/${fname}`;
    }
    return trimmed;
  }

  // 6. Relative path starting with / or uploads/
  const cleaned = trimmed.replace(/^\/+/, "");
  if (cleaned.startsWith("uploads/")) {
    return `${getApiBase()}/${cleaned}`;
  }

  // 7. Bare filename with image extension
  if (/\.(jpe?g|png|webp|gif|svg)$/i.test(cleaned)) {
    return `${getApiBase()}/uploads/${cleaned}`;
  }

  return `${getApiBase()}/${cleaned}`;
};

export const getMimeTypeFromName = (name = "") => {
  const lowerName = String(name || "").toLowerCase();
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

export const uploadImageToApi = async ({
  uri,
  base64,
  authToken,
  apiBase = getApiBase(),
  fallbackName = "upload.jpg",
}) => {
  if (!uri && !base64) return null;

  // If already a relative uploaded path, return it directly
  if (typeof uri === "string" && uri.startsWith("/uploads/")) {
    return uri;
  }

  // If already an external full URL, return it directly
  if (
    typeof uri === "string" &&
    uri.startsWith("http") &&
    !uri.includes("localhost") &&
    !uri.includes("10.0.2.2") &&
    !uri.includes("127.0.0.1") &&
    !uri.includes(apiBase)
  ) {
    return uri;
  }

  const fileName =
    (String(uri || fallbackName).split("/").pop() || fallbackName).split("?")[0] ||
    fallbackName;
  const mimeType = getMimeTypeFromName(fileName);

  // Auto-resolve auth token from SecureStore if not provided
  let token = authToken;
  if (!token) {
    try {
      token =
        (await SecureStore.getItemAsync("admin_token")) ||
        (await SecureStore.getItemAsync("user_token"));
    } catch {
      // Ignore SecureStore read errors
    }
  }

  const formData = new FormData();

  // Handle file attaching
  if (uri) {
    if (Platform.OS === "web") {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append("image", blob, fileName);
      } catch {
        formData.append("image", { uri, name: fileName, type: mimeType });
      }
    } else {
      // Native React Native FormData: file object with uri, name, and type
      const cleanUri =
        Platform.OS === "android" ? uri : uri.replace(/^file:\/\//, "");
      formData.append("image", {
        uri: cleanUri,
        name: fileName,
        type: mimeType,
      });
    }
  }

  // If base64 is available (e.g. from launchImageLibraryAsync with base64: true), include it
  if (base64) {
    formData.append("imageBase64", base64);
    formData.append("imageMimeType", mimeType);
  } else if (typeof uri === "string" && uri.startsWith("data:image/")) {
    formData.append("imageBase64", uri);
    formData.append("imageMimeType", mimeType);
  }

  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // IMPORTANT: Do NOT set Content-Type header so fetch can set the multipart boundary automatically

  const uploadResponse = await fetch(`${apiBase}/api/uploads`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    let errorMsg = "Image upload failed";
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed.message || parsed.error || errorMsg;
    } catch {
      errorMsg = text || errorMsg;
    }
    throw new Error(errorMsg);
  }

  const json = await uploadResponse.json();
  return json?.path || null;
};

export default getApiBase;
