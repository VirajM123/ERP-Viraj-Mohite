import React, { useSyncExternalStore } from "react";
import { FileText, PackageSearch, ClipboardCheck, FileSearch } from "lucide-react";
import { getLoadingSnapshot, subscribeLoading } from "./loadingTracker";
import "./ReportLoading.css";

export default function GlobalLoading() {
  const current = useSyncExternalStore(subscribeLoading, getLoadingSnapshot);
  if (!current) return null;
  const ActivityIcon = { invoices: FileText, batches: PackageSearch, validation: ClipboardCheck, preview: FileSearch }[current.variant];
  return <div className="erp-global-loading" role="status" aria-live="polite">
    <div className="erp-loading-panel">
      {ActivityIcon ? <span className="erp-activity-icon" aria-hidden="true"><ActivityIcon size={40} strokeWidth={1.6} /><span className="erp-activity-dots"><i /><i /><i /></span></span> : <div className={current.variant === "report" ? "report-loading-animation" : current.variant === "module" ? "erp-module-loader" : "erp-dashboard-loader"} aria-hidden="true" />}
      <strong>{current.title}</strong><span>{current.message}</span>
    </div>
  </div>;
}
