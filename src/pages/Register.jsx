import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { register } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await register({ username, email, password });
      nav("/");
    } catch (e) {
      setErr(e.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow text-black">
      <h2 className="text-xl mb-4">Register</h2>
      {err && <p className="text-red-500">{err}</p>}
      <form onSubmit={submit}>
        <label>Username</label>
        <input
          className="w-full p-2 border rounded mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
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
        <button className="w-full p-2 bg-green-600 text-white rounded">
          Sign Up
        </button>
      </form>
      <p className="mt-4">
        Have an account?{" "}
        <Link to="/login" className="text-blue-600">
          Log In
        </Link>
      </p>
    </div>
  );
}
