import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import "./SuccessNotice.css";

export function showSuccessNotice(message) {
  window.dispatchEvent(new CustomEvent("erp:success-notice", { detail: { message } }));
}

export default function SuccessNotice() {
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    const show = (event) => setNotice({ message: event.detail.message });
    window.addEventListener("erp:success-notice", show);
    return () => window.removeEventListener("erp:success-notice", show);
  }, []);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 2000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  if (!notice) return null;
  return <div className="erp-success-overlay" role="status" aria-live="polite">
    <div className="erp-success-card">
      <span className="erp-success-check" aria-hidden="true"><Check size={34} strokeWidth={3} /></span>
      <strong>{notice.message}</strong>
    </div>
  </div>;
}
