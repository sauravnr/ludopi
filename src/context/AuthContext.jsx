// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, load user + player once
  useEffect(() => {
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        setPlayer(data.player);
      })
      .catch((err) => {
        // if no auth (401), that's fine—just clear both
        if (err.response?.status !== 401) console.error(err);
        setUser(null);
        setPlayer(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Login + fetch player
  const login = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    if (data.player) {
      setPlayer(data.player);
    } else {
      const { data: me } = await api.get("/auth/me");
      setPlayer(me.player);
    }
  };

  // Register + fetch player
  const register = async ({ username, email, password }) => {
    const { data } = await api.post("/auth/register", {
      username,
      email,
      password,
    });
    setUser(data.user);
    if (data.player) {
      setPlayer(data.player);
    } else {
      const { data: me } = await api.get("/auth/me");
      setPlayer(me.player);
    }
  };

  // Pi Network login
  const piLogin = async (accessToken) => {
    const { data } = await api.post("/auth/pi-login", { accessToken });
    setUser(data.user);
    if (data.player) {
      setPlayer(data.player);
    } else {
      const { data: me } = await api.get("/auth/me");
      setPlayer(me.player);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setPlayer(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        player,
        setPlayer,
        loading,
        login,
        register,
        piLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for convenience
export function useAuth() {
  return useContext(AuthContext);
}
