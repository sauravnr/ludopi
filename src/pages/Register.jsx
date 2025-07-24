import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { register } = useAuth();
  const nav = useNavigate();
  const showAlert = useAlert();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await register({ username, email, password });
      nav("/");
    } catch (e) {
      showAlert(e.response?.data?.message || "Registration failed", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cosmic p-4">
      <div className="w-full max-w-sm bg-[#fff8e6] border border-[#e0c08b] rounded-2xl shadow-[0_3px_0_#c7994a,0_8px_2px_rgba(0,0,0,0.5)] text-gray-900 p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Create Account</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
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
          <button className="w-full btn btn-secondary">Sign Up</button>
        </form>
        <p className="text-center">
          Have an account?{" "}
          <Link to="/login" className="underline text-blue-600">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
