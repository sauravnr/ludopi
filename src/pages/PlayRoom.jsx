// src/pages/PlayRoom.jsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import LudoCanvas from "../components/LudoCanvas";
import WinnerPopup from "../components/WinnerPopup";
import { ChatProvider } from "../components/Chat/ChatProvider";
import ChatButton from "../components/Chat/ChatButton";
import ChatWindow from "../components/Chat/ChatWindow";
import Loader from "../components/Loader";
import { useAlert } from "../context/AlertContext";

const PlayRoom = () => {
  const { user, loading } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const location = useLocation();
  const showAlert = useAlert();

  // when the server “player-list” event arrives.
  const [mode, setMode] = useState(
    (location.state?.mode || "2P").toUpperCase()
  );

  // ─── State Hooks ───────────────────────────────────────────────────────
  // Start with whatever list of players was passed if we just navigated from GameRoom,
  // or empty until we hear back from socket.emit("player-list").
  const [players, setPlayers] = useState(location.state?.players || []);
  // Keep a ref so that our onDice listener always sees the latest `players`.
  const playersRef = useRef(players);

  const [playerColor, setPlayerColor] = useState(null);
  const [currentTurnColor, setCurrentTurnColor] = useState(null);

  // ALL finishers in order: array of { playerId, name, place }
  const [allFinishers, setAllFinishers] = useState([]);

  // The “most recent finisher” for 4P intermediate popups.
  const [currentFinish, setCurrentFinish] = useState(null);

  // Once the game is over (2P after 1st, 4P after 3rd), block further moves
  const [gameOver, setGameOver] = useState(false);

  const [rejoinMsg, setRejoinMsg] = useState(null);
  const [botEnabled, setBotEnabled] = useState(false);

  const toggleBot = () => {
    const next = !botEnabled;
    setBotEnabled(next);
    socket.emit("bot-toggle", {
      roomCode,
      color: playerColor,
      enabled: next,
    });
  };

  // Only show the board once we know our color and have >0 players
  const isReady = Boolean(playerColor && players.length > 0);

  // Keep playersRef in sync with players state
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Show loading spinner/text while AuthContext is loading
  if (loading) {
    return <Loader />;
  }

  // ─── On mount: connect + join-room ──────────────────────────────────────
  useEffect(() => {
    if (loading) return; // don’t connect until user is known

    let timeoutId;

    const onAuthFail = (err) => {
      console.error("Socket auth failed in PlayRoom:", err.message);
      showAlert("Authentication failed. Redirecting to home.", "error");
      navigate("/");
    };

    const sendJoin = () => {
      socket.emit("join-room", { roomCode, mode });
    };

    const doJoin = async () => {
      if (!socket.connected) {
        socket.once("connect_error", onAuthFail);
        socket.once("connect", sendJoin);
      } else {
        sendJoin();
      }
    };
    doJoin();

    // If no color after 5s, alert user
    timeoutId = setTimeout(() => {
      if (!playerColor) {
        showAlert(
          "Could not connect to game server. Please try again later.",
          "error"
        );
      }
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      socket.off("connect_error", onAuthFail);
      if (!sessionStorage.getItem("navigatingToRoom") && socket.connected) {
        socket.emit("leave-room", { roomCode });
      }
      socket.off("connect", sendJoin);
    };
  }, [loading, roomCode, mode, playerColor, navigate]);

  useEffect(() => {
    // Now the server emits { players: [...], mode: "2P"|"4P" }
    const onList = ({
      players: updatedPlayers,
      mode: serverMode,
      botActive,
    }) => {
      const transformed = updatedPlayers.map((p) => ({
        playerId: p.userId,
        name: p.username,
        color: p.color,
        offline: p.offline,
        bot: botActive ? botActive[p.color] : false,
      }));
      setPlayers(transformed);

      //  whenever the server sends back its mode, overwrite our state
      setMode(serverMode.toUpperCase());

      // Once we see our own color, mark ourselves ready
      const me = transformed.find((p) => p.playerId === user._id);
      if (me?.color) {
        setPlayerColor(me.color);
        if (botActive) {
          setBotEnabled(Boolean(botActive[me.color]));
        }
        if (!location.state?.players) {
          setRejoinMsg("✅ Reconnected to your game.");
          setTimeout(() => setRejoinMsg(null), 3000);
        }
      }
    };

    const onTurn = ({ currentTurnColor }) => {
      setCurrentTurnColor(currentTurnColor);
    };

    socket.on("player-list", onList);
    socket.on("turn-change", onTurn);
    const onSync = ({ finishOrder }) => {
      if (Array.isArray(finishOrder)) {
        finishOrder.forEach((c) => handleFinish(c));
      }
    };
    socket.on("state-sync", onSync);

    return () => {
      socket.off("player-list", onList);
      socket.off("turn-change", onTurn);
      socket.off("state-sync", onSync);
    };
  }, [user, location.state]);

  // ─── “simulateFinishViaServer” helper (for console testing) ─────────
  useEffect(() => {
    window.simulateFinishViaServer = (color) => {
      socket.emit("simulate-finish", { color });
    };
    return () => {
      delete window.simulateFinishViaServer;
    };
  }, [socket]);

  // ─── Extracted helper to simulate “player color just finished all tokens” ──
  const handleFinish = (color) => {
    // If game is already over, do nothing
    if (gameOver) {
      return;
    }

    // Use playersRef.current so we always see the latest list
    const justFinished = playersRef.current.find((p) => p.color === color);
    if (!justFinished) {
      return;
    }

    if (mode === "2P") {
      // ───── 2P: as soon as someone finishes, the game ends ─────
      const firstObj = {
        playerId: justFinished.playerId,
        name: justFinished.name,
        place: 1,
      };

      // The “other” (only other) is 2nd
      const other = playersRef.current.find((p) => p.color !== color);
      const secondObj = other
        ? {
            playerId: other.playerId,
            name: other.name,
            place: 2,
          }
        : null;

      const newFinishers = secondObj ? [firstObj, secondObj] : [firstObj];
      setAllFinishers(newFinishers);

      // Block further moves/rolls
      setGameOver(true);
      // We don’t need currentFinish in 2P
      setCurrentFinish(null);
      return;
    }

    // ───── 4P: push one finisher at a time ─────
    setAllFinishers((prev) => {
      const place = prev.length + 1;
      const finObj = {
        playerId: justFinished.playerId,
        name: justFinished.name,
        place,
      };
      // Show intermediate popup for place 1 or 2
      setCurrentFinish(finObj);

      // If third finishes, block 4th
      if (place === 3) {
        setGameOver(true);
      }

      return [...prev, finObj];
    });
  };

  // ─── Listen for “dice-rolled-broadcast” from server ────────────────────
  useEffect(() => {
    const onDiceBroadcast = ({ color, finished }) => {
      if (!finished) return;
      handleFinish(color);
    };

    socket.on("dice-rolled-broadcast", onDiceBroadcast);
    return () => {
      socket.off("dice-rolled-broadcast", onDiceBroadcast);
    };
  }, [mode, gameOver]);

  // ─── 4P: auto-assign the 4th once we have three ─────────────────────────
  useEffect(() => {
    if (mode === "4P" && allFinishers.length === 3) {
      const fourth = playersRef.current.find(
        (p) => !allFinishers.some((f) => f.playerId === p.playerId)
      );
      if (!fourth) return;

      const finObj = {
        playerId: fourth.playerId,
        name: fourth.name,
        place: 4,
      };
      setAllFinishers((prev) => [...prev, finObj]);
      setGameOver(true);
      setCurrentFinish(finObj);
    }
  }, [allFinishers, mode, players]);

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <ChatProvider roomCode={roomCode}>
      <div className="flex flex-col h-full bg-slate-600 relative">
        <h1 className="text-xl font-semibold mb-2">Room Code: {roomCode}</h1>

        {rejoinMsg && (
          <div className="mb-4 bg-green-600 px-4 py-2 rounded-lg text-sm font-medium">
            {rejoinMsg}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center">
          {isReady ? (
            <LudoCanvas
              roomCode={roomCode}
              playerId={user._id}
              playerColor={playerColor}
              players={players}
              currentTurnColor={currentTurnColor}
              gameOver={gameOver} // Block actions once gameOver is true
            />
          ) : (
            <Loader />
          )}
        </div>

        {/* ─── 2P FINAL POPUP (non-closeable) ──────────────────── */}
        {mode === "2P" && allFinishers.length === 2 && (
          <WinnerPopup
            winners={allFinishers}
            isFinal={true} // non-closeable
            onLobby={() => navigate("/")}
          />
        )}

        {/* ─── 4P INTERMEDIATE (1st & 2nd: closable) ─────────────────── */}
        {mode === "4P" &&
          (currentFinish?.place === 1 || currentFinish?.place === 2) && (
            <WinnerPopup
              winners={allFinishers}
              isFinal={false} // still closable for intermediate 1st/2nd
              onClose={() => setCurrentFinish(null)}
              onLobby={() => navigate("/")}
            />
          )}

        {/* ─── 4P FINAL (3rd & 4th: non-closeable) ─────────────────── */}
        {(mode === "4P" && currentFinish?.place === 3) ||
        (mode === "4P" && allFinishers.length === 4) ? (
          <WinnerPopup
            winners={allFinishers}
            isFinal={true} // non-closeable
            onLobby={() => navigate("/")}
          />
        ) : null}

        {/* Chat UI */}
        <button
          onClick={toggleBot}
          className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded"
        >
          {botEnabled ? "Disable Bot" : "Enable Bot"}
        </button>
        <ChatButton />
        <ChatWindow />
      </div>
    </ChatProvider>
  );
};

export default PlayRoom;
