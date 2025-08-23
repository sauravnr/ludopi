// src/pages/PlayRoom.jsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSocket, useSocketStatus } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import LudoCanvas from "../components/LudoCanvas";
import WinnerPopup from "../components/WinnerPopup";
import { ChatProvider } from "../components/Chat/ChatProvider";
import ChatButton from "../components/Chat/ChatButton";
import ChatWindow from "../components/Chat/ChatWindow";
import Loader from "../components/Loader";
import { useAlert } from "../context/AlertContext";

const PlayRoom = () => {
  const { user, player: me, loading, refreshAuth } = useAuth();
  const socket = useSocket();
  const { status, setStatus } = useSocketStatus();
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
  // Store every player seen at game start so winner popup works after forfeits
  const initialAllPlayers = {};
  (location.state?.players || []).forEach((p) => {
    const id = p.userId || p.playerId;
    const name = p.username || p.name;
    const avatarUrl = p.avatarUrl || null;
    const frameDesign = p.frameDesign || null;
    initialAllPlayers[p.color] = { playerId: id, name, avatarUrl, frameDesign };
  });
  const allPlayersRef = useRef(initialAllPlayers);

  const [playerColor, setPlayerColor] = useState(me?.color || null);

  const [currentTurnColor, setCurrentTurnColor] = useState(null);

  // ALL finishers in order: array of { playerId, name, place }
  const [allFinishers, setAllFinishers] = useState([]);

  // The “most recent finisher” for 4P intermediate popups.
  const [currentFinish, setCurrentFinish] = useState(null);

  // Once the game is over (2P after 1st, 4P after 3rd), block further moves
  const [gameOver, setGameOver] = useState(false);

  const [rejoinMsg, setRejoinMsg] = useState(null);
  const [botEnabled, setBotEnabled] = useState(false);

  const joinDataRef = useRef({ roomCode, mode });
  const emitJoin = (payload) => {
    joinDataRef.current = payload;
    socket.emit("join-room", payload);
  };

  useEffect(() => {
    joinDataRef.current = { roomCode, mode };
  }, [roomCode, mode]);

  const toggleBot = () => {
    const next = !botEnabled;
    setBotEnabled(next);
    socket.emit("bot-toggle", {
      roomCode,
      color: playerColor,
      enabled: next,
    });
  };

  const exitGame = () => {
    if (
      window.confirm(
        "Are you sure you want to leave? You will forfeit the game."
      )
    ) {
      sessionStorage.setItem("navigatingToRoom", "true");
      if (!gameOver) {
        socket.emit("forfeit-game", { roomCode });
      } else if (socket.connected) {
        socket.emit("leave-room", { roomCode });
      }
      refreshAuth().finally(() => navigate("/"));
    }
  };

  const goLobby = () => {
    refreshAuth().finally(() => navigate("/"));
  };

  // Only show the board once we know our color and have >0 players
  const isReady = Boolean(playerColor && players.length > 0);

  // Keep playersRef in sync with players state
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

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
      emitJoin({ roomCode, mode });
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

    const handleRoomNotFound = () => {
      showAlert("Room not found", "error");
      navigate("/");
    };
    socket.on("room-not-found", handleRoomNotFound);

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
      socket.off("room-not-found", handleRoomNotFound);
    };
  }, [loading, roomCode, mode, playerColor, navigate, showAlert]);

  // Handle socket connection state
  useEffect(() => {
    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("reconnecting");
    const onAttempt = () => setStatus("reconnecting");
    const onReconnect = () => {
      setStatus("connected");
      emitJoin(joinDataRef.current);
      setRejoinMsg("✅ Reconnected to your game.");
      setTimeout(() => setRejoinMsg(null), 3000);
    };
    const onFailed = () => setStatus("failed");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("reconnect_attempt", onAttempt);
    socket.on("reconnect", onReconnect);
    socket.on("reconnect_failed", onFailed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("reconnect_attempt", onAttempt);
      socket.off("reconnect", onReconnect);
      socket.off("reconnect_failed", onFailed);
    };
  }, [roomCode, mode]);

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
        diceDesign: p.diceDesign || "default",
        tokenDesign: p.tokenDesign || "default",
        avatarUrl: p.avatarUrl || null,
        frameDesign: p.frameDesign || null,
      }));
      setPlayers(transformed);
      // keep track of everyone who has ever been in the room
      transformed.forEach((p) => {
        allPlayersRef.current[p.color] = {
          playerId: p.playerId,
          name: p.name,
          avatarUrl:
            p.avatarUrl || allPlayersRef.current[p.color]?.avatarUrl || null,
          frameDesign:
            p.frameDesign ||
            allPlayersRef.current[p.color]?.frameDesign ||
            null,
        };
      });

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

  // ─── Extracted helper to simulate “player color just finished all tokens” ──
  const handleFinish = (color) => {
    // If game is already over, do nothing
    if (gameOver) {
      return;
    }

    // Use playersRef.current so we always see the latest list
    let justFinished = playersRef.current.find((p) => p.color === color);
    if (!justFinished) {
      const stored = allPlayersRef.current[color];
      if (stored) {
        justFinished = { playerId: stored.playerId, name: stored.name };
      } else {
        return;
      }
    }

    const getAvatar = (id, col) =>
      id === me?.playerId
        ? me.avatarUrl
        : playersRef.current.find((p) => p.playerId === id)?.avatarUrl ||
          allPlayersRef.current[col]?.avatarUrl;

    if (mode === "2P") {
      // ───── 2P: as soon as someone finishes, the game ends ─────
      const firstObj = {
        playerId: justFinished.playerId,
        name: justFinished.name,
        place: 1,
        avatarUrl: getAvatar(justFinished.playerId, color),
      };

      // The “other” (only other) is 2nd
      let other = playersRef.current.find((p) => p.color !== color);
      if (!other) {
        const entry = Object.entries(allPlayersRef.current).find(
          ([c]) => c !== color
        );
        if (entry) {
          const [otherColor, data] = entry;
          other = {
            playerId: data.playerId,
            name: data.name,
            color: otherColor,
          };
        }
      }
      const secondObj = other
        ? {
            playerId: other.playerId,
            name: other.name,
            place: 2,
            avatarUrl: getAvatar(other.playerId, other.color),
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
        avatarUrl: getAvatar(justFinished.playerId, color),
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
    const onDiceBroadcast = ({ color, finished, diceDesign, tokenDesign }) => {
      if (diceDesign || tokenDesign) {
        setPlayers((prev) =>
          prev.map((p) =>
            p.color === color
              ? {
                  ...p,
                  diceDesign: diceDesign || p.diceDesign,
                  tokenDesign: tokenDesign || p.tokenDesign,
                }
              : p
          )
        );
      }
      if (!finished) return;
      handleFinish(color);
    };

    socket.on("dice-rolled-broadcast", onDiceBroadcast);
    return () => {
      socket.off("dice-rolled-broadcast", onDiceBroadcast);
    };
  }, [mode, gameOver, me]);

  // ─── 4P: auto-assign the 4th once we have three ─────────────────────────
  useEffect(() => {
    if (mode === "4P" && allFinishers.length === 3) {
      let fourth = playersRef.current.find(
        (p) => !allFinishers.some((f) => f.playerId === p.playerId)
      );
      let fourthColor = fourth?.color;
      if (!fourth) {
        const remainingEntry = Object.entries(allPlayersRef.current).find(
          ([, ap]) => !allFinishers.some((f) => f.playerId === ap.playerId)
        );
        if (remainingEntry) {
          const [colorKey, data] = remainingEntry;
          fourth = { playerId: data.playerId, name: data.name };
          fourthColor = colorKey;
        }
      }
      if (!fourth) return;

      const finObj = {
        playerId: fourth.playerId,
        name: fourth.name,
        place: 4,
        avatarUrl:
          fourth.playerId === me?.playerId
            ? me.avatarUrl
            : playersRef.current.find((p) => p.playerId === fourth.playerId)
                ?.avatarUrl || allPlayersRef.current[fourthColor]?.avatarUrl,
      };
      setAllFinishers((prev) => [...prev, finObj]);
      setGameOver(true);
      setCurrentFinish(finObj);
    }
  }, [allFinishers, mode, players, me]);

  if (loading) {
    return <Loader />;
  }

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <ChatProvider roomCode={roomCode}>
      <div className="flex flex-col h-full relative bg-cosmic">
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
            onLobby={goLobby}
            mode={mode}
          />
        )}

        {/* ─── 4P INTERMEDIATE (1st & 2nd: closable) ─────────────────── */}
        {mode === "4P" &&
          (currentFinish?.place === 1 || currentFinish?.place === 2) && (
            <WinnerPopup
              winners={allFinishers}
              isFinal={false} // still closable for intermediate 1st/2nd
              onClose={() => setCurrentFinish(null)}
              onLobby={goLobby}
              mode={mode}
            />
          )}

        {/* ─── 4P FINAL (3rd & 4th: non-closeable) ─────────────────── */}
        {(mode === "4P" && currentFinish?.place === 3) ||
        (mode === "4P" && allFinishers.length === 4) ? (
          <WinnerPopup
            winners={allFinishers}
            isFinal={true} // non-closeable
            onLobby={goLobby}
            mode={mode}
          />
        ) : null}

        {/* Chat UI */}
        <button
          onClick={toggleBot}
          className="absolute top-2 right-32 bg-blue-600 text-white px-3 py-1 rounded"
        >
          {botEnabled ? "Disable Bot" : "Enable Bot"}
        </button>
        {!gameOver && players.length > 1 && (
          <button
            onClick={exitGame}
            className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded"
          >
            Exit Game
          </button>
        )}
        <ChatButton />
        <ChatWindow />
        {status !== "connected" && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
            {status === "failed" ? (
              <div className="bg-white p-4 rounded text-center space-y-2">
                <p>Connection lost.</p>
                <button
                  onClick={() => {
                    setStatus("reconnecting");
                    socket.connect();
                  }}
                  className="btn btn-primary"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="bg-white p-4 rounded">Reconnecting…</div>
            )}
          </div>
        )}
      </div>
    </ChatProvider>
  );
};

export default PlayRoom;
