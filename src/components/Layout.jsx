// src/components/Layout.jsx
import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation(); // ← get current location
  const { pathname } = location;

  // map pathnames → the same labels you use in Footer’s NavItem `active={…}`
  let activePage;
  if (pathname === "/") activePage = "Home";
  else if (pathname.startsWith("/store")) activePage = "Store";
  else if (pathname.startsWith("/inventory")) activePage = "Inventory";
  else if (pathname.startsWith("/friends")) activePage = "Friends";
  else if (pathname.startsWith("/ranking")) activePage = "Ranking";
  else activePage = "";

  // … all your existing header‐state & effects …
  const [showSettings, setShowSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [chatOn, setChatOn] = useState(true);

  const handleSupport = () => console.log("Support clicked");
  const handleFeedback = () => console.log("Feedback clicked");

  return (
    <div className="flex flex-col h-screen">
      <Header
        user={user}
        onLogout={logout}
        showSettings={showSettings}
        onSettingsClick={() => setShowSettings(true)}
        onSettingsClose={() => setShowSettings(false)}
        soundOn={soundOn}
        toggleSound={() => setSoundOn((s) => !s)}
        musicOn={musicOn}
        toggleMusic={() => setMusicOn((m) => !m)}
        chatOn={chatOn}
        toggleChat={() => setChatOn((c) => !c)}
        onSupport={handleSupport}
        onFeedback={handleFeedback}
      />

      <main
        className="flex-1 overflow-auto bg-cover bg-center"
        style={{ backgroundImage: "url(/images/cosmic-bg.png)" }}
      >
        <Outlet />
      </main>

      {/* ← pass the activePage you just computed */}
      <Footer activePage={activePage} />
    </div>
  );
}
