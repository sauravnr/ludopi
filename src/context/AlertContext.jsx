import React, { createContext, useContext, useState, useCallback } from "react";
import Alert from "../components/Alert";

const AlertContext = createContext(() => {});

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((msg, type = "info") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  }, []);

  return (
    <AlertContext.Provider value={showAlert}>
      {children}
      {alert && <Alert type={alert.type}>{alert.msg}</Alert>}
    </AlertContext.Provider>
  );
}

export const useAlert = () => useContext(AlertContext);
