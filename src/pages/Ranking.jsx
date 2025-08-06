import React, { useState, lazy, Suspense } from "react";
import Loader from "../components/Loader";

const CoinsRanking = lazy(() => import("../components/CoinsRanking"));
const TrophiesRanking = lazy(() => import("../components/TrophiesRanking"));
const Leaderboard = lazy(() => import("../components/Leaderboard"));

export default function Ranking() {
  const [activeTab, setActiveTab] = useState("coins");

  const tabs = [
    { key: "coins", label: "Coins" },
    { key: "trophies", label: "Trophies" },
    { key: "leaderboard", label: "Leaderboard" },
  ];

  return (
    <div className="p-4 h-full flex flex-col page-fade">
      <div className="bg-[#fff8e6] border border-[#e0c08b] rounded-2xl shadow-[0_3px_0_#c7994a,0_8px_2px_rgba(0,0,0,0.5)] text-gray-900 p-4 flex flex-col flex-1 overflow-hidden">
        <div className="flex border-b mb-4">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                activeTab === key
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<Loader />}>
            {activeTab === "coins" && <CoinsRanking />}
            {activeTab === "trophies" && <TrophiesRanking />}
            {activeTab === "leaderboard" && <Leaderboard />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
