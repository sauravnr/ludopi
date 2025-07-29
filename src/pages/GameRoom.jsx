// src/pages/GameRoom.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import ContentModal from "../components/ContentModal";
import Modal from "../components/Modal";
import { ClipboardCopy, Share2 } from "lucide-react";
import api from "../utils/api";
import { useAlert } from "../context/AlertContext";

const GameRoom = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const showAlert = useAlert();

  // Instead of reading mode from location.state, ask the server:
  const [mode, setMode] = useState("2P");
  // playerLimit is 2 in "2P" mode, or 4 in "4P" mode
  const playerLimit = mode === "4P" ? 4 : 2;

  const [players, setPlayers] = useState([]);
  const [bet, setBet] = useState(0);
  const [betAgreed, setBetAgreed] = useState(false);
  const [showBetConfirm, setShowBetConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  // ─── Keep a ref to the "latest" players array, so we can read it in start-game
  const playersRef = useRef(players);
  // ─── Whenever `players` state changes, update the ref so we always have “latest” ─────────────────────
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // ─── Cleanup on unload (leave room) ──────────────────────────────────────
  useEffect(() => {
    const onUnload = () => {
      socket.emit("leave-room", { roomCode });
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      if (!sessionStorage.getItem("navigatingToRoom")) {
        socket.emit("leave-room", { roomCode });
      }
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [roomCode]);

  useEffect(() => {
    const handleRateLimit = ({ message }) => {
      showAlert(
        message || "Too many join attempts—try again in a minute.",
        "error"
      );
    };

    // 1) If the server says “players + mode,” update both
    const handlePlayerList = ({ players: list, mode: serverMode, bet: b }) => {
      setPlayers(list);
      setMode(serverMode.toUpperCase()); // always "2P" or "4P"
      if (typeof b === "number") {
        setBet(b);
      }
    };
    const handleRoomNotFound = () => {
      showAlert("Room not found", "error");
      navigate("/");
    };
    const handleRoomFull = () => {
      showAlert("Room full", "error");
      navigate("/");
    };
    const handleStart = () => {
      const currentPlayers = playersRef.current || [];
      const me = currentPlayers.find((p) => p.userId === user._id);
      const myColor = me ? me.color : currentPlayers[0]?.color;
      console.log(
        "handleStart → navigating with players:",
        currentPlayers,
        "my color:",
        myColor
      );
      sessionStorage.setItem("navigatingToRoom", "true");
      navigate(`/play/${roomCode}`, {
        state: { players: currentPlayers, mode: location.state?.mode || "2P" },
      });
    };
    const handleRoomClosed = ({ message }) => {
      showAlert(message || "Host has left—this room is closed.", "error");
      navigate("/");
    };

    socket.on("room-closed", handleRoomClosed);
    socket.on("player-list", handlePlayerList);
    socket.on("room-not-found", handleRoomNotFound);
    socket.on("room-full", handleRoomFull);
    socket.on("start-game", handleStart);
    const handleResume = () => {
      if (!sessionStorage.getItem("navigatingToRoom")) {
        sessionStorage.setItem("navigatingToRoom", "true");
        navigate(`/play/${roomCode}`, {
          state: { players: playersRef.current, mode },
        });
      }
    };
    socket.on("turn-change", handleResume);
    socket.on("start-failed", ({ message }) => {
      showAlert(message || "Unable to start game.", "error");
    });
    socket.on("insufficient-coins", ({ message }) => {
      showAlert(message || "Not enough coins to join this room.", "error");
      navigate("/");
    });
    socket.on("rate-limit", handleRateLimit);

    // If the handshake fails (invalid or missing JWT), show an alert and redirect:
    const onAuthFail = (err) => {
      console.error("Socket auth failed in GameRoom:", err.message);
      showAlert("Authentication failed. Please log in again.", "error");
      navigate("/"); // send them home (or to a login page)
    };

    const fetchAndJoin = async () => {
      let joinMode = location.state?.mode || "2P";
      if (location.state?.mode === "join") {
        try {
          const { data } = await api.get(`/rooms/${roomCode}`);
          joinMode = data.mode.toUpperCase();
          setMode(joinMode);
          setBet(data.bet);
          setPendingMode(joinMode);
          setShowBetConfirm(true);
          return;
        } catch (err) {
          showAlert("Room not found", "error");
          navigate("/");
          return;
        }
      }
      socket.emit("join-room", { roomCode, mode: joinMode });
    };

    if (!socket.connected) {
      socket.once("connect_error", onAuthFail);
      socket.once("connect", fetchAndJoin);
    } else {
      fetchAndJoin();
    }

    return () => {
      socket.off("connect_error", onAuthFail);
      socket.off("room-closed", handleRoomClosed);
      socket.off("player-list", handlePlayerList);
      socket.off("room-not-found", handleRoomNotFound);
      socket.off("room-full", handleRoomFull);
      socket.off("rate-limit", handleRateLimit);
      socket.off("start-game", handleStart);
      socket.off("start-failed");
      socket.off("insufficient-coins");
      socket.off("turn-change", handleResume);
      socket.off("connect", fetchAndJoin);
    };
  }, [roomCode, navigate, user._id]);

  const acceptBet = () => {
    setBetAgreed(true);
    setShowBetConfirm(false);
    socket.emit("join-room", { roomCode, mode: pendingMode || mode });
  };

  const declineBet = () => {
    navigate("/");
  };

  const isHost =
    players[0]?.userId === user._id || location.state?.action === "create";

  const handleStart = () => {
    const currentPlayers = playersRef.current || [];
    const me = currentPlayers.find((p) => p.userId === user._id);
    const myColor = me ? me.color : currentPlayers[0]?.color;
    console.log(
      "handleStart → navigating with players:",
      currentPlayers,
      "myColor:",
      myColor,
      "mode:",
      mode
    );
    sessionStorage.setItem("navigatingToRoom", "true");
    navigate(`/play/${roomCode}`, {
      state: {
        players: currentPlayers,
        mode, // ← this is now always “2P” or “4P” from the server
      },
    });
  };

  return (
    <div className="flex-1 p-4">
      <ContentModal title="Game Room" width="lg">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Room Code & Actions */}
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full
                   bg-[#eeebe3] border rounded-xl p-4"
          >
            {/* code label + value */}
            <div className="flex items-baseline space-x-2 mb-2 sm:mb-0">
              <span className="text-lg font-semibold">Room Code:</span>
              <span className="text-2xl font-mono text-[#ffae33]">
                {roomCode}
              </span>
            </div>
            <div className="flex items-baseline space-x-2 mb-2 sm:mb-0">
              <span className="text-lg font-semibold">Entry:</span>
              <span className="text-xl font-mono text-green-600">{bet}</span>
            </div>

            {/* copy + share */}
            <div className="flex flex-wrap gap-2 mt-4 sm:justify-end">
              <button
                onClick={() => navigator.clipboard.writeText(roomCode)}
                className="flex items-center px-2 py-1.5 rounded-lg border-none hover:brightness-110 btn-yellow"
              >
                <ClipboardCopy className="w-5 h-5 mr-1" />
                Copy
              </button>
              <button
                onClick={() =>
                  navigator.share?.({
                    title: "Join my game",
                    url: window.location.href,
                  })
                }
                className="flex items-center px-2 py-1.5 rounded-lg border-none hover:brightness-110 btn-primary"
              >
                <Share2 className="w-5 h-5 mr-1" />
                Share
              </button>
            </div>
          </div>

          {/* Players List */}
          <div>
            <h2 className="text-xl font-semibold mb-3">
              Players ({players.length}/{playerLimit})
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {players.map((p) => (
                <li
                  key={p.userId}
                  className="flex items-center gap-3 bg-[#eeebe3] border rounded-xl p-3"
                >
                  {/* colored dot or avatar */}
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {/* show the real username */}
                  <span className="font-medium text-gray-800">
                    {p.username}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Start / Waiting */}
          <div className="text-center">
            {players.length === playerLimit && isHost ? (
              <button
                onClick={() => socket.emit("start-game")}
                className=" btn btn-secondary"
              >
                Start Game
              </button>
            ) : (
              <p className="italic text-gray-500">
                Waiting for players… ({players.length}/{playerLimit})
              </p>
            )}
          </div>
        </div>
      </ContentModal>
      {showBetConfirm && (
        <Modal
          show={showBetConfirm}
          title="Join Room"
          closable={false}
          onClose={declineBet}
          footer={[
            { label: "Accept", variant: "secondary", onClick: acceptBet },
            { label: "Decline", variant: "primary", onClick: declineBet },
          ]}
        >
          <p className="text-center">
            Entry amount is {bet} coins. Do you accept?
          </p>
        </Modal>
      )}
    </div>
  );
};

export default GameRoom;
