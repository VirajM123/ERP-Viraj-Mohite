import React, { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { useSortableListTables } from "./hooks/useSortableListTables";
import {
  getSessionExpiresAt,
  hasActiveSession,
  startSession,
} from "./utils/session";

function App() {
  useSortableListTables();

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (localStorage.getItem("token") && !getSessionExpiresAt()) {
      startSession();
    }

    const isActive = hasActiveSession();

    if (!isActive && localStorage.getItem("token")) {
      localStorage.clear();
      sessionStorage.clear();
    }

    return isActive;
  });

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    setIsLoggedIn(false);
  };

  return (
    <>
      {isLoggedIn ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
