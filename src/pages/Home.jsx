// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
      iconSrc: "/icons/2players-128.png",
      onClick: () => handleCreateRoom("2P"),
      bg: "bg-gradient-to-br from-teal-400 to-teal-600",
      shadowClass: "shadow-[0_5px_0_#0f766e]",
      activeShadowClass: "active:shadow-[0_2px_0_#0f766e]",
      borderClass: "border-teal-300/30 ring-1 ring-inset ring-white/10",
    },
    {
      label: "4 Players",
      iconSrc: "/icons/4players-128.png",
      onClick: () => handleCreateRoom("4P"),
      bg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
      shadowClass: "shadow-[0_5px_0_#a16207]",
      activeShadowClass: "active:shadow-[0_2px_0_#a16207]",
      borderClass: "border-yellow-300/30 ring-1 ring-inset ring-white/10",
    },
    {
      label: "Online",
      iconSrc: "/icons/online-128.png",
      onClick: handleOnline,
      bg: "bg-gradient-to-br from-green-400 to-green-600",
      shadowClass: "shadow-[0_5px_0_#15803d]",
      activeShadowClass: "active:shadow-[0_2px_0_#15803d]",
      borderClass: "border-green-300/30 ring-1 ring-inset ring-white/10",
    },
    {
      label: "Join Room",
      iconSrc: "/icons/joinroom-128.png",
      onClick: () => setShowJoinModal(true),
      bg: "bg-gradient-to-br from-red-400 to-red-600",
      shadowClass: "shadow-[0_5px_0_#b91c1c]",
      activeShadowClass: "active:shadow-[0_2px_0_#b91c1c]",
      borderClass: "border-red-300/30 ring-1 ring-inset ring-white/10",
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="grid grid-cols-2 gap-8 p-8">
        {cards.map(
          ({
            label,
            iconSrc,
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
              <div className="absolute inset-0 bg-white/5 rounded-2xl pointer-events-none z-0" />
              <div className="flex flex-col items-center text-white z-10">
                <img src={iconSrc} alt={label} className="mb-1 w-16 h-16" />
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
