// src/components/Header.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  FaCoins,
  FaGem,
  FaCog,
  FaVolumeUp,
  FaMusic,
  FaComments,
} from "react-icons/fa";
import Modal, { ToggleSwitch } from "./Modal";

export default function Header({
  user,
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
  return (
    <>
      <header className="relative z-10 flex items-center justify-between px-4 py-4 bg-header text-white header-3d">
        <div className="flex items-center space-x-2">
          <Link
            to="/profile"
            className="relative -mt-2 -mb-2 w-9 h-9 ring-offset-1 ring-offset-blue-800 rounded-md overflow-hidden hover:ring-2 hover:ring-white transition"
          >
            <img
              src={smallAvatar}
              srcSet={srcSet}
              sizes="32px"
              alt="Profile avatar"
              className="w-full h-full object-cover"
              decoding="async"
              fetchPriority={isCdn ? "high" : undefined}
            />
          </Link>
          <Link to="/profile" className="font-semibold">
            {user?.username}
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <FaCoins /> <span>1.7K</span>
          </div>
          <div className="flex items-center space-x-1">
            <FaGem /> <span>30</span>
          </div>
          <button onClick={onSettingsClick}>
            <FaCog className="w-6 h-6" />
          </button>
          {/* ← new Users link */}
          <Link to="/users" className="ml-4 text-sm hover:underline">
            Users
          </Link>
          {user && (
            <button onClick={onLogout} className="ml-4 text-sm hover:underline">
              Logout
            </button>
          )}
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
          ]}
        >
          <div className="space-y-4 w-52 mx-auto">
            <div className="flex items-center justify-start gap-4">
              <FaVolumeUp size={24} />
              <span>Sound</span>
              <div className="ml-auto">
                <ToggleSwitch
                  id="sound-switch"
                  checked={soundOn}
                  onChange={toggleSound}
                />
              </div>
            </div>
            <div className="flex items-center justify-start gap-4">
              <FaMusic size={24} />
              <span>Music</span>
              <div className="ml-auto">
                <ToggleSwitch
                  id="music-switch"
                  checked={musicOn}
                  onChange={toggleMusic}
                />
              </div>
            </div>
            <div className="flex items-center justify-start gap-4">
              <FaComments size={24} />
              <span>Chat</span>
              <div className="ml-auto">
                <ToggleSwitch
                  id="chat-switch"
                  checked={chatOn}
                  onChange={toggleChat}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
