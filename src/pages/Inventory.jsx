import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const tabs = [
  { key: "dice", label: "Dice", icon: "/inventory-icons/dice.png" },
  { key: "frame", label: "Frame", icon: "/inventory-icons/frame.png" },
  { key: "emoji", label: "Emoji", icon: "/inventory-icons/emoji.png" },
  { key: "board", label: "Board", icon: "/inventory-icons/board.png" },
  { key: "token", label: "Token", icon: "/inventory-icons/token.png" },
];

const Inventory = () => {
  const [activeTab, setActiveTab] = useState("dice");
  const { player, setPlayer } = useAuth();
  const [loading, setLoading] = useState(null);

  const selectDesign = async (id) => {
    setLoading(id);
    try {
      const { data } = await api.patch("/player/dice/design", { designId: id });
      setPlayer(data.player);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="bg-[#fff8e6] border border-[#e0c08b] rounded-2xl shadow-[0_3px_0_#c7994a,0_8px_2px_rgba(0,0,0,0.5)] text-gray-900 p-6 flex flex-col flex-1 overflow-hidden">
        <div className="flex justify-around border-b mb-4">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 flex flex-col items-center transition-colors ${
                activeTab === key
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <img src={icon} alt={label} className="w-8 h-8 mb-1" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {activeTab === "dice" && (
            <div className="p-4 space-y-4">
              {(player?.ownedDiceDesigns || []).map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between bg-white p-4 rounded shadow"
                >
                  <img
                    src={`/dice/${id}/idle-256.png`}
                    alt={id}
                    className="w-12 h-12"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                  <button
                    disabled={loading === id || player?.diceDesign === id}
                    onClick={() => selectDesign(id)}
                    className="bg-green-500 text-white px-3 py-1 rounded"
                  >
                    {player?.diceDesign === id ? "Selected" : "Use"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {activeTab === "frame" && (
            <div className="p-4">Your frames collection goes here.</div>
          )}
          {activeTab === "emoji" && (
            <div className="p-4">Your emojis collection goes here.</div>
          )}
          {activeTab === "board" && (
            <div className="p-4">Your boards collection goes here.</div>
          )}
          {activeTab === "token" && (
            <div className="p-4">Your tokens collection goes here.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
