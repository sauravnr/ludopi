// src/components/Header.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FaVolumeUp, FaMusic, FaComments } from "react-icons/fa";
import Modal, { ToggleSwitch } from "./Modal";

export default function Header({
  user,
  player,
  onLogout,
  showSettings,
  onSettingsClick,
  onSettingsClose,
  soundOn,
  toggleSound,
  musicOn,
  toggleMusic,
  chatOn,
  toggleChat,
  onSupport,
  onFeedback,
}) {
  // build src/srcSet only for CDN images
  const isCdn = Boolean(user?.avatarUrl);
  const smallAvatar = isCdn
    ? `${user.avatarUrl}?format=auto&width=32&quality=60`
    : "/default-avatar.png";
  const srcSet = isCdn
    ? `${user.avatarUrl}?format=auto&width=32&quality=60 32w,
       ${user.avatarUrl}?format=auto&width=64&quality=60 64w`
    : "";
  const getFrameSrc = (design) => {
    const safe =
      typeof design === "string" && /^[a-zA-Z0-9_-]+$/.test(design)
        ? design
        : "default";
    return safe && safe !== "default"
      ? `/frames/${encodeURIComponent(safe)}/idle-128.png`
      : "/frames/idle-128.png";
  };
  const formatAmount = (value) => {
    const num = Number(value || 0);
    const abs = Math.abs(num);
    if (abs >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (abs >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (abs >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  };
  const coins = formatAmount(player?.coins);
  const pipCoins = formatAmount(player?.pipBalance);
  return (
    <>
      <header className="relative z-10 flex items-center justify-between px-4 py-4 bg-header text-white header-3d">
        <div className="flex items-center space-x-2">
          <Link
            to="/profile"
            className="relative -mt-2 -mb-2 w-10 h-10 overflow-hidden"
          >
            <img
              src={smallAvatar}
              srcSet={srcSet}
              sizes="32px"
              alt="Avatar"
              className="w-full h-full object-cover"
              decoding="async"
              fetchPriority={isCdn ? "high" : undefined}
            />
            <img
              src={getFrameSrc(player?.frameDesign)}
              alt=""
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </Link>
          <Link to="/profile" className="font-semibold text-white">
            {user?.username}
          </Link>
        </div>
        <div className="flex items-center space-x-7">
          {/* Coins pill */}
          <div className="relative bg-white/10 px-8 rounded-full flex justify-center items-center h-5">
            <img
              src="/icons/coin.png"
              alt="Coins"
              className="absolute left-0 top-1/2 w-6 h-6
                 transform -translate-x-1/1 -translate-y-1/2"
            />
            <span className="text-white font-semibold">{coins}</span>
            <button
              className="absolute right-0 top-1/2
                 transform translate-x-1/1 -translate-y-1/2"
            >
              <img src="/icons/add.png" alt="Add Coins" className="w-5 h-5" />
            </button>
          </div>

          {/* PiPips pill */}
          <div className="relative bg-white/10 px-8 rounded-full flex justify-center items-center h-5">
            <img
              src="/icons/pipips.png"
              alt="PiPips"
              className="absolute left-0 top-1/2 w-6 h-6
                 transform -translate-x-1/1 -translate-y-1/2"
            />
            <span className="text-white font-semibold">{pipCoins}</span>
            <button
              className="absolute right-0 top-1/2
                 transform translate-x-1/1 -translate-y-1/2"
            >
              <img src="/icons/add.png" alt="Add PiPips" className="w-5 h-5" />
            </button>
          </div>

          {/* Settings button */}
          <button onClick={onSettingsClick}>
            <img src="/icons/setting.png" alt="Settings" className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <Modal
          show={showSettings}
          title="Settings"
          width="sm"
          onClose={onSettingsClose}
          footer={[
            { label: "Support", variant: "secondary", onClick: onSupport },
            { label: "Feedback", variant: "primary", onClick: onFeedback },
            { label: "Logout", variant: "warning", onClick: onLogout },
          ]}
        >
          <div className="space-y-4 w-full max-w-xs mx-auto">
            <div className="flex items-center justify-between gap-2">
              <FaVolumeUp size={24} />
              <span>Sound</span>
              <ToggleSwitch
                id="sound-switch"
                checked={soundOn}
                onChange={toggleSound}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <FaMusic size={24} />
              <span>Music</span>
              <ToggleSwitch
                id="music-switch"
                checked={musicOn}
                onChange={toggleMusic}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <FaComments size={24} />
              <span>Chat</span>
              <ToggleSwitch
                id="chat-switch"
                checked={chatOn}
                onChange={toggleChat}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
