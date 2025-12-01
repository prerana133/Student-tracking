// src/context/AuthContext.jsx
import React, { useEffect, useState } from "react";
import * as jwtDecodeModule from "jwt-decode";
import API, { setAuthHeader } from "../api"; // <-- updated import

import { AuthContext } from "./authContext";

function parseAccessToken(access) {
  if (!access) return null;
  try {
    const decoder = jwtDecodeModule.default || jwtDecodeModule;
    const decoded = decoder(access);
    return {
      id: decoded.user_id || decoded.sub || null,
      username: decoded.username || decoded.user || null,
      role: decoded.role || decoded?.roles || null,
    };
  } catch {
    return null;
  }
}

function isTokenExpired(access) {
  if (!access) return true;
  try {
    const decoder = jwtDecodeModule.default || jwtDecodeModule;
    const decoded = decoder(access);
    const expiryTime = decoded.exp * 1000;
    return Date.now() >= expiryTime;
  } catch {
    return true;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) return JSON.parse(stored);
    } catch {
      console.warn("Failed to parse user from localStorage");
    }
    const access = localStorage.getItem("access_token");
    if (access && !isTokenExpired(access)) {
      // ensure API header is set immediately if token exists
      try { setAuthHeader(access); } catch {
        console.warn("Failed to set auth header from stored access token");
      }
      return parseAccessToken(access);
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const access = localStorage.getItem("access_token");
      if (!access) {
        if (mounted) setLoading(false);
        return;
      }

      // ensure header is set for the first call
      setAuthHeader(access);

      // refresh if expired
      if (isTokenExpired(access)) {
        const refresh = localStorage.getItem("refresh_token");
        if (refresh) {
          try {
            const r = await API.post("users/token/refresh/", { refresh });
            const newAccess = r.data.access || r.data?.data?.tokens?.access || r.data?.data?.access;
            if (newAccess) {
              localStorage.setItem("access_token", newAccess);
              setAuthHeader(newAccess);
              // Parse the new token to update user data with potentially new role
              const refreshedUser = parseAccessToken(newAccess);
              if (refreshedUser) {
                try {
                  localStorage.setItem("user", JSON.stringify(refreshedUser));
                } catch {
                  console.warn("Failed to store refreshed user in localStorage");
                }
                if (mounted) setUser(refreshedUser);
              }
            } else {
              throw new Error("No access token in refresh response");
            }
          } catch (refreshErr) {
            console.warn("Token refresh failed during init", refreshErr);
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
            setAuthHeader(null);
            if (mounted) setLoading(false);
            return;
          }
        } else {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          setAuthHeader(null);
          if (mounted) setLoading(false);
          return;
        }
      }

      try {
        // IMPORTANT: use relative path without leading slash to avoid baseURL path issues
        const resp = await API.get("users/me/");
        if (!mounted) return;

        const payload = resp?.data ?? resp;
        const data = payload?.data ?? payload;
        const userFromServer =
          (data && (data.user || data)) ||
          resp?.data?.user ||
          resp?.data;

        const normalized =
          (userFromServer && typeof userFromServer === "object")
            ? {
                id: userFromServer.id ?? userFromServer.pk,
                username: userFromServer.username ?? userFromServer.email ?? userFromServer.userName,
                role: userFromServer.role ?? userFromServer.user_role ?? userFromServer?.roles ?? null,
                ...userFromServer,
              }
            : parseAccessToken(localStorage.getItem("access_token"));

        try {
          localStorage.setItem("user", JSON.stringify(normalized));
        } catch {
          console.warn("Failed to store user in localStorage");
        }

        setUser(normalized);
      } catch (err) {
        console.warn("Auth init: unable to fetch users/me - falling back to parsed token data.", err);
        // Don't log out - use the data we got from parsing the access token
        const fallbackUser = parseAccessToken(localStorage.getItem("access_token"));
        if (fallbackUser) {
          setUser(fallbackUser);
          try {
            localStorage.setItem("user", JSON.stringify(fallbackUser));
          } catch {
            console.warn("Failed to store fallback user in localStorage");
          }
        } else {
          // Only log out if we can't get any user data from the token
          setUser(null);
          localStorage.removeItem("user");
          setAuthHeader(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const login = async (username, password) => {
    const res = await API.post("users/login/", { username, password });
    const body = res.data || {};

    const tokens =
      body?.data?.tokens ||
      body?.data?.data?.tokens ||
      body?.tokens ||
      (body?.data && (body?.data?.access || body?.data)) ||
      undefined;

    const userData = body?.data?.user || body?.data?.data?.user || body?.user || null;

    const access = tokens?.access || body?.access;
    const refresh = tokens?.refresh || body?.refresh;

    if (access) {
      localStorage.setItem("access_token", access);
      if (refresh) localStorage.setItem("refresh_token", refresh);

      // set header immediately so any follow-up requests work
      setAuthHeader(access);

      const decodedUser = userData ? {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        avatar: userData.avatar,
        ...userData,
      } : parseAccessToken(access);

      try { localStorage.setItem("user", JSON.stringify(decodedUser)); } catch {
        console.warn("Failed to store user in localStorage");
      }
      setUser(decodedUser);
      return { ok: true, user: decodedUser };
    }

    throw new Error("Login failed");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setAuthHeader(null);
    setUser(null);
  };

  const inviteUser = async (payload) => {
    const merged = {
      ...payload,
      frontend_url: payload.frontend_url || import.meta.env.VITE_FRONTEND_URL || window.location.origin
    };
    return API.post("users/invite-user/", merged);
  };

  const acceptInvitation = async (payload) => {
    return API.post("users/accept-invitation/", payload);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, inviteUser, acceptInvitation }}>
      {children}
    </AuthContext.Provider>
  );
};
