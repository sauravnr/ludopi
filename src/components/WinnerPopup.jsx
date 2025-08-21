// src/components/WinnerPopup.jsx

import React from "react";
import Modal from "./Modal";
import "../styles/modal.css";

export default function WinnerPopup({
  winners = [], // array of { playerId, name, place, avatarUrl }
  isFinal,
  onClose,
  onLobby,
  mode,
}) {
  const footerButtons = [
    {
      label: "Lobby",
      onClick: onLobby,
      variant: "secondary",
    },
  ];

  const getIcon = (place) => {
    if (place === 1) return "/icons/first.png";
    if (place === 2)
      return mode === "2P" ? "/icons/second2p.png" : "/icons/second.png";
    if (place === 3) return "/icons/third.png";
    if (place === 4) return "/icons/fourth.png";
    return "";
  };

  const sorted = [...winners].sort((a, b) => a.place - b.place);
  const champion = sorted[0];
  const others = sorted.slice(1);

  const getBadgeSize = (place) => {
    if (place === 1) return "w-16 h-16";
    if (place === 2) return mode === "2P" ? "w-10 h-10" : "w-12 h-12";
    return "w-10 h-10";
  };

  return (
    <Modal
      show={true}
      closable={!isFinal}
      onClose={onClose}
      footer={footerButtons}
      width="md"
    >
      <div className="relative pt-10">
        <img
          src="/icons/winner.png"
          alt="Winner"
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-60"
        />
        {champion && (
          <div className="flex items-center gap-4 mx-4 p-2 rounded-xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 shadow-[0_0_10px_rgba(255,215,0,0.7)]">
            <img
              src={getIcon(champion.place)}
              alt=""
              className={getBadgeSize(champion.place)}
            />
            <img
              src={champion.avatarUrl || "/default-avatar.png"}
              alt={champion.name}
              className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow"
            />
            <span className="text-2xl text-white font-bold">
              {champion.name}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-4 mt-4">
          {others.map((w) => (
            <div
              key={w.playerId}
              className="flex items-center gap-4 bg-white px-5 py-3 rounded-lg shadow-lg mx-4"
            >
              <img
                src={getIcon(w.place)}
                alt=""
                className={getBadgeSize(w.place)}
              />
              <img
                src={w.avatarUrl || "/default-avatar.png"}
                alt={w.name}
                className="w-11 h-11 rounded-lg object-cover border-2 border-white shadow"
              />
              <span className="text-lg text-gray-800 font-medium">
                {w.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
