// src/App.jsx
import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Loader from "./components/Loader";

const Layout = lazy(() => import("./components/Layout"));
import Login from "./pages/Login";
import Register from "./pages/Register";

// lazy-load all of the “inside‐layout” pages:
const Home = lazy(() => import("./pages/Home"));
const GameRoom = lazy(() => import("./pages/GameRoom"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Friends = lazy(() => import("./pages/Friends"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Store = lazy(() => import("./pages/Store"));
const Users = lazy(() => import("./pages/Users"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// these we keep “eager” because they’re full-screen or tiny:
const PlayRoom = lazy(() => import("./pages/PlayRoom"));
const Profile = lazy(() => import("./pages/Profile"));

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? <Outlet /> : <Navigate to="/login" />;
}
function RequireAuthRedirectToOwn() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  // once we know who they are, redirect to /profile/{theirId}
  const actualId = user._id || user.id;
  return <Navigate to={`/profile/${actualId}`} replace />;
}
function RedirectIfAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="w-full max-w-[425px] h-full bg-gray-100 overflow-hidden shadow-2xl flex flex-col relative">
        <Routes>
          {/* public */}
          <Route
            path="/login"
            element={
              <RedirectIfAuth>
                <Login />
              </RedirectIfAuth>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuth>
                <Register />
              </RedirectIfAuth>
            }
          />

          {/* protected */}
          <Route element={<RequireAuth />}>
            <Route
              element={
                <Suspense fallback={<Loader />}>
                  <Layout />
                </Suspense>
              }
            >
              {/* wrap each lazy page in Suspense */}
              <Route
                path="/"
                element={
                  <Suspense fallback={<Loader />}>
                    <Home />
                  </Suspense>
                }
              />
              <Route
                path="/room/:roomCode"
                element={
                  <Suspense fallback={<Loader />}>
                    <GameRoom />
                  </Suspense>
                }
              />
              <Route
                path="/inventory"
                element={
                  <Suspense fallback={<Loader />}>
                    <Inventory />
                  </Suspense>
                }
              />
              <Route
                path="/friends"
                element={
                  <Suspense fallback={<Loader />}>
                    <Friends />
                  </Suspense>
                }
              />
              <Route
                path="/ranking"
                element={
                  <Suspense fallback={<Loader />}>
                    <Ranking />
                  </Suspense>
                }
              />
              <Route
                path="/store"
                element={
                  <Suspense fallback={<Loader />}>
                    <Store />
                  </Suspense>
                }
              />
              <Route
                path="/users"
                element={
                  <Suspense fallback={<Loader />}>
                    <Users />
                  </Suspense>
                }
              />
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<Loader />}>
                    <AdminDashboard />
                  </Suspense>
                }
              />
            </Route>

            {/* full-screen / no chrome (you can also wrap these if you want) */}
            <Route
              path="/play/:roomCode"
              element={
                <Suspense fallback={<Loader />}>
                  <PlayRoom />
                </Suspense>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <Suspense fallback={<Loader />}>
                  <Profile />
                </Suspense>
              }
            />
            {/* if they hit “/profile” with no id, send them to their own */}
            <Route path="/profile" element={<RequireAuthRedirectToOwn />} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}
