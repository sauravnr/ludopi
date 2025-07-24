import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, piLogin } = useAuth();
  const nav = useNavigate();
  const showAlert = useAlert();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      nav("/"); // redirect to home
    } catch (e) {
      showAlert(e.response?.data?.message || "Login failed", "error");
    }
  };
  // Pi Browser submit
  const handlePi = () => {
    const ua = navigator.userAgent || "";
    const isPiBrowser = ua.includes("PiBrowser");

    if (!window.Pi || !isPiBrowser) {
      showAlert(
        "Please open this page in your Pi Browser to login with Pi.",
        "error"
      );
      return;
    }

    // Now we know we’re in Pi Browser and Pi.init() has run
    Pi.authenticate([], () => {})
      .then((auth) => piLogin(auth.accessToken))
      .then(() => navigate("/"))
      .catch((err) => {
        console.error("Pi login failed", err);
        showAlert("Pi login failed", "error");
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cosmic p-4">
      <div className="w-full max-w-sm bg-[#fff8e6] border border-[#e0c08b] rounded-2xl shadow-[0_3px_0_#c7994a,0_8px_2px_rgba(0,0,0,0.5)] text-gray-900 p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Login</h2>

        {/* ——— Email / Password Form ——— */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="w-full btn btn-primary">Login</button>
        </form>

        {/* ——— OR separator ——— */}
        <div className="text-center text-gray-500">OR</div>

        {/* ——— Pi Button ——— */}
        <button
          type="button"
          onClick={handlePi}
          className="w-full btn btn-yellow"
        >
          Login with Pi Network
        </button>

        <p className="text-center">
          No account?{" "}
          <Link to="/register" className="underline text-blue-600">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
