import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installAuthenticatedFetch } from "./api/client";

import { ERPProvider } from "./context/ERPContext";
import "./ERPTheme.css";

installAuthenticatedFetch();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ERPProvider>
      <App />
    </ERPProvider>
  </React.StrictMode>
);
