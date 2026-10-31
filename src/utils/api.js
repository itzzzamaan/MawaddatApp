import { Platform } from "react-native";

export const getApiBase = () => {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.API_URL ||
    "http://192.168.133.223:4000";
  const normalized = configuredUrl.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(normalized)
    ? normalized
    : `https://${normalized}`;
};

export const normalizeImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

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
    formData.append("image", { uri, name: fileName, type: mimeType });
  }

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
