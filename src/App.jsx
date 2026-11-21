import React, { lazy, Suspense, useEffect, useState } from "react";
import Login from "./Login";
import ScreenLoading from "./components/ScreenLoading";
import GlobalLoading from "./components/GlobalLoading";
import SuccessNotice from "./components/SuccessNotice";
import { useSortableListTables } from "./hooks/useSortableListTables";
import { API_URL } from "./api/config";
import { setCsrfToken } from "./api/client";

const Dashboard = lazy(() => import("./Dashboard"));

function App() {
  useSortableListTables();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    localStorage.removeItem("token");
    let active = true;
    fetch(`${API_URL}/session`).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      if (!active || !result.success) return;
      setCsrfToken(result.csrf);
      for (const key of ["distributorId", "firmId", "firmName", "userName", "userId", "role", "salesmanCode"]) {
        localStorage.setItem(key, result.user[key] || "");
      }
      localStorage.setItem("userSource", result.user.source || "");
      setIsLoggedIn(true);
    }).catch(() => {}).finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async (event) => {
    if (event?.type !== "erp:session-expired") {
      try {
        const response = await fetch(`${API_URL}/logout`, { method: "POST" });
        if (!response.ok) throw new Error("Logout failed");
      } catch {
        alert("Server logout could not be confirmed. Reconnect and log out again to revoke the session.");
      }
    }
    setCsrfToken("");
    sessionStorage.clear();
    localStorage.clear();
    setIsLoggedIn(false);
  };

  useEffect(() => {
    window.addEventListener("erp:session-expired", handleLogout);
    return () => window.removeEventListener("erp:session-expired", handleLogout);
  }, []);

  return (
    <>
      <GlobalLoading />
      <SuccessNotice />
      {restoring ? <ScreenLoading variant="dashboard" title="Restoring your session..." message="Please wait while we prepare your workspace." /> : isLoggedIn ? (
        <Suspense fallback={<ScreenLoading variant="dashboard" title="Opening your dashboard..." message="Please wait while we prepare your workspace." />}>
          <Dashboard onLogout={handleLogout} />
        </Suspense>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
