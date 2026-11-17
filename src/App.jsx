import React, { lazy, Suspense, useState } from "react";
import Login from "./Login";
import SmartLoadingOverlay from "./components/SmartLoadingOverlay";
import { useSortableListTables } from "./hooks/useSortableListTables";

const Dashboard = lazy(() => import("./Dashboard"));

function App() {
  useSortableListTables();

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
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
      <SmartLoadingOverlay />
      {isLoggedIn ? (
        <Suspense fallback={<div role="status">Loading ERP...</div>}>
          <Dashboard onLogout={handleLogout} />
        </Suspense>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
