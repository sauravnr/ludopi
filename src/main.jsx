// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext"; // adjust path if yours is different
import AuthedSocket from "./components/AuthedSocket.jsx";
import { AlertProvider } from "./context/AlertContext";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AlertProvider>
        <AuthProvider>
          <AuthedSocket>
            <App />
          </AuthedSocket>
        </AuthProvider>
      </AlertProvider>
    </BrowserRouter>
  </StrictMode>
);
