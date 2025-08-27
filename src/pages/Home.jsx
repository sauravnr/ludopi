// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import BetModal from "../components/BetModal";
import NotificationsModal from "../components/NotificationsModal";
import WheelModal from "../components/WheelModal";
import api from "../utils/api";
import { useAlert } from "../context/AlertContext";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

const BET_OPTIONS = {
  "2P": [
    { entry: 500, win: 950 },
    { entry: 1000, win: 1900 },
    { entry: 5000, win: 9500 },
    { entry: 10000, win: 19000 },
  ],
  "4P": [
    { entry: 500, win: 1400 },
    { entry: 1000, win: 2800 },
    { entry: 5000, win: 14000 },
    { entry: 10000, win: 28000 },
  ],
};

const HEADER_ICON_BASE =
  "relative w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-100 ease-out filter active:translate-y-1 active:brightness-75 ring-1 ring-inset ring-white/10 border";
const HEADER_ICON_STYLE =
  "bg-gradient-to-br from-teal-400 to-teal-600 border-teal-300/30";

const Home = () => {
  const navigate = useNavigate();
  const showAlert = useAlert();
  const [roomCode, setRoomCode] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showBetModal, setShowBetModal] = useState(false);
  const [betError, setBetError] = useState("");
  const [betMode, setBetMode] = useState(null);
  const {
    notifications,
    notifCount: notificationCount,
    clearNotifications,
  } = useNotifications();
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [prize, setPrize] = useState(null);
  const { player, setPlayer } = useAuth();
  const [wheelResetAt, setWheelResetAt] = useState(null);
  const [timeUntilSpin, setTimeUntilSpin] = useState("");
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem("navigatingToRoom");
    const fetchStatus = async () => {
      try {
        const { data } = await api.get("/wheel/status");
        setWheelResetAt(data.resetAt);
      } catch (err) {
        console.error("Failed to get wheel status:", err);
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      if (!wheelResetAt) {
        setTimeUntilSpin("");
        return;
      }
      const diff = new Date(wheelResetAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeUntilSpin("0:00");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const hStr = hours > 0 ? `${hours}:` : "";
      const mStr = String(minutes).padStart(2, "0");
      const sStr = String(seconds).padStart(2, "0");
      setTimeUntilSpin(`${hStr}${mStr}:${sStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [wheelResetAt]);

  const handleCreateRoom = (mode) => {
    setBetMode(mode);
    setBetError("");
    setShowBetModal(true);
  };

  const confirmCreateRoom = async (amount) => {
    const bet = parseInt(amount, 10);
    const valid = BET_OPTIONS[betMode]?.some((o) => o.entry === bet);
    if (!valid) {
      setBetError("Invalid entry amount");
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

  const handlePurchaseVip = async () => {
    if (vipLoading || player?.isVip) return;
    try {
      setVipLoading(true);
      await api.post("/vip/purchase");
      setPlayer((prev) => ({ ...prev, isVip: true }));
      showAlert("VIP membership activated!", "success");
      setShowVipModal(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Unable to purchase VIP right now.";
      showAlert(msg, "error");
    } finally {
      setVipLoading(false);
    }
  };

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
    <div className="flex-1 flex flex-col items-center px-4">
      <div className="w-full flex justify-between mt-4 mb-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowWheelModal(true)}
              className={`${HEADER_ICON_BASE} ${HEADER_ICON_STYLE}`}
              aria-label="Spin Wheel"
            >
              <div className="absolute inset-0 bg-white/5 rounded-xl pointer-events-none" />
              <img
                src="/icons/wheelicon.png"
                alt="Spin"
                className="w-7 h-7 z-5"
              />
            </button>
            {timeUntilSpin && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center bg-gray-800 rounded-full px-2 py-0.5 gap-1 w-[60px]">
                <span className="text-[7px] font-semibold font-mono tabular-nums">
                  {timeUntilSpin}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowVipModal(true)}
            className={`${HEADER_ICON_BASE} ${HEADER_ICON_STYLE}`}
            aria-label="VIP"
          >
            <div className="absolute inset-0 bg-white/5 rounded-xl pointer-events-none" />
            <img src="/icons/vip.png" alt="VIP" className="w-7 h-7 z-5" />
          </button>
          <span
            className={`text-[10px] font-semibold ${
              player?.isVip ? "text-yellow-300" : "text-gray-300"
            }`}
          >
            {player?.isVip ? "Active" : "Get VIP"}
          </span>
        </div>

        <button
          onClick={() => {
            clearNotifications();
            setShowNotifModal(true);
          }}
          className={`${HEADER_ICON_BASE} ${HEADER_ICON_STYLE}`}
          aria-label="Notifications"
        >
          <div className="absolute inset-0 bg-white/5 rounded-xl pointer-events-none" />
          <img
            src="/icons/notification.png"
            alt="Notifications"
            className="w-7 h-7 z-5"
          />
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notificationCount >= 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>
      </div>

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
                <img src={iconSrc} alt={label} className="mb-2 w-16 h-16" />
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
          width="sm"
          footer={[
            { label: "Join Game", variant: "primary", onClick: handleJoinRoom },
          ]}
        >
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter Room Code"
            className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none"
          />
        </Modal>
      )}

      {showBetModal && (
        <BetModal
          show={showBetModal}
          onClose={() => setShowBetModal(false)}
          onConfirm={confirmCreateRoom}
          options={BET_OPTIONS[betMode] || []}
          error={betError}
          mode={betMode}
        />
      )}

      {showNotifModal && (
        <NotificationsModal
          show={showNotifModal}
          onClose={() => setShowNotifModal(false)}
          notifications={notifications}
        />
      )}

      {showVipModal && (
        <Modal
          show={showVipModal}
          onClose={() => setShowVipModal(false)}
          title="VIP Membership"
          width="sm"
          footer={
            player?.isVip
              ? null
              : [
                  {
                    label: vipLoading ? "Processing..." : "Purchase",
                    variant: "primary",
                    onClick: handlePurchaseVip,
                  },
                ]
          }
        >
          {player?.isVip ? (
            <p className="text-center">You are already a VIP member.</p>
          ) : (
            <p className="text-center">
              Unlock exclusive features with a VIP membership.
            </p>
          )}
        </Modal>
      )}

      {showWheelModal && (
        <WheelModal
          show={showWheelModal}
          onClose={() => setShowWheelModal(false)}
          onResult={(p, balance, remaining, reset) => {
            setShowWheelModal(false);
            setPrize(p);
            setShowPrizeModal(true);
            setPlayer((prev) => ({ ...prev, coins: balance }));
            if (reset) setWheelResetAt(reset);
          }}
        />
      )}

      {showPrizeModal && (
        <Modal
          show={showPrizeModal}
          onClose={() => setShowPrizeModal(false)}
          title={null}
          footer={null}
          width="sm"
        >
          <div className="text-center">
            <p className="text-lg font-bold mb-2">You won {prize} coins!</p>
            <div className="flex justify-center items-center gap-2">
              <img src="/icons/coin.png" alt="coin" className="w-6 h-6" />
              <span className="text-xl font-semibold">{prize}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Home;
