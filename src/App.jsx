import React, { lazy, Suspense, useEffect, useState } from "react";
import Login from "./Login";
import LandingPage from "./LandingPage";
import { LogOut } from "lucide-react";
import "./components/LogoutDialog.css";
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
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
      setSigningOut(true);
      try {
        const response = await fetch(`${API_URL}/logout`, { method: "POST" });
        if (!response.ok) throw new Error("Logout failed");
      } catch {
        alert("Server logout could not be confirmed. Reconnect and log out again to revoke the session.");
        return;
      } finally {
        setSigningOut(false);
      }
    }
    setShowLogoutDialog(false);
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
      {showLogoutDialog && <div className="logout-dialog-backdrop" onClick={() => { if (!signingOut) setShowLogoutDialog(false); }}>
        <div className="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-description" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape" && !signingOut) setShowLogoutDialog(false); }}>
          <div className="logout-dialog-icon" aria-hidden="true"><LogOut size={40} strokeWidth={1.8} /></div>
          <h2 id="logout-dialog-title">Log out of Total Solution ERP?</h2>
          <p id="logout-dialog-description">You'll return to the sign-in page.</p>
          <div className="logout-dialog-actions">
            <button type="button" className="logout-dialog-cancel" disabled={signingOut} autoFocus onClick={() => setShowLogoutDialog(false)}>Stay signed in</button>
            <button type="button" className="logout-dialog-confirm" disabled={signingOut} onClick={handleLogout}>{signingOut ? <><span className="logout-ring" aria-hidden="true" />Signing out…</> : "Log out"}</button>
          </div>
        </div>
      </div>}
      {restoring ? <ScreenLoading variant="dashboard" title="Restoring your session..." message="Please wait while we prepare your workspace." /> : isLoggedIn ? (
        <Suspense fallback={<ScreenLoading variant="login-dashboard" title="Opening your dashboard..." message="Please wait while we prepare your workspace." />}>
          <Dashboard onLogout={() => setShowLogoutDialog(true)} />
        </Suspense>
      ) : (
        <LandingPage onLoginSuccess={handleLoginSuccess} Login={Login} />
      )}
    </>
  );
}

export default App;
