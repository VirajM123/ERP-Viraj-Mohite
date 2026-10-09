import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { API_URL } from "../api/config";
import "./UserProfileModal.css";

const display = (value) => String(value ?? "").trim() || "—";
const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

export default function UserProfileModal({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const closeRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/profile`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load profile.");
        setProfile(result.profile);
      })
      .catch((failure) => {
        if (failure.name !== "AbortError") setError(failure.message);
      });
    closeRef.current?.focus();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  const fields = profile ? [
    ["User ID", profile.userId],
    ["Username", profile.userName],
    ["Role", profile.role],
    ["Firm", profile.firmName],
    ["Status", profile.isActive ? "Active" : "Inactive"],
    ["Distributor ID", profile.distributorId],
    ...(profile.firmCode ? [["Firm code", profile.firmCode]] : []),
    ...(profile.salesmanCode ? [["Salesman code", profile.salesmanCode]] : []),
    ...(profile.email ? [["Email", profile.email]] : []),
    ...(profile.mobileNo ? [["Mobile", profile.mobileNo]] : []),
    ["Created", formatDate(profile.createdAt)],
    ["Last updated", formatDate(profile.updatedAt)],
  ] : [];

  return createPortal(
    <div className="user-profile-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="user-profile-modal" role="dialog" aria-modal="true" aria-labelledby="user-profile-title">
        <header className="user-profile-modal-header">
          <h2 id="user-profile-title">My Profile</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close profile"><X size={20} /></button>
        </header>
        {error ? <p className="user-profile-message" role="alert">{error}</p> : !profile ? <p className="user-profile-message">Loading profile…</p> : <>
          <div className="user-profile-identity">
            <span className="user-profile-modal-avatar" aria-hidden="true">{display(profile.userName).slice(0, 2).toUpperCase()}</span>
            <div><strong>{display(profile.userName)}</strong><span>{display(profile.role).replaceAll("_", " ")}</span></div>
          </div>
          <dl className="user-profile-details">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl>
          <footer>Account details from {profile.source === "REGISTER" ? "Mas_Register" : "Mas_User"}</footer>
        </>}
      </section>
    </div>,
    document.body
  );
}
