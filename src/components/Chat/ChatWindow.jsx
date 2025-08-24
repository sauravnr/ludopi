// src/components/Chat/ChatWindow.jsx
import React, { useState } from "react";
import { useChat } from "./ChatProvider";

export default function ChatWindow() {
  const { messages, sendMessage, isOpen, closeChat } = useChat();
  const [draft, setDraft] = useState("");

  if (!isOpen) return null;

  const onSend = () => {
    if (!draft.trim()) return;
    sendMessage(draft.trim());
    setDraft("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-80 h-96 rounded-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b">
          <h2 className="font-semibold text-black">Chat</h2>
          <button
            onClick={closeChat}
            className="text-xl leading-none text-black"
          >
            ✕
          </button>
        </div>

        {/* Message list */}
        <div className="flex-1 p-2 overflow-auto bg-gray-50">
          {messages.map((m, i) => (
            <div key={m.id || i} className="mb-1 flex items-center">
              <span className="font-bold text-black">{m.name}</span>
              <span className="text-black">: {m.text}</span>
              {m.status === "pending" && (
                <span className="text-gray-500 text-xs ml-1">(sending…)</span>
              )}
              {m.status === "failed" && (
                <span className="text-red-500 text-xs ml-1">(failed)</span>
              )}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="p-2 border-t flex">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="Type a message…"
            className="flex-1 p-1 border rounded text-black placeholder-gray-500"
          />
          <button
            onClick={onSend}
            className="ml-2 px-3 py-1 bg-blue-500 text-white rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
