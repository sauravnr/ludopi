// src/utils/api.js
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL || "https://ludopi.onrender.com/api";
const api = axios.create({
  baseURL,
  withCredentials: true, // send & receive HttpOnly cookies
  timeout: 10000, // 10 second timeout for requests
});

// Exponential backoff retry for network/timeout errors
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_RETRIES = 3;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;

    // Retry only if network error or timeout and config is available
    if (
      config &&
      (!error.response || error.code === "ECONNABORTED") &&
      (config.__retryCount || 0) < MAX_RETRIES
    ) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      const delay = 2 ** config.__retryCount * 100; // 200ms, 400ms, 800ms
      await sleep(delay);
      return api(config);
    }

    if (!error.response || error.code === "ECONNABORTED") {
      // Final failure after retries
      window.alert("Network error. Please try again.");
    }

    return Promise.reject(error);
  }
);

export default api;
