import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Users from "../components/Admin/Users";
import RoomActivity from "../components/Admin/RoomActivity";
import PipBalances from "../components/Admin/PipBalances";
import PipWithdrawals from "../components/Admin/PipWithdrawals";

export default function AdminDashboard() {
  const { player } = useAuth();
  const [tab, setTab] = useState("users");

  if (!player || player.role !== "admin") {
    return <div className="p-4">Not authorized.</div>;
  }

  const renderTab = () => {
    switch (tab) {
      case "rooms":
        return <RoomActivity />;
      case "balances":
        return <PipBalances />;
      case "withdrawals":
        return <PipWithdrawals />;
      default:
        return <Users />;
    }
  };
  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <nav className="flex gap-4 border-b pb-2">
        <button
          className={tab === "users" ? "font-semibold" : ""}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          className={tab === "rooms" ? "font-semibold" : ""}
          onClick={() => setTab("rooms")}
        >
          Room Activity
        </button>
        <button
          className={tab === "balances" ? "font-semibold" : ""}
          onClick={() => setTab("balances")}
        >
          PIP Balances
        </button>
        <button
          className={tab === "withdrawals" ? "font-semibold" : ""}
          onClick={() => setTab("withdrawals")}
        >
          Withdrawals
        </button>
      </nav>
      {renderTab()}
    </div>
  );
}
