import React, { lazy, Suspense, useState } from "react";
import Login from "./Login";
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
