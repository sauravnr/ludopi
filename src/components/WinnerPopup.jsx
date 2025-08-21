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
      <div className="relative pt-20">
        <img
          src="/icons/winner.png"
          alt="Winner"
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-40"
        />
        <div className="flex flex-col gap-4">
          {sorted.map((w) => (
            <div key={w.playerId} className="flex items-center gap-3">
              <img src={getIcon(w.place)} alt="" className="w-8 h-8" />
              <img
                src={w.avatarUrl || "/default-avatar.png"}
                alt={w.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-xl text-gray-800 font-medium">
                {w.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
