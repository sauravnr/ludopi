import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { login, piLogin } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      nav("/"); // redirect to home
    } catch (e) {
      setErr(e.response?.data?.message || "Login failed");
    }
  };
  // Pi Browser submit
  const handlePi = () => {
    const ua = navigator.userAgent || "";
    const isPiBrowser = ua.includes("PiBrowser");

    if (!window.Pi || !isPiBrowser) {
      alert("Please open this page in your Pi Browser to login with Pi.");
      return;
    }

    // Now we know we’re in Pi Browser and Pi.init() has run
    Pi.authenticate([], () => {})
      .then((auth) => piLogin(auth.accessToken))
      .then(() => navigate("/"))
      .catch((err) => {
        console.error("Pi login failed", err);
        setErr("Pi login failed");
      });
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded text-black shadow">
      <h2 className="text-xl mb-4">Login</h2>
      {err && <p className="text-red-500">{err}</p>}

      {/* ——— Email / Password Form ——— */}
      <form onSubmit={submit}>
        <label>Email</label>
        <input
          className="w-full p-2 border rounded mb-4"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          className="w-full p-2 border rounded mb-4"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full p-2 bg-blue-600 text-white rounded">
          Login
        </button>
      </form>

      {/* ——— OR separator ——— */}
      <div className="my-6 text-center text-gray-500">OR</div>

      {/* ——— Pi Button ——— */}
      <button
        type="button"
        onClick={handlePi}
        className="w-full p-2 bg-yellow-500 text-black rounded"
      >
        Login with Pi Network
      </button>

      <p className="mt-4 text-center">
        No account?{" "}
        <Link to="/register" className="text-blue-600">
          Sign up
        </Link>
      </p>
    </div>
  );
}
