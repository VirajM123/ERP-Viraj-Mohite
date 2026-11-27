// From Uiverse.io by yeisonordonez - https://uiverse.io/yeisonordonez/short-owl-85
// MIT License, Copyright (c) yeisonordonez (Yeison Ordoñez)
import React from "react";
import { createPortal } from "react-dom";
import "./CreateLoadTruckLoader.css";

export default function CreateLoadTruckLoader({ editing = false }) {
  return createPortal(
    <div className="create-load-truck-overlay" role="status" aria-live="polite">
      <div className="create-load-truck-panel">
        <div className="create-load-truck-frame" aria-hidden="true">
          <div className="create-load-truck-scene">
            <div className="create-load-truck-body">
              <div className="create-load-truck-window" />
              <div className="create-load-truck-cargo" />
              <div className="create-load-truck-door" />
              <div className="create-load-truck-lights" />
            </div>
            <div className="create-load-truck-wheel" />
            <div className="create-load-truck-wheel create-load-truck-wheel--front" />
            <div className="create-load-truck-street" />
            <div className="create-load-truck-post" />
          </div>
        </div>
        <strong>{editing ? "Updating load..." : "Creating load..."}</strong>
        <span>Please wait while the load is saved.</span>
      </div>
    </div>,
    document.body
  );
}
