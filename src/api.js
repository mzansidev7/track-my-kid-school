import { clearSupabaseSession } from "./supabaseClient";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://track-my-kid-server-1.onrender.com")
).replace(/\/$/, "");

let expiredToken = null;
const getRawBearerToken = (headers = {}) => {
  const authorization = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "authorization",
  )?.[1];
  if (typeof authorization !== "string") return "";

  let token = authorization.trim().replace(/^(?:Bearer\s+)+/i, "").trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  return token;
};

const isJwt = (token) =>
  typeof token === "string" &&
  token.split(".").length === 3 &&
  token.split(".").every((part) => /^[A-Za-z0-9_-]+$/.test(part)) &&
  token.split(".").slice(0, 2).every((part) => part.length % 4 !== 1);

const getStoredSchoolToken = () => {
  try {
    const auth = JSON.parse(localStorage.getItem("schoolAuth") || "null");
    return typeof auth?.token === "string" ? auth.token : "";
  } catch {
    return "";
  }
};

const isPublicAuthRequest = (path) =>
  /\/(login|create-user|verify-otp|resend-otp|request-registration-link|forgot-password|reset-password|health)(?:[?#]|$)/i.test(
    path,
  );

const resolveRequestToken = (path, headers) => {
  if (isPublicAuthRequest(path)) return "";

  const providedToken = getRawBearerToken(headers);
  const storedToken = getStoredSchoolToken();

  if (isJwt(storedToken)) return storedToken;
  if (isJwt(providedToken)) return providedToken;

  return "";
};

const clearExpiredSchoolSession = (token) => {
  if (!token || token === expiredToken) return;
  expiredToken = token;
  localStorage.removeItem("schoolAuth");
  sessionStorage.removeItem("schoolAuth");
  window.dispatchEvent(new Event("school-auth-changed"));
  void clearSupabaseSession().catch((error) => {
    console.error("Could not clear Supabase Auth session:", error);
  });
  for (const key of Object.keys(localStorage)) {
    if (
      key.startsWith("schoolProfileCache:") ||
      key.startsWith("schoolDashboardCache:")
    ) {
      localStorage.removeItem(key);
    }
  }
  window.location.replace("/login");
};

export const apiRequest = async (path, options = {}) => {
  console.log({ API_URL });
  const isMultipart = options.body instanceof FormData;
  const token = resolveRequestToken(path, options.headers);
  if (token && !isJwt(token)) {
    clearExpiredSchoolSession(token);
    throw new Error("Your login session is invalid. Please sign in again.");
  }
  const requestHeaders = {
    ...(isMultipart ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };
  for (const key of Object.keys(requestHeaders)) {
    if (key.toLowerCase() === "authorization") delete requestHeaders[key];
  }
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: requestHeaders,
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok && isPublicAuthRequest(path)) expiredToken = null;
  if (
    response.status === 401 &&
    token &&
    !isPublicAuthRequest(path) &&
    ["NO_TOKEN", "INVALID_TOKEN"].includes(data.error || data.message)
  ) {
    clearExpiredSchoolSession(token);
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

export { API_URL, isJwt };
