// src/context/SettingsContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const SettingsContext = createContext(null);

const readBool = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeBool = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors (private mode, SSR, etc.)
  }
};

export function SettingsProvider({ children }) {
  const [soundOn, setSoundOn] = useState(() =>
    readBool("settings:soundOn", true)
  );
  const [musicOn, setMusicOn] = useState(() =>
    readBool("settings:musicOn", true)
  );
  const [chatOn, setChatOn] = useState(() =>
    readBool("settings:chatOn", true)
  );

  useEffect(() => writeBool("settings:soundOn", soundOn), [soundOn]);
  useEffect(() => writeBool("settings:musicOn", musicOn), [musicOn]);
  useEffect(() => writeBool("settings:chatOn", chatOn), [chatOn]);

  return (
    <SettingsContext.Provider
      value={{
        soundOn,
        setSoundOn,
        musicOn,
        setMusicOn,
        chatOn,
        setChatOn,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
