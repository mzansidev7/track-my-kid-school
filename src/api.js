const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://track-my-kid-server-1.onrender.com")
).replace(/\/$/, "");

let expiredToken = null;
const getBearerToken = (headers = {}) => {
  const authorization = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "authorization",
  )?.[1];
  return typeof authorization === "string"
    ? authorization.replace(/^Bearer\s+/i, "")
    : "";
};

const isPublicAuthRequest = (path) =>
  /\/(login|create-user|verify-otp|resend-otp|request-registration-link|health)(?:[?#]|$)/i.test(
    path,
  );

const clearExpiredSchoolSession = (token) => {
  if (!token || token === expiredToken) return;
  expiredToken = token;
  localStorage.removeItem("schoolAuth");
  sessionStorage.removeItem("schoolAuth");
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
  const token = getBearerToken(options.headers);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isMultipart ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  if (response.ok && isPublicAuthRequest(path)) expiredToken = null;
  if (response.status === 401 && token && !isPublicAuthRequest(path)) {
    clearExpiredSchoolSession(token);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

export { API_URL };
