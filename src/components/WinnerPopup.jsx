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
        <div className="flex flex-col gap-4">
          {sorted.map((w) => (
            <div
              key={w.playerId}
              className="flex items-center gap-4 bg-white p-3 rounded-lg shadow-lg"
            >
              <img src={getIcon(w.place)} alt="" className="w-12 h-12" />
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
