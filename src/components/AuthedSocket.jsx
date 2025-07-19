// src/components/AuthedSocket.jsx
import React, { Suspense, lazy } from "react";
import { useAuth } from "../context/AuthContext";

const LazySocketProvider = lazy(() =>
  import("../context/SocketContext").then((m) => ({
    default: m.SocketProvider,
  }))
);

export default function AuthedSocket({ children }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  return (
    <Suspense fallback={null}>
      <LazySocketProvider>{children}</LazySocketProvider>
    </Suspense>
  );
}
