import React, { useState, lazy, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";

const Users = lazy(() => import("../components/Admin/Users"));
const RoomActivity = lazy(() => import("../components/Admin/RoomActivity"));
const PipBalances = lazy(() => import("../components/Admin/PipBalances"));
const PipWithdrawals = lazy(() => import("../components/Admin/PipWithdrawals"));
const Messages = lazy(() => import("../components/Admin/Messages"));
const AdminLogs = lazy(() => import("../components/Admin/Logs"));

export default function AdminDashboard() {
  const { player } = useAuth();
  const [tab, setTab] = useState("users");

  if (!player || player.role !== "admin") {
    return <div className="p-4">Not authorized.</div>;
  }

  const renderTab = () => {
    const Component = (() => {
      switch (tab) {
        case "rooms":
          return RoomActivity;
        case "balances":
          return PipBalances;
        case "withdrawals":
          return PipWithdrawals;
        case "messages":
          return Messages;
        case "logs":
          return AdminLogs;
        default:
          return Users;
      }
    })();
    return (
      <Suspense fallback={<Loader />}>
        <Component />
      </Suspense>
    );
  };
  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <nav className="flex gap-4 border-b pb-2 overflow-x-auto whitespace-nowrap">
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
        <button
          className={tab === "messages" ? "font-semibold" : ""}
          onClick={() => setTab("messages")}
        >
          Messages
        </button>
        <button
          className={tab === "logs" ? "font-semibold" : ""}
          onClick={() => setTab("logs")}
        >
          Logs
        </button>
      </nav>
      {renderTab()}
    </div>
  );
}
