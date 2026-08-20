const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://track-my-kid-server-1.onrender.com")
).replace(/\/$/, "");
export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

export { API_URL };
