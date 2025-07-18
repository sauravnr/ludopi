import React, { useState, lazy, Suspense } from "react";
import Loader from "../components/Loader";

const DiceList = lazy(() => import("../components/Inventory/DiceList"));
const FrameList = lazy(() => import("../components/Inventory/FrameList"));
const TokenList = lazy(() => import("../components/Inventory/TokenList"));
const EmojiList = lazy(() => import("../components/Inventory/EmojiList"));
const BoardList = lazy(() => import("../components/Inventory/BoardList"));

const tabs = [
  { key: "dice", label: "Dice", icon: "/inventory-icons/dice.png" },
  { key: "frame", label: "Frame", icon: "/inventory-icons/frame.png" },
  { key: "emoji", label: "Emoji", icon: "/inventory-icons/emoji.png" },
  { key: "board", label: "Board", icon: "/inventory-icons/board.png" },
  { key: "token", label: "Token", icon: "/inventory-icons/token.png" },
];

const Inventory = () => {
  const [activeTab, setActiveTab] = useState("dice");

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
            <Suspense fallback={<Loader />}>
              <DiceList />
            </Suspense>
          )}
          {activeTab === "frame" && (
            <Suspense fallback={<Loader />}>
              <FrameList />
            </Suspense>
          )}
          {activeTab === "emoji" && (
            <Suspense fallback={<Loader />}>
              <EmojiList />
            </Suspense>
          )}
          {activeTab === "board" && (
            <Suspense fallback={<Loader />}>
              <BoardList />
            </Suspense>
          )}
          {activeTab === "token" && (
            <Suspense fallback={<Loader />}>
              <TokenList />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
