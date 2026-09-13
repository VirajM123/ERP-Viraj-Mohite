import cors from "cors";
import express from "express";
import createDesktopImportRouter from "./desktopImportRoutes.js";

const host = "127.0.0.1";
const port = Math.max(1, Math.min(65535, Number(process.env.DESKTOP_IMPORT_HELPER_PORT || 5055)));
const allowedOrigins = new Set(String(process.env.DESKTOP_IMPORT_HELPER_ORIGINS || "https://totalsolutionerp.com,http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean));

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  if (req.get("Access-Control-Request-Private-Network") === "true") {
    res.set("Access-Control-Allow-Private-Network", "true");
  }
  next();
});
app.use(cors({
  origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Desktop-Distributor-Id", "X-Desktop-Firm-Id"],
}));
app.use((req, res, next) => {
  const distributorId = String(req.get("X-Desktop-Distributor-Id") || "").trim();
  const firmId = String(req.get("X-Desktop-Firm-Id") || "").trim();
  if (!distributorId || !firmId) return res.status(400).json({ success: false, message: "The ERP distributor and firm IDs are required." });
  req.security = { distributorId, firmId, firmName: "Local conversion" };
  next();
});

const allowLocalConversion = () => (req, res, next) => next();
app.use("/api", createDesktopImportRouter({ authorizeRequest: allowLocalConversion }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("Local desktop converter request failed", error);
  return res.status(error.status || 500).json({ success: false, message: error.message || "Local conversion failed." });
});

app.listen(port, host, () => {
  console.log(`Local SQL backup converter ready at http://${host}:${port}`);
  console.log("Keep this window open while generating Excel files from the ERP website.");
});
