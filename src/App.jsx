import React, { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { useSortableListTables } from "./hooks/useSortableListTables";
import {
  getSessionExpiresAt,
  startSession,
} from "./utils/session";

function App() {
  useSortableListTables();

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (localStorage.getItem("token") && !getSessionExpiresAt()) {
      startSession();
    }
    // Keep the current workspace visible after expiry. The API still rejects
    // an expired token, but unsaved screen state is no longer destroyed by an
    // automatic logout.
    return Boolean(localStorage.getItem("token"));
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
