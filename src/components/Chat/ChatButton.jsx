// src/components/Chat/ChatButton.jsx
import React from "react";
import { useChat } from "./ChatProvider";

export default function ChatButton() {
  const { openChat } = useChat();
  return (
    <button
      onClick={openChat}
      className="absolute bottom-4 left-4 p-2 bg-white rounded-full shadow-md"
      title="Open chat"
    >
      💬
    </button>
  );
}
