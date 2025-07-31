// src/pages/Friends.jsx
import React, { useState, lazy, Suspense } from "react";
import Loader from "../components/Loader";

const FriendsList = lazy(() => import("../components/FriendList"));
const ChatList = lazy(() => import("../components/ChatList"));
const ChatWindow = lazy(() => import("../components/ChatWindow"));
const RequestsList = lazy(() => import("../components/RequestsList"));

export default function Friends() {
  const [activeTab, setActiveTab] = useState("friends");
  // either `null` (show chat‐list) or a full `{ id, username, avatarUrl }`
  const [selectedUser, setSelectedUser] = useState(null);

  const tabs = [
    { key: "friends", label: "Friends" },
    { key: "chat", label: "Chat" },
    { key: "requests", label: "Requests" },
  ];

  return (
    <div className="p-4 h-full flex flex-col page-fade">
      <div
        className="
          bg-[#fff8e6] border border-[#e0c08b] rounded-2xl
          shadow-[0_3px_0_#c7994a,0_8px_2px_rgba(0,0,0,0.5)]
          text-gray-900 p-6 flex flex-col flex-1 overflow-hidden
        "
      >
        {/* Tab headers */}
        <div className="flex border-b mb-4">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setSelectedUser(null);
              }}
              className={`
                flex-1 py-2 text-center font-medium transition-colors
                ${
                  activeTab === key
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex">
          <Suspense fallback={<Loader />}>
            {activeTab === "friends" && (
              <FriendsList
                onMessageClick={(user) => {
                  setSelectedUser(user);
                  setActiveTab("chat");
                }}
              />
            )}

            {activeTab === "chat" && !selectedUser && (
              <ChatList onSelect={(user) => setSelectedUser(user)} />
            )}

            {activeTab === "chat" && selectedUser && (
              <ChatWindow
                user={selectedUser}
                onBack={() => setSelectedUser(null)}
              />
            )}

            {activeTab === "requests" && <RequestsList />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
