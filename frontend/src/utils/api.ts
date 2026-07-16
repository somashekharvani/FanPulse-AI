// REST & WS API Clients for FanPulse AI

const getApiUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    return `http://${hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
};

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || getApiUrl();
export const API_URL = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;
export const API_BASE = `${API_URL}/api/v1`;

// Get standard auth headers
export function getAuthHeaders() {
  const token = localStorage.getItem("fanpulse_access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Custom fetch wrapper with refresh token rotation
export async function apiRequest(path: string, options: RequestInit = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Handle Token Expiration (401)
  if (response.status === 401 && path !== "/auth/login" && path !== "/auth/refresh") {
    const refreshToken = localStorage.getItem("fanpulse_refresh_token");
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          localStorage.setItem("fanpulse_access_token", refreshData.access_token);
          localStorage.setItem("fanpulse_refresh_token", refreshData.refresh_token);

          // Retry the original request with the new token
          const retriedHeaders = {
            ...getAuthHeaders(),
            ...options.headers,
          };
          response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: retriedHeaders,
          });
        } else {
          // Refresh token expired too, log out
          logoutUser();
        }
      } catch (err) {
        logoutUser();
      }
    } else {
      logoutUser();
    }
  }

  return response;
}

export function logoutUser() {
  localStorage.removeItem("fanpulse_access_token");
  localStorage.removeItem("fanpulse_refresh_token");
  localStorage.removeItem("fanpulse_role");
  localStorage.removeItem("fanpulse_email");
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

// Websocket Address Resolver
export function getWebSocketUrl(): string {
  const wsUrl = API_URL.replace(/^http/, "ws");
  return `${wsUrl}/ws`;
}
