// src/components/Header.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaCoins,
  FaGem,
  FaCog,
  FaVolumeUp,
  FaMusic,
  FaComments,
  FaTrophy,
  FaUsers,
  FaUserFriends,
} from "react-icons/fa";
import Modal, { ToggleSwitch } from "./Modal";

// Stat card moved here from Home.jsx
function StatCard({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center">
      {React.cloneElement(icon, {
        size: 28,
        className: "text-yellow-400 mb-2",
      })}
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

export default function Header({
  user,
  onLogout,
  showProfile,
  onProfileClick,
  onProfileClose,
  showSettings,
  onSettingsClick,
  onSettingsClose,
  soundOn,
  toggleSound,
  musicOn,
  toggleMusic,
  chatOn,
  toggleChat,
  stats,
  onSupport,
  onFeedback,
}) {
  const navigate = useNavigate();
  const gamesPlayed = stats.twoWins + stats.fourWins;
  const winRate = gamesPlayed
    ? Math.round((stats.totalWins / gamesPlayed) * 100)
    : 0;
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
          <button
            onClick={onProfileClick}
            className="
              relative -mt-2 -mb-2 w-9 h-9
              ring-offset-1 ring-offset-blue-800
              rounded-md overflow-hidden
              hover:ring-2 hover:ring-white
              transition
            "
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
          </button>
          <span className="font-semibold">{user?.username}</span>
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

      {/* Profile Modal */}
      {showProfile && (
        <Modal
          show={showProfile}
          title="Player Profile"
          onClose={onProfileClose}
          footer={[
            {
              label: "Full Profile",
              variant: "secondary",
              onClick: () => {
                onProfileClose();
                navigate("/profile");
              },
            },
          ]}
        >
          <div className="flex flex-col items-center space-y-2 mb-6">
            <img
              src={user.avatarUrl || "/default-avatar.png"}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-white shadow-md"
              loading="lazy"
              decoding="async"
            />
            <h2 className="text-2xl font-bold text-gray-800">
              {user.username}
            </h2>
            <button className="text-sm text-blue-500 hover:underline">
              Change Avatar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 text-center">
            <StatCard
              icon={<FaTrophy />}
              label="Total Wins"
              value={stats.totalWins}
            />
            <StatCard
              icon={<FaUsers />}
              label="2-Player Wins"
              value={stats.twoWins}
            />
            <StatCard
              icon={<FaUserFriends />}
              label="4-Player Wins"
              value={stats.fourWins}
            />
            <div />
          </div>

          <div className="mt-6">
            <p className="text-center font-medium">
              Win Rate: <span className="text-green-400">{winRate}%</span>
            </p>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-green-400"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
        </Modal>
      )}

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
