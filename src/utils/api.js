import Constants from "expo-constants";
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
  const trimmed = value.trim();
  if (!trimmed) return "";

  const cleaned = trimmed.replace(/\\/g, "/").replace(/\/+/g, "/");

  if (/^https?:\/\//i.test(cleaned)) {
    const match = cleaned.match(
      /(?:^https?:\/\/[^/]+)?\/uploads\/([^/?#]+\.(?:jpe?g|png|webp))$/i
    );
    if (match) return `${getApiBase()}/uploads/${match[1]}`;
    return cleaned;
  }

  const match =
    cleaned.match(/(?:^|\/uploads\/)([^/?#]+\.(?:jpe?g|png|webp))$/i) ||
    cleaned.match(/([^/?#]+\.(?:jpe?g|png|webp))$/i);

  if (match) {
    return `${getApiBase()}/uploads/${match[1]}`;
  }

  const normalizedPath = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return `${getApiBase()}${normalizedPath}`;
};

const toBase64FromBytes = (bytes) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  if (typeof globalThis.Buffer !== "undefined") {
    return globalThis.Buffer.from(binary, "binary").toString("base64");
  }

  throw new Error("Base64 encoding is not supported in this environment");
};

export const getMimeTypeFromName = (name = "") => {
  const lowerName = String(name || "").toLowerCase();
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

export const uploadImageToApi = async ({
  uri,
  authToken,
  apiBase = getApiBase(),
  fallbackName = "upload.jpg",
}) => {
  if (!uri) return null;
  if (typeof uri === "string" && uri.startsWith("http")) return uri;

  const fileName =
    (String(uri).split("/").pop() || fallbackName).split("?")[0] ||
    fallbackName;
  const mimeType = getMimeTypeFromName(fileName);

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const base64 = toBase64FromBytes(uint8);

  const formData = new FormData();
  formData.append("imageBase64", `data:${mimeType};base64,${base64}`);
  formData.append("imageMimeType", mimeType);

  const uploadResponse = await fetch(`${apiBase}/api/uploads`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    body: formData,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(text || "Image upload failed");
  }

  const json = await uploadResponse.json();
  return json?.path || null;
};

export default getApiBase;
