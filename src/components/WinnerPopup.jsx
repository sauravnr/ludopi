// src/components/WinnerPopup.jsx

import React from "react";
import Modal from "./Modal"; // ← import the new Modal component
import "../styles/modal.css"; // ← ensure Modal’s CSS is loaded

// Utility to turn 1 → "1st", 2 → "2nd", etc.
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function WinnerPopup({
  place,
  name,
  winners, // array of { playerId, name, place }
  isFinal, // boolean: if true, this popup should NOT be closable
  onClose, // invoked when user clicks “✕” (ignored if isFinal)
  onLobby, // always invoked when user clicks “Lobby”
}) {
  // Determine title text
  const titleText = isFinal ? "Final" : "Nice!";

  // Build the array of lines we want to show:
  // – if `winners` is passed, show all of them
  // – otherwise show just one {name, place}
  const renderContent = () => {
    if (winners && winners.length > 0) {
      return winners.map((w) => (
        <p key={w.playerId} className="mt-2 text-xl text-gray-800 font-medium">
          <strong>{w.name}</strong> finished <em>{ordinal(w.place)}</em>!
        </p>
      ));
    } else {
      return (
        <>
          <div className="text-6xl font-bold text-yellow-500">
            {ordinal(place)}
          </div>
          <p className="mt-2 text-2xl text-blue-600 font-semibold">
            <strong>{name}</strong> finished <em>{ordinal(place)}</em>!
          </p>
        </>
      );
    }
  };

  // Footer: always show a “Lobby” button; optionally show a “Close” button if not final.
  // But since Modal already renders “✕” at top, we only need “Lobby” down below.
  const footerButtons = [
    {
      label: "Lobby",
      onClick: onLobby,
      variant: "secondary", // or “primary” if you prefer
    },
  ];

  return (
    <Modal
      show={true}
      title={titleText}
      closable={!isFinal}
      onClose={onClose}
      footer={footerButtons}
      width="sm"
    >
      {renderContent()}
    </Modal>
  );
}
