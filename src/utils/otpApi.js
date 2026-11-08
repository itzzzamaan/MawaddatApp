import * as SecureStore from "@/utils/secureStorage";
import { getApiBase, parseApiResponse } from "./api";

const DEFAULT_AVATAR = "https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png";

// Kept in memory only so the password never travels through route params or storage.
// Needed to resend the signup code from the OTP screen.
let pendingSignup = null;
export const setPendingSignup = (value) => {
  pendingSignup = value;
};
export const getPendingSignup = () => pendingSignup;

export class ApiError extends Error {
  constructor(message, { status, code, retryAfter } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export async function postAuth(path, body) {
  let response;
  try {
    response = await fetch(`${getApiBase()}/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Network error. Check your connection and try again.");
  }

  const data = await parseApiResponse(response);
  if (!response.ok) {
    throw new ApiError(data.message || "Something went wrong. Please try again.", {
      status: response.status,
      code: data.code,
      retryAfter: data.retryAfter,
    });
  }
  return data;
}

export async function storeUserSession({ token, user }) {
  const profile = {
    id: user.id || null,
    name: user.name || "",
    fullName: user.name || "",
    email: user.email || "",
    imageUri: user.imageUri || DEFAULT_AVATAR,
  };

  await SecureStore.deleteItemAsync("admin_token");
  await SecureStore.deleteItemAsync("admin_user");
  await SecureStore.setItemAsync("user_token", token);
  await SecureStore.setItemAsync("user_account", JSON.stringify(profile));
  await SecureStore.setItemAsync("user_profile", JSON.stringify(profile));
  return profile;
}
