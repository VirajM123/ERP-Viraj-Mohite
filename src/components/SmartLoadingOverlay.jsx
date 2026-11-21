import React, { useEffect, useRef, useState } from "react";
import "./SmartLoadingOverlay.css";

const REVEAL_DELAY_MS = 450;

const LOADING_CONTENT = {
  login: {
    title: "Welcome to Total Solution ERP",
    message: "Preparing your business workspace...",
    label: "Launching your workspace",
  },
  sales: {
    title: "Loading Sales Invoices",
    message: "Gathering your sales records...",
    label: "Sales processing",
  },
  purchase: {
    title: "Loading Purchase Records",
    message: "Gathering supplier and purchase details...",
    label: "Purchase processing",
  },
  stock: {
    title: "Updating Inventory",
    message: "Checking item quantities and stock balances...",
    label: "Inventory synchronization",
  },
  gst: {
    title: "Loading GST Records",
    message: "Preparing your tax information...",
    label: "GST processing",
  },
  reports: {
    title: "Generating Business Report",
    message: "Analyzing records and preparing your report...",
    label: "Report generation",
  },
  workspace: {
    title: "Preparing Your ERP",
    message: "Loading your business information...",
    label: "Loading workspace",
  },
};

export default function SmartLoadingOverlay() {
  const requests = useRef(new Map());
  const timer = useRef(null);
  const [loadingType, setLoadingType] = useState("workspace");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleStart = (event) => {
      const { requestId, type } = event.detail || {};
      if (requestId === undefined) return;

      requests.current.set(requestId, type || "workspace");
      if (requests.current.size === 1) {
        timer.current = window.setTimeout(() => {
          timer.current = null;
          if (requests.current.size === 0) return;
          setLoadingType(requests.current.values().next().value || "workspace");
          setVisible(true);
        }, REVEAL_DELAY_MS);
      }
    };

    const handleEnd = (event) => {
      requests.current.delete(event.detail?.requestId);
      if (requests.current.size > 0) return;

      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      setVisible(false);
    };

    window.addEventListener("erp:loading-start", handleStart);
    window.addEventListener("erp:loading-end", handleEnd);
    return () => {
      window.removeEventListener("erp:loading-start", handleStart);
      window.removeEventListener("erp:loading-end", handleEnd);
      if (timer.current !== null) window.clearTimeout(timer.current);
      requests.current.clear();
    };
  }, []);

  const content = LOADING_CONTENT[loadingType] || LOADING_CONTENT.workspace;


  return (
    <div
      className={`erp-loader${visible ? " active" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="loader-box">
        <div className="erp-loading-bar" aria-hidden="true" />
        <h2 className="loader-title">{content.title}</h2>
        <p className="loader-message">{content.message}</p>
      </div>
    </div>
  );
}
