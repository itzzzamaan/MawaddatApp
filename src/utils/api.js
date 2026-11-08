import { Platform } from "react-native";
import { fetch as expoFetch } from "expo/fetch";
import { File } from "expo-file-system";

export const getApiBase = () => {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.API_URL ||
    "https://mawaddatapp.onrender.com/";
  const normalized = configuredUrl.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(normalized)
    ? normalized
    : `https://${normalized}`;
};

export const parseApiResponse = async (response) => {
  const body = await response.text();
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    if (/^\s*</.test(body)) {
      throw new Error(
        `Backend returned an HTML error page (HTTP ${response.status}). Deploy the latest backend changes and try again.`,
      );
    }

    throw new Error(`Backend returned an invalid response (HTTP ${response.status}).`);
  }
};

export const normalizeImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Device-local URIs (picker results) are meaningless to other users. Never rewrite them
  // into a server URL that 404s; return "" so the UI shows its fallback instead.
  if (/^(file|content|ph|assets-library|blob|data):/i.test(trimmed)) return "";

  const cleaned = trimmed.replace(/\\/g, "/").replace(/\/+/g, "/");

  if (/^https?:\/\//i.test(trimmed)) {
    const match = trimmed
      .replace(/\\/g, "/")
      .match(
        /(?:^https?:\/\/[^/]+)?\/uploads\/([^/?#]+\.(?:jpe?g|png|webp))$/i,
      );
    if (match) return `${getApiBase()}/uploads/${match[1]}`;
    return trimmed;
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

  const isDataOrBlobUri = /^(data|blob):/i.test(String(uri));
  let fileName = isDataOrBlobUri
    ? fallbackName
    : (String(uri).split("/").pop() || fallbackName).split("?")[0] ||
      fallbackName;
  let mimeType = getMimeTypeFromName(fileName);

  // Send the image as a real file part (multer `image` field), not a text field.
  const formData = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    if (/^image\/(jpeg|png|webp)$/i.test(blob.type)) {
      mimeType = blob.type.toLowerCase();
      const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
      fileName = `${fileName.replace(/\.[^.]+$/, "")}.${ext}`;
    }
    formData.append("image", blob, fileName);
  } else {
    // SDK 58: global FormData/fetch is WinterCG-style; it needs a File/Blob part,
    // not the old React Native `{ uri, name, type }` object.
    formData.append("image", new File(uri));
  }

  const doFetch = Platform.OS === "web" ? fetch : expoFetch;
  const uploadResponse = await doFetch(`${apiBase}/api/uploads`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    body: formData,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    let message = "";
    try {
      message = JSON.parse(text)?.message || "";
    } catch {
      // Non-JSON error body (e.g. an HTML error page from a proxy).
    }
    throw new Error(message || `Image upload failed (HTTP ${uploadResponse.status}).`);
  }

  const json = await parseApiResponse(uploadResponse);
  // Never report success without a permanent path: callers would save a record with no image.
  if (!json?.path) throw new Error("The server did not return an image path.");
  return json.path;
};

export default getApiBase;
