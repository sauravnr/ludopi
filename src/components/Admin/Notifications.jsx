import React, { useState } from "react";
import api from "../../utils/api";
import { useAlert } from "../../context/AlertContext";

export default function Notifications() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const showAlert = useAlert();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    try {
      setSending(true);
      await api.post("/admin/notifications", { message: text });
      showAlert("Notification sent", "success");
      setMessage("");
    } catch (err) {
      console.error("Failed to send notification", err);
      const msg = err?.response?.data?.message || "Failed to send notification";
      showAlert(msg, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 max-w-md">
      <h2 className="text-xl mb-4">Send Notification</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="Notification message"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={sending || !message.trim()}
        >
          {sending ? "Sending..." : "Send to All Users"}
        </button>
      </form>
    </div>
  );
}
