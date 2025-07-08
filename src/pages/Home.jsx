// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers, FaUserFriends, FaGlobe, FaSignInAlt } from "react-icons/fa";
import Modal from "../components/Modal";
import BetModal from "../components/BetModal";
import api from "../utils/api";
import { useAlert } from "../context/AlertContext";

const MIN_BET = 10;
const MAX_BET = 1000;

const Home = () => {
  const navigate = useNavigate();
  const showAlert = useAlert();
  const [roomCode, setRoomCode] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showBetModal, setShowBetModal] = useState(false);
  const [betError, setBetError] = useState("");
  const [betMode, setBetMode] = useState(null);

  useEffect(() => {
    sessionStorage.removeItem("navigatingToRoom");
  }, []);

  const handleCreateRoom = (mode) => {
    setBetMode(mode);
    setBetError("");
    setShowBetModal(true);
  };

  const confirmCreateRoom = async (amount) => {
    const bet = parseInt(amount, 10);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      setBetError(`Bet must be between ${MIN_BET} and ${MAX_BET}`);
      return;
    }
    try {
      sessionStorage.setItem("navigatingToRoom", "true");
      const { data } = await api.post("/rooms", { mode: betMode, bet });
      navigate(`/room/${data.code}`, {
        state: { mode: betMode, action: "create" },
      });
      setShowBetModal(false);
    } catch (err) {
      console.error("Failed to create room:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Unable to create room right now. Please try again.";
      setBetError(msg);
    }
  };

  const handleJoinRoom = () => {
    const code = roomCode.trim().toUpperCase();
    // only allow exactly 6 alphanumeric characters (A–Z, 0–9). Adjust length as needed.
    const isValidFormat = /^[A-Z0-9]{6}$/.test(code);
    if (!isValidFormat) {
      showAlert("Room code must be 6 letters/numbers.", "error");
      return;
    }
    sessionStorage.setItem("navigatingToRoom", "true");
    navigate(`/room/${code}`, {
      state: { mode: "join" },
    });
    setShowJoinModal(false);
  };

  const handleOnline = () => console.log("Online matchmaking clicked");

  const cards = [
    {
      label: "2 Players",
      icon: FaUsers,
      onClick: () => handleCreateRoom("2P"),
      bg: "bg-gradient-to-br from-teal-400 to-teal-600",
      shadowClass: "shadow-[0px_5px_0px_#16a34a]",
      activeShadowClass: "active:shadow-[0px_2px_0px_#16a34a]",
      borderClass: "border-gray-200/50",
    },
    {
      label: "4 Players",
      icon: FaUserFriends,
      onClick: () => handleCreateRoom("4P"),
      bg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
      shadowClass: "shadow-[0px_5px_0px_#ca8a04]",
      activeShadowClass: "active:shadow-[0px_2px_0px_#ca8a04]",
      borderClass: "border-gray-200/50",
    },
    {
      label: "Online",
      icon: FaGlobe,
      onClick: handleOnline,
      bg: "bg-gradient-to-br from-green-400 to-green-600",
      shadowClass: "shadow-[0px_5px_0px_#16a34a]",
      activeShadowClass: "active:shadow-[0px_2px_0px_#16a34a]",
      borderClass: "border-white/30",
    },
    {
      label: "Join Room",
      icon: FaSignInAlt,
      onClick: () => setShowJoinModal(true),
      bg: "bg-gradient-to-br from-red-400 to-red-600",
      shadowClass: "shadow-[0px_5px_0px_#dc2626]",
      activeShadowClass: "active:shadow-[0px_2px_0px_#dc2626]",
      borderClass: "border-gray-200/50",
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="grid grid-cols-2 gap-8 p-8">
        {cards.map(
          ({
            label,
            icon: Icon,
            onClick,
            bg,
            shadowClass,
            activeShadowClass,
            borderClass,
          }) => (
            <div
              key={label}
              onClick={onClick}
              className={`
                ${bg} ${borderClass} relative rounded-2xl cursor-pointer
                w-32 h-32 flex items-center justify-center
                transition-all duration-100 ease-out filter
                ${shadowClass} ${activeShadowClass}
                active:translate-y-1 active:brightness-75
              `}
            >
              <div className="flex flex-col items-center text-white">
                <Icon size={48} className="mb-1" />
                <span className="text-xl font-bold">{label}</span>
              </div>
            </div>
          )
        )}
      </div>

      {showJoinModal && (
        <Modal
          show={showJoinModal}
          title="Join Room"
          onClose={() => setShowJoinModal(false)}
          footer={[
            { label: "Join Game", variant: "primary", onClick: handleJoinRoom },
            {
              label: "Cancel",
              variant: "secondary",
              onClick: () => setShowJoinModal(false),
            },
          ]}
        >
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter Room Code"
            className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Modal>
      )}

      {showBetModal && (
        <BetModal
          show={showBetModal}
          onClose={() => setShowBetModal(false)}
          onConfirm={confirmCreateRoom}
          minBet={MIN_BET}
          maxBet={MAX_BET}
          error={betError}
        />
      )}
    </div>
  );
};

export default Home;
