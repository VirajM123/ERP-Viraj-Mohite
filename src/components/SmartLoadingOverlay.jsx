import React, { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Boxes,
  Building2,
  CircleDollarSign,
  PackageSearch,
  Rocket,
  ShoppingCart,
} from "lucide-react";
import "./SmartLoadingOverlay.css";

const REVEAL_DELAY_MS = 450;

const LOADING_CONTENT = {
  login: {
    title: "Welcome to Total Solution ERP",
    message: "Preparing your business workspace...",
    label: "Launching your workspace",
    Icon: Rocket,
  },
  sales: {
    title: "Loading Sales Invoices",
    message: "Gathering your sales records...",
    label: "Sales processing",
    Icon: ShoppingCart,
  },
  purchase: {
    title: "Loading Purchase Records",
    message: "Gathering supplier and purchase details...",
    label: "Purchase processing",
    Icon: Building2,
  },
  stock: {
    title: "Updating Inventory",
    message: "Checking item quantities and stock balances...",
    label: "Inventory synchronization",
    Icon: PackageSearch,
  },
  gst: {
    title: "Loading GST Records",
    message: "Preparing your tax information...",
    label: "GST processing",
    Icon: CircleDollarSign,
  },
  reports: {
    title: "Generating Business Report",
    message: "Analyzing records and preparing your report...",
    label: "Report generation",
    Icon: BarChart3,
  },
  workspace: {
    title: "Preparing Your ERP",
    message: "Loading your business information...",
    label: "Loading workspace",
    Icon: Boxes,
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
  const { Icon } = content;

  return (
    <div
      className={`erp-loader${visible ? " active" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="loader-box">
        <div className="loader-brand">
          <div className="brand-logo" aria-hidden="true">T</div>
          <div className="brand-name">
            <strong>TOTAL SOLUTION</strong>
            <span>Enterprise ERP</span>
          </div>
        </div>

        <div className="visual-stage" aria-hidden="true">
          <div className="loader-orbit" />
          <span className="loader-star loader-star-one">✦</span>
          <span className="loader-star loader-star-two">✧</span>
          <span className="loader-star loader-star-three">✦</span>
          <div className="loader-illustration"><Icon size={64} strokeWidth={1.6} /></div>
        </div>

        <h2 className="loader-title">{content.title}</h2>
        <p className="loader-message">{content.message}</p>

        <div className="progress-area">
          <div className="progress-top">
            <span className="progress-label">{content.label}</span>
            <span className="progress-percent" aria-hidden="true">Loading</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" />
          </div>
        </div>

        <div className="loader-footer">
          <span aria-hidden="true">✦</span> Making your work a little smoother
        </div>
      </div>
    </div>
  );
}
