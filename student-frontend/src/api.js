// src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8000/api/",
  headers: { "Content-Type": "application/json" },
});

export function setAuthHeader(token) {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common.Authorization;
  }
}

function getAccess() {
  return localStorage.getItem("access_token");
}

// attach token on every request (reads from localStorage so it's always current)
API.interceptors.request.use((config) => {
  const access = getAccess();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  if (import.meta.env.DEV) {
    try {
      const tokenPreview = access ? `Bearer ...${access.slice(-8)}` : "(no token)";
      console.debug("API Request:", config.method?.toUpperCase(), config.url, "Auth:", tokenPreview);
    } catch {
      console.debug("API Request:", config.method?.toUpperCase(), config.url, "Auth: (error reading token)");
    }
  }
  return config;
});

// response interceptor with refresh logic.
// Note: use API.post(...) instead of building baseURL manually.
API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    if (err.response && err.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          // call the refresh endpoint relative to baseURL
          const r = await API.post("users/token/refresh/", { refresh }, { withCredentials: true });
          const newAccess = r.data.access || r.data?.data?.tokens?.access || r.data?.data?.access || r.data?.data?.access;
          if (newAccess) {
            localStorage.setItem("access_token", newAccess);
            setAuthHeader(newAccess);
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return API(originalRequest);
          }
        } catch (_refreshErr) {
          console.warn("Refresh token failed", _refreshErr);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          setAuthHeader(null);
        }
      }
    }
    throw err;
  }
);

export default API;
