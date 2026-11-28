import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installAuthenticatedFetch } from "./api/client";
import { installSuccessAlertBridge } from "./components/successFeedback";

import { ERPProvider } from "./context/ERPContext";
import "./ERPTheme.css";
import "./components/Loading.css";

installAuthenticatedFetch();
installSuccessAlertBridge();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ERPProvider>
      <App />
    </ERPProvider>
  </React.StrictMode>
);
