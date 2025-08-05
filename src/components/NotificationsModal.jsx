import React from "react";
import Modal from "./Modal";

export default function NotificationsModal({ show, onClose, notifications }) {
  return (
    <Modal show={show} onClose={onClose} title="Notifications" footer={null}>
      <ul className="space-y-2 max-h-65 overflow-y-auto">
        {notifications.length === 0 && (
          <li className="text-center text-gray-500">No notifications</li>
        )}
        {notifications.map((n) => (
          <li key={n._id} className="border-b last:border-b-0 pb-2">
            <div>{n.message}</div>
            <div className="text-xs text-gray-400">
              {new Date(n.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
