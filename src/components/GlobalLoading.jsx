import React, { useSyncExternalStore } from "react";
import { FileText, PackageSearch, ClipboardCheck, FileSearch } from "lucide-react";
import { getLoadingSnapshot, subscribeLoading } from "./loadingTracker";
import "./ReportLoading.css";
import LoginSpeedLoader from "./LoginSpeedLoader";

export default function GlobalLoading() {
  const current = useSyncExternalStore(subscribeLoading, getLoadingSnapshot);
  if (!current) return null;
  if (current.variant === "report") return <div className="report-generating-overlay" role="status" aria-live="polite" aria-label="Generating report">
    <div className="report-generating-wrapper" aria-hidden="true">
      {"Generating...".split("").map((letter, index) => <span className="report-generating-letter" key={index}>{letter}</span>)}
      <div className="report-generating-circle" />
    </div>
  </div>;
  const ActivityIcon = { invoices: FileText, batches: PackageSearch, validation: ClipboardCheck, preview: FileSearch, saving: ClipboardCheck }[current.variant];
  return <div className="erp-global-loading" role="status" aria-live="polite">
    <div className="erp-loading-panel">
      {current.variant === "login-dashboard" ? <LoginSpeedLoader /> : ActivityIcon ? <span className="erp-activity-icon" aria-hidden="true"><ActivityIcon size={40} strokeWidth={1.6} /><span className="erp-activity-dots"><i /><i /><i /></span></span> : <div className={current.variant === "module" ? "erp-module-loader" : "erp-dashboard-loader"} aria-hidden="true" />}
      <strong>{current.title}</strong><span>{current.message}</span>
    </div>
  </div>;
}
