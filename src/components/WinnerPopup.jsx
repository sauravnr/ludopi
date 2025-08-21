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
    if (place === 1) return "w-14 h-14";
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
        <div
          className="
    absolute inset-x-0 top-[-57px] h-44 -z-10
    bg-gradient-to-b from-purple-500 to-purple-600
    rounded-b-2xl
    border-x border-b border-[#d4af37]
    shadow-[0_3px_0_#d4af37,0_3px_4px_rgba(0,0,0,0.35)]
  "
        />
        <img
          src="/icons/winner.png"
          alt="Winner"
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-60"
        />
        {champion && (
          <div
            className="-mt-4 flex items-center gap-4 bg-gradient-to-b from-amber-50 to-amber-100 
             px-4 py-2 rounded-2xl shadow-[0_3px_0_#d4af37,0_1px_4px_rgba(0,0,0,0.2)] mx-4"
          >
            <img
              src={getIcon(champion.place)}
              alt=""
              className={getBadgeSize(champion.place)}
            />
            <img
              src={champion.avatarUrl || "/default-avatar.png"}
              alt={champion.name}
              className="w-14 h-14 rounded-lg object-cover border-2 border-white shadow"
            />
            <span className="text-xl text-gray-800 font-medium">
              {champion.name}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-4 mt-9">
          {others.map((w) => (
            <div
              key={w.playerId}
              className="flex items-center gap-4 bg-gradient-to-b from-amber-50 to-amber-100 
             px-5 py-3 rounded-2xl shadow-[0_3px_0_#d4af37,0_1px_4px_rgba(0,0,0,0.2)] mx-4"
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
