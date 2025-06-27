// src/utils/api.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "https://localhost:4000/api";
const api = axios.create({
  baseURL,
  withCredentials: true, // send & receive HttpOnly cookies
});

export default api;
