import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing in .env file");
  process.exit(1);
}

console.log("✅ ENV loaded");
console.log("PORT =", PORT);

const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
console.log("MONGODB_URI =", maskedUri);

mongoose.set("strictQuery", false);

const connectDB = async () => {
  try {
    console.log("🔄 Connecting to MongoDB Atlas...");

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
      retryWrites: true,
      family: 4,
      dbName: "Total_Solution",
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
    });

    console.log("✅ MongoDB connected successfully");
    console.log("📊 Connected to Database:", mongoose.connection.name);
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

connectDB();

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

const ensureConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database not connected. Please try again later.",
    });
  }
  next();
};

const registerSchema = new mongoose.Schema(
  {
    distributorId: { type: String, default: null },
    firmId: { type: String, default: null },

    firmCode: { type: String, required: true, trim: true },
    firmName: { type: String, required: true, trim: true },

    address1: { type: String, default: "", trim: true },
    address2: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    pinCode: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    country: { type: String, default: "India", trim: true },

    phoneNo: { type: String, default: "", trim: true },
    mobileNo: { type: String, default: "", trim: true },
    tinNo: { type: String, default: "", trim: true },
    regNo: { type: String, default: "", trim: true },
    gstNo: { type: String, default: "", trim: true },
    drugLicNo: { type: String, default: "", trim: true },
    foodLicenceNo: { type: String, default: "", trim: true },
    apiKey: { type: String, default: "", trim: true },

    email: { type: String, default: "", trim: true, lowercase: true },
    userName: { type: String, required: true, trim: true },

    password: { type: String, required: true },

    role: { type: String, default: "DISTRIBUTOR_ADMIN" },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "Mas_Register",
  }
);
registerSchema.index({ firmCode: 1, firmName: 1 });
registerSchema.index({ firmId: 1 }, { unique: true });
registerSchema.index({ userName: 1 });
registerSchema.index({ userName: 1, firmId: 1 });
registerSchema.index({ distributorId: 1 });

const Register = mongoose.model("Mas_Register", registerSchema);

const generateDistributorId = async () => {
  const last = await Register.findOne({
    distributorId: { $regex: /^DIST-\d+$/ },
  }).sort({ createdAt: -1 });

  if (!last?.distributorId) return "DIST-1001";

  const num = Number(last.distributorId.split("-")[1]);
  return `DIST-${num + 1}`;
};

const generateFirmId = async () => {
  const firms = await Register.find(
    { firmId: { $regex: /^FIRM-\d+$/ } },
    { firmId: 1 }
  );

  let maxNo = 2000;

  firms.forEach((firm) => {
    const no = Number(String(firm.firmId).split("-")[1]);
    if (!isNaN(no) && no > maxNo) {
      maxNo = no;
    }
  });

  return `FIRM-${maxNo + 1}`;
};

app.post("/api/register", ensureConnection, async (req, res) => {
  try {
    const {
      firmCode,
      firmName,
      userName,
      password,
      address1,
      address2,
      city,
      pinCode,
      state,
      country,
      phoneNo,
      mobileNo,
      tinNo,
      regNo,
      gstNo,
      drugLicNo,
      foodLicenceNo,
      apiKey,
      email,
    } = req.body;

    if (!firmCode || !firmName || !userName || !password) {
      return res.status(400).json({
        success: false,
        message: "firmCode, firmName, userName and password are required",
      });
    }

    const existingFirm = await Register.findOne({
      firmCode: firmCode.trim(),
      firmName: firmName.trim(),
    });

    if (existingFirm) {
      return res.status(409).json({
        success: false,
        message: "Firm already exists with this firm code and name",
      });
    }

    const existingUser = await Register.findOne({
      userName: userName.trim(),
      isActive: true,
    });

    let distributorId;

    if (existingUser) {
      if (password !== existingUser.password) {
        return res.status(401).json({
          success: false,
          message:
            "This username already exists. Enter correct old password to add another firm.",
        });
      }

      distributorId = existingUser.distributorId;
    } else {
      distributorId = await generateDistributorId();
    }

    const firmId = await generateFirmId();

    const savedUser = await Register.create({
      distributorId,
      firmId,
      firmCode: firmCode.trim(),
      firmName: firmName.trim(),
      address1: address1 || "",
      address2: address2 || "",
      city: city || "",
      pinCode: pinCode || "",
      state: state || "",
      country: country || "India",
      phoneNo: phoneNo || "",
      mobileNo: mobileNo || "",
      tinNo: tinNo || "",
      regNo: regNo || "",
      gstNo: gstNo || "",
      drugLicNo: drugLicNo || "",
      foodLicenceNo: foodLicenceNo || "",
      apiKey: apiKey || "",
      email: email || "",
      userName: userName.trim(),
      password,
    });

    const data = savedUser.toObject();
    delete data.password;

    res.status(201).json({
      success: true,
      message: "Registration completed successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Register error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry. Firm code, firm name, or username already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
      error: error.message,
    });
  }
});

app.post("/api/login/firms", ensureConnection, async (req, res) => {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const matchingFirms = await Register.find(
      {
        userName: userName.trim(),
        password: password,
        isActive: true,
      },
      { password: 0 }
    ).sort({ firmName: 1 });

    if (matchingFirms.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    res.json({
      success: true,
      distributorId: matchingFirms[0].distributorId,
      firms: matchingFirms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load firms",
      error: error.message,
    });
  }
});
app.post("/api/login", ensureConnection, async (req, res) => {
  try {
    const { userName, password, firmId } = req.body;

    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    if (!firmId) {
      return res.status(400).json({
        success: false,
        message: "Please select firm",
      });
    }

    const user = await Register.findOne({
      userName: userName.trim(),
      firmId,
      isActive: true,
    });

    if (!user || password !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username, password or firm",
      });
    }

    const userData = user.toObject();
    delete userData.password;

    res.json({
      success: true,
      message: "Login successful",
      user: userData,
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Login failed. Please try again later.",
      error: error.message,
    });
  }
});

app.get("/api/users", ensureConnection, async (req, res) => {
  try {
    const users = await Register.find({}, { password: 0 }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

app.get("/api/health", async (req, res) => {
  res.json({
    status: "OK",
    port: PORT,
    database: {
      readyState: mongoose.connection.readyState,
      connected: mongoose.connection.readyState === 1,
      name: mongoose.connection.name || null,
      expectedDb: "Total_Solution",
      isCorrectDb: mongoose.connection.name === "Total_Solution",
    },
    serverTime: new Date().toISOString(),
  });
});

app.get("/api/firms", ensureConnection, async (req, res) => {
  try {
    const { distributorId } = req.query;

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "distributorId is required",
      });
    }

    const firms = await Register.find(
      { distributorId, isActive: true },
      { password: 0 }
    ).sort({ firmName: 1 });

    res.json({ success: true, firms });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch firms",
      error: error.message,
    });
  }
});

app.post("/api/firms", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "distributorId is required. Please login again.",
      });
    }

    const baseUser = await Register.findOne({ distributorId, isActive: true });

    if (!baseUser) {
      return res.status(404).json({
        success: false,
        message: "Distributor not found. Please login again.",
      });
    }

    const firmCode = String(req.body.firmCode || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    if (!firmCode || !firmName) {
      return res.status(400).json({
        success: false,
        message: "Firm Code and Firm Name are required",
      });
    }

    const firm = await Register.create({
      distributorId,
      firmId: await generateFirmId(),

      firmCode,
      firmName,

      address1: String(req.body.address1 || "").trim(),
      address2: String(req.body.address2 || "").trim(),
      city: String(req.body.city || "").trim(),
      pinCode: String(req.body.pinCode || "").trim(),
      state: String(req.body.state || "").trim(),
      country: String(req.body.country || "India").trim(),

      phoneNo: String(req.body.phoneNo || "").trim(),
      mobileNo: String(req.body.mobileNo || "").trim(),
      tinNo: String(req.body.tinNo || "").trim(),
      regNo: String(req.body.regNo || "").trim(),
      gstNo: String(req.body.gstNo || "").trim(),
      drugLicNo: String(req.body.drugLicNo || "").trim(),
      foodLicenceNo: String(req.body.foodLicenceNo || "").trim(),
      apiKey: String(req.body.apiKey || "").trim(),
      email: String(req.body.email || baseUser.email || "").trim(),

      userName: baseUser.userName,
      password: baseUser.password,
      role: baseUser.role || "DISTRIBUTOR_ADMIN",
      isActive: true,
    });

    const data = firm.toObject();
    delete data.password;

    res.status(201).json({
      success: true,
      message: "Firm created successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Firm creation error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `Duplicate key error: ${JSON.stringify(error.keyValue)}`,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Firm creation failed",
    });
  }
});
app.get("/api/connection-status", (req, res) => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    success: true,
    readyState: mongoose.connection.readyState,
    status: states[mongoose.connection.readyState],
    databaseName: mongoose.connection.name || null,
    expectedDatabase: "Total_Solution",
    isCorrectDatabase: mongoose.connection.name === "Total_Solution",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
});