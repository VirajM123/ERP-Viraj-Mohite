import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import transactionRoutes from "./transaction.js";
import generalSetupRoutes from "./generalSetup.js";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/transaction", transactionRoutes);
app.use("/api/general-setup", generalSetupRoutes);

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

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    console.log("✅ MongoDB connected successfully");
    console.log("📊 Connected to Database:", mongoose.connection.name);
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
const ensureConnection = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    success: false,
    message: "Database not connected. Please try again.",
  });
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

    role: {
      type: String,
      enum: [
        "DISTRIBUTOR_ADMIN",
        "ADMIN",
        "MANAGER",
        "ACCOUNTANT",
        "SALESMAN",
        "GODOWN",
        "USER",
      ],
      default: "DISTRIBUTOR_ADMIN",
      trim: true,
      uppercase: true,
    },
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
      role: "DISTRIBUTOR_ADMIN",
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

app.post(
  "/api/login/firms",
  ensureConnection,
  async (req, res) => {
    try {
      const userName = String(
        req.body.userName || ""
      ).trim();

      const password = String(
        req.body.password || ""
      );

      if (!userName || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Username and password are required",
        });
      }

      /*
       * Distributor administrator firms.
       */
      const registerFirms =
        await Register.find({
          userName,
          password,
          isActive: true,
        })
          .select({
            distributorId: 1,
            firmId: 1,
            firmCode: 1,
            firmName: 1,
            userName: 1,
            role: 1,
          })
          .lean();

      /*
       * Normal users created from User Master.
       */
      const normalUserFirms =
        await User.find({
          userName,
          password,
          isActive: true,
        })
          .select({
            distributorId: 1,
            firmId: 1,
            firmName: 1,
            userName: 1,
            role: 1,
          })
          .lean();

      const allFirms = [
        ...registerFirms.map((firm) => ({
          distributorId:
            firm.distributorId,

          firmId:
            firm.firmId,

          firmCode:
            firm.firmCode || "",

          firmName:
            firm.firmName,

          userName:
            firm.userName,

          role: String(
            firm.role ||
            "DISTRIBUTOR_ADMIN"
          )
            .trim()
            .toUpperCase(),

          userSource: "REGISTER",
        })),

        ...normalUserFirms.map((user) => ({
          distributorId:
            user.distributorId,

          firmId:
            user.firmId,

          firmCode: "",

          firmName:
            user.firmName,

          userName:
            user.userName,

          role: String(
            user.role || "USER"
          )
            .trim()
            .toUpperCase(),

          userSource: "USER",
        })),
      ];

      /*
       * Remove duplicate firm entries.
       */
      const uniqueFirmMap = new Map();

      allFirms.forEach((firm) => {
        const key = String(
          firm.firmId || ""
        ).trim();

        if (key && !uniqueFirmMap.has(key)) {
          uniqueFirmMap.set(key, firm);
        }
      });

      const firms = Array.from(
        uniqueFirmMap.values()
      ).sort((first, second) =>
        String(
          first.firmName || ""
        ).localeCompare(
          String(second.firmName || "")
        )
      );

      if (firms.length === 0) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid username or password",
        });
      }

      return res.json({
        success: true,

        distributorId:
          firms[0].distributorId,

        firms,
      });
    } catch (error) {
      console.error(
        "Login firms error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load firms",
        error: error.message,
      });
    }
  }
);
app.post(
  "/api/login",
  ensureConnection,
  async (req, res) => {
    try {
      const userName = String(
        req.body.userName || ""
      ).trim();

      const password = String(
        req.body.password || ""
      );

      const firmId = String(
        req.body.firmId || ""
      ).trim();

      if (!userName || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Username and password are required",
        });
      }

      if (!firmId) {
        return res.status(400).json({
          success: false,
          message:
            "Please select firm",
        });
      }

      /*
       * First check distributor administrator.
       */
      const registerUser =
        await Register.findOne({
          userName,
          firmId,
          isActive: true,
        }).lean();

      if (
        registerUser &&
        password === registerUser.password
      ) {
        const role = String(
          registerUser.role ||
          "DISTRIBUTOR_ADMIN"
        )
          .trim()
          .toUpperCase();

        return res.json({
          success: true,
          message: "Login successful",

          user: {
            id: registerUser._id,

            distributorId:
              registerUser.distributorId,

            firmId:
              registerUser.firmId,

            firmCode:
              registerUser.firmCode || "",

            firmName:
              registerUser.firmName,

            userName:
              registerUser.userName,

            role,

            userSource: "REGISTER",
          },
        });
      }

      /*
       * If not administrator, check User Master.
       */
      const normalUser =
        await User.findOne({
          userName,
          firmId,
          isActive: true,
        }).lean();

      if (
        !normalUser ||
        password !== normalUser.password
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid username, password or firm",
        });
      }

      const role = String(
        normalUser.role || "USER"
      )
        .trim()
        .toUpperCase();

      return res.json({
        success: true,
        message: "Login successful",

        user: {
          id: normalUser._id,

          userId:
            normalUser.userId || "",

          distributorId:
            normalUser.distributorId,

          firmId:
            normalUser.firmId,

          firmCode: "",

          firmName:
            normalUser.firmName,

          userName:
            normalUser.userName,

          role,

          userSource: "USER",
        },
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Login failed. Please try again later.",
        error: error.message,
      });
    }
  }
);

app.get("/api/users", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(
      req.query.distributorId || ""
    ).trim();

    const firmId = String(
      req.query.firmId || ""
    ).trim();

    const search = String(
      req.query.search || ""
    ).trim();

    const requestedPage = Number.parseInt(
      req.query.page,
      10
    );

    const requestedLimit = Number.parseInt(
      req.query.limit,
      10
    );

    const page =
      Number.isFinite(requestedPage) &&
        requestedPage > 0
        ? requestedPage
        : 1;

    const limit =
      Number.isFinite(requestedLimit) &&
        requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 10;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message:
          "distributorId and firmId are required",
      });
    }

    const escapedSearch = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const filter = {
      distributorId,
      firmId,
      isActive: true,
    };

    if (escapedSearch) {
      const searchRegex = new RegExp(
        escapedSearch,
        "i"
      );

      filter.$or = [
        { userId: searchRegex },
        { userName: searchRegex },
        { role: searchRegex },
        { firmName: searchRegex },
      ];
    }

    const totalRecords =
      await User.countDocuments(filter);

    const totalPages = Math.max(
      1,
      Math.ceil(totalRecords / limit)
    );

    const currentPage = Math.min(
      page,
      totalPages
    );

    const skip =
      (currentPage - 1) * limit;

    const users = await User.find(filter)
      /*
      * Password fields are not needed in the list.
      * Do not send them unnecessarily.
      */
      .select("-password")
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,

      users,

      count: users.length,

      pagination: {
        currentPage,
        page: currentPage,
        limit,
        totalRecords,
        totalPages,

        hasPreviousPage:
          currentPage > 1,

        hasNextPage:
          currentPage < totalPages,

        startRecord:
          totalRecords === 0
            ? 0
            : skip + 1,

        endRecord:
          totalRecords === 0
            ? 0
            : Math.min(
              skip + users.length,
              totalRecords
            ),
      },
    });
  } catch (error) {
    console.error(
      "❌ User Master pagination load error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});
app.post("/api/users", ensureConnection, async (req, res) => {
  try {
    console.log("REQ BODY /api/users:", req.body);

    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();
    const userName = String(req.body.userName || "").trim();
    const oldPassword = String(req.body.oldPassword || "");
    const password = String(req.body.password || "");

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found. Please login again.",
      });
    }

    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: "User Name and Password are required",
      });
    }

    const existingUser = await User.findOne({
      distributorId,
      firmId,
      userName,
      isActive: true,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This user already exists for this firm",
      });
    }

    const allowedUserRoles = [
      "ADMIN",
      "MANAGER",
      "ACCOUNTANT",
      "SALESMAN",
      "GODOWN",
      "USER",
    ];

    const requestedRole = String(
      req.body.role || "USER"
    )
      .trim()
      .toUpperCase();

    const safeRole =
      allowedUserRoles.includes(requestedRole)
        ? requestedRole
        : "USER";

    const newUser = await User.create({
      userId: "USR" + Date.now(),
      distributorId,
      firmId,
      firmName,
      userName,
      oldPassword,
      password,
      role: safeRole,
      isActive: true,
    });

    const data = newUser.toObject();
    delete data.password;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data,
    });
  } catch (error) {
    console.error("❌ User creation error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "User creation failed",
    });
  }
});

app.put("/api/users/:id", ensureConnection, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        userName: String(req.body.userName || "").trim(),
        oldPassword: req.body.oldPassword || "",
        password: req.body.password || "",
        role: req.body.role || "USER",
        isActive: req.body.isActive ?? true,
      },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User update failed",
      error: error.message,
    });
  }
});

// ---------- USER ----------
app.delete("/api/users/:id", ensureConnection, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User delete failed",
      error: error.message,
    });
  }
});
const groupSchema = new mongoose.Schema(
  {
    groupCode: { type: String, required: true, trim: true },
    groupName: { type: String, required: true, trim: true },
    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_Group" }
);

const categorySchema = new mongoose.Schema(
  {
    categoryCode: { type: String, required: true, trim: true },
    categoryName: { type: String, required: true, trim: true },
    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_Category" }
);

// In server.js - Update productSchema
const productSchema = new mongoose.Schema(
  {
    productCode: String,
    productName: String,
    companyId: String,
    companyName: String,
    group: String,
    category: String,
    description: String,
    gst: Number,
    basicUnit: String,
    boxPack: Number,
    inboxPack: Number,
    retailerMargin: Number,
    distributorMargin: Number,
    hsn: String,
    weight: Number,
    eanCode: { type: String, default: "", trim: true },
    Rate_Per_Unit: Number,
    srateSelection: { type: String, default: "PURCHASE_RATE" },
    Reorder_Level: Number,
    Min_Stock_Holding: Number,
    cess: Number,
    cessAmt: Number,
    ExpDays: Number,
    create: String,
    active: Boolean,
    locked: Boolean,
    isDrug: { type: Boolean, default: false },  // ← ADD THIS
    allowFraction: Boolean,
    distributorId: String,
    firmId: String,
    firmName: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_Product" }
);
const Group = mongoose.model("Mas_Group", groupSchema);
const Category = mongoose.model("Mas_Category", categorySchema);
const Product = mongoose.model("Mas_Product", productSchema);

const accountSchema = new mongoose.Schema(
  {
    accountCode: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },

    openingDate: { type: String, default: "" },

    address: { type: String, default: "" },
    town: { type: String, default: "" },
    state: { type: String, default: "" },
    pinCode: { type: String, default: "" },

    phoneNo: { type: String, default: "" },
    mobileNo: { type: String, default: "" },
    emailId: { type: String, default: "" },

    tinNo: { type: String, default: "" },
    openingBal: { type: Number, default: 0 },
    openingBalType: { type: String, default: "Dr" },

    contactPerson: { type: String, default: "" },
    invType: { type: String, default: "TAXABLE" },
    taxOn: { type: String, default: "SRATE" },

    panNo: { type: String, default: "" },
    foodLicense: { type: String, default: "" },
    gstNo: { type: String, default: "" },
    billToAdd1: { type: String, default: "" },
    tanNo: { type: String, default: "" },

    gstType: { type: String, default: "Unregistered" },
    gstDate: { type: String, default: "" },
    gstClsDate: { type: String, default: "" },

    add2: { type: String, default: "" },
    tcsPercent: { type: Number, default: 0 },
    allowInPurchase: { type: String, default: "N" },

    drugLicNo: { type: String, default: "" },
    drugExpDate: { type: String, default: "" },

    // 🔥 FIX: These fields must be properly defined
    creditDays: { type: Number, default: 0 },
    creditBills: { type: Number, default: 0 },
    lockDays: { type: Number, default: 0 },
    creditAmt: { type: Number, default: 0 },
    blackListed: { type: String, default: "NO", enum: ["YES", "NO"] },
    lastBillDate: { type: String, default: "" },
    lastInvoiceDate: { type: String, default: "" },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    areaCode: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_Account" }
);
const Account = mongoose.model("Mas_Account", accountSchema);

const otherAccountSchema = new mongoose.Schema(
  {
    lastAccount: { type: String, default: "" },

    accountCode: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountGroup: { type: String, default: "" },

    openingDate: { type: String, default: "" },

    address: { type: String, default: "" },
    town: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "India" },
    pinCode: { type: String, default: "" },

    phoneNo: { type: String, default: "" },
    mobileNo: { type: String, default: "" },
    emailId: { type: String, default: "" },

    tinNo: { type: String, default: "" },

    openingBal: { type: Number, default: 0 },
    openingBalType: { type: String, default: "Dr" },

    invType: { type: String, default: "TAXABLE" },
    taxOn: { type: String, default: "SRATE" },

    bankAccountNo: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    branch: { type: String, default: "" },
    branchName: { type: String, default: "" },

    panNo: { type: String, default: "" },
    foodLicense: { type: String, default: "" },
    gstNo: { type: String, default: "" },

    billToAdd1: { type: String, default: "" },
    remark: { type: String, default: "" },

    tcsPercent: { type: Number, default: 0 },
    tanNo: { type: String, default: "" },

    gstType: { type: String, default: "Unregistered" },
    gstDate: { type: String, default: "" },
    add2: { type: String, default: "" },
    gstClsDate: { type: String, default: "" },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_OtherAccount" }
);

otherAccountSchema.index(
  { distributorId: 1, firmId: 1, accountCode: 1 },
  { unique: true }
);
const gstSchema = new mongoose.Schema(
  {
    gstCode: { type: String, required: true, trim: true },
    vatPercent: { type: Number, required: true },

    purchaseType: {
      type: String,
      default: "VAT ON PURCHASE PRICE",
    },
    salesType: {
      type: String,
      default: "VAT ON SALES PRICE",
    },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_GST" }
);

gstSchema.index(
  { distributorId: 1, firmId: 1, gstCode: 1 },
  { unique: true }
);

const GST = mongoose.model("Mas_GST", gstSchema);

const salesmanSchema = new mongoose.Schema(
  {
    salesmanCode: { type: String, required: true, trim: true },
    salesmanName: { type: String, required: true, trim: true },
    salesmanType: { type: String, default: "SALESMAN" },

    dateOfBirth: { type: String, default: "" },
    address: { type: String, default: "" },
    town: { type: String, default: "" },
    pinCode: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "India" },

    phoneNo: { type: String, default: "" },
    mobileNo: { type: String, default: "" },
    emailId: { type: String, default: "" },

    qualification: { type: String, default: "" },
    reference: { type: String, default: "" },
    imeiNo: { type: String, default: "" },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_Salesman" }
);

salesmanSchema.index(
  { distributorId: 1, firmId: 1, salesmanCode: 1 },
  { unique: true }
);

const Salesman = mongoose.model("Mas_Salesman", salesmanSchema);

const areaSchema = new mongoose.Schema(
  {
    areaCode: { type: String, required: true, trim: true },
    areaName: { type: String, required: true, trim: true },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_Area" }
);

areaSchema.index(
  { distributorId: 1, firmId: 1, areaCode: 1 },
  { unique: true }
);

const Area = mongoose.model("Mas_Area", areaSchema);

const godownSchema = new mongoose.Schema(
  {
    godownCode: { type: String, required: true, trim: true },
    godownName: { type: String, required: true, trim: true },

    address: { type: String, default: "" },
    location: { type: String, default: "" },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "Mas_Godown",
  }
);

godownSchema.index(
  { distributorId: 1, firmId: 1, godownCode: 1 },
  { unique: true }
);

const Godown = mongoose.model("Mas_Godown", godownSchema);

const customerBankSchema = new mongoose.Schema(
  {
    bankCode: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },

    accountNumber: { type: String, default: "", trim: true }, // NOT REQUIRED NOW
    ifscCode: { type: String, default: "", trim: true },
    branchName: { type: String, default: "", trim: true },

    accountType: { type: String, default: "Savings" },
    clearingType: { type: String, default: "LOCAL", trim: true },

    customerName: { type: String, default: "" },
    customerCode: { type: String, default: "" },
    mobileNo: { type: String, default: "" },
    emailId: { type: String, default: "" },
    upiId: { type: String, default: "" },
    beneficiaryName: { type: String, default: "" },

    swiftCode: { type: String, default: "" },
    micrCode: { type: String, default: "" },
    panNumber: { type: String, default: "" },
    remarks: { type: String, default: "" },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_CustomerBank" }
);

customerBankSchema.index(
  { distributorId: 1, firmId: 1, bankCode: 1 },
  { unique: true }
);

const CustomerBank = mongoose.model(
  "Mas_CustomerBank",
  customerBankSchema
);

const salesmanAreaMappingSchema = new mongoose.Schema(
  {
    companyCode: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },

    areaCode: { type: String, required: true, trim: true },
    areaName: { type: String, required: true, trim: true },

    salesmanCode: { type: String, required: true, trim: true },
    salesmanName: { type: String, required: true, trim: true },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "Mas_SalesmanAreaMapping",
  }
);

salesmanAreaMappingSchema.index(
  { distributorId: 1, firmId: 1, companyCode: 1, areaCode: 1 },
  { unique: true }
);

const SalesmanAreaMapping = mongoose.model(
  "Mas_SalesmanAreaMapping",
  salesmanAreaMappingSchema
);


/* =========================================================
  PARTY SALES REPORT CRITERIA

  Loads:
  1. Companies
  2. Parties mapped to selected company
  3. Areas mapped to selected company
  4. Salesmen mapped to selected company

  GET /api/reports/party-sales/criteria
  ========================================================= */

app.get(
  "/api/reports/party-sales/criteria",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const companyCode = String(
        req.query.companyCode || ""
      ).trim();

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required.",
        });
      }

      const baseFilter = {
        distributorId,
        firmId,
        isActive: true,
      };

      /*
      * Company master is always returned so the company
      * dropdown can load even before selecting a company.
      */
      const companies = await Company.find(baseFilter)
        .select({
          _id: 1,
          companyCode: 1,
          companyName: 1,
        })
        .sort({
          companyName: 1,
          companyCode: 1,
        })
        .lean();

      /*
      * Until a company is selected, there is no company-wise
      * party/area/salesman mapping to return.
      */
      if (!companyCode) {
        return res.json({
          success: true,
          companies,
          parties: [],
          areas: [],
          salesmen: [],
          partyMappings: [],
          salesmanAreaMappings: [],
        });
      }

      const mappingFilter = {
        ...baseFilter,
        companyCode,
      };

      const [
        partyMappings,
        salesmanAreaMappings,
      ] = await Promise.all([
        AreaToPartyMapping.find(mappingFilter)
          .sort({
            accountName: 1,
            accountCode: 1,
          })
          .lean(),

        SalesmanAreaMapping.find(mappingFilter)
          .sort({
            areaName: 1,
            salesmanName: 1,
          })
          .lean(),
      ]);

      /*
      * Build unique mapped party codes.
      */
      const mappedPartyCodes = [
        ...new Set(
          partyMappings
            .map((mapping) =>
              String(
                mapping.accountCode || ""
              ).trim()
            )
            .filter(Boolean)
        ),
      ];

      /*
      * Load original Account Master information for mapped
      * parties. Mapping values are used as fallback.
      */
      const accountMasters =
        mappedPartyCodes.length > 0
          ? await Account.find({
            ...baseFilter,
            accountCode: {
              $in: mappedPartyCodes,
            },
          })
            .select({
              _id: 1,
              accountCode: 1,
              accountName: 1,
              areaCode: 1,
              town: 1,
              address: 1,
              mobileNo: 1,
              phoneNo: 1,
              gstNo: 1,
            })
            .lean()
          : [];

      const accountMasterMap = new Map(
        accountMasters.map((account) => [
          String(
            account.accountCode || ""
          ).trim(),
          account,
        ])
      );

      const parties = partyMappings
        .map((mapping) => {
          const accountCode = String(
            mapping.accountCode || ""
          ).trim();

          const account =
            accountMasterMap.get(accountCode);

          return {
            _id:
              account?._id ||
              mapping._id,

            accountCode,

            accountName:
              account?.accountName ||
              mapping.accountName ||
              "",

            areaCode:
              mapping.areaCode ||
              account?.areaCode ||
              "",

            areaName:
              mapping.areaName || "",

            companyCode:
              mapping.companyCode ||
              companyCode,

            companyName:
              mapping.companyName || "",

            town:
              account?.town || "",

            address:
              account?.address || "",

            mobileNo:
              account?.mobileNo || "",

            phoneNo:
              account?.phoneNo || "",

            gstNo:
              account?.gstNo || "",
          };
        })
        .filter(
          (party) => party.accountCode
        );

      /*
      * Areas come from both mapping collections:
      * - Area-to-party mappings
      * - Salesman-to-area mappings
      */
      const areaMap = new Map();

      partyMappings.forEach((mapping) => {
        const areaCode = String(
          mapping.areaCode || ""
        ).trim();

        if (!areaCode) {
          return;
        }

        areaMap.set(areaCode, {
          areaCode,
          areaName:
            mapping.areaName || areaCode,
          companyCode,
        });
      });

      salesmanAreaMappings.forEach(
        (mapping) => {
          const areaCode = String(
            mapping.areaCode || ""
          ).trim();

          if (!areaCode) {
            return;
          }

          const oldArea =
            areaMap.get(areaCode);

          areaMap.set(areaCode, {
            areaCode,
            areaName:
              mapping.areaName ||
              oldArea?.areaName ||
              areaCode,
            companyCode,
          });
        }
      );

      const areas = Array.from(
        areaMap.values()
      ).sort((first, second) =>
        String(first.areaName).localeCompare(
          String(second.areaName)
        )
      );

      /*
      * Build unique company-mapped salesmen.
      */
      const salesmanMap = new Map();

      salesmanAreaMappings.forEach(
        (mapping) => {
          const salesmanCode = String(
            mapping.salesmanCode || ""
          ).trim();

          if (!salesmanCode) {
            return;
          }

          const existing =
            salesmanMap.get(salesmanCode);

          salesmanMap.set(salesmanCode, {
            salesmanCode,
            salesmanName:
              mapping.salesmanName ||
              existing?.salesmanName ||
              salesmanCode,

            companyCode,

            /*
            * A salesman can be attached to more than one area.
            */
            areaCodes: [
              ...new Set([
                ...(existing?.areaCodes || []),
                String(
                  mapping.areaCode || ""
                ).trim(),
              ]),
            ].filter(Boolean),
          });
        }
      );

      const mappedSalesmanCodes =
        Array.from(
          salesmanMap.keys()
        );

      /*
      * Read original salesman names/details from master.
      */
      if (mappedSalesmanCodes.length > 0) {
        const salesmanMasters =
          await Salesman.find({
            ...baseFilter,
            salesmanCode: {
              $in: mappedSalesmanCodes,
            },
          })
            .select({
              _id: 1,
              salesmanCode: 1,
              salesmanName: 1,
              mobileNo: 1,
              phoneNo: 1,
            })
            .lean();

        salesmanMasters.forEach(
          (salesman) => {
            const salesmanCode = String(
              salesman.salesmanCode || ""
            ).trim();

            const mapped =
              salesmanMap.get(salesmanCode);

            if (!mapped) {
              return;
            }

            salesmanMap.set(salesmanCode, {
              ...mapped,
              _id: salesman._id,
              salesmanName:
                salesman.salesmanName ||
                mapped.salesmanName,
              mobileNo:
                salesman.mobileNo || "",
              phoneNo:
                salesman.phoneNo || "",
            });
          }
        );
      }

      const salesmen = Array.from(
        salesmanMap.values()
      ).sort((first, second) =>
        String(
          first.salesmanName
        ).localeCompare(
          String(second.salesmanName)
        )
      );

      return res.json({
        success: true,
        companyCode,
        companies,
        parties,
        areas,
        salesmen,
        partyMappings,

        salesmanAreaMappings,
      });
    } catch (error) {
      console.error(
        "Party sales criteria error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load report criteria.",
        error: error.message,
      });
    }
  }
);
const areaToPartyMappingSchema = new mongoose.Schema(
  {
    companyCode: String,
    companyName: String,

    accountCode: String,
    accountName: String,

    areaCode: String,
    areaName: String,

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_AreaToPartyMapping" }
);

areaToPartyMappingSchema.index(
  { distributorId: 1, firmId: 1, companyCode: 1, accountCode: 1 },
  { unique: true }
);

const AreaToPartyMapping = mongoose.model(
  "Mas_AreaToPartyMapping",
  areaToPartyMappingSchema
);
const stockSchema = new mongoose.Schema(
  {
    GDCode: { type: String, required: true },
    ProdCode: { type: String, required: true },
    Batch: { type: String, default: "." },
    ExpDt: { type: String, default: null },
    MfgDt: { type: String, default: null },
    MRP: { type: Number, default: 0 },
    PRate: { type: Number, default: 0 },
    SRate: { type: Number, default: 0 },
    Qty: { type: Number, default: 0 },
    IsLocked: { type: String, default: "N" },
    BoxPack: { type: Number, default: 1 },
    InBoxPack: { type: Number, default: 1 },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },
  },
  { timestamps: true, collection: "Mas_Stock" }
);

stockSchema.index(
  { distributorId: 1, firmId: 1, GDCode: 1, ProdCode: 1, Batch: 1, MRP: 1 },
  { unique: true }
);

const purchaseHeaderSchema = new mongoose.Schema(
  {
    distributorId: String,
    firmId: String,
    firmName: String,

    invoiceDate: String,
    vouSer: String,
    vouNo: Number,
    vno: String,

    supplierCode: String,
    supplierName: String,
    company: String,

    gdCode: String,
    godownName: String,

    isIgst: { type: String, default: "N" },
    invoiceNumber: String,
    narration: String,

    discountPercent: Number,
    mrpTotal: Number,
    tcbPercent: Number,
    tcbAmount: Number,
    diBc1: Number,
    afterDiBc1: Number,
    groBsAmt: Number,
    diBc2: Number,
    afterDiBc2: Number,
    qbtAmt: Number,
    rounding: Number,
    diBc3: Number,
    afterDiBc3: Number,
    ceBsAmt: Number,
    grossAmount: Number,
    cgstAmt: Number,
    sgstAmt: Number,
    igstAmt: Number,
    netAmt: Number,

    items: Array,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "T_Pur_Header" }
);

purchaseHeaderSchema.index(
  { distributorId: 1, firmId: 1, vouSer: 1, vouNo: 1 },
  { unique: true }
);

const Stock = mongoose.model("Mas_Stock", stockSchema);
const PurchaseHeader = mongoose.model("T_Pur_Header", purchaseHeaderSchema);

const salesHeaderSchema = new mongoose.Schema(
  {
    distributorId: String,
    firmId: String,
    firmName: String,

    BillDate: String,
    Godown: String,
    GDCode: String,

    CompanyCode: String,
    CompanyName: String,
    AreaCode: String,
    AreaName: String,
    PartyCode: String,
    PartyName: String,

    BillSeries: String,
    BillNo: Number,
    BillType: String,

    BillStatus: {
      type: String,
      default: "ACTIVE",
    },

    IsBillCancelled: {
      type: Boolean,
      default: false,
    },

    CancelledAt: Date,
    DueDate: String,

    SalesmanCode: String,
    SalesmanName: String,
    Narration: String,

    LoadSeries: {
      type: String,
      default: "",
    },

    LoadNo: {
      type: Number,
      default: null,
    },

    IsLoaded: {
      type: Boolean,
      default: false,
    },

    GrossAmount: {
      type: Number,
      default: 0,
    },

    TPRAmount: {
      type: Number,
      default: 0,
    },

    SchemeAmount: {
      type: Number,
      default: 0,
    },

    StarDiscountAmount: {
      type: Number,
      default: 0,
    },

    CashDiscountAmount: {
      type: Number,
      default: 0,
    },

    DisplayAmount: {
      type: Number,
      default: 0,
    },

    CouponAmount: {
      type: Number,
      default: 0,
    },

    AddLessAmount: {
      type: Number,
      default: 0,
    },

    TaxableValue: {
      type: Number,
      default: 0,
    },

    SGSTAmount: {
      type: Number,
      default: 0,
    },

    CGSTAmount: {
      type: Number,
      default: 0,
    },

    IGSTAmount: {
      type: Number,
      default: 0,
    },

    OriginalNetAmount: {
      type: Number,
      default: 0,
    },

    CreditNoteAmount: {
      type: Number,
      default: 0,
    },

    NetAmount: {
      type: Number,
      default: 0,
    },

    TotalQty: Number,
    TotalFreeQty: Number,
    TotalItems: Number,

    items: Array,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "T_Sal_Header",
  }
);
salesHeaderSchema.index(
  { distributorId: 1, firmId: 1, BillSeries: 1, BillNo: 1 },
  { unique: true }
);

const SalesHeader = mongoose.model("T_Sal_Header", salesHeaderSchema);
app.get(
  "/api/reports/party-sales",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const companyCode = String(
        req.query.companyCode || ""
      ).trim();

      const reportLevel = String(
        req.query.reportLevel ||
        "salesSummary"
      ).trim();

      const productWise =
        String(
          req.query.productWise ||
          "no"
        ).toLowerCase() === "yes";

      const withCreditNote =
        String(
          req.query.withCreditNote ||
          "no"
        ).toLowerCase() === "yes";

      const fromDate = String(
        req.query.fromDate || ""
      ).trim();

      const toDate = String(
        req.query.toDate || ""
      ).trim();

      const orderBy = String(
        req.query.orderBy ||
        "partyName"
      ).trim();

      /*
      * Convert comma-separated query parameters
      * into cleaned arrays.
      */
      const parseCsv = (value) =>
        String(value || "")
          .split(",")
          .map((item) =>
            item.trim()
          )
          .filter(Boolean);

      const selectedPartyCodes =
        parseCsv(
          req.query.selectedPartyCodes
        );

      const selectedAreaCodes =
        parseCsv(
          req.query.selectedAreaCodes
        );

      const selectedSalesmanCodes =
        parseCsv(
          req.query
            .selectedSalesmanCodes
        );

      /*
      * Basic validation.
      */
      if (
        !distributorId ||
        !firmId
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "distributorId and firmId are required.",
          });
      }

      if (
        !fromDate ||
        !toDate
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "From Date and To Date are required.",
          });
      }

      if (fromDate > toDate) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "From Date cannot be greater than To Date.",
          });
      }

      if (
        reportLevel ===
        "selectedParty" &&
        selectedPartyCodes.length ===
        0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Select at least one party.",
          });
      }

      /*
      * Prepare sales bill filter.
      */
      const match = {
        distributorId,
        firmId,
        isActive: true,

        IsBillCancelled: {
          $ne: true,
        },

        BillStatus: {
          $ne: "CANCELLED",
        },

        BillDate: {
          $gte: fromDate,
          $lte: toDate,
        },
      };

      if (companyCode) {
        match.CompanyCode =
          companyCode;
      }

      if (
        selectedPartyCodes.length >
        0
      ) {
        match.PartyCode = {
          $in: selectedPartyCodes,
        };
      }

      if (
        selectedAreaCodes.length >
        0
      ) {
        match.AreaCode = {
          $in: selectedAreaCodes,
        };
      }

      if (
        selectedSalesmanCodes.length >
        0
      ) {
        match.SalesmanCode = {
          $in:
            selectedSalesmanCodes,
        };
      }

      /*
      * Load all matching sales bills.
      */
      const bills =
        await SalesHeader.find(
          match
        )
          .sort({
            BillDate: 1,
            BillSeries: 1,
            BillNo: 1,
          })
          .lean();

      /*
      * Return an empty report cleanly.
      */
      if (bills.length === 0) {
        return res.json({
          success: true,
          count: 0,
          reportLevel,
          productWise,
          rows: [],
          columns: [],
        });
      }

      /*
      * Safely convert different possible
      * numeric field formats.
      */
      const toNumber = (
        ...values
      ) => {
        for (const value of values) {
          if (
            value !== undefined &&
            value !== null &&
            value !== ""
          ) {
            const number =
              Number(value);

            if (
              !Number.isNaN(number)
            ) {
              return number;
            }
          }
        }

        return 0;
      };

      /*
      * Read the first available property
      * from an invoice item.
      */
      const getItemValue = (
        item,
        ...keys
      ) => {
        for (const key of keys) {
          if (
            item?.[key] !==
            undefined &&
            item?.[key] !== null
          ) {
            return item[key];
          }
        }

        return "";
      };

      /*
      * Read product code and product name
      * from all supported invoice formats.
      *
      * Some invoices store:
      * product: "986523 - BOURNVILLA 250 GM"
      */
      const getProductDetails = (
        item = {}
      ) => {
        const combinedProduct =
          String(
            getItemValue(
              item,
              "product",
              "Product",
              "productDisplay",
              "productDescription"
            ) || ""
          ).trim();

        let productCode =
          String(
            getItemValue(
              item,
              "productCode",
              "ProductCode",
              "prodCode",
              "ProdCode",
              "productId",
              "ProductId",
              "code"
            ) || ""
          ).trim();

        let productName =
          String(
            getItemValue(
              item,
              "productName",
              "ProductName",
              "prodName",
              "ProdName",
              "name"
            ) || ""
          ).trim();

        if (combinedProduct) {
          const separatorIndex =
            combinedProduct.indexOf(
              " - "
            );

          if (
            separatorIndex >= 0
          ) {
            const parsedCode =
              combinedProduct
                .slice(
                  0,
                  separatorIndex
                )
                .trim();

            const parsedName =
              combinedProduct
                .slice(
                  separatorIndex +
                  3
                )
                .trim();

            if (!productCode) {
              productCode =
                parsedCode;
            }

            if (!productName) {
              productName =
                parsedName;
            }
          } else if (
            !productName
          ) {
            productName =
              combinedProduct;
          }
        }

        return {
          productCode,
          productName,
        };
      };

      /*
      * Collect every product code used in
      * the selected sales invoices.
      */
      const soldProductCodes = [
        ...new Set(
          bills
            .flatMap((bill) => {
              const items =
                Array.isArray(
                  bill.items
                )
                  ? bill.items
                  : [];

              return items.map(
                (item) =>
                  getProductDetails(
                    item
                  ).productCode
              );
            })
            .filter(Boolean)
        ),
      ];

      /*
      * Load matching product master rows.
      * This provides product-name fallback
      * where old invoices only have code.
      */
      const productMasters =
        soldProductCodes.length >
          0
          ? await Product.find({
            distributorId,
            firmId,

            productCode: {
              $in:
                soldProductCodes,
            },
          })
            .select({
              productCode: 1,
              productName: 1,
              companyId: 1,
              companyName: 1,
            })
            .lean()
          : [];

      const productMasterMap =
        new Map(
          productMasters.map(
            (product) => [
              String(
                product.productCode ||
                ""
              ).trim(),
              product,
            ]
          )
        );

      /*
      * Load every Mas_Stock row for the
      * products appearing in selected bills.
      *
      * PRate, SRate, MRP and Batch are read
      * from this collection.
      */
      const stockRows =
        soldProductCodes.length >
          0
          ? await Stock.find({
            distributorId,
            firmId,

            ProdCode: {
              $in:
                soldProductCodes,
            },
          })
            .select({
              _id: 1,
              GDCode: 1,
              ProdCode: 1,
              Batch: 1,
              MRP: 1,
              PRate: 1,
              SRate: 1,
              Qty: 1,
              MfgDt: 1,
              ExpDt: 1,
              BoxPack: 1,
              InBoxPack: 1,
              IsLocked: 1,
            })
            .lean()
          : [];

      /*
      * Create product-wise stock lookup.
      * A product can have several batches,
      * MRP values and godowns.
      */
      const stockProductMap =
        new Map();

      stockRows.forEach(
        (stock) => {
          const productCode =
            String(
              stock.ProdCode ||
              ""
            ).trim();

          if (!productCode) {
            return;
          }

          if (
            !stockProductMap.has(
              productCode
            )
          ) {
            stockProductMap.set(
              productCode,
              []
            );
          }

          stockProductMap
            .get(productCode)
            .push(stock);
        }
      );

      /*
      * Normalize batch value so empty batch
      * and "." can be matched consistently.
      */
      const normalizeBatch = (
        value
      ) => {
        const batch = String(
          value ?? ""
        ).trim();

        return batch || ".";
      };

      /*
      * Find the most accurate Mas_Stock row
      * for one sales invoice item.
      *
      * Matching priority:
      * 1. Product + Godown + Batch + MRP
      * 2. Product + Batch + MRP
      * 3. Product + Godown + Batch
      * 4. Product + Batch
      * 5. Product + Godown + MRP
      * 6. Product + MRP
      * 7. Product + Godown
      * 8. First product stock row
      */
      const findItemStock = (
        bill,
        item,
        productCode
      ) => {
        if (!productCode) {
          return null;
        }

        const stockOptions =
          stockProductMap.get(
            productCode
          ) || [];

        if (
          stockOptions.length ===
          0
        ) {
          return null;
        }

        const selectedBatch =
          item?.selectedBatch &&
            typeof item
              .selectedBatch ===
            "object"
            ? item.selectedBatch
            : {};

        const godownCode =
          String(
            bill.GDCode ||
            item.GDCode ||
            item.gdCode ||
            selectedBatch.GDCode ||
            selectedBatch.gdCode ||
            ""
          ).trim();

        const batch =
          normalizeBatch(
            getItemValue(
              item,
              "batchNo",
              "BatchNo",
              "batch",
              "Batch"
            ) ||
            selectedBatch.batchNo ||
            selectedBatch.BatchNo ||
            selectedBatch.batch ||
            selectedBatch.Batch
          );

        const mrp = toNumber(
          getItemValue(
            item,
            "mrp",
            "MRP",
            "productMrp",
            "ProductMRP"
          ),
          selectedBatch.mrp,
          selectedBatch.MRP
        );

        const sameGodown = (
          stock
        ) =>
          !godownCode ||
          String(
            stock.GDCode || ""
          ).trim() === godownCode;

        const sameBatch = (
          stock
        ) =>
          normalizeBatch(
            stock.Batch
          ) === batch;

        const sameMrp = (
          stock
        ) =>
          mrp <= 0 ||
          Number(
            stock.MRP || 0
          ) === mrp;

        return (
          stockOptions.find(
            (stock) =>
              sameGodown(stock) &&
              sameBatch(stock) &&
              sameMrp(stock)
          ) ||
          stockOptions.find(
            (stock) =>
              sameBatch(stock) &&
              sameMrp(stock)
          ) ||
          stockOptions.find(
            (stock) =>
              sameGodown(stock) &&
              sameBatch(stock)
          ) ||
          stockOptions.find(
            (stock) =>
              sameBatch(stock)
          ) ||
          stockOptions.find(
            (stock) =>
              sameGodown(stock) &&
              sameMrp(stock)
          ) ||
          stockOptions.find(
            (stock) =>
              sameMrp(stock)
          ) ||
          stockOptions.find(
            (stock) =>
              sameGodown(stock)
          ) ||
          stockOptions[0] ||
          null
        );
      };

      /*
      * Build one report row for every
      * product in every matching invoice.
      */
      const detailRows = [];

      bills.forEach((bill) => {
        const items =
          Array.isArray(
            bill.items
          )
            ? bill.items
            : [];

        /*
        * Sales Details and Selected Party
        * Product Wise require actual items.
        *
        * For older header-only invoices,
        * keep one blank product row only
        * when products were not requested.
        */
        const productsRequired =
          reportLevel ===
          "salesDetails" ||
          productWise;

        const reportItems =
          items.length > 0
            ? items
            : productsRequired
              ? []
              : [{}];

        reportItems.forEach(
          (
            item,
            itemIndex
          ) => {
            const selectedBatch =
              item?.selectedBatch &&
                typeof item
                  .selectedBatch ===
                "object"
                ? item.selectedBatch
                : {};

            const {
              productCode,
              productName:
              savedProductName,
            } =
              getProductDetails(
                item
              );

            const productMaster =
              productMasterMap.get(
                productCode
              );

            const productName =
              savedProductName ||
              productMaster
                ?.productName ||
              "";

            const stockRow =
              findItemStock(
                bill,
                item,
                productCode
              );

            const qty = toNumber(
              getItemValue(
                item,
                "qty",
                "Qty",
                "quantity",
                "Quantity",
                "saleQty",
                "SaleQty"
              )
            );

            const freeQty =
              toNumber(
                getItemValue(
                  item,
                  "freeQty",
                  "FreeQty",
                  "freeQuantity"
                )
              );

            /*
            * Sale rate first uses the actual
            * invoice rate. Mas_Stock SRate is
            * used only when invoice rate is absent.
            */
            const salesRate =
              toNumber(
                getItemValue(
                  item,
                  "salesRate",
                  "SalesRate",
                  "saleRate",
                  "SaleRate",
                  "sRate",
                  "SRate",
                  "rate",
                  "Rate"
                ),
                selectedBatch.salesRate,
                selectedBatch.SalesRate,
                selectedBatch.sRate,
                selectedBatch.SRate,
                stockRow?.SRate
              );

            /*
            * Purchase rate uses Mas_Stock PRate
            * where it is not saved in invoice item.
            */
            const purchaseRate =
              toNumber(
                getItemValue(
                  item,
                  "purchaseRate",
                  "PurchaseRate",
                  "pRate",
                  "PRate",
                  "prate"
                ),
                selectedBatch
                  .purchaseRate,
                selectedBatch
                  .PurchaseRate,
                selectedBatch.pRate,
                selectedBatch.PRate,
                selectedBatch.PRate,
                stockRow?.PRate
              );

            const mrp = toNumber(
              getItemValue(
                item,
                "mrp",
                "MRP",
                "productMrp",
                "ProductMRP"
              ),
              selectedBatch.mrp,
              selectedBatch.MRP,
              stockRow?.MRP
            );

            const batch =
              normalizeBatch(
                getItemValue(
                  item,
                  "batchNo",
                  "BatchNo",
                  "batch",
                  "Batch"
                ) ||
                selectedBatch
                  .batchNo ||
                selectedBatch
                  .BatchNo ||
                selectedBatch
                  .batch ||
                selectedBatch
                  .Batch ||
                stockRow?.Batch
              );

            const godownCode =
              String(
                bill.GDCode ||
                stockRow
                  ?.GDCode ||
                ""
              ).trim();

            const godownName =
              String(
                bill.Godown ||
                godownCode ||
                ""
              ).trim();

            const stockQty =
              toNumber(
                stockRow?.Qty
              );

            const mfgDate =
              String(
                getItemValue(
                  item,
                  "mfgDate",
                  "MfgDate",
                  "MfgDt",
                  "manufacturingDate"
                ) ||
                selectedBatch
                  .mfgDate ||
                selectedBatch
                  .MfgDt ||
                stockRow?.MfgDt ||
                ""
              );

            const expiryDate =
              String(
                getItemValue(
                  item,
                  "expiryDate",
                  "ExpiryDate",
                  "expDate",
                  "ExpDate",
                  "ExpDt"
                ) ||
                selectedBatch
                  .expiryDate ||
                selectedBatch
                  .expDate ||
                selectedBatch
                  .ExpDt ||
                stockRow?.ExpDt ||
                ""
              );

            const grossAmount =
              toNumber(
                getItemValue(
                  item,
                  "grossAmount",
                  "GrossAmount",
                  "grossAmt",
                  "GrossAmt"
                ),
                qty * salesRate
              );

            const schemePercent =
              toNumber(
                getItemValue(
                  item,
                  "schemePercent",
                  "SchemePercent",
                  "schemePer",
                  "SchemePer",
                  "scheme",
                  "schPercent",
                  "schPer",
                  "schPct",
                  "SchPercent"
                )
              );

            const schemeAmount =
              toNumber(
                getItemValue(
                  item,
                  "schemeAmount",
                  "SchemeAmount",
                  "schemeAmt",
                  "schAmount",
                  "schAmt",
                  "SchAmount"
                )
              );

            const cashDiscountPercent =
              toNumber(
                getItemValue(
                  item,
                  "cashDiscountPercent",
                  "CashDiscountPercent",
                  "cashDiscountPer",
                  "cdPercent",
                  "cdPer",
                  "CDPct",
                  "CDPercent"
                )
              );

            const cashDiscountAmount =
              toNumber(
                getItemValue(
                  item,
                  "cashDiscountAmount",
                  "CashDiscountAmount",
                  "cashDiscountAmt",
                  "cdAmount",
                  "cdAmt",
                  "CDAmount"
                )
              );

            const tprPercent =
              toNumber(
                getItemValue(
                  item,
                  "tprPercent",
                  "TPRPercent",
                  "tprPer",
                  "TPRPer"
                )
              );

            const tprAmount =
              toNumber(
                getItemValue(
                  item,
                  "tprAmount",
                  "TPRAmount",
                  "tprAmt",
                  "TPRAmt"
                )
              );

            const cgstPercent =
              toNumber(
                getItemValue(
                  item,
                  "cgstPercent",
                  "CGSTPercent",
                  "cgstPer"
                )
              );

            const sgstPercent =
              toNumber(
                getItemValue(
                  item,
                  "sgstPercent",
                  "SGSTPercent",
                  "sgstPer"
                )
              );

            const igstPercent =
              toNumber(
                getItemValue(
                  item,
                  "igstPercent",
                  "IGSTPercent",
                  "igstPer"
                )
              );

            const gstPercent =
              igstPercent ||
              cgstPercent +
              sgstPercent ||
              toNumber(
                getItemValue(
                  item,
                  "gstPercent",
                  "GSTPercent",
                  "gst",
                  "GST"
                )
              );

            const cgstAmount =
              toNumber(
                getItemValue(
                  item,
                  "cgstAmount",
                  "CGSTAmount",
                  "cgstAmt"
                )
              );

            const sgstAmount =
              toNumber(
                getItemValue(
                  item,
                  "sgstAmount",
                  "SGSTAmount",
                  "sgstAmt"
                )
              );

            const igstAmount =
              toNumber(
                getItemValue(
                  item,
                  "igstAmount",
                  "IGSTAmount",
                  "igstAmt"
                )
              );

            const gstAmount =
              cgstAmount +
              sgstAmount +
              igstAmount;

            const taxableAmount =
              toNumber(
                getItemValue(
                  item,
                  "taxableAmount",
                  "TaxableAmount",
                  "taxableValue",
                  "TaxableValue"
                ),
                grossAmount -
                schemeAmount -
                cashDiscountAmount -
                tprAmount
              );

            const calculatedNet =
              taxableAmount +
              gstAmount;

            const originalItemNet =
              toNumber(
                getItemValue(
                  item,
                  "netAmount",
                  "NetAmount",
                  "netAmt",
                  "amount",
                  "Amount"
                ),
                calculatedNet
              );

            /*
            * CreditNoteAmount is stored at
            * bill-header level.
            *
            * Apply it only to the first item
            * row so it is not deducted once
            * for every product.
            */
            const creditNoteAmount =
              withCreditNote &&
                itemIndex === 0
                ? toNumber(
                  bill
                    .CreditNoteAmount
                )
                : 0;

            const netAmount =
              originalItemNet -
              creditNoteAmount;

            detailRows.push({
              rowId: `${String(
                bill._id
              )}-${itemIndex}`,

              srNo:
                detailRows.length +
                1,

              trn: "SALES",

              billDate:
                bill.BillDate || "",

              billSeries:
                bill.BillSeries ||
                "",

              billNo:
                bill.BillNo ?? "",

              billReference: [
                bill.BillSeries,
                bill.BillNo,
              ]
                .filter(
                  (value) =>
                    value !==
                    undefined &&
                    value !==
                    null &&
                    value !== ""
                )
                .join("-"),

              billType:
                bill.BillType ||
                "",

              companyCode:
                bill.CompanyCode ||
                "",

              companyName:
                bill.CompanyName ||
                "",

              partyCode:
                bill.PartyCode ||
                "",

              partyName:
                bill.PartyName ||
                "",

              productCode,
              productName,

              batch,
              mrp,
              qty,
              freeQty,

              salesRate,
              purchaseRate,

              godownCode,
              godownName,
              stockQty,

              mfgDate,
              expiryDate,

              grossAmount,

              tprPercent,
              tprAmount,

              schemePercent,
              schemeAmount,

              cashDiscountPercent,
              cashDiscountAmount,

              taxableAmount,

              gstPercent,
              cgstPercent,
              cgstAmount,
              sgstPercent,
              sgstAmount,
              igstPercent,
              igstAmount,
              gstAmount,

              creditNoteAmount,
              netAmount,

              areaCode:
                bill.AreaCode ||
                "",

              areaName:
                bill.AreaName ||
                "",

              salesmanCode:
                bill.SalesmanCode ||
                "",

              salesmanName:
                bill.SalesmanName ||
                "",
            });
          }
        );
      });

      let rows = detailRows;

      /*
      * Sales Summary is grouped by party.
      *
      * When Product Wise is Yes, summary
      * is grouped by party and product.
      *
      * Selected Party is intentionally not
      * grouped because it must show each bill.
      */
      if (
        reportLevel ===
        "salesSummary"
      ) {
        const groupedRows =
          new Map();

        detailRows.forEach(
          (row) => {
            const groupKey =
              productWise
                ? `${row.partyCode}__${row.productCode}`
                : row.partyCode ||
                row.partyName;

            if (
              !groupedRows.has(
                groupKey
              )
            ) {
              groupedRows.set(
                groupKey,
                {
                  rowId:
                    groupKey,

                  srNo: 0,

                  partyCode:
                    row.partyCode,

                  partyName:
                    row.partyName,

                  ...(productWise
                    ? {
                      productCode:
                        row.productCode,

                      productName:
                        row.productName,

                      qty: 0,
                    }
                    : {}),

                  grossAmount: 0,
                  tprAmount: 0,
                  schemeAmount: 0,
                  cashDiscountAmount: 0,
                  taxableAmount: 0,
                  gstAmount: 0,
                  creditNoteAmount: 0,
                  netAmount: 0,

                  areaName:
                    row.areaName,

                  salesmanName:
                    row.salesmanName,
                }
              );
            }

            const group =
              groupedRows.get(
                groupKey
              );

            if (productWise) {
              group.qty +=
                toNumber(
                  row.qty
                );
            }

            group.grossAmount +=
              toNumber(
                row.grossAmount
              );

            group.tprAmount +=
              toNumber(
                row.tprAmount
              );

            group.schemeAmount +=
              toNumber(
                row.schemeAmount
              );

            group.cashDiscountAmount +=
              toNumber(
                row.cashDiscountAmount
              );

            group.taxableAmount +=
              toNumber(
                row.taxableAmount
              );

            group.gstAmount +=
              toNumber(
                row.gstAmount
              );

            group.creditNoteAmount +=
              toNumber(
                row.creditNoteAmount
              );

            group.netAmount +=
              toNumber(
                row.netAmount
              );
          }
        );

        rows = Array.from(
          groupedRows.values()
        );
      }

      /*
      * Sort final report rows.
      */
      const sortText = (
        value
      ) =>
        String(value || "")
          .trim()
          .toLowerCase();

      rows.sort(
        (first, second) => {
          if (
            orderBy ===
            "partyCode"
          ) {
            return sortText(
              first.partyCode
            ).localeCompare(
              sortText(
                second.partyCode
              )
            );
          }

          if (
            orderBy === "trn"
          ) {
            const firstSeries =
              sortText(
                first.billSeries
              );

            const secondSeries =
              sortText(
                second.billSeries
              );

            const seriesResult =
              firstSeries.localeCompare(
                secondSeries
              );

            if (
              seriesResult !== 0
            ) {
              return seriesResult;
            }

            return (
              Number(
                first.billNo || 0
              ) -
              Number(
                second.billNo || 0
              )
            );
          }

          if (
            orderBy ===
            "areaName"
          ) {
            return sortText(
              first.areaName
            ).localeCompare(
              sortText(
                second.areaName
              )
            );
          }

          if (
            orderBy ===
            "salesmanName"
          ) {
            return sortText(
              first.salesmanName
            ).localeCompare(
              sortText(
                second
                  .salesmanName
              )
            );
          }

          if (
            orderBy ===
            "netAmountDesc"
          ) {
            return (
              Number(
                second.netAmount ||
                0
              ) -
              Number(
                first.netAmount ||
                0
              )
            );
          }

          if (
            orderBy ===
            "productName"
          ) {
            return sortText(
              first.productName
            ).localeCompare(
              sortText(
                second.productName
              )
            );
          }

          const partyResult =
            sortText(
              first.partyName
            ).localeCompare(
              sortText(
                second.partyName
              )
            );

          if (
            partyResult !== 0
          ) {
            return partyResult;
          }

          const dateResult =
            sortText(
              first.billDate
            ).localeCompare(
              sortText(
                second.billDate
              )
            );

          if (
            dateResult !== 0
          ) {
            return dateResult;
          }

          return (
            Number(
              first.billNo || 0
            ) -
            Number(
              second.billNo || 0
            )
          );
        }
      );

      rows = rows.map(
        (row, index) => ({
          ...row,
          srNo: index + 1,
        })
      );

      /*
      * Product information must appear:
      *
      * 1. When Product Wise = Yes
      * 2. Always for Sales Details
      */
      const showProductDetails =
        productWise ||
        reportLevel ===
        "salesDetails";

      /*
      * Detail columns are used by:
      * - Sales Details
      * - Selected Party
      */
      const detailColumns = [
        {
          key: "srNo",
          label: "Sr No",
        },
        {
          key: "trn",
          label: "Trn",
        },
        {
          key: "billDate",
          label: "Bill Date",
        },
        {
          key: "billSeries",
          label: "Bill Series",
        },
        {
          key: "billNo",
          label: "Bill No",
        },
        {
          key: "billType",
          label: "Bill Type",
        },
        {
          key: "partyCode",
          label: "Party Code",
        },
        {
          key: "partyName",
          label: "Party Name",
        },
      ];

      if (showProductDetails) {
        detailColumns.push(
          {
            key: "productCode",
            label:
              "Product Code",
          },
          {
            key: "productName",
            label:
              "Product Name",
          },
          {
            key: "batch",
            label: "Batch",
          },
          {
            key: "mrp",
            label: "MRP",
            type: "number",
          },
          {
            key: "qty",
            label: "Qty",
            type: "number",
          },
          {
            key: "freeQty",
            label: "Free Qty",
            type: "number",
          },
          {
            key: "salesRate",
            label: "Sale Rate",
            type: "number",
          },
          {
            key: "purchaseRate",
            label: "Pur Rate",
            type: "number",
          },
          {
            key: "godownCode",
            label: "Godown Code",
          },
          {
            key: "godownName",
            label: "Godown",
          },
          {
            key: "stockQty",
            label:
              "Current Stock",
            type: "number",
          },
          {
            key: "mfgDate",
            label: "Mfg Date",
          },
          {
            key: "expiryDate",
            label: "Expiry Date",
          }
        );
      }

      detailColumns.push(
        {
          key: "grossAmount",
          label: "Gross Amt",
          type: "number",
        },
        {
          key: "tprPercent",
          label: "TPR %",
          type: "number",
        },
        {
          key: "tprAmount",
          label: "TPR Amt",
          type: "number",
        },
        {
          key: "schemePercent",
          label: "Sch %",
          type: "number",
        },
        {
          key: "schemeAmount",
          label: "Sch Amt",
          type: "number",
        },
        {
          key:
            "cashDiscountPercent",
          label: "CD %",
          type: "number",
        },
        {
          key:
            "cashDiscountAmount",
          label: "CD Amt",
          type: "number",
        },
        {
          key: "taxableAmount",
          label: "Taxable Amt",
          type: "number",
        },
        {
          key: "gstPercent",
          label: "GST %",
          type: "number",
        },
        {
          key: "gstAmount",
          label: "GST Amt",
          type: "number",
        },
        {
          key:
            "creditNoteAmount",
          label: "Credit Note",
          type: "number",
        },
        {
          key: "netAmount",
          label: "Net Amt",
          type: "number",
        },
        {
          key: "areaName",
          label: "Area Name",
        },
        {
          key: "salesmanName",
          label:
            "Salesman Name",
        }
      );

      /*
      * Summary columns.
      */
      const summaryColumns = [
        {
          key: "srNo",
          label: "Sr No",
        },
        {
          key: "partyCode",
          label: "Party Code",
        },
        {
          key: "partyName",
          label: "Party Name",
        },
      ];

      if (productWise) {
        summaryColumns.push(
          {
            key: "productCode",
            label:
              "Product Code",
          },
          {
            key: "productName",
            label:
              "Product Name",
          },
          {
            key: "qty",
            label: "Qty",
            type: "number",
          }
        );
      }

      summaryColumns.push(
        {
          key: "grossAmount",
          label: "Gross Amt",
          type: "number",
        },
        {
          key: "tprAmount",
          label: "TPR Amt",
          type: "number",
        },
        {
          key: "schemeAmount",
          label: "Sch Amt",
          type: "number",
        },
        {
          key:
            "cashDiscountAmount",
          label: "CD Amt",
          type: "number",
        },
        {
          key: "taxableAmount",
          label: "Taxable Amt",
          type: "number",
        },
        {
          key: "gstAmount",
          label: "GST Amt",
          type: "number",
        },
        {
          key:
            "creditNoteAmount",
          label: "Credit Note",
          type: "number",
        },
        {
          key: "netAmount",
          label: "Net Amt",
          type: "number",
        },
        {
          key: "areaName",
          label: "Area Name",
        },
        {
          key: "salesmanName",
          label:
            "Salesman Name",
        }
      );

      return res.json({
        success: true,
        count: rows.length,
        reportLevel,
        productWise,
        rows,

        columns:
          reportLevel ===
            "salesSummary"
            ? summaryColumns
            : detailColumns,
      });
    } catch (error) {
      console.error(
        "Party sales report error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to generate party sales report.",
          error: error.message,
        });
    }
  }
);


const quotationHeaderSchema =
  new mongoose.Schema(
    {
      distributorId: {
        type: String,
        required: true,
      },

      firmId: {
        type: String,
        required: true,
      },

      firmName: {
        type: String,
        default: "",
      },

      BillDate: {
        type: String,
        default: "",
      },

      Godown: {
        type: String,
        default: "",
      },

      GDCode: {
        type: String,
        default: "",
      },

      CompanyCode: {
        type: String,
        default: "",
      },

      CompanyName: {
        type: String,
        default: "",
      },

      AreaCode: {
        type: String,
        default: "",
      },

      AreaName: {
        type: String,
        default: "",
      },

      PartyCode: {
        type: String,
        default: "",
      },

      PartyName: {
        type: String,
        default: "",
      },

      BillSeries: {
        type: String,
        default: "",
        trim: true,
      },

      BillNo: {
        type: Number,
        required: true,
      },

      BillType: {
        type: String,
        default: "Credit",
      },

      DueDate: {
        type: String,
        default: "",
      },

      SalesmanCode: {
        type: String,
        default: "",
      },

      SalesmanName: {
        type: String,
        default: "",
      },

      Narration: {
        type: String,
        default: "",
      },

      GrossAmount: {
        type: Number,
        default: 0,
      },

      TPRAmount: {
        type: Number,
        default: 0,
      },

      SchemeAmount: {
        type: Number,
        default: 0,
      },

      StarDiscountAmount: {
        type: Number,
        default: 0,
      },

      CashDiscountAmount: {
        type: Number,
        default: 0,
      },

      DisplayAmount: {
        type: Number,
        default: 0,
      },

      CouponAmount: {
        type: Number,
        default: 0,
      },

      AddLessAmount: {
        type: Number,
        default: 0,
      },

      TaxableValue: {
        type: Number,
        default: 0,
      },

      SGSTAmount: {
        type: Number,
        default: 0,
      },

      CGSTAmount: {
        type: Number,
        default: 0,
      },

      IGSTAmount: {
        type: Number,
        default: 0,
      },

      OriginalNetAmount: {
        type: Number,
        default: 0,
      },

      NetAmount: {
        type: Number,
        default: 0,
      },

      TotalQty: {
        type: Number,
        default: 0,
      },

      TotalFreeQty: {
        type: Number,
        default: 0,
      },

      TotalItems: {
        type: Number,
        default: 0,
      },

      items: {
        type: Array,
        default: [],
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      collection: "T_Quotation_Header",
    }
  );

quotationHeaderSchema.index(
  {
    distributorId: 1,
    firmId: 1,
    BillSeries: 1,
    BillNo: 1,
  },
  {
    unique: true,
  }
);

const QuotationHeader = mongoose.model(
  "T_Quotation_Header",
  quotationHeaderSchema
);

const loadHeaderSchema = new mongoose.Schema(
  {
    LoadSeries: {
      type: String,
      default: "",
      trim: true,
    },

    LoadNo: {
      type: Number,
      required: true,
    },

    LoadDate: {
      type: String,
      default: "",
    },

    CompanyCode: {
      type: String,
      default: "",
      trim: true,
    },

    CompanyName: {
      type: String,
      default: "",
      trim: true,
    },

    DeliveryBoyCode: {
      type: String,
      default: "",
      trim: true,
    },

    DeliveryBoyName: {
      type: String,
      default: "",
      trim: true,
    },

    DeliveryBy: {
      type: String,
      default: "",
      trim: true,
    },

    VehicleNo: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    DriverMobile: {
      type: String,
      default: "",
      trim: true,
    },

    SalesmanCode: {
      type: String,
      default: "",
      trim: true,
    },

    SalesmanName: {
      type: String,
      default: "",
      trim: true,
    },

    SelectedSalesmen: {
      type: [
        {
          salesmanCode: {
            type: String,
            default: "",
          },

          salesmanName: {
            type: String,
            default: "",
          },
        },
      ],
      default: [],
    },

    SelectedAreas: {
      type: [
        {
          areaCode: {
            type: String,
            default: "",
          },

          areaName: {
            type: String,
            default: "",
          },
        },
      ],
      default: [],
    },

    BillFromDate: {
      type: String,
      default: "",
    },

    BillToDate: {
      type: String,
      default: "",
    },

    Narration: {
      type: String,
      default: "",
      trim: true,
    },

    Remarks: {
      type: String,
      default: "",
      trim: true,
    },

    Bills: {
      type: Array,
      default: [],
    },

    TotalBills: {
      type: Number,
      default: 0,
    },

    TotalParties: {
      type: Number,
      default: 0,
    },

    TotalSalesmen: {
      type: Number,
      default: 0,
    },

    TotalAreas: {
      type: Number,
      default: 0,
    },

    TotalAmount: {
      type: Number,
      default: 0,
    },

    LoadSummary: {
      totalSalesmen: {
        type: Number,
        default: 0,
      },

      totalAreas: {
        type: Number,
        default: 0,
      },

      totalBills: {
        type: Number,
        default: 0,
      },

      totalParties: {
        type: Number,
        default: 0,
      },

      totalAmount: {
        type: Number,
        default: 0,
      },
    },

    DistributorId: {
      type: String,
      required: true,
      trim: true,
    },

    FirmId: {
      type: String,
      required: true,
      trim: true,
    },

    FirmName: {
      type: String,
      default: "",
      trim: true,
    },

    Status: {
      type: String,
      default: "ACTIVE",
    },

    IsCancelled: {
      type: Boolean,
      default: false,
    },

    IsLocked: {
      type: Boolean,
      default: false,
    },

    CreatedBy: {
      type: String,
      default: "",
    },

    UpdatedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: {
      createdAt: "CreatedAt",
      updatedAt: "UpdatedAt",
    },

    collection: "T_Load_Header",
  }
);

loadHeaderSchema.index(
  {
    DistributorId: 1,
    FirmId: 1,
    LoadSeries: 1,
    LoadNo: 1,
  },
  {
    unique: true,
  }
);

const LoadHeader = mongoose.model(
  "T_Load_Header",
  loadHeaderSchema
);


const OtherAccount = mongoose.model("Mas_OtherAccount", otherAccountSchema);
app.get(
  "/api/companies",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      const companies = await Company.find({
        distributorId,
        firmId,
        isActive: true,
      })
        .sort({
          companyName: 1,
          companyCode: 1,
        })
        .lean();

      return res.json({
        success: true,
        count: companies.length,
        companies,
      });
    } catch (error) {
      console.error(
        "Company load error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch companies",
        error: error.message,
      });
    }
  }
);
app.get(
  "/api/companies/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(requestedLimit, 100)
          : 10;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const filter = {
        distributorId,
        firmId,
        isActive: true,
      };

      if (escapedSearch) {
        const searchRegex = new RegExp(
          escapedSearch,
          "i"
        );

        filter.$or = [
          {
            companyCode: searchRegex,
          },
          {
            companyName: searchRegex,
          },
          {
            companyAddress: searchRegex,
          },
          {
            branchOfficeAddress: searchRegex,
          },
          {
            firmName: searchRegex,
          },
        ];
      }

      const totalRecords =
        await Company.countDocuments(filter);

      const totalPages = Math.max(
        1,
        Math.ceil(totalRecords / limit)
      );

      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) * limit;

      const companies = await Company.find(
        filter
      )
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean();

      return res.json({
        success: true,
        companies,
        count: companies.length,

        pagination: {
          currentPage,
          page: currentPage,
          limit,
          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage < totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip + companies.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Company Master list pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch company list",
        error: error.message,
      });
    }
  }
);

app.post("/api/companies", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, firmName, code, name, address, branchAddress } = req.body;

    if (!distributorId || !firmId || !code || !name) {
      return res.status(400).json({
        success: false,
        message: "distributorId, firmId, code and name are required",
      });
    }

    const company = await Company.create({
      companyCode: code.trim(),
      companyName: name.trim(),
      companyAddress: address || "",
      branchOfficeAddress: branchAddress || "",
      distributorId,
      firmId,
      firmName: firmName || "",
      isActive: true,
    });

    res.status(201).json({ success: true, message: "Company created successfully", data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: "Company creation failed", error: error.message });
  }
});

app.put("/api/companies/:id", ensureConnection, async (req, res) => {
  try {
    const { code, name, address, branchAddress } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Code and Name are required",
      });
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      {
        companyCode: code.trim(),
        companyName: name.trim(),
        companyAddress: address || "",
        branchOfficeAddress: branchAddress || "",
      },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.json({ success: true, message: "Company updated successfully", data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: "Company update failed", error: error.message });
  }
});

// ---------- COMPANY ----------
app.delete("/api/companies/:id", ensureConnection, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const distributorId = company.distributorId;
    const firmId = company.firmId;
    const companyCode = String(company.companyCode || "").trim();
    const companyName = String(company.companyName || "").trim();

    const usedIn = [];

    const salesUsed = await SalesHeader.exists({
      distributorId,
      firmId,
      isActive: true,
      CompanyCode: companyCode,
    });

    if (salesUsed) usedIn.push("Sales");

    const purchaseUsed = await PurchaseHeader.exists({
      distributorId,
      firmId,
      isActive: true,
      $or: [
        { company: companyCode },
        { company: companyName },
      ],
    });

    if (purchaseUsed) usedIn.push("Purchase");

    const creditNoteUsed = await CreditNote.exists({
      distributorId,
      firmId,
      isActive: true,
      CompanyCode: companyCode,
    });

    if (creditNoteUsed) usedIn.push("Credit Note");

    if (usedIn.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete company "${companyName}". It is used in: ${usedIn.join(", ")}.`,
      });
    }

    await Company.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Company delete failed",
      error: error.message,
    });
  }
});

app.get("/api/groups", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const groups = await Group.find({
      distributorId,
      firmId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: groups.length, groups });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch groups",
      error: error.message,
    });
  }
});

app.get(
  "/api/groups/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(requestedLimit, 100)
          : 10;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const filter = {
        distributorId,
        firmId,
        isActive: true,
      };

      if (escapedSearch) {
        const searchRegex = new RegExp(
          escapedSearch,
          "i"
        );

        filter.$or = [
          {
            groupCode: searchRegex,
          },
          {
            groupName: searchRegex,
          },
          {
            firmName: searchRegex,
          },
        ];
      }

      const totalRecords =
        await Group.countDocuments(filter);

      const totalPages = Math.max(
        1,
        Math.ceil(totalRecords / limit)
      );

      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) * limit;

      const groups = await Group.find(filter)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean();

      return res.json({
        success: true,

        groups,

        count: groups.length,

        pagination: {
          currentPage,
          page: currentPage,
          limit,
          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage < totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip + groups.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Group Master list pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch Group Master list",
        error: error.message,
      });
    }
  }
);

app.post("/api/groups", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, firmName, code, name } = req.body;

    if (!distributorId || !firmId || !code || !name) {
      return res.status(400).json({
        success: false,
        message: "distributorId, firmId, code and name are required",
      });
    }

    const group = await Group.create({
      groupCode: code.trim(),
      groupName: name.trim(),
      distributorId,
      firmId,
      firmName: firmName || "",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Group creation failed",
      error: error.message,
    });
  }
});

app.get("/api/categories", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const categories = await Category.find({
      distributorId,
      firmId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
});
app.get(
  "/api/categories/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(requestedLimit, 100)
          : 10;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const filter = {
        distributorId,
        firmId,
        isActive: true,
      };

      if (escapedSearch) {
        const searchRegex = new RegExp(
          escapedSearch,
          "i"
        );

        filter.$or = [
          {
            categoryCode: searchRegex,
          },
          {
            categoryName: searchRegex,
          },
          {
            firmName: searchRegex,
          },
        ];
      }

      const totalRecords =
        await Category.countDocuments(filter);

      const totalPages = Math.max(
        1,
        Math.ceil(totalRecords / limit)
      );

      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) * limit;

      const categories =
        await Category.find(filter)
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        categories,

        count: categories.length,

        pagination: {
          currentPage,
          page: currentPage,
          limit,
          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage < totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip + categories.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Category Master list pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch Category Master list",
        error: error.message,
      });
    }
  }
);

app.post("/api/categories", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, firmName, code, name } = req.body;

    if (!distributorId || !firmId || !code || !name) {
      return res.status(400).json({
        success: false,
        message: "distributorId, firmId, code and name are required",
      });
    }

    const category = await Category.create({
      categoryCode: code.trim(),
      categoryName: name.trim(),
      distributorId,
      firmId,
      firmName: firmName || "",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Category creation failed",
      error: error.message,
    });
  }
});

app.get("/api/products", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, companyCode = "", companyName = "" } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const filter = {
      distributorId,
      firmId,
      isActive: true,
    };

    if (companyCode || companyName) {
      filter.$or = [
        { companyId: String(companyCode).trim() },
        { companyCode: String(companyCode).trim() },
        { companyName: String(companyName).trim() },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});
app.get(
  "/api/products/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const companyCode = String(
        req.query.companyCode || ""
      ).trim();

      const groupCode = String(
        req.query.groupCode || ""
      ).trim();

      const categoryCode = String(
        req.query.categoryCode || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(requestedLimit, 100)
          : 20;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      /*
      * Main filters.
      */
      const filter = {
        distributorId,
        firmId,

        /*
        * Include active records and old records
        * where isActive may not exist.
        */
        isActive: {
          $ne: false,
        },
      };

      /*
      * Store all optional filters inside $and.
      *
      * This avoids conflicts between:
      * - product search
      * - company filter
      * - group filter
      * - category filter
      */
      const andConditions = [];

      if (companyCode) {
        andConditions.push({
          $or: [
            {
              CompanyCode: companyCode,
            },
            {
              companyCode,
            },
            {
              CompCode: companyCode,
            },
          ],
        });
      }

      if (groupCode) {
        andConditions.push({
          $or: [
            {
              GroupCode: groupCode,
            },
            {
              groupCode,
            },
          ],
        });
      }

      if (categoryCode) {
        andConditions.push({
          $or: [
            {
              CategoryCode: categoryCode,
            },
            {
              categoryCode,
            },
          ],
        });
      }

      /*
      * Backend product search.
      */
      if (search) {
        const escapedSearch = search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const searchRegex = new RegExp(
          escapedSearch,
          "i"
        );

        andConditions.push({
          $or: [
            {
              ProdCode: searchRegex,
            },
            {
              productCode: searchRegex,
            },
            {
              code: searchRegex,
            },

            {
              ProdName: searchRegex,
            },
            {
              productName: searchRegex,
            },
            {
              name: searchRegex,
            },

            {
              ShortCode: searchRegex,
            },
            {
              shortCode: searchRegex,
            },

            {
              EANNo: searchRegex,
            },
            {
              EANCode: searchRegex,
            },
            {
              eanCode: searchRegex,
            },
            {
              barcode: searchRegex,
            },

            {
              CompanyCode: searchRegex,
            },
            {
              companyCode: searchRegex,
            },

            {
              CompanyName: searchRegex,
            },
            {
              companyName: searchRegex,
            },

            {
              GroupCode: searchRegex,
            },
            {
              groupCode: searchRegex,
            },

            {
              GroupName: searchRegex,
            },
            {
              groupName: searchRegex,
            },

            {
              CategoryCode: searchRegex,
            },
            {
              categoryCode: searchRegex,
            },

            {
              CategoryName: searchRegex,
            },
            {
              categoryName: searchRegex,
            },

            {
              HSNCode: searchRegex,
            },
            {
              hsnCode: searchRegex,
            },
            {
              hsn: searchRegex,
            },
          ],
        });
      }

      if (andConditions.length > 0) {
        filter.$and = andConditions;
      }

      /*
      * Count matching records.
      */
      const totalRecords =
        await Product.countDocuments(filter);

      const totalPages = Math.max(
        1,
        Math.ceil(totalRecords / limit)
      );

      /*
      * Prevent requesting a page greater than
      * the available page count.
      */
      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) * limit;

      /*
      * Fetch only the current page.
      */
      const products = await Product.find(
        filter
      )
        .sort({
          ProdName: 1,
          productName: 1,
          ProdCode: 1,
          productCode: 1,
          _id: 1,
        })
        .skip(skip)
        .limit(limit)
        .lean();

      return res.status(200).json({
        success: true,

        products,

        count: products.length,

        pagination: {
          currentPage,
          page: currentPage,
          limit,

          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage < totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip + products.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Product Master pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Product Master",
        error: error.message,
      });
    }
  }
);

app.post("/api/products", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, firmName, code, name } = req.body;

    if (!distributorId || !firmId || !code || !name) {
      return res.status(400).json({
        success: false,
        message: "distributorId, firmId, code and name are required",
      });
    }

    const product = await Product.create({
      productCode: code.trim(),
      productName: name.trim(),
      ...req.body,
      distributorId,
      firmId,
      firmName: firmName || "",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Product creation failed",
      error: error.message,
    });
  }
});
// ==================== GET ACCOUNTS WITH AREA DATA ====================
app.get("/api/accounts", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    // Fetch accounts with area data populated
    const accounts = await Account.find({
      distributorId,
      firmId,
      isActive: true,
    })
      .select('accountCode accountName openingDate address town state pinCode phoneNo mobileNo emailId tinNo openingBal openingBalType contactPerson invType taxOn panNo foodLicense gstNo billToAdd1 tanNo gstType gstDate gstClsDate add2 tcsPercent allowInPurchase drugLicNo drugExpDate creditDays creditBills lockDays creditAmt blackListed lastBillDate lastInvoiceDate areaCode distributorId firmId firmName isActive createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Get all areas for this firm to populate town dropdown
    const areas = await Area.find({
      distributorId,
      firmId,
      isActive: true,
    }).select('areaCode areaName').lean();

    res.json({
      success: true,
      count: accounts.length,
      accounts,
      areas // Send areas data to frontend for dropdown
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch accounts",
      error: error.message,
    });
  }
});

/* =========================================================
  ACCOUNT MASTER PAGINATED LIST

  Existing:
  GET /api/accounts
  remains unchanged.

  New:
  GET /api/accounts/list
  is used only by Account Master grid.
  ========================================================= */

app.get(
  "/api/accounts/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 20;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      const filter = {
        distributorId,
        firmId,

        /*
        * This includes:
        * - active accounts
        * - old accounts where isActive does not exist
        */
        isActive: {
          $ne: false,
        },
      };

      /*
      * Backend search.
      */
      if (search) {
        const escapedSearch =
          search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const searchRegex =
          new RegExp(
            escapedSearch,
            "i"
          );

        filter.$or = [
          {
            accountCode:
              searchRegex,
          },
          {
            accountName:
              searchRegex,
          },
          {
            contactPerson:
              searchRegex,
          },
          {
            mobileNo:
              searchRegex,
          },
          {
            phoneNo:
              searchRegex,
          },
          {
            emailId:
              searchRegex,
          },
          {
            town:
              searchRegex,
          },
          {
            state:
              searchRegex,
          },
          {
            pinCode:
              searchRegex,
          },
          {
            gstNo:
              searchRegex,
          },
          {
            tinNo:
              searchRegex,
          },
          {
            panNo:
              searchRegex,
          },
          {
            areaCode:
              searchRegex,
          },
          {
            address:
              searchRegex,
          },
        ];
      }

      /*
      * Count matching accounts.
      */
      const totalRecords =
        await Account.countDocuments(
          filter
        );

      const totalPages = Math.max(
        1,
        Math.ceil(
          totalRecords / limit
        )
      );

      /*
      * Prevent loading a page greater than
      * the available total pages.
      */
      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) *
        limit;

      /*
      * Load only the current Account Master page.
      *
      * All fields are returned because the same row
      * is passed to the Edit Account form.
      */
      const accounts =
        await Account.find(filter)
          .select(
            [
              "accountCode",
              "accountName",
              "openingDate",
              "address",
              "town",
              "state",
              "pinCode",
              "phoneNo",
              "mobileNo",
              "emailId",
              "tinNo",
              "openingBal",
              "openingBalType",
              "contactPerson",
              "invType",
              "taxOn",
              "panNo",
              "foodLicense",
              "gstNo",
              "billToAdd1",
              "tanNo",
              "gstType",
              "gstDate",
              "gstClsDate",
              "add2",
              "tcsPercent",
              "allowInPurchase",
              "drugLicNo",
              "drugExpDate",
              "creditDays",
              "creditBills",
              "lockDays",
              "creditAmt",
              "blackListed",
              "lastBillDate",
              "lastInvoiceDate",
              "areaCode",
              "distributorId",
              "firmId",
              "firmName",
              "isActive",
              "createdAt",
              "updatedAt",
            ].join(" ")
          )
          .sort({
            accountName: 1,
            accountCode: 1,
            _id: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.status(200).json({
        success: true,

        accounts,

        count: accounts.length,

        pagination: {
          currentPage,
          page: currentPage,
          limit,

          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                accounts.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Account Master pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Account Master",
        error: error.message,
      });
    }
  }
);
app.post("/api/accounts", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    const accountCode = String(req.body.accountCode || "").trim();
    const accountName = String(req.body.accountName || "").trim();

    if (!distributorId || !firmId || !accountCode || !accountName) {
      return res.status(400).json({
        success: false,
        message: "distributorId, firmId, accountCode and accountName are required",
      });
    }

    let townValue = req.body.town || "Pune";
    let areaCodeValue = req.body.areaCode || "";

    if (areaCodeValue) {
      const area = await Area.findOne({
        distributorId,
        firmId,
        areaCode: areaCodeValue,
        isActive: true,
      });

      if (area) {
        townValue = area.areaName;
      }
    }

    const account = await Account.create({
      accountCode,
      accountName,

      openingDate: req.body.openingDate || "",
      address: req.body.address || "",
      town: townValue,
      state: req.body.state || "MAHARASHTRA",
      pinCode: req.body.pinCode || "",
      phoneNo: req.body.phoneNo || "",
      mobileNo: req.body.mobileNo || "",
      emailId: req.body.emailId || "",
      tinNo: req.body.tinNo || "",
      openingBal: Number(req.body.openingBal || 0),
      openingBalType: req.body.openingBalType || "Dr",
      contactPerson: req.body.contactPerson || "",

      invType: req.body.invType || "TAXABLE",
      taxOn: req.body.taxOn || "SRATE",

      panNo: req.body.panNo || "",
      foodLicense: req.body.foodLicense || "",
      gstNo: req.body.gstNo || "",
      billToAdd1: req.body.billToAdd1 || "",
      tanNo: req.body.tanNo || "",
      gstType: req.body.gstType || "Unregistered",
      gstDate: req.body.gstDate || "",
      gstClsDate: req.body.gstClsDate || "",
      add2: req.body.add2 || "",
      tcsPercent: Number(req.body.tcsPercent || 0),
      allowInPurchase: req.body.allowInPurchase || "N",

      drugLicNo: req.body.drugLicNo || "",
      drugExpDate: req.body.drugExpDate || "",

      // NEW FIELDS
      creditDays: Number(req.body.creditDays || 0),
      creditBills: Number(req.body.creditBills || 0),
      lockDays: Number(req.body.lockDays || 0),
      creditAmt: Number(req.body.creditAmt || 0),
      blackListed: String(req.body.blackListed || "NO").trim().toUpperCase() === "YES" ? "YES" : "NO",
      lastBillDate: req.body.lastBillDate || "",
      lastInvoiceDate: req.body.lastInvoiceDate || "",
      // END NEW FIELDS

      areaCode: areaCodeValue || "",
      distributorId,
      firmId,
      firmName,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: account,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Account code already exists for this firm",
      });
    }
    res.status(500).json({
      success: false,
      message: "Account creation failed",
      error: error.message,
    });
  }
});
app.get("/api/other-accounts", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const otherAccounts = await OtherAccount.find({
      distributorId,
      firmId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: otherAccounts.length,
      otherAccounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch other accounts",
      error: error.message,
    });
  }
});
/* =========================================================
  OTHER ACCOUNT MASTER PAGINATED LIST

  Existing:
  GET /api/other-accounts
  remains unchanged.

  New:
  GET /api/other-accounts/list
  used only by Other Account Master grid.
  ========================================================= */

app.get(
  "/api/other-accounts/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 20;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      const filter = {
        distributorId,
        firmId,

        /*
        * Include active records and older records
        * where isActive may not exist.
        */
        isActive: {
          $ne: false,
        },
      };

      if (search) {
        const escapedSearch =
          search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const searchRegex =
          new RegExp(
            escapedSearch,
            "i"
          );

        filter.$or = [
          {
            accountCode:
              searchRegex,
          },
          {
            accountName:
              searchRegex,
          },
          {
            accountGroup:
              searchRegex,
          },
          {
            mobileNo:
              searchRegex,
          },
          {
            phoneNo:
              searchRegex,
          },
          {
            emailId:
              searchRegex,
          },
          {
            town:
              searchRegex,
          },
          {
            state:
              searchRegex,
          },
          {
            pinCode:
              searchRegex,
          },
          {
            gstNo:
              searchRegex,
          },
          {
            tinNo:
              searchRegex,
          },
          {
            panNo:
              searchRegex,
          },
          {
            bankAccountNo:
              searchRegex,
          },
          {
            ifscCode:
              searchRegex,
          },
          {
            branchName:
              searchRegex,
          },
          {
            remark:
              searchRegex,
          },
        ];
      }

      const totalRecords =
        await OtherAccount.countDocuments(
          filter
        );

      const totalPages = Math.max(
        1,
        Math.ceil(
          totalRecords / limit
        )
      );

      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) *
        limit;

      const otherAccounts =
        await OtherAccount.find(filter)
          .sort({
            accountName: 1,
            accountCode: 1,
            _id: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.status(200).json({
        success: true,

        otherAccounts,

        count:
          otherAccounts.length,

        pagination: {
          currentPage,
          page: currentPage,
          limit,

          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                otherAccounts.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Other Account Master pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Other Account Master",
        error: error.message,
      });
    }
  }
);

app.post("/api/other-accounts", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    const accountCode = String(req.body.accountCode || "").trim();
    const accountName = String(req.body.accountName || "").trim();

    if (!distributorId || !firmId || !accountCode || !accountName) {
      return res.status(400).json({
        success: false,
        message: "distributorId, firmId, accountCode and accountName are required",
      });
    }

    const otherAccount = await OtherAccount.create({
      ...req.body,
      accountCode,
      accountName,
      distributorId,
      firmId,
      firmName,
      branch: req.body.branch || req.body.branchName || "",
      branchName: req.body.branchName || req.body.branch || "",
      openingBal: Number(req.body.openingBal || 0),
      tcsPercent: Number(req.body.tcsPercent || 0),
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Other account created successfully",
      data: otherAccount,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Other account code already exists for this firm",
      });
    }

    res.status(500).json({
      success: false,
      message: "Other account creation failed",
      error: error.message,
    });
  }
});

app.get("/api/firms", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(
      req.query.distributorId || ""
    ).trim();

    const search = String(
      req.query.search || ""
    ).trim();

    /*
    * Safe pagination values.
    *
    * Existing frontend calls without page and limit
    * will automatically load page 1 with 10 records.
    */
    const requestedPage = Number.parseInt(
      req.query.page,
      10
    );

    const requestedLimit = Number.parseInt(
      req.query.limit,
      10
    );

    const page =
      Number.isFinite(requestedPage) &&
        requestedPage > 0
        ? requestedPage
        : 1;

    /*
    * Maximum 100 records per request prevents
    * accidental very large API responses.
    */
    const limit =
      Number.isFinite(requestedLimit) &&
        requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 10;

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "distributorId is required",
      });
    }

    /*
    * Escape special regular-expression characters
    * entered in the search box.
    */
    const escapedSearch = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const filter = {
      distributorId,
      isActive: true,
    };

    /*
    * Search is applied before count, skip and limit.
    * This means pagination works on filtered records.
    */
    if (escapedSearch) {
      const searchRegex = new RegExp(
        escapedSearch,
        "i"
      );

      filter.$or = [
        { firmCode: searchRegex },
        { firmName: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
        { mobileNo: searchRegex },
        { phoneNo: searchRegex },
        { gstNo: searchRegex },
        { email: searchRegex },
      ];
    }

    /*
    * Count matching records first so frontend
    * can calculate pagination buttons.
    */
    const totalRecords =
      await Register.countDocuments(filter);

    const totalPages =
      Math.max(
        1,
        Math.ceil(totalRecords / limit)
      );

    /*
    * If the requested page is greater than the
    * available pages, return the last valid page.
    */
    const currentPage =
      Math.min(page, totalPages);

    const skip =
      (currentPage - 1) * limit;

    const firms = await Register.find(
      filter,
      {
        password: 0,
      }
    )
      .sort({
        firmName: 1,
        _id: 1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,

      firms,

      pagination: {
        currentPage,
        page: currentPage,
        limit,
        totalRecords,
        totalPages,

        hasPreviousPage:
          currentPage > 1,

        hasNextPage:
          currentPage < totalPages,

        startRecord:
          totalRecords === 0
            ? 0
            : skip + 1,

        endRecord:
          totalRecords === 0
            ? 0
            : Math.min(
              skip + firms.length,
              totalRecords
            ),
      },
    });
  } catch (error) {
    console.error(
      "❌ Firm pagination load error:",
      error
    );

    return res.status(500).json({
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

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },
    userName: { type: String, required: true, trim: true },
    oldPassword: { type: String, default: "" },
    password: { type: String, required: true },
    role: { type: String, default: "USER" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_User" }
);

const companySchema = new mongoose.Schema(
  {
    companyCode: String,
    companyName: String,
    companyAddress: String,
    branchOfficeAddress: String,
    distributorId: String,
    firmId: String,
    firmName: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_Company" }
);

const User = mongoose.model("Mas_User", userSchema);
const Company = mongoose.model("Mas_Company", companySchema);


app.get("/api/gst", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const gstList = await GST.find({
      distributorId,
      firmId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: gstList.length,
      gstList,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch GST list",
      error: error.message,
    });
  }
});
/* =========================================================
  GST MASTER PAGINATED LIST

  Existing:
  GET /api/gst
  remains unchanged.

  New:
  GET /api/gst/list
  used only by GST Master grid.
  ========================================================= */

app.get(
  "/api/gst/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage =
        Number.parseInt(
          req.query.page,
          10
        );

      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10
        );

      const page =
        Number.isFinite(
          requestedPage
        ) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(
          requestedLimit
        ) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 10;

      if (
        !distributorId ||
        !firmId
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "distributorId and firmId are required",
          });
      }

      const filter = {
        distributorId,
        firmId,

        /*
        * Include active GST records and
        * older records where isActive
        * may not be present.
        */
        isActive: {
          $ne: false,
        },
      };

      if (search) {
        const escapedSearch =
          search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const searchRegex =
          new RegExp(
            escapedSearch,
            "i"
          );

        const numericSearch =
          Number(search);

        filter.$or = [
          {
            gstCode:
              searchRegex,
          },
          {
            purchaseType:
              searchRegex,
          },
          {
            salesType:
              searchRegex,
          },
        ];

        /*
        * Allow exact search by GST percentage.
        * For example: 5, 12, 18 or 28.
        */
        if (
          Number.isFinite(
            numericSearch
          )
        ) {
          filter.$or.push({
            vatPercent:
              numericSearch,
          });
        }
      }

      const totalRecords =
        await GST.countDocuments(
          filter
        );

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalRecords /
            limit
          )
        );

      /*
      * If requested page becomes invalid
      * after deletion, return the last
      * available page.
      */
      const currentPage =
        Math.min(
          page,
          totalPages
        );

      const skip =
        (currentPage - 1) *
        limit;

      const gstList =
        await GST.find(filter)
          .sort({
            vatPercent: 1,
            gstCode: 1,
            _id: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res
        .status(200)
        .json({
          success: true,

          gstList,

          count:
            gstList.length,

          pagination: {
            currentPage,
            page:
              currentPage,
            limit,

            totalRecords,
            totalPages,

            hasPreviousPage:
              currentPage > 1,

            hasNextPage:
              currentPage <
              totalPages,

            startRecord:
              totalRecords === 0
                ? 0
                : skip + 1,

            endRecord:
              totalRecords === 0
                ? 0
                : Math.min(
                  skip +
                  gstList.length,
                  totalRecords
                ),
          },
        });
    } catch (error) {
      console.error(
        "GST Master pagination error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load GST Master",
          error:
            error.message,
        });
    }
  }
);

app.post("/api/gst", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    const gstCode = String(
      req.body.gstCode || req.body.code || ""
    ).trim();

    const vatPercent = Number(
      req.body.vatPercent ?? req.body.vat ?? 0
    );

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found. Please login again.",
      });
    }

    if (!gstCode || vatPercent === "" || isNaN(vatPercent)) {
      return res.status(400).json({
        success: false,
        message: "GST Code and VAT Percent are required",
      });
    }

    const gst = await GST.create({
      gstCode,
      vatPercent,
      purchaseType:
        req.body.purchaseType || "VAT ON PURCHASE PRICE",
      salesType:
        req.body.salesType || "VAT ON SALES PRICE",
      distributorId,
      firmId,
      firmName,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "GST saved successfully",
      data: gst,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This GST Code already exists for this firm",
      });
    }

    res.status(500).json({
      success: false,
      message: "GST save failed",
      error: error.message,
    });
  }
});
app.get("/api/sales/bill", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || "").trim();
    const firmId = String(req.query.firmId || "").trim();

    const billSeries = String(
      req.query.billSeries || req.query.BillSeries || ""
    ).trim();

    const billNo = Number(
      req.query.billNo || req.query.BillNo || 0
    );

    if (!distributorId || !firmId || !billNo) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm and Bill No are required",
      });
    }

    const bill = await SalesHeader.findOne({
      distributorId,
      firmId,
      BillSeries: billSeries,
      BillNo: billNo,
      isActive: true,
    }).lean();

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Sales bill not found",
      });
    }

    return res.json({
      success: true,
      bill,
    });
  } catch (error) {
    console.error("❌ Sales bill load error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load sales bill",
      error: error.message,
    });
  }
});


app.get("/api/salesmen", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const salesmen = await Salesman.find({
      distributorId,
      firmId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: salesmen.length,
      salesmen,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch salesmen",
      error: error.message,
    });
  }
});
/* =========================================================
  SALESMAN MASTER PAGINATED LIST

  Existing:
  GET /api/salesmen
  remains unchanged.

  New:
  GET /api/salesmen/list
  used only by Salesman Master grid.
  ========================================================= */

app.get(
  "/api/salesmen/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage =
        Number.parseInt(
          req.query.page,
          10
        );

      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10
        );

      const page =
        Number.isFinite(
          requestedPage
        ) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(
          requestedLimit
        ) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 20;

      if (
        !distributorId ||
        !firmId
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "distributorId and firmId are required",
          });
      }

      const filter = {
        distributorId,
        firmId,

        /*
        * Include active records and older
        * records where isActive may not exist.
        */
        isActive: {
          $ne: false,
        },
      };

      if (search) {
        const escapedSearch =
          search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const searchRegex =
          new RegExp(
            escapedSearch,
            "i"
          );

        filter.$or = [
          {
            salesmanCode:
              searchRegex,
          },
          {
            salesmanName:
              searchRegex,
          },
          {
            salesmanType:
              searchRegex,
          },
          {
            mobileNo:
              searchRegex,
          },
          {
            phoneNo:
              searchRegex,
          },
          {
            emailId:
              searchRegex,
          },
          {
            town:
              searchRegex,
          },
          {
            state:
              searchRegex,
          },
          {
            pinCode:
              searchRegex,
          },
          {
            qualification:
              searchRegex,
          },
          {
            reference:
              searchRegex,
          },
          {
            imeiNo:
              searchRegex,
          },
          {
            address:
              searchRegex,
          },
        ];
      }

      const totalRecords =
        await Salesman.countDocuments(
          filter
        );

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalRecords /
            limit
          )
        );

      /*
      * If requested page becomes invalid
      * after deletion, return the last
      * available page.
      */
      const currentPage =
        Math.min(
          page,
          totalPages
        );

      const skip =
        (currentPage - 1) *
        limit;

      const salesmen =
        await Salesman.find(filter)
          .sort({
            salesmanName: 1,
            salesmanCode: 1,
            _id: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res
        .status(200)
        .json({
          success: true,

          salesmen,

          count:
            salesmen.length,

          pagination: {
            currentPage,
            page:
              currentPage,
            limit,

            totalRecords,
            totalPages,

            hasPreviousPage:
              currentPage > 1,

            hasNextPage:
              currentPage <
              totalPages,

            startRecord:
              totalRecords === 0
                ? 0
                : skip + 1,

            endRecord:
              totalRecords === 0
                ? 0
                : Math.min(
                  skip +
                  salesmen.length,
                  totalRecords
                ),
          },
        });
    } catch (error) {
      console.error(
        "Salesman Master pagination error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load Salesman Master",
          error:
            error.message,
        });
    }
  }
);

app.post("/api/salesmen", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    const salesmanCode = String(
      req.body.salesmanCode || req.body.code || ""
    ).trim();

    const salesmanName = String(
      req.body.salesmanName || req.body.name || ""
    ).trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found. Please login again.",
      });
    }

    if (!salesmanCode || !salesmanName) {
      return res.status(400).json({
        success: false,
        message: "Salesman Code and Salesman Name are required",
      });
    }

    const salesman = await Salesman.create({
      salesmanCode,
      salesmanName,
      salesmanType: req.body.salesmanType || req.body.type || "SALESMAN",

      dateOfBirth: req.body.dateOfBirth || "",
      address: req.body.address || "",
      town: req.body.town || "",
      pinCode: req.body.pinCode || "",
      state: req.body.state || "",
      country: req.body.country || "India",

      phoneNo: req.body.phoneNo || "",
      mobileNo: req.body.mobileNo || "",
      emailId: req.body.emailId || "",

      qualification: req.body.qualification || "",
      reference: req.body.reference || "",
      imeiNo: req.body.imeiNo || "",

      distributorId,
      firmId,
      firmName,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Salesman saved successfully",
      data: salesman,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Salesman Code already exists for this firm",
      });
    }

    res.status(500).json({
      success: false,
      message: "Salesman save failed",
      error: error.message,
    });
  }
});
app.put("/api/sales/change-bill-type-f4", ensureConnection, async (req, res) => {
  try {
    console.log("CHANGE BILL TYPE BODY:", JSON.stringify(req.body, null, 2));

    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const bills = Array.isArray(req.body.bills) ? req.body.bills : [];

    const bill = bills[0] || {};
    const billSeries = String(bill.billSeries || "").trim();
    const billNoStr = String(bill.billNo || "").trim();
    const billNoNum = Number(billNoStr);
    const newBillType = String(bill.newBillType || "").trim();

    if (!distributorId || !firmId || !billNoStr || !newBillType) {
      return res.status(400).json({
        success: false,
        message: "distributorId, firmId, billNo and newBillType are required",
        received: req.body,
      });
    }

    const salesFilter = {
      distributorId,
      firmId,
      isActive: true,
      BillNo: billNoNum,
    };

    if (billSeries) {
      salesFilter.BillSeries = billSeries;
    }

    console.log("CHANGE BILL TYPE SALES FILTER:", salesFilter);

    const salesBill = await SalesHeader.findOne(salesFilter);

    if (!salesBill) {
      return res.status(404).json({
        success: false,
        message: `Sales bill not found: ${billSeries}/${billNoStr}`,
        filter: salesFilter,
      });
    }

    salesBill.BillType = newBillType;
    salesBill.billType = newBillType;
    await salesBill.save();

    // Update LoadHeader also, but without arrayFilters $or
    await LoadHeader.updateMany(
      {
        $or: [
          { distributorId, firmId },
          { DistributorId: distributorId, FirmId: firmId },
        ],
        Bills: {
          $elemMatch: {
            $or: [
              { BillSeries: billSeries, BillNo: billNoNum },
              { BillSeries: billSeries, BillNo: billNoStr },
              { billSeries: billSeries, billNo: billNoStr },
              { billSeries: billSeries, billNo: billNoNum },
              { Series: billSeries, BillNo: billNoNum },
              { Series: billSeries, BillNo: billNoStr },
            ],
          },
        },
      },
      {
        $set: {
          "Bills.$.BillType": newBillType,
          "Bills.$.billType": newBillType,
        },
      }
    );

    return res.json({
      success: true,
      message: "Bill type changed successfully",
      billType: newBillType,
      bill: salesBill,
    });
  } catch (error) {
    console.error("CHANGE BILL TYPE ERROR FULL:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Change bill type failed",
      stack: error.stack,
    });
  }
});
app.get("/api/sales/change-bill-type", ensureConnection, (req, res) => {
  res.json({
    success: true,
    message: "Route exists. This API must be called using PUT from React F4, not browser GET.",
  });
});
app.put("/api/sales/:id", ensureConnection, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const {
      distributorId,
      firmId,
      firmName,
      BillDate,
      Godown,
      GDCode,
      CompanyCode,
      CompanyName,
      AreaCode,
      AreaName,
      PartyCode,
      PartyName,
      BillSeries = "",
      BillNo,
      BillType,
      DueDate,
      SalesmanCode,
      SalesmanName,
      Narration,
      items = [],
    } = req.body;

    if (!distributorId || !firmId) throw new Error("Distributor/Firm not found");
    if (!BillNo) throw new Error("Bill No is required");
    if (!PartyName) throw new Error("Party is required");
    if (!GDCode) throw new Error("Godown code is required");
    if (!items.length) throw new Error("At least one product is required");

    const oldBill = await SalesHeader.findOne({
      _id: id,
      distributorId,
      firmId,
      isActive: true,
    }).session(session);

    if (!oldBill) throw new Error("Original sales bill not found");
    /*
* Read General Setup for this firm.
*/
    const generalSetup =
      await mongoose.connection
        .collection("Mas_GeneralSetup1")
        .findOne({
          distributorId:
            String(distributorId).trim(),

          firmId:
            String(firmId).trim(),

          isActive: {
            $ne: false,
          },
        });

    const allowEditBillAfterLoad =
      generalSetup?.allowEditBillAfterLoad === true;

    /*
     * Consider the bill loaded when IsLoaded is true
     * or a valid LoadNo is assigned.
     */
    const oldBillIsLoaded =
      oldBill.IsLoaded === true ||
      oldBill.isLoaded === true ||
      Number(
        oldBill.LoadNo ??
        oldBill.loadNo ??
        0
      ) > 0;

    if (
      oldBillIsLoaded &&
      !allowEditBillAfterLoad
    ) {
      await session.abortTransaction();

      return res.status(403).json({
        success: false,

        message:
          "This bill is already assigned to a load. Editing loaded bills is disabled in General Setup.",
      });
    }

    // Restore old stock first
    for (const oldItem of oldBill.items || []) {
      const prodCode = String(oldItem.productCode || oldItem.productId || "").trim();
      const batchNo = String(oldItem.batchNo || oldItem.selectedBatch?.batchNo || ".").trim() || ".";
      const mrp = Number(oldItem.mrp || 0);
      const qty = Number(oldItem.qty || oldItem.quantity || 0) + Number(oldItem.free || 0);

      if (prodCode && qty > 0) {
        await Stock.updateOne(
          {
            distributorId,
            firmId,
            GDCode: oldBill.GDCode,
            ProdCode: prodCode,
            Batch: batchNo,
            MRP: mrp,
          },
          { $inc: { Qty: qty } },
          { session }
        );
      }
    }

    // Deduct new stock
    for (const item of items) {
      const prodCode = String(
        item.productCode ||
        item.productId ||
        item.code ||
        String(item.product || "").split(" - ")[0] ||
        ""
      ).trim();

      const batchNo = String(item.batchNo || item.selectedBatch?.batchNo || ".").trim() || ".";
      const mrp = Number(item.mrp || 0);
      const qty = Number(item.qty || item.quantity || 0) + Number(item.free || 0);

      if (!prodCode) throw new Error("Product code missing in sales item");
      if (qty <= 0) throw new Error(`Qty required for product ${prodCode}`);

      const stockRow = await Stock.findOne({
        distributorId,
        firmId,
        GDCode,
        ProdCode: prodCode,
        Batch: batchNo,
        MRP: mrp,
        IsLocked: { $ne: "Y" },
      }).session(session);

      if (!stockRow) throw new Error(`Stock batch not found for product ${prodCode}, batch ${batchNo}`);

      if (Number(stockRow.Qty || 0) < qty) {
        throw new Error(`Insufficient stock for product ${prodCode}. Available: ${stockRow.Qty}, Sales Qty: ${qty}`);
      }

      await Stock.updateOne(
        { _id: stockRow._id },
        { $inc: { Qty: -qty } },
        { session }
      );
    }
    const normalizedItems = items.map((item, index) => {
      const finalQty = Number(item.qty ?? item.quantity ?? item.Qty ?? 0);
      const finalFree = Number(item.free ?? item.Free ?? 0);

      return {
        ...item,
        sr: item.sr || index + 1,

        productCode:
          item.productCode ||
          item.productId ||
          item.code ||
          String(item.product || "").split(" - ")[0] ||
          "",
        productId:
          item.productCode ||
          item.productId ||
          item.code ||
          String(item.product || "").split(" - ")[0] ||
          "",

        batchNo: item.batchNo || item.selectedBatch?.batchNo || ".",

        qty: finalQty,
        quantity: finalQty,
        Qty: finalQty,

        free: finalFree,
        Free: finalFree,

        mrp: Number(item.mrp || item.MRP || 0),
        MRP: Number(item.mrp || item.MRP || 0),

        rate: Number(item.rate || item.salesRate || item.srate || 0),
        salesRate: Number(item.rate || item.salesRate || item.srate || 0),

        amount: Number(item.amount || 0),
      };
    });
    const updatedBill = await SalesHeader.findOneAndUpdate(
      { _id: id, distributorId, firmId, isActive: true },
      {
        $set: {
          firmName,
          BillDate,
          Godown,
          GDCode,
          CompanyCode: CompanyCode || "",
          CompanyName: CompanyName || "",
          AreaCode: AreaCode || "",
          AreaName: AreaName || "",
          PartyCode: PartyCode || "",
          PartyName,
          BillSeries: String(BillSeries || "").trim(),
          BillNo: Number(BillNo),
          BillType: BillType || "Credit",
          DueDate,
          SalesmanCode: SalesmanCode || "",
          SalesmanName: SalesmanName || "",
          Narration: Narration || "",
          GrossAmount: Number(
            req.body.GrossAmount || 0
          ),

          TPRAmount: Number(
            req.body.TPRAmount || 0
          ),

          SchemeAmount: Number(
            req.body.SchemeAmount || 0
          ),

          StarDiscountAmount: Number(
            req.body.StarDiscountAmount || 0
          ),

          CashDiscountAmount: Number(
            req.body.CashDiscountAmount || 0
          ),

          DisplayAmount: Number(
            req.body.DisplayAmount || 0
          ),

          CouponAmount: Number(
            req.body.CouponAmount || 0
          ),

          AddLessAmount: Number(
            req.body.AddLessAmount || 0
          ),

          TaxableValue: Number(
            req.body.TaxableValue || 0
          ),

          SGSTAmount: Number(
            req.body.SGSTAmount || 0
          ),

          CGSTAmount: Number(
            req.body.CGSTAmount || 0
          ),

          IGSTAmount: Number(
            req.body.IGSTAmount || 0
          ),

          /*
            Keep the original invoice amount before Credit Note.
          */
          OriginalNetAmount: Number(
            req.body.OriginalNetAmount ??
            oldBill.OriginalNetAmount ??
            req.body.NetAmount ??
            oldBill.NetAmount ??
            0
          ),

          /*
            Preserve the existing Credit Note amount when editing
            unless the frontend explicitly sends a new value.
          */
          CreditNoteAmount: Number(
            req.body.CreditNoteAmount ??
            oldBill.CreditNoteAmount ??
            0
          ),

          NetAmount: Number(
            req.body.NetAmount ?? oldBill.NetAmount ?? 0
          ),
          TotalQty: Number(req.body.TotalQty || 0),
          TotalFreeQty: Number(req.body.TotalFreeQty || 0),
          TotalItems: items.length,
          items: normalizedItems,
        },
      },
      { new: true, session }
    );
    /*
---------------------------------------------------------
Synchronize Load Header Bill Amount
---------------------------------------------------------
*/

    await LoadHeader.updateMany(
      {
        $or: [
          {
            DistributorId: distributorId,
            FirmId: firmId,
          },
          {
            distributorId,
            firmId,
          },
        ],

        Bills: {
          $elemMatch: {
            BillSeries: String(BillSeries),
            BillNo: Number(BillNo),
          },
        },
      },

      {
        $set: {
          "Bills.$.BillAmount": Number(req.body.NetAmount || 0),
          "Bills.$.billAmount": Number(req.body.NetAmount || 0),

          "Bills.$.PendingAmount": Number(req.body.NetAmount || 0),
          "Bills.$.pendingAmount": Number(req.body.NetAmount || 0),

          "Bills.$.NetAmount": Number(req.body.NetAmount || 0),
          "Bills.$.netAmount": Number(req.body.NetAmount || 0),

          "Bills.$.BillType": BillType || "Credit",
          "Bills.$.billType": BillType || "Credit",

          UpdatedAt: new Date(),
        },
      },

      { session }
    );

    await session.commitTransaction();

    const savedUpdatedBill =
      updatedBill?.toObject
        ? updatedBill.toObject()
        : updatedBill;

    return res.json({
      success: true,
      message:
        "Sales bill updated successfully",

      /*
       * Used by Save and Print after bill update.
       */
      bill: savedUpdatedBill,

      /*
       * Preserve the previous response format.
       */
      data: {
        header: savedUpdatedBill,
      },

      savedBillId:
        String(
          savedUpdatedBill?._id || ""
        ),
    });
  } catch (error) {
    await session.abortTransaction();

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This sales bill number already exists for this series",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Sales update failed",
    });
  } finally {
    session.endSession();
  }
});
app.get("/api/areas", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const areas = await Area.find({
      distributorId,
      firmId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: areas.length,
      areas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch areas",
      error: error.message,
    });
  }
});
/* =========================================================
  AREA MASTER - PAGINATED LIST
  Existing GET /api/areas remains unchanged for dropdowns.
  This API is used only by the Area Master grid.
  ========================================================= */

app.get(
  "/api/areas/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage =
        Number.parseInt(
          req.query.page,
          10
        );

      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10
        );

      const page =
        Number.isFinite(
          requestedPage
        ) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(
          requestedLimit
        ) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 10;

      if (
        !distributorId ||
        !firmId
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "distributorId and firmId are required",
          });
      }

      /*
      * Escape special RegExp characters so that
      * text such as +, (, ), [, ] does not break search.
      */
      const escapedSearch =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const filter = {
        distributorId,
        firmId,

        /*
        * Keep the same active-record logic
        * used by your existing Area API.
        */
        isActive: true,
      };

      if (escapedSearch) {
        const searchRegex =
          new RegExp(
            escapedSearch,
            "i"
          );

        filter.$or = [
          {
            areaCode:
              searchRegex,
          },

          {
            areaName:
              searchRegex,
          },

          {
            firmName:
              searchRegex,
          },
        ];
      }

      const totalRecords =
        await Area.countDocuments(
          filter
        );

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalRecords /
            limit
          )
        );

      /*
      * Prevent requesting a page number greater
      * than the available pages after deletion.
      */
      const currentPage =
        Math.min(
          page,
          totalPages
        );

      const skip =
        (currentPage - 1) *
        limit;

      const areas =
        await Area.find(filter)
          .sort({
            areaName: 1,
            areaCode: 1,
            _id: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        areas,

        count:
          areas.length,

        pagination: {
          currentPage,

          page:
            currentPage,

          limit,

          totalRecords,

          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                areas.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Area Master list pagination error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Failed to fetch Area Master list",

          error:
            error.message,
        });
    }
  }
);

app.post("/api/areas", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    const areaCode = String(req.body.areaCode || req.body.code || "").trim();
    const areaName = String(req.body.areaName || req.body.name || "").trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found. Please login again.",
      });
    }

    if (!areaCode || !areaName) {
      return res.status(400).json({
        success: false,
        message: "Area Code and Area Name are required",
      });
    }

    const area = await Area.create({
      areaCode,
      areaName,
      distributorId,
      firmId,
      firmName,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Area saved successfully",
      data: area,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Area Code already exists for this firm",
      });
    }

    res.status(500).json({
      success: false,
      message: "Area save failed",
      error: error.message,
    });
  }
});

app.get("/api/godowns", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const godowns = await Godown.find({
      distributorId,
      firmId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: godowns.length,
      godowns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch godowns",
      error: error.message,
    });
  }
});
/* =========================================================
  GODOWN MASTER PAGINATED LIST

  Existing:
  GET /api/godowns
  remains unchanged for Billing, Purchase, Stock,
  Credit Note, Debit Note and dropdowns.

  New:
  GET /api/godowns/list
  is used only by the GoDown Master grid.
  ========================================================= */

app.get(
  "/api/godowns/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 20;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      const filter = {
        distributorId,
        firmId,

        /*
        * Include active records and older records
        * where isActive may not exist.
        */
        isActive: {
          $ne: false,
        },
      };

      if (search) {
        const escapedSearch =
          search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const searchRegex =
          new RegExp(
            escapedSearch,
            "i"
          );

        filter.$or = [
          {
            godownCode:
              searchRegex,
          },
          {
            godownName:
              searchRegex,
          },
          {
            address:
              searchRegex,
          },
          {
            location:
              searchRegex,
          },
          {
            firmName:
              searchRegex,
          },
        ];
      }

      const totalRecords =
        await Godown.countDocuments(
          filter
        );

      const totalPages = Math.max(
        1,
        Math.ceil(
          totalRecords / limit
        )
      );

      /*
      * Keep requested page inside the
      * currently available page range.
      */
      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) *
        limit;

      const godowns =
        await Godown.find(filter)
          .sort({
            godownName: 1,
            godownCode: 1,
            _id: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        godowns,

        count:
          godowns.length,

        pagination: {
          currentPage,
          page: currentPage,
          limit,
          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                godowns.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Godown Master pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Godown Master",
        error:
          error.message,
      });
    }
  }
);
app.post("/api/godowns", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    const godownCode = String(
      req.body.godownCode || req.body.code || ""
    ).trim();

    const godownName = String(
      req.body.godownName || req.body.name || ""
    ).trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found. Please login again.",
      });
    }

    if (!godownCode || !godownName) {
      return res.status(400).json({
        success: false,
        message: "Godown Code and Godown Name are required",
      });
    }

    const godown = await Godown.create({
      godownCode,
      godownName,

      address: req.body.address || "",
      location: req.body.location || "",

      distributorId,
      firmId,
      firmName,

      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Godown saved successfully",
      data: godown,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Godown Code already exists for this firm",
      });
    }

    res.status(500).json({
      success: false,
      message: "Godown save failed",
      error: error.message,
    });
  }
});

app.get("/api/customer-banks", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const customerBanks = await CustomerBank.find({
      distributorId,
      firmId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customerBanks.length,
      customerBanks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer banks",
      error: error.message,
    });
  }
});
/* =========================================================
  CUSTOMER BANK MASTER PAGINATED LIST

  Existing:
  GET /api/customer-banks
  remains unchanged for complete-list usage.

  New:
  GET /api/customer-banks/list
  is used only by Customer Bank Master grid.
  ========================================================= */

app.get(
  "/api/customer-banks/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 20;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      const filter = {
        distributorId,
        firmId,

        /*
        * Include active records and old records
        * where isActive may not exist.
        */
        isActive: {
          $ne: false,
        },
      };

      if (search) {
        const escapedSearch =
          search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const searchRegex =
          new RegExp(
            escapedSearch,
            "i"
          );

        filter.$or = [
          {
            bankCode:
              searchRegex,
          },
          {
            bankName:
              searchRegex,
          },
          {
            accountNumber:
              searchRegex,
          },
          {
            ifscCode:
              searchRegex,
          },
          {
            branchName:
              searchRegex,
          },
          {
            accountType:
              searchRegex,
          },
          {
            clearingType:
              searchRegex,
          },
          {
            customerName:
              searchRegex,
          },
          {
            customerCode:
              searchRegex,
          },
          {
            mobileNo:
              searchRegex,
          },
          {
            emailId:
              searchRegex,
          },
          {
            upiId:
              searchRegex,
          },
          {
            beneficiaryName:
              searchRegex,
          },
          {
            swiftCode:
              searchRegex,
          },
          {
            micrCode:
              searchRegex,
          },
          {
            panNumber:
              searchRegex,
          },
          {
            remarks:
              searchRegex,
          },
        ];
      }

      const totalRecords =
        await CustomerBank.countDocuments(
          filter
        );

      const totalPages = Math.max(
        1,
        Math.ceil(
          totalRecords / limit
        )
      );

      /*
      * Keep the requested page inside
      * the currently available page range.
      */
      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) *
        limit;

      const customerBanks =
        await CustomerBank.find(filter)
          .sort({
            bankName: 1,
            bankCode: 1,
            _id: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        customerBanks,

        count:
          customerBanks.length,

        pagination: {
          currentPage,
          page: currentPage,
          limit,
          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                customerBanks.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Customer Bank Master pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Customer Bank Master",
        error:
          error.message,
      });
    }
  }
);
app.post("/api/customer-banks", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    const bankCode = String(req.body.bankCode || "").trim();
    const bankName = String(req.body.bankName || "").trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found. Please login again.",
      });
    }

    if (!bankCode || !bankName) {
      return res.status(400).json({
        success: false,
        message: "Bank Code and Bank Name are required",
      });
    }

    const customerBank = await CustomerBank.create({
      bankCode,
      bankName,

      accountNumber: req.body.accountNumber || "",
      ifscCode: req.body.ifscCode || "",
      branchName: req.body.branchName || "",
      accountType: req.body.accountType || "Savings",
      clearingType: String(req.body.clearingType || "LOCAL").trim(),

      swiftCode: req.body.swiftCode || "",
      micrCode: req.body.micrCode || "",
      panNumber: req.body.panNumber || "",

      remarks: req.body.remarks || "",

      distributorId,
      firmId,
      firmName,

      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Customer Bank saved successfully",
      data: customerBank,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Bank Code already exists for this firm",
      });
    }

    res.status(500).json({
      success: false,
      message: "Customer Bank save failed",
      error: error.message,
    });
  }
});

app.get("/api/salesman-area-mappings", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, companyCode } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const filter = {
      distributorId,
      firmId,
      isActive: true,
    };

    if (companyCode) {
      filter.companyCode = companyCode;
    }

    const mappings = await SalesmanAreaMapping.find(filter).sort({
      areaName: 1,
    });

    res.json({
      success: true,
      count: mappings.length,
      mappings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch salesman area mappings",
      error: error.message,
    });
  }
});

app.post("/api/salesman-area-mappings", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    const companyCode = String(req.body.companyCode || "").trim();
    const companyName = String(req.body.companyName || "").trim();

    const mappings = Array.isArray(req.body.mappings)
      ? req.body.mappings
      : [];

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found. Please login again.",
      });
    }

    if (!companyCode || !companyName) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (mappings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one mapping is required",
      });
    }

    const operations = mappings
      .filter((m) => m.areaCode && m.areaName && m.salesmanCode && m.salesmanName)
      .map((m) => ({
        updateOne: {
          filter: {
            distributorId,
            firmId,
            companyCode,
            areaCode: String(m.areaCode).trim(),
          },
          update: {
            $set: {
              companyCode,
              companyName,

              areaCode: String(m.areaCode).trim(),
              areaName: String(m.areaName).trim(),

              salesmanCode: String(m.salesmanCode).trim(),
              salesmanName: String(m.salesmanName).trim(),

              distributorId,
              firmId,
              firmName,

              isActive: true,
            },
          },
          upsert: true,
        },
      }));

    if (operations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid salesman mapping data not found",
      });
    }

    await SalesmanAreaMapping.bulkWrite(operations);

    res.status(201).json({
      success: true,
      message: "Salesman to Area mapping saved successfully",
      count: operations.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Salesman to Area mapping save failed",
      error: error.message,
    });
  }
});

app.get(
  "/api/area-to-party-mappings",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const companyCode = String(
        req.query.companyCode || ""
      ).trim();

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message: "distributorId and firmId are required",
        });
      }

      const mappingFilter = {
        distributorId,
        firmId,
        isActive: true,
      };

      if (companyCode) {
        mappingFilter.companyCode = companyCode;
      }

      /*
      * Load saved Area-to-Party mappings.
      */
      const savedMappings =
        await AreaToPartyMapping.find(mappingFilter)
          .lean();

      /*
      * Collect all mapped account codes.
      */
      const mappedAccountCodes = [
        ...new Set(
          savedMappings
            .map((mapping) =>
              String(mapping.accountCode || "").trim()
            )
            .filter(Boolean)
        ),
      ];

      /*
      * Load only accounts that currently exist in
      * Account Master.
      */
      const existingAccounts =
        mappedAccountCodes.length > 0
          ? await Account.find({
            distributorId,
            firmId,
            isActive: true,
            accountCode: {
              $in: mappedAccountCodes,
            },
          })
            .select({
              accountCode: 1,
              accountName: 1,
              blackListed: 1,
              areaCode: 1,
            })
            .lean()
          : [];

      /*
      * Create fast lookup using account code.
      */
      const accountMap = new Map(
        existingAccounts.map((account) => [
          String(account.accountCode || "").trim(),
          account,
        ])
      );

      /*
      * Return only mappings whose accounts still
      * exist in Account Master.
      */
      const mappings = savedMappings
        .map((mapping) => {
          const accountCode = String(
            mapping.accountCode || ""
          ).trim();

          const account = accountMap.get(accountCode);

          if (!account) {
            return null;
          }

          return {
            ...mapping,

            accountCode,
            accountName:
              String(account.accountName || "").trim(),

            blackListed:
              account.blackListed || "NO",
          };
        })
        .filter(Boolean)
        .sort((first, second) =>
          String(first.accountName || "").localeCompare(
            String(second.accountName || "")
          )
        );

      return res.json({
        success: true,
        count: mappings.length,
        mappings,
      });
    } catch (error) {
      console.error(
        "Area To Party mapping load error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch Area To Party mappings",
        error: error.message,
      });
    }
  }
);

app.post("/api/area-to-party-mappings", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const firmName = String(req.body.firmName || "").trim();

    const companyCode = String(req.body.companyCode || "").trim();
    const companyName = String(req.body.companyName || "").trim();

    const mappings = Array.isArray(req.body.mappings)
      ? req.body.mappings
      : [];

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found. Please login again.",
      });
    }

    if (!companyCode || !companyName) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const validMappings = mappings.filter(
      (m) => m.accountCode && m.accountName && m.areaCode && m.areaName
    );

    if (validMappings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one area.",
      });
    }

    const operations = validMappings.map((m) => ({
      updateOne: {
        filter: {
          distributorId,
          firmId,
          companyCode,
          accountCode: String(m.accountCode).trim(),
        },
        update: {
          $set: {
            companyCode,
            companyName,
            accountCode: String(m.accountCode).trim(),
            accountName: String(m.accountName).trim(),
            areaCode: String(m.areaCode).trim(),
            areaName: String(m.areaName).trim(),
            distributorId,
            firmId,
            firmName,
            isActive: true,
          },
        },
        upsert: true,
      },
    }));

    await AreaToPartyMapping.bulkWrite(operations);

    res.status(201).json({
      success: true,
      message: "Area To Party mapping saved successfully",
      count: operations.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Area To Party mapping save failed",
      error: error.message,
    });
  }
});


app.get("/api/purchase/next-vou-no", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, vouSer = "" } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const lastPurchase = await PurchaseHeader.findOne({
      distributorId,
      firmId,
      vouSer: String(vouSer || "").trim(), // blank series also allowed
    }).sort({ vouNo: -1 });

    const nextVouNo = lastPurchase ? Number(lastPurchase.vouNo || 0) + 1 : 1;

    res.json({ success: true, nextVouNo });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate next voucher no",
      error: error.message,
    });
  }
});

app.post("/api/purchase", ensureConnection, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      distributorId,
      firmId,
      firmName,
      invoiceDate,
      vouSer,
      vouNo,
      vno,
      supplierCode,
      supplierName,
      company,
      gdCode,
      godownName,
      isIgst,
      invoiceNumber,
      narration,
      items = [],
    } = req.body;

    if (!distributorId || !firmId) {
      throw new Error("Distributor/Firm not found");
    }

    if (!vouNo) {
      throw new Error("Vou No is required");
    }

    if (!supplierName) {
      throw new Error("Supplier is required");
    }

    if (!gdCode) {
      throw new Error("Godown code is required");
    }

    if (!items.length) {
      throw new Error("At least one product is required");
    }

    const header = await PurchaseHeader.create(
      [{
        distributorId,
        firmId,
        firmName,
        invoiceDate,
        vouSer: String(vouSer).trim(),
        vouNo: Number(vouNo),
        vno: vno || "",
        supplierCode: supplierCode || "",
        supplierName,
        company,
        gdCode,
        godownName,
        isIgst: isIgst || "N",
        invoiceNumber,
        narration,

        mrpTotal: Number(req.body.mrpTotal || 0),
        grossAmount: Number(req.body.grossAmount || 0),
        cgstAmt: Number(req.body.cgstAmt || 0),
        sgstAmt: Number(req.body.sgstAmt || 0),
        igstAmt: Number(req.body.igstAmt || 0),
        qbtAmt: Number(req.body.qbtAmt || 0),
        rounding: Number(req.body.rounding || 0),
        netAmt: Number(req.body.netAmt || 0),

        items,
        isActive: true,
      }],
      { session }
    );

    for (const item of items) {
      const prodCode = String(
        item.productCode ||
        item.code ||
        item.productId ||
        String(item.product || "")
          .split(" - ")[0] ||
        ""
      ).trim();

      const batchNo =
        String(
          item.batchNo ||
          item.batch ||
          item.selectedBatch?.batchNo ||
          item.selectedBatch?.Batch ||
          "."
        ).trim() || ".";

      const mrp = Number(
        item.mrp ??
        item.MRP ??
        item.selectedBatch?.mrp ??
        item.selectedBatch?.MRP ??
        0
      );

      const qty =
        Number(
          item.quantity ??
          item.qty ??
          item.Qty ??
          0
        ) +
        Number(
          item.free ??
          item.Free ??
          0
        );

      const finalPurchaseRate = Number(
        item.purRate ??
        item.purchaseRate ??
        item.PurchaseRate ??
        item.pRate ??
        item.PRate ??
        item.prate ??
        item.selectedBatch?.purRate ??
        item.selectedBatch?.purchaseRate ??
        item.selectedBatch?.PurchaseRate ??
        item.selectedBatch?.pRate ??
        item.selectedBatch?.PRate ??
        0
      );

      const finalSalesRate = Number(
        item.salesRate ??
        item.SalesRate ??
        item.sRate ??
        item.SRate ??
        item.rate ??
        item.selectedBatch?.salesRate ??
        item.selectedBatch?.SalesRate ??
        item.selectedBatch?.sRate ??
        item.selectedBatch?.SRate ??
        0
      );

      if (!prodCode) {
        throw new Error(
          "Product code is missing in Purchase item."
        );
      }

      if (
        !Number.isFinite(mrp) ||
        mrp <= 0
      ) {
        throw new Error(
          `Valid MRP is required for product ${prodCode}.`
        );
      }

      if (
        !Number.isFinite(qty) ||
        qty <= 0
      ) {
        throw new Error(
          `Quantity is required for product ${prodCode}.`
        );
      }

      if (
        !Number.isFinite(finalPurchaseRate) ||
        finalPurchaseRate <= 0
      ) {
        throw new Error(
          `Purchase Rate is required for product ${prodCode}, batch ${batchNo}, MRP ${mrp}.`
        );
      }

      console.log(
        "PURCHASE STOCK SAVE DEBUG:",
        {
          prodCode,
          batchNo,
          mrp,
          qty,
          finalPurchaseRate,
          finalSalesRate,
          rawPurRate:
            item.purRate,
        }
      );

      const updatedStock =
        await Stock.findOneAndUpdate(
          {
            distributorId,
            firmId,
            GDCode: gdCode,
            ProdCode: prodCode,
            Batch: batchNo,
            MRP: mrp,
          },
          {
            $setOnInsert: {
              distributorId,
              firmId,

              GDCode: gdCode,
              ProdCode: prodCode,
              Batch: batchNo,
              MRP: mrp,
            },

            $set: {
              firmName,
              isActive: true,

              ExpDt:
                item.expDate ||
                item.selectedBatch?.expDate ||
                null,

              MfgDt:
                item.mfgDate ||
                item.selectedBatch?.mfgDate ||
                null,

              PRate:
                finalPurchaseRate,

              SRate:
                finalSalesRate,

              IsLocked:
                item.isLocked ||
                item.selectedBatch?.isLocked ||
                "N",

              BoxPack: Number(
                item.boxPack ??
                item.BoxPack ??
                item.selectedBatch?.boxPack ??
                item.selectedBatch?.BoxPack ??
                1
              ),

              InBoxPack: Number(
                item.inBoxPack ??
                item.inboxPack ??
                item.InBoxPack ??
                item.selectedBatch?.inBoxPack ??
                item.selectedBatch?.inboxPack ??
                item.selectedBatch?.InBoxPack ??
                item.ratePerUnit ??
                1
              ),
            },

            $inc: {
              Qty: qty,
            },
          },
          {
            upsert: true,
            new: true,
            session,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

      console.log(
        "PURCHASE STOCK SAVED:",
        {
          id:
            String(
              updatedStock?._id || ""
            ),

          ProdCode:
            updatedStock?.ProdCode,

          GDCode:
            updatedStock?.GDCode,

          Batch:
            updatedStock?.Batch,

          MRP:
            updatedStock?.MRP,

          PRate:
            updatedStock?.PRate,

          SRate:
            updatedStock?.SRate,

          Qty:
            updatedStock?.Qty,
        }
      );
    }

    await session.commitTransaction();

    const nextVouNo = Number(vouNo) + 1;

    res.status(201).json({
      success: true,
      message: "Purchase saved successfully",
      data: {
        header: header[0],
      },
      nextVouNo,
    });
  } catch (error) {
    await session.abortTransaction();

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This purchase voucher number already exists for this series",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Purchase save failed",
    });
  } finally {
    session.endSession();
  }
});


app.get("/api/purchase", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const purchases = await PurchaseHeader.find({
      distributorId,
      firmId,
      isActive: true,
    })
      .sort({ invoiceDate: -1, vouNo: -1 })
      .lean();

    res.json({
      success: true,
      count: purchases.length,
      purchases,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load purchase bills",
      error: error.message,
    });
  }
});
/* =========================================================
  PURCHASE LIST - BACKEND PAGINATION

  Existing:
  GET /api/purchase
  remains unchanged for any existing full-list dependency.

  New:
  GET /api/purchase/list
  is used only by Purchase List.
  ========================================================= */

app.get(
  "/api/purchase/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const fromDate = String(
        req.query.fromDate || ""
      ).trim();

      const toDate = String(
        req.query.toDate || ""
      ).trim();

      const vouSer = String(
        req.query.vouSer ||
        req.query.billSeries ||
        ""
      ).trim();

      const supplierCode = String(
        req.query.supplierCode ||
        req.query.partyCode ||
        ""
      ).trim();

      const supplierName = String(
        req.query.supplierName ||
        req.query.partyName ||
        req.query.party ||
        ""
      ).trim();

      const company = String(
        req.query.company || ""
      ).trim();

      const gdCode = String(
        req.query.gdCode ||
        req.query.godownCode ||
        ""
      ).trim();

      const godownName = String(
        req.query.godownName ||
        req.query.branchName ||
        ""
      ).trim();

      const invoiceNumber = String(
        req.query.invoiceNumber || ""
      ).trim();

      const minAmountText = String(
        req.query.minAmount || ""
      ).trim();

      const maxAmountText = String(
        req.query.maxAmount || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(requestedLimit, 100)
          : 10;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      /*
      * Escape user-entered search text before
      * creating MongoDB regular expressions.
      */
      const escapeRegex = (value) =>
        String(value || "").replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const containsRegex = (value) =>
        new RegExp(
          escapeRegex(value),
          "i"
        );

      const exactRegex = (value) =>
        new RegExp(
          `^${escapeRegex(value)}$`,
          "i"
        );

      const filter = {
        distributorId,
        firmId,

        /*
        * This permits old Purchase records where
        * isActive was not explicitly stored.
        */
        isActive: {
          $ne: false,
        },
      };

      /* =====================================================
        DATE FILTER
        ===================================================== */

      if (fromDate || toDate) {
        filter.invoiceDate = {};

        if (fromDate) {
          filter.invoiceDate.$gte =
            fromDate;
        }

        if (toDate) {
          filter.invoiceDate.$lte =
            toDate;
        }
      }

      /* =====================================================
        EXACT AND TEXT FILTERS
        ===================================================== */

      if (vouSer) {
        filter.vouSer =
          exactRegex(vouSer);
      }

      if (supplierCode) {
        filter.supplierCode =
          exactRegex(supplierCode);
      }

      if (supplierName) {
        filter.supplierName =
          containsRegex(supplierName);
      }

      if (company) {
        const companyRegex =
          containsRegex(company);

        /*
        * Purchase records store company in
        * companyCode and companyName.
        *
        * Some old records may contain company,
        * so that field is also checked.
        */
        filter.$and =
          filter.$and || [];

        filter.$and.push({
          $or: [
            {
              companyCode:
                companyRegex,
            },
            {
              companyName:
                companyRegex,
            },
            {
              company:
                companyRegex,
            },
          ],
        });
      }

      if (gdCode) {
        filter.gdCode =
          exactRegex(gdCode);
      }

      if (godownName) {
        filter.godownName =
          containsRegex(godownName);
      }

      if (invoiceNumber) {
        filter.invoiceNumber =
          containsRegex(invoiceNumber);
      }

      /* =====================================================
        AMOUNT RANGE
        ===================================================== */

      const minAmount =
        Number(minAmountText);

      const maxAmount =
        Number(maxAmountText);

      if (
        (
          minAmountText &&
          Number.isFinite(minAmount)
        ) ||
        (
          maxAmountText &&
          Number.isFinite(maxAmount)
        )
      ) {
        filter.netAmt = {};

        if (
          minAmountText &&
          Number.isFinite(minAmount)
        ) {
          filter.netAmt.$gte =
            minAmount;
        }

        if (
          maxAmountText &&
          Number.isFinite(maxAmount)
        ) {
          filter.netAmt.$lte =
            maxAmount;
        }
      }

      /* =====================================================
        GENERAL SEARCH
        ===================================================== */

      if (search) {
        const searchRegex =
          containsRegex(search);

        const numericSearch =
          Number(search);

        const searchConditions = [
          {
            vouSer:
              searchRegex,
          },
          {
            vno:
              searchRegex,
          },
          {
            supplierCode:
              searchRegex,
          },
          {
            supplierName:
              searchRegex,
          },
          {
            company:
              searchRegex,
          },
          {
            gdCode:
              searchRegex,
          },
          {
            godownName:
              searchRegex,
          },
          {
            invoiceNumber:
              searchRegex,
          },
          {
            narration:
              searchRegex,
          },
          {
            firmName:
              searchRegex,
          },
        ];

        /*
        * Voucher number and amount are numeric fields.
        * Search them only when entered text is numeric.
        */
        if (
          Number.isFinite(
            numericSearch
          )
        ) {
          searchConditions.push(
            {
              vouNo:
                numericSearch,
            },
            {
              netAmt:
                numericSearch,
            }
          );
        }

        filter.$and =
          filter.$and || [];

        filter.$and.push({
          $or:
            searchConditions,
        });
      }

      /* =====================================================
        COUNT ALL MATCHING RECORDS
        ===================================================== */

      const totalRecords =
        await PurchaseHeader.countDocuments(
          filter
        );

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalRecords /
            limit
          )
        );

      /*
      * Protect against an invalid page after deletion.
      *
      * Example:
      * User deletes the only record on page 4.
      * The backend safely returns page 3.
      */
      const currentPage =
        Math.min(
          page,
          totalPages
        );

      const skip =
        (
          currentPage -
          1
        ) *
        limit;

      /* =====================================================
        LOAD ONLY THE CURRENT PAGE
        ===================================================== */

      const purchases =
        await PurchaseHeader.find(
          filter
        )
          .sort({
            invoiceDate: -1,
            vouNo: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      /* =====================================================
        RESPONSE
        ===================================================== */

      return res.json({
        success: true,

        purchases,

        count:
          purchases.length,

        pagination: {
          currentPage,

          page:
            currentPage,

          limit,

          totalRecords,

          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                purchases.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Purchase list pagination error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load purchase bills",

        error:
          error.message,
      });
    }
  }
);

app.get(
  "/api/purchase/find-bill",
  ensureConnection,
  async (req, res) => {
    try {
      const {
        distributorId,
        firmId,
        vouSer = "",
        vouNo = "",
      } = req.query;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      if (
        vouNo === null ||
        vouNo === undefined ||
        String(vouNo).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase Bill Number is required",
        });
      }

      const numericVouNo =
        Number(String(vouNo).trim());

      if (!Number.isFinite(numericVouNo)) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase Bill Number must be numeric",
        });
      }

      const purchase = await PurchaseHeader.findOne({
        distributorId:
          String(distributorId).trim(),

        firmId:
          String(firmId).trim(),

        vouSer:
          String(vouSer || "").trim(),

        vouNo:
          numericVouNo,

        isActive: true,
      }).lean();

      if (!purchase) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase Bill not found for the entered series and number.",
        });
      }

      const purchaseItems =
        Array.isArray(purchase.items)
          ? purchase.items
          : [];

      return res.json({
        success: true,

        purchase,
        bill: purchase,
        items: purchaseItems,

        count:
          purchaseItems.length,
      });
    } catch (error) {
      console.error(
        "Purchase Bill lookup error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Purchase Bill",
        error:
          error.message,
      });
    }
  }
);

app.get("/api/sales/next-bill-no", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, BillSeries = "" } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const lastBill = await SalesHeader.findOne({
      distributorId,
      firmId,
      BillSeries: String(BillSeries || "").trim(),
    }).sort({ BillNo: -1 });

    res.json({
      success: true,
      nextBillNo: lastBill ? Number(lastBill.BillNo || 0) + 1 : 1,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load next sales bill no",
      error: error.message,
    });
  }
});

app.post("/api/sales", ensureConnection, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      distributorId,
      firmId,
      firmName,
      BillDate,
      Godown,
      GDCode,
      CompanyCode,
      CompanyName,
      AreaCode,
      AreaName,
      PartyCode,
      PartyName,
      BillSeries = "",
      BillNo,
      BillType,
      DueDate,
      SalesmanCode,
      SalesmanName,
      Narration,
      items = [],
    } = req.body;

    if (!distributorId || !firmId) throw new Error("Distributor/Firm not found");
    if (!BillNo) throw new Error("Bill No is required");
    if (!PartyName) throw new Error("Party is required");
    if (!GDCode) throw new Error("Godown code is required");
    if (!items.length) throw new Error("At least one product is required");

    for (const item of items) {
      const prodCode = String(
        item.productCode ||
        item.productId ||
        item.code ||
        String(item.product || "").split(" - ")[0] ||
        ""
      ).trim();

      const batchNo = String(item.batchNo || item.selectedBatch?.batchNo || ".").trim() || ".";
      const mrp = Number(item.mrp || 0);
      const qty = Number(item.qty || item.quantity || 0) + Number(item.free || 0);

      if (!prodCode) throw new Error("Product code missing in sales item");
      if (qty <= 0) throw new Error(`Qty required for product ${prodCode}`);

      const stockRow = await Stock.findOne({
        distributorId,
        firmId,
        GDCode,
        ProdCode: prodCode,
        Batch: batchNo,
        MRP: mrp,
        IsLocked: { $ne: "Y" },
      }).session(session);

      if (!stockRow) {
        throw new Error(`Stock batch not found for product ${prodCode}, batch ${batchNo}`);
      }

      if (Number(stockRow.Qty || 0) < qty) {
        throw new Error(
          `Insufficient stock for product ${prodCode}, batch ${batchNo}. Available: ${stockRow.Qty}, Sales Qty: ${qty}`
        );
      }

      await Stock.updateOne(
        { _id: stockRow._id },
        { $inc: { Qty: -qty } },
        { session }
      );
    }

    const header = await SalesHeader.create(
      [{
        distributorId,
        firmId,
        firmName,

        BillDate,
        Godown,
        GDCode,

        CompanyCode: CompanyCode || "",
        CompanyName: CompanyName || "",
        AreaCode: AreaCode || "",
        AreaName: AreaName || "",
        PartyCode: PartyCode || "",
        PartyName,

        BillSeries: String(BillSeries || "").trim(),
        BillNo: Number(BillNo),
        BillType: BillType || "Credit",
        DueDate,

        SalesmanCode: SalesmanCode || "",
        SalesmanName: SalesmanName || "",
        Narration: Narration || "",

        GrossAmount: Number(
          req.body.GrossAmount || 0
        ),

        TPRAmount: Number(
          req.body.TPRAmount || 0
        ),

        SchemeAmount: Number(
          req.body.SchemeAmount || 0
        ),

        StarDiscountAmount: Number(
          req.body.StarDiscountAmount || 0
        ),

        CashDiscountAmount: Number(
          req.body.CashDiscountAmount || 0
        ),

        DisplayAmount: Number(
          req.body.DisplayAmount || 0
        ),

        CouponAmount: Number(
          req.body.CouponAmount || 0
        ),

        // Number("-25") remains -25
        // Number("+25") becomes 25
        AddLessAmount: Number(
          req.body.AddLessAmount || 0
        ),

        TaxableValue: Number(
          req.body.TaxableValue || 0
        ),

        SGSTAmount: Number(
          req.body.SGSTAmount || 0
        ),

        CGSTAmount: Number(
          req.body.CGSTAmount || 0
        ),

        IGSTAmount: Number(
          req.body.IGSTAmount || 0
        ),

        OriginalNetAmount: Number(
          req.body.OriginalNetAmount ??
          req.body.NetAmount ??
          0
        ),

        CreditNoteAmount: Number(
          req.body.CreditNoteAmount || 0
        ),

        NetAmount: Number(
          req.body.NetAmount || 0
        ),
        TotalQty: Number(req.body.TotalQty || 0),
        TotalFreeQty: Number(req.body.TotalFreeQty || 0),
        TotalItems: items.length,

        items,
        isActive: true,
      }],
      { session }
    );

    await session.commitTransaction();

    const savedBill =
      header[0].toObject
        ? header[0].toObject()
        : header[0];

    return res.status(201).json({
      success: true,
      message: "Sales saved successfully",

      /*
       * Main saved Sales Bill record.
       * Dashboard Save and Print reads this property.
       */
      bill: savedBill,

      /*
       * Keep the existing structure so older frontend
       * logic is not affected.
       */
      data: {
        header: savedBill,
      },

      savedBillId:
        String(savedBill._id || ""),

      nextBillNo:
        Number(BillNo) + 1,
    });
  } catch (error) {
    await session.abortTransaction();

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This sales bill number already exists for this series",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Sales save failed",
    });
  } finally {
    session.endSession();
  }
});

app.get("/api/sales", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const sales = await SalesHeader.find({
      distributorId,
      firmId,
      isActive: true,
    })
      .sort({ BillDate: -1, BillNo: -1 })
      .lean();

    res.json({
      success: true,
      count: sales.length,
      sales,
    });
  } catch (error) {
    console.error("❌ Sales list error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load sales bills",
      error: error.message,
    });
  }
});

/* =========================================================
SALES BILLING LIST - BACKEND PAGINATION

Existing:
GET /api/sales
remains unchanged for existing full-list dependencies.

New:
GET /api/sales/list
is used only by Sales -> Billing list.
========================================================= */

app.get(
  "/api/sales/list",
  ensureConnection,
  async (req, res) => {
    try {
      /* =====================================================
        REQUEST PARAMETERS
        ===================================================== */

      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const fromDate = String(
        req.query.fromDate || ""
      ).trim();

      const toDate = String(
        req.query.toDate || ""
      ).trim();

      const billSeries = String(
        req.query.billSeries || ""
      ).trim();

      const billType = String(
        req.query.billType || ""
      ).trim();

      const companyCode = String(
        req.query.companyCode ||
        req.query.company ||
        ""
      ).trim();

      const partyCode = String(
        req.query.partyCode || ""
      ).trim();

      const partyName = String(
        req.query.partyName ||
        req.query.party ||
        ""
      ).trim();

      const salesmanCode = String(
        req.query.salesmanCode || ""
      ).trim();

      const salesmanName = String(
        req.query.salesmanName ||
        req.query.salesman ||
        ""
      ).trim();

      const areaCode = String(
        req.query.areaCode || ""
      ).trim();

      const areaName = String(
        req.query.areaName ||
        req.query.area ||
        ""
      ).trim();

      const godownCode = String(
        req.query.godownCode ||
        req.query.gdCode ||
        ""
      ).trim();

      /*
      * Load filters.
      */
      const loadSeries = String(
        req.query.loadSeries || ""
      ).trim();

      const loadNoText = String(
        req.query.loadNo ||
        req.query.loadNumber ||
        ""
      ).trim();

      /*
      * User who added the Sales Bill.
      */
      const addUser = String(
        req.query.addUser ||
        req.query.createdBy ||
        ""
      ).trim();

      const paymentStatus = String(
        req.query.paymentStatus || ""
      ).trim();

      const minAmountText = String(
        req.query.minAmount || ""
      ).trim();

      const maxAmountText = String(
        req.query.maxAmount || ""
      ).trim();

      /* =====================================================
        PAGINATION PARAMETERS
        ===================================================== */

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 20;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      /* =====================================================
        HELPER FUNCTIONS
        ===================================================== */

      const escapeRegex = (value) =>
        String(value || "").replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      /*
      * Creates an exact, case-insensitive
      * regular expression.
      *
      * Example:
      * CAD will match CAD, cad and Cad,
      * but it will not match CADBURY.
      */
      const createExactRegex = (value) =>
        new RegExp(
          `^${escapeRegex(
            String(value || "").trim()
          )}$`,
          "i"
        );

      /*
      * All independent field filters are added
      * to the same $and array.
      *
      * This permits:
      * Company + Area + Salesman + Load Series
      * + Load No + Party at the same time.
      */
      const andConditions = [];

      /* =====================================================
        BASE FILTER
        ===================================================== */

      const filter = {
        distributorId,
        firmId,

        /*
        * Include active records and old records
        * where isActive was never stored.
        */
        isActive: {
          $ne: false,
        },
      };

      /* =====================================================
        DATE FILTER
        ===================================================== */

      if (fromDate || toDate) {
        const billDateFilter = {};

        if (fromDate) {
          const startDate = new Date(
            `${fromDate}T00:00:00.000Z`
          );

          if (
            !Number.isNaN(
              startDate.getTime()
            )
          ) {
            billDateFilter.$gte =
              startDate;
          }
        }

        if (toDate) {
          const endDate = new Date(
            `${toDate}T23:59:59.999Z`
          );

          if (
            !Number.isNaN(
              endDate.getTime()
            )
          ) {
            billDateFilter.$lte =
              endDate;
          }
        }

        if (
          Object.keys(
            billDateFilter
          ).length > 0
        ) {
          andConditions.push({
            $or: [
              {
                BillDate:
                  billDateFilter,
              },
              {
                billDate:
                  billDateFilter,
              },
            ],
          });
        }
      }

      /* =====================================================
        BILL SERIES FILTER
        ===================================================== */

      if (billSeries) {
        const billSeriesRegex =
          createExactRegex(
            billSeries
          );

        andConditions.push({
          $or: [
            {
              BillSeries:
                billSeriesRegex,
            },
            {
              billSeries:
                billSeriesRegex,
            },
            {
              TrnSeries:
                billSeriesRegex,
            },
            {
              trnSeries:
                billSeriesRegex,
            },
          ],
        });
      }

      /* =====================================================
        BILL TYPE FILTER
        ===================================================== */

      if (billType) {
        const billTypeRegex =
          createExactRegex(
            billType
          );

        andConditions.push({
          $or: [
            {
              BillType:
                billTypeRegex,
            },
            {
              billType:
                billTypeRegex,
            },
            {
              InvoiceType:
                billTypeRegex,
            },
            {
              invoiceType:
                billTypeRegex,
            },
          ],
        });
      }

      /* =====================================================
        COMPANY FILTER
        ===================================================== */

      if (companyCode) {
        const companyRegex =
          createExactRegex(
            companyCode
          );

        andConditions.push({
          $or: [
            /*
            * Correct code fields.
            */
            {
              CompanyCode:
                companyRegex,
            },
            {
              companyCode:
                companyRegex,
            },
            {
              CompCode:
                companyRegex,
            },
            {
              compCode:
                companyRegex,
            },

            /*
            * Fallback for cases where the frontend
            * option contains a company name because
            * an old master has no company code.
            */
            {
              CompanyName:
                companyRegex,
            },
            {
              companyName:
                companyRegex,
            },
          ],
        });
      }

      /* =====================================================
        PARTY CODE FILTER
        ===================================================== */

      if (partyCode) {
        const partyCodeRegex =
          createExactRegex(
            partyCode
          );

        andConditions.push({
          $or: [
            {
              PartyCode:
                partyCodeRegex,
            },
            {
              partyCode:
                partyCodeRegex,
            },
            {
              AccountCode:
                partyCodeRegex,
            },
            {
              accountCode:
                partyCodeRegex,
            },
          ],
        });
      }

      /* =====================================================
        PARTY NAME FILTER
        ===================================================== */

      if (partyName) {
        const partyNameRegex =
          new RegExp(
            escapeRegex(
              partyName
            ),
            "i"
          );

        andConditions.push({
          $or: [
            {
              PartyName:
                partyNameRegex,
            },
            {
              partyName:
                partyNameRegex,
            },
            {
              party:
                partyNameRegex,
            },
            {
              AccountName:
                partyNameRegex,
            },
            {
              accountName:
                partyNameRegex,
            },
          ],
        });
      }

      /* =====================================================
        SALESMAN CODE FILTER
        ===================================================== */

      if (salesmanCode) {
        const salesmanCodeRegex =
          createExactRegex(
            salesmanCode
          );

        andConditions.push({
          $or: [
            {
              SalesmanCode:
                salesmanCodeRegex,
            },
            {
              salesmanCode:
                salesmanCodeRegex,
            },
            {
              SmanCode:
                salesmanCodeRegex,
            },
            {
              smanCode:
                salesmanCodeRegex,
            },

            /*
            * Fallback when the dropdown value is
            * salesman name rather than code.
            */
            {
              SalesmanName:
                salesmanCodeRegex,
            },
            {
              salesmanName:
                salesmanCodeRegex,
            },
          ],
        });
      }

      /* =====================================================
        SALESMAN NAME FILTER
        ===================================================== */

      if (salesmanName) {
        const salesmanNameRegex =
          new RegExp(
            escapeRegex(
              salesmanName
            ),
            "i"
          );

        andConditions.push({
          $or: [
            {
              SalesmanName:
                salesmanNameRegex,
            },
            {
              salesmanName:
                salesmanNameRegex,
            },
            {
              salesman:
                salesmanNameRegex,
            },
          ],
        });
      }

      /* =====================================================
        AREA CODE FILTER
        ===================================================== */

      if (areaCode) {
        const areaCodeRegex =
          createExactRegex(
            areaCode
          );

        andConditions.push({
          $or: [
            {
              AreaCode:
                areaCodeRegex,
            },
            {
              areaCode:
                areaCodeRegex,
            },

            /*
            * Fallback for old master records where
            * the dropdown value may contain the name.
            */
            {
              AreaName:
                areaCodeRegex,
            },
            {
              areaName:
                areaCodeRegex,
            },
          ],
        });
      }

      /* =====================================================
        AREA NAME FILTER
        ===================================================== */

      if (areaName) {
        const areaNameRegex =
          new RegExp(
            escapeRegex(
              areaName
            ),
            "i"
          );

        andConditions.push({
          $or: [
            {
              AreaName:
                areaNameRegex,
            },
            {
              areaName:
                areaNameRegex,
            },
            {
              area:
                areaNameRegex,
            },
          ],
        });
      }

      /* =====================================================
        GODOWN FILTER
        ===================================================== */

      if (godownCode) {
        const godownCodeRegex =
          createExactRegex(
            godownCode
          );

        andConditions.push({
          $or: [
            {
              GDCode:
                godownCodeRegex,
            },
            {
              gdCode:
                godownCodeRegex,
            },
            {
              GodownCode:
                godownCodeRegex,
            },
            {
              godownCode:
                godownCodeRegex,
            },
          ],
        });
      }

      /* =====================================================
        LOAD SERIES FILTER
        ===================================================== */

      if (loadSeries) {
        const loadSeriesRegex =
          createExactRegex(
            loadSeries
          );

        andConditions.push({
          $or: [
            {
              LoadSeries:
                loadSeriesRegex,
            },
            {
              loadSeries:
                loadSeriesRegex,
            },
            {
              LoadSer:
                loadSeriesRegex,
            },
            {
              loadSer:
                loadSeriesRegex,
            },
          ],
        });
      }

      /* =====================================================
        LOAD NUMBER FILTER
        ===================================================== */

      if (loadNoText) {
        const numericLoadNo =
          Number(loadNoText);

        const loadNoConditions = [
          /*
          * String representations.
          */
          {
            LoadNo:
              loadNoText,
          },
          {
            loadNo:
              loadNoText,
          },
          {
            LoadNumber:
              loadNoText,
          },
          {
            loadNumber:
              loadNoText,
          },
        ];

        /*
        * MongoDB documents may store LoadNo as
        * a numeric value instead of a string.
        */
        if (
          Number.isFinite(
            numericLoadNo
          )
        ) {
          loadNoConditions.push(
            {
              LoadNo:
                numericLoadNo,
            },
            {
              loadNo:
                numericLoadNo,
            },
            {
              LoadNumber:
                numericLoadNo,
            },
            {
              loadNumber:
                numericLoadNo,
            }
          );
        }

        andConditions.push({
          $or:
            loadNoConditions,
        });
      }

      /* =====================================================
        ADD USER FILTER
        ===================================================== */

      if (addUser) {
        const addUserRegex =
          createExactRegex(
            addUser
          );

        andConditions.push({
          $or: [
            {
              CreatedBy:
                addUserRegex,
            },
            {
              createdBy:
                addUserRegex,
            },
            {
              AddUser:
                addUserRegex,
            },
            {
              addUser:
                addUserRegex,
            },
            {
              UserName:
                addUserRegex,
            },
            {
              userName:
                addUserRegex,
            },
          ],
        });
      }

      /* =====================================================
        AMOUNT RANGE FILTER
        ===================================================== */

      const minAmount =
        Number(minAmountText);

      const maxAmount =
        Number(maxAmountText);

      if (
        minAmountText !== "" &&
        Number.isFinite(minAmount)
      ) {
        andConditions.push({
          $or: [
            {
              NetAmount: {
                $gte:
                  minAmount,
              },
            },
            {
              netAmount: {
                $gte:
                  minAmount,
              },
            },
            {
              amount: {
                $gte:
                  minAmount,
              },
            },
          ],
        });
      }

      if (
        maxAmountText !== "" &&
        Number.isFinite(maxAmount)
      ) {
        andConditions.push({
          $or: [
            {
              NetAmount: {
                $lte:
                  maxAmount,
              },
            },
            {
              netAmount: {
                $lte:
                  maxAmount,
              },
            },
            {
              amount: {
                $lte:
                  maxAmount,
              },
            },
          ],
        });
      }

      /* =====================================================
        PAYMENT STATUS FILTER
        ===================================================== */

      if (
        paymentStatus &&
        paymentStatus.toLowerCase() !==
        "all"
      ) {
        const normalizedStatus =
          paymentStatus.toLowerCase();

        if (
          normalizedStatus ===
          "paid"
        ) {
          andConditions.push({
            $or: [
              {
                PaymentStatus: {
                  $regex:
                    /^paid$/i,
                },
              },
              {
                paymentStatus: {
                  $regex:
                    /^paid$/i,
                },
              },
              {
                BalanceAmount: {
                  $lte: 0,
                },
              },
              {
                balanceAmount: {
                  $lte: 0,
                },
              },
            ],
          });
        } else if (
          normalizedStatus ===
          "pending"
        ) {
          andConditions.push({
            $or: [
              {
                PaymentStatus: {
                  $regex:
                    /pending|unpaid/i,
                },
              },
              {
                paymentStatus: {
                  $regex:
                    /pending|unpaid/i,
                },
              },
              {
                BalanceAmount: {
                  $gt: 0,
                },
              },
              {
                balanceAmount: {
                  $gt: 0,
                },
              },
            ],
          });
        } else if (
          normalizedStatus ===
          "partial"
        ) {
          andConditions.push({
            $or: [
              {
                PaymentStatus: {
                  $regex:
                    /partial/i,
                },
              },
              {
                paymentStatus: {
                  $regex:
                    /partial/i,
                },
              },
            ],
          });
        } else {
          const statusRegex =
            createExactRegex(
              paymentStatus
            );

          andConditions.push({
            $or: [
              {
                PaymentStatus:
                  statusRegex,
              },
              {
                paymentStatus:
                  statusRegex,
              },
            ],
          });
        }
      }

      /* =====================================================
        GENERAL SEARCH
        ===================================================== */

      if (search) {
        const searchRegex =
          new RegExp(
            escapeRegex(
              search
            ),
            "i"
          );

        const searchConditions = [
          {
            BillSeries:
              searchRegex,
          },
          {
            billSeries:
              searchRegex,
          },
          {
            PartyCode:
              searchRegex,
          },
          {
            partyCode:
              searchRegex,
          },
          {
            PartyName:
              searchRegex,
          },
          {
            partyName:
              searchRegex,
          },
          {
            CompanyCode:
              searchRegex,
          },
          {
            companyCode:
              searchRegex,
          },
          {
            CompanyName:
              searchRegex,
          },
          {
            companyName:
              searchRegex,
          },
          {
            SalesmanCode:
              searchRegex,
          },
          {
            salesmanCode:
              searchRegex,
          },
          {
            SalesmanName:
              searchRegex,
          },
          {
            salesmanName:
              searchRegex,
          },
          {
            AreaCode:
              searchRegex,
          },
          {
            areaCode:
              searchRegex,
          },
          {
            AreaName:
              searchRegex,
          },
          {
            areaName:
              searchRegex,
          },
          {
            GDCode:
              searchRegex,
          },
          {
            gdCode:
              searchRegex,
          },
          {
            Godown:
              searchRegex,
          },
          {
            godown:
              searchRegex,
          },
          {
            BillType:
              searchRegex,
          },
          {
            billType:
              searchRegex,
          },
          {
            LoadSeries:
              searchRegex,
          },
          {
            loadSeries:
              searchRegex,
          },
          {
            CreatedBy:
              searchRegex,
          },
          {
            createdBy:
              searchRegex,
          },
          {
            AddUser:
              searchRegex,
          },
          {
            addUser:
              searchRegex,
          },
          {
            Narration:
              searchRegex,
          },
          {
            narration:
              searchRegex,
          },
        ];

        /*
        * BillNo and LoadNo may be stored as numbers.
        */
        const numericSearch =
          Number(search);

        if (
          Number.isFinite(
            numericSearch
          )
        ) {
          searchConditions.push(
            {
              BillNo:
                numericSearch,
            },
            {
              billNo:
                numericSearch,
            },
            {
              LoadNo:
                numericSearch,
            },
            {
              loadNo:
                numericSearch,
            }
          );
        }

        /*
        * Also allow string LoadNo searches.
        */
        searchConditions.push(
          {
            LoadNo:
              search,
          },
          {
            loadNo:
              search,
          }
        );

        andConditions.push({
          $or:
            searchConditions,
        });
      }

      /* =====================================================
        APPLY ALL COMBINED CONDITIONS
        ===================================================== */

      if (
        andConditions.length > 0
      ) {
        filter.$and =
          andConditions;
      }

      /* =====================================================
        COUNT AND PAGINATION
        ===================================================== */

      const totalRecords =
        await SalesHeader.countDocuments(
          filter
        );

      const totalPages = Math.max(
        1,
        Math.ceil(
          totalRecords /
          limit
        )
      );

      /*
      * If a deletion reduced the number of pages,
      * move the request to the final available page.
      */
      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) *
        limit;

      /* =====================================================
        LOAD SALES LIST
        ===================================================== */

      const sales =
        await SalesHeader.find(
          filter
        )
          /*
          * Exclude products/items from the list API.
          * The edit and print APIs can load full items.
          */
          .select({
            items: 0,
            Items: 0,
          })
          .sort({
            BillDate: -1,
            BillNo: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      /* =====================================================
        RESPONSE
        ===================================================== */

      return res.json({
        success: true,

        sales,

        count:
          sales.length,

        pagination: {
          currentPage,
          page:
            currentPage,
          limit,
          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                sales.length,
                totalRecords
              ),
        },

        appliedFilters: {
          search,
          fromDate,
          toDate,
          billSeries,
          billType,

          companyCode,

          partyCode,
          partyName,

          salesmanCode,
          salesmanName,

          areaCode,
          areaName,

          godownCode,

          loadSeries,
          loadNo:
            loadNoText,

          addUser,

          paymentStatus,

          minAmount:
            minAmountText,

          maxAmount:
            maxAmountText,
        },
      });
    } catch (error) {
      console.error(
        "Sales Billing paginated list error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Sales Billing list",
        error:
          error.message,
      });
    }
  }
);
//Quotation backend 


app.get("/api/stock/batches", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, gdCode, prodCode, includeLocked = "N" } = req.query;

    const filter = {
      distributorId: String(distributorId || "").trim(),
      firmId: String(firmId || "").trim(),
      GDCode: String(gdCode || "").trim(),
      ProdCode: String(prodCode || "").trim(),
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    };

    if (includeLocked !== "Y") {
      filter.IsLocked = { $ne: "Y" };
    }

    const rows = await Stock.find(filter).sort({ ExpDt: 1, Batch: 1 }).lean();
    console.log(
      "STOCK BATCH FILTER:",
      JSON.stringify(filter, null, 2)
    );

    console.table(
      rows.map((stockRow) => ({
        _id:
          String(stockRow._id || ""),

        ProdCode:
          stockRow.ProdCode,

        GDCode:
          stockRow.GDCode,

        Batch:
          stockRow.Batch,

        MRP:
          stockRow.MRP,

        PRate:
          stockRow.PRate,

        SRate:
          stockRow.SRate,

        Qty:
          stockRow.Qty,
      }))
    );

    const batches = rows.map((s) => ({
      batchNo: s.Batch || ".",
      batch: s.Batch || ".",
      mrp: Number(s.MRP || 0),
      salesRate: Number(s.SRate || 0),
      sRate: Number(s.SRate || 0),
      purchaseRate: Number(s.PRate || 0),
      stockQty: Number(s.Qty || 0),
      qty: Number(s.Qty || 0),
      gdCode: s.GDCode || "",
      prodCode: s.ProdCode || "",
      isLocked: s.IsLocked || "N",
      boxPack: Number(s.BoxPack || 1),
      inboxPack: Number(s.InBoxPack || 1),
      mfgDate: s.MfgDt || "",
      expDate: s.ExpDt || "",
    }));

    res.json({
      success: true,
      count: batches.length,
      batches,
    });
  } catch (error) {
    console.error("❌ Stock batch load error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load stock batches",
      error: error.message,
    });
  }
});
// ============================================================
// CREDIT NOTE BATCHES
// GDR => Mas_Stock
// DGR => Mas_DamStock
// ============================================================
app.get(
  "/api/stock/credit-note-batches",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const gdCode = String(
        req.query.gdCode || ""
      ).trim();

      const prodCode = String(
        req.query.prodCode || ""
      ).trim();

      const trnType = String(
        req.query.trnType || "GDR"
      )
        .trim()
        .toUpperCase();

      const includeLocked = String(
        req.query.includeLocked || "N"
      )
        .trim()
        .toUpperCase();

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      if (!prodCode) {
        return res.status(400).json({
          success: false,
          message: "Product code is required",
        });
      }

      if (!["GDR", "DGR"].includes(trnType)) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction type must be GDR or DGR",
        });
      }

      const StockCollection =
        trnType === "DGR"
          ? DamStock
          : Stock;

      const filter = {
        distributorId,
        firmId,
        ProdCode: prodCode,

        $and: [
          {
            $or: [
              { isActive: true },
              { isActive: { $exists: false } },
            ],
          },
        ],
      };

      /*
      * Apply godown only when it is available.
      * This also supports old stock records where GDCode
      * may not have been stored.
      */
      if (gdCode) {
        filter.$and.push({
          $or: [
            { GDCode: gdCode },
            { GDCode: "" },
            { GDCode: null },
            { GDCode: { $exists: false } },
          ],
        });
      }

      if (includeLocked !== "Y") {
        filter.$and.push({
          $or: [
            { IsLocked: { $ne: "Y" } },
            { IsLocked: { $exists: false } },
          ],
        });
      }

      const rows = await StockCollection.find(
        filter
      )
        .sort({
          ExpDt: 1,
          Batch: 1,
          MRP: 1,
        })
        .lean();

      const batches = rows.map((stockRow) => ({
        id: stockRow._id,

        batchNo:
          stockRow.Batch ||
          stockRow.batchNo ||
          ".",

        batch:
          stockRow.Batch ||
          stockRow.batchNo ||
          ".",

        mrp: Number(
          stockRow.MRP ||
          stockRow.mrp ||
          0
        ),

        salesRate: Number(
          stockRow.SRate ||
          stockRow.salesRate ||
          stockRow.Rate ||
          stockRow.rate ||
          0
        ),

        sRate: Number(
          stockRow.SRate ||
          stockRow.salesRate ||
          stockRow.Rate ||
          stockRow.rate ||
          0
        ),

        purchaseRate: Number(
          stockRow.PRate ||
          stockRow.purchaseRate ||
          0
        ),

        stockQty: Number(
          stockRow.Qty ||
          stockRow.stockQty ||
          0
        ),

        qty: Number(
          stockRow.Qty ||
          stockRow.stockQty ||
          0
        ),

        gdCode:
          stockRow.GDCode || "",

        prodCode:
          stockRow.ProdCode || "",

        mfgDate:
          stockRow.MfgDt ||
          stockRow.mfgDate ||
          "",

        expDate:
          stockRow.ExpDt ||
          stockRow.expDate ||
          "",

        boxPack: Number(
          stockRow.BoxPack || 1
        ),

        inboxPack: Number(
          stockRow.InBoxPack || 1
        ),

        isLocked:
          stockRow.IsLocked || "N",

        sourceCollection:
          trnType === "DGR"
            ? "MAS_DAMSTOCK"
            : "MAS_STOCK",
      }));

      res.json({
        success: true,
        transactionType: trnType,

        sourceCollection:
          trnType === "DGR"
            ? "MAS_DAMSTOCK"
            : "MAS_STOCK",

        count: batches.length,
        batches,
      });
    } catch (error) {
      console.error(
        "Credit Note batch load error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load Credit Note batches",
        error: error.message,
      });
    }
  }
);
app.get("/api/quotation/next-bill-no", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, BillSeries = "" } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const lastBill = await QuotationHeader.findOne({
      distributorId,
      firmId,
      BillSeries: String(BillSeries || "").trim(),
    }).sort({ BillNo: -1 });

    res.json({
      success: true,
      nextBillNo: lastBill ? Number(lastBill.BillNo || 0) + 1 : 1,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load next quotation bill no",
      error: error.message,
    });
  }
});

app.post(
  "/api/quotation",
  ensureConnection,
  async (req, res) => {
    try {
      const {
        distributorId,
        firmId,
        firmName = "",

        BillDate = "",
        Godown = "",
        GDCode = "",

        CompanyCode = "",
        CompanyName = "",

        AreaCode = "",
        AreaName = "",

        PartyCode = "",
        PartyName = "",

        BillSeries = "",
        BillNo,
        BillType = "Credit",
        DueDate = "",

        SalesmanCode = "",
        SalesmanName = "",
        Narration = "",

        items = [],
      } = req.body;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "Distributor/Firm not found",
        });
      }

      if (!Number(BillNo)) {
        return res.status(400).json({
          success: false,
          message:
            "Quotation Bill No is required",
        });
      }

      if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({
          success: false,
          message:
            "At least one product is required",
        });
      }

      const normalizedItems = items.map(
        (item, index) => ({
          ...item,

          sr: item.sr || index + 1,

          productCode: String(
            item.productCode ||
            item.productId ||
            item.code ||
            String(item.product || "")
              .split(" - ")[0] ||
            ""
          ).trim(),

          productId: String(
            item.productCode ||
            item.productId ||
            item.code ||
            String(item.product || "")
              .split(" - ")[0] ||
            ""
          ).trim(),

          productName: String(
            item.productName ||
            item.name ||
            ""
          ).trim(),

          batchNo: String(
            item.batchNo ||
            item.batch ||
            item.selectedBatch?.batchNo ||
            "."
          ).trim(),

          qty: Number(
            item.qty ||
            item.quantity ||
            0
          ),

          quantity: Number(
            item.qty ||
            item.quantity ||
            0
          ),

          free: Number(item.free || 0),
          mrp: Number(item.mrp || 0),
          rate: Number(item.rate || 0),
          rateGst: Number(item.rateGst || 0),
          tprAmt: Number(item.tprAmt || 0),

          schemePct: Number(
            item.schemePct || 0
          ),

          schemeAmt: Number(
            item.schemeAmt || 0
          ),

          cdPct: Number(item.cdPct || 0),
          cdAmt: Number(item.cdAmt || 0),

          starPct: Number(
            item.starPct || 0
          ),

          starAmt: Number(
            item.starAmt || 0
          ),

          taxable: Number(
            item.taxable || 0
          ),

          gst: Number(item.gst || 0),
          sgst: Number(item.sgst || 0),
          cgst: Number(item.cgst || 0),
          igst: Number(item.igst || 0),

          amount: Number(item.amount || 0),
        })
      );

      const quotation =
        await QuotationHeader.create({
          distributorId:
            String(distributorId).trim(),

          firmId:
            String(firmId).trim(),

          firmName:
            String(firmName || "").trim(),

          BillDate,
          Godown,
          GDCode,

          CompanyCode:
            String(CompanyCode || "").trim(),

          CompanyName:
            String(CompanyName || "").trim(),

          AreaCode:
            String(AreaCode || "").trim(),

          AreaName:
            String(AreaName || "").trim(),

          PartyCode:
            String(PartyCode || "").trim(),

          PartyName:
            String(PartyName || "").trim(),

          BillSeries:
            String(BillSeries || "").trim(),

          BillNo: Number(BillNo),

          BillType:
            BillType || "Credit",

          DueDate,

          SalesmanCode:
            String(
              SalesmanCode || ""
            ).trim(),

          SalesmanName:
            String(
              SalesmanName || ""
            ).trim(),

          Narration:
            String(Narration || "").trim(),

          GrossAmount: Number(
            req.body.GrossAmount || 0
          ),

          TPRAmount: Number(
            req.body.TPRAmount || 0
          ),

          SchemeAmount: Number(
            req.body.SchemeAmount || 0
          ),

          StarDiscountAmount: Number(
            req.body.StarDiscountAmount || 0
          ),

          CashDiscountAmount: Number(
            req.body.CashDiscountAmount || 0
          ),

          DisplayAmount: Number(
            req.body.DisplayAmount || 0
          ),

          CouponAmount: Number(
            req.body.CouponAmount || 0
          ),

          /*
            This keeps the sign:
            Number("-25") = -25
            Number("+25") = 25
          */
          AddLessAmount: Number(
            req.body.AddLessAmount || 0
          ),

          TaxableValue: Number(
            req.body.TaxableValue || 0
          ),

          SGSTAmount: Number(
            req.body.SGSTAmount || 0
          ),

          CGSTAmount: Number(
            req.body.CGSTAmount || 0
          ),

          IGSTAmount: Number(
            req.body.IGSTAmount || 0
          ),

          OriginalNetAmount: Number(
            req.body.OriginalNetAmount ??
            req.body.NetAmount ??
            0
          ),

          NetAmount: Number(
            req.body.NetAmount || 0
          ),

          TotalQty: Number(
            req.body.TotalQty || 0
          ),

          TotalFreeQty: Number(
            req.body.TotalFreeQty || 0
          ),

          TotalItems:
            normalizedItems.length,

          items: normalizedItems,
          isActive: true,
        });

      res.status(201).json({
        success: true,
        message:
          "Quotation saved successfully",
        data: {
          header: quotation,
        },
        nextBillNo:
          Number(BillNo) + 1,
      });
    } catch (error) {
      console.error(
        "Quotation save error:",
        error
      );

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "This quotation bill number already exists for this series",
        });
      }

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Quotation save failed",
      });
    }
  }
);

app.get("/api/quotation", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const quotations = await QuotationHeader.find({
      distributorId,
      firmId,
      isActive: true,
    })
      .sort({ BillDate: -1, BillNo: -1 })
      .lean();

    res.json({
      success: true,
      count: quotations.length,
      quotations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load quotations",
      error: error.message,
    });
  }
});
app.get(
  "/api/quotation/list",
  ensureConnection,
  async (req, res) => {
    try {
      /* =====================================================
        REQUEST PARAMETERS
        ===================================================== */

      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const fromDate = String(
        req.query.fromDate || ""
      ).trim();

      const toDate = String(
        req.query.toDate || ""
      ).trim();

      const billSeries = String(
        req.query.billSeries || ""
      ).trim();

      const billType = String(
        req.query.billType || ""
      ).trim();

      const companyCode = String(
        req.query.companyCode ||
        req.query.company ||
        ""
      ).trim();

      const partyCode = String(
        req.query.partyCode || ""
      ).trim();

      const partyName = String(
        req.query.partyName ||
        req.query.party ||
        ""
      ).trim();

      const salesmanCode = String(
        req.query.salesmanCode || ""
      ).trim();

      const salesmanName = String(
        req.query.salesmanName ||
        req.query.salesman ||
        ""
      ).trim();

      const areaCode = String(
        req.query.areaCode || ""
      ).trim();

      const areaName = String(
        req.query.areaName ||
        req.query.area ||
        ""
      ).trim();

      const godownCode = String(
        req.query.godownCode ||
        req.query.gdCode ||
        ""
      ).trim();

      const addUser = String(
        req.query.addUser ||
        req.query.createdBy ||
        ""
      ).trim();

      const minAmountText = String(
        req.query.minAmount || ""
      ).trim();

      const maxAmountText = String(
        req.query.maxAmount || ""
      ).trim();

      /* =====================================================
        PAGINATION
        ===================================================== */

      const requestedPage =
        Number.parseInt(
          req.query.page,
          10
        );

      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10
        );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 20;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      /* =====================================================
        HELPERS
        ===================================================== */

      const escapeRegex = (value) =>
        String(value || "").replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const exactRegex = (value) =>
        new RegExp(
          `^${escapeRegex(
            String(value || "").trim()
          )}$`,
          "i"
        );

      const andConditions = [];

      /* =====================================================
        BASE FILTER
        ===================================================== */

      const filter = {
        distributorId,
        firmId,

        /*
        * Include active quotations and older records
        * where isActive is not present.
        */
        isActive: {
          $ne: false,
        },
      };

      /* =====================================================
        DATE FILTER
        ===================================================== */

      if (fromDate || toDate) {
        const dateCondition = {};

        if (fromDate) {
          const startDate = new Date(
            `${fromDate}T00:00:00.000Z`
          );

          if (
            !Number.isNaN(
              startDate.getTime()
            )
          ) {
            dateCondition.$gte =
              startDate;
          }
        }

        if (toDate) {
          const endDate = new Date(
            `${toDate}T23:59:59.999Z`
          );

          if (
            !Number.isNaN(
              endDate.getTime()
            )
          ) {
            dateCondition.$lte =
              endDate;
          }
        }

        if (
          Object.keys(
            dateCondition
          ).length > 0
        ) {
          andConditions.push({
            $or: [
              {
                BillDate:
                  dateCondition,
              },
              {
                billDate:
                  dateCondition,
              },
            ],
          });
        }
      }

      /* =====================================================
        BILL SERIES
        ===================================================== */

      if (billSeries) {
        const regex =
          exactRegex(
            billSeries
          );

        andConditions.push({
          $or: [
            {
              BillSeries:
                regex,
            },
            {
              billSeries:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        BILL TYPE
        ===================================================== */

      if (billType) {
        const regex =
          exactRegex(
            billType
          );

        andConditions.push({
          $or: [
            {
              BillType:
                regex,
            },
            {
              billType:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        COMPANY
        ===================================================== */

      if (companyCode) {
        const regex =
          exactRegex(
            companyCode
          );

        andConditions.push({
          $or: [
            {
              CompanyCode:
                regex,
            },
            {
              companyCode:
                regex,
            },
            {
              CompCode:
                regex,
            },
            {
              compCode:
                regex,
            },

            /*
            * Fallback for old records where a name
            * may have been saved instead of a code.
            */
            {
              CompanyName:
                regex,
            },
            {
              companyName:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        PARTY CODE
        ===================================================== */

      if (partyCode) {
        const regex =
          exactRegex(
            partyCode
          );

        andConditions.push({
          $or: [
            {
              PartyCode:
                regex,
            },
            {
              partyCode:
                regex,
            },
            {
              AccountCode:
                regex,
            },
            {
              accountCode:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        PARTY NAME
        ===================================================== */

      if (partyName) {
        const regex =
          new RegExp(
            escapeRegex(
              partyName
            ),
            "i"
          );

        andConditions.push({
          $or: [
            {
              PartyName:
                regex,
            },
            {
              partyName:
                regex,
            },
            {
              party:
                regex,
            },
            {
              AccountName:
                regex,
            },
            {
              accountName:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        SALESMAN CODE
        ===================================================== */

      if (salesmanCode) {
        const regex =
          exactRegex(
            salesmanCode
          );

        andConditions.push({
          $or: [
            {
              SalesmanCode:
                regex,
            },
            {
              salesmanCode:
                regex,
            },
            {
              SmanCode:
                regex,
            },
            {
              smanCode:
                regex,
            },
            {
              SalesmanName:
                regex,
            },
            {
              salesmanName:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        SALESMAN NAME
        ===================================================== */

      if (salesmanName) {
        const regex =
          new RegExp(
            escapeRegex(
              salesmanName
            ),
            "i"
          );

        andConditions.push({
          $or: [
            {
              SalesmanName:
                regex,
            },
            {
              salesmanName:
                regex,
            },
            {
              salesman:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        AREA CODE
        ===================================================== */

      if (areaCode) {
        const regex =
          exactRegex(
            areaCode
          );

        andConditions.push({
          $or: [
            {
              AreaCode:
                regex,
            },
            {
              areaCode:
                regex,
            },
            {
              AreaName:
                regex,
            },
            {
              areaName:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        AREA NAME
        ===================================================== */

      if (areaName) {
        const regex =
          new RegExp(
            escapeRegex(
              areaName
            ),
            "i"
          );

        andConditions.push({
          $or: [
            {
              AreaName:
                regex,
            },
            {
              areaName:
                regex,
            },
            {
              area:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        GODOWN
        ===================================================== */

      if (godownCode) {
        const regex =
          exactRegex(
            godownCode
          );

        andConditions.push({
          $or: [
            {
              GDCode:
                regex,
            },
            {
              gdCode:
                regex,
            },
            {
              GodownCode:
                regex,
            },
            {
              godownCode:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        ADD USER
        ===================================================== */

      if (addUser) {
        const regex =
          exactRegex(
            addUser
          );

        andConditions.push({
          $or: [
            {
              CreatedBy:
                regex,
            },
            {
              createdBy:
                regex,
            },
            {
              AddUser:
                regex,
            },
            {
              addUser:
                regex,
            },
            {
              UserName:
                regex,
            },
            {
              userName:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        AMOUNT RANGE
        ===================================================== */

      const minAmount =
        Number(minAmountText);

      const maxAmount =
        Number(maxAmountText);

      if (
        minAmountText !== "" &&
        Number.isFinite(minAmount)
      ) {
        andConditions.push({
          $or: [
            {
              NetAmount: {
                $gte:
                  minAmount,
              },
            },
            {
              netAmount: {
                $gte:
                  minAmount,
              },
            },
          ],
        });
      }

      if (
        maxAmountText !== "" &&
        Number.isFinite(maxAmount)
      ) {
        andConditions.push({
          $or: [
            {
              NetAmount: {
                $lte:
                  maxAmount,
              },
            },
            {
              netAmount: {
                $lte:
                  maxAmount,
              },
            },
          ],
        });
      }

      /* =====================================================
        GENERAL SEARCH
        ===================================================== */

      if (search) {
        const searchRegex =
          new RegExp(
            escapeRegex(
              search
            ),
            "i"
          );

        const searchConditions = [
          {
            BillSeries:
              searchRegex,
          },
          {
            billSeries:
              searchRegex,
          },
          {
            PartyCode:
              searchRegex,
          },
          {
            partyCode:
              searchRegex,
          },
          {
            PartyName:
              searchRegex,
          },
          {
            partyName:
              searchRegex,
          },
          {
            CompanyCode:
              searchRegex,
          },
          {
            companyCode:
              searchRegex,
          },
          {
            CompanyName:
              searchRegex,
          },
          {
            companyName:
              searchRegex,
          },
          {
            SalesmanCode:
              searchRegex,
          },
          {
            salesmanCode:
              searchRegex,
          },
          {
            SalesmanName:
              searchRegex,
          },
          {
            salesmanName:
              searchRegex,
          },
          {
            AreaCode:
              searchRegex,
          },
          {
            areaCode:
              searchRegex,
          },
          {
            AreaName:
              searchRegex,
          },
          {
            areaName:
              searchRegex,
          },
          {
            GDCode:
              searchRegex,
          },
          {
            gdCode:
              searchRegex,
          },
          {
            Godown:
              searchRegex,
          },
          {
            godown:
              searchRegex,
          },
          {
            BillType:
              searchRegex,
          },
          {
            billType:
              searchRegex,
          },
          {
            Narration:
              searchRegex,
          },
          {
            narration:
              searchRegex,
          },
          {
            CreatedBy:
              searchRegex,
          },
          {
            createdBy:
              searchRegex,
          },
        ];

        /*
        * BillNo is usually stored as a number.
        */
        const numericSearch =
          Number(search);

        if (
          Number.isFinite(
            numericSearch
          )
        ) {
          searchConditions.push(
            {
              BillNo:
                numericSearch,
            },
            {
              billNo:
                numericSearch,
            }
          );
        }

        andConditions.push({
          $or:
            searchConditions,
        });
      }

      /* =====================================================
        APPLY CONDITIONS
        ===================================================== */

      if (
        andConditions.length > 0
      ) {
        filter.$and =
          andConditions;
      }

      /* =====================================================
        COUNT RECORDS
        ===================================================== */

      const totalRecords =
        await QuotationHeader.countDocuments(
          filter
        );

      const totalPages = Math.max(
        1,
        Math.ceil(
          totalRecords /
          limit
        )
      );

      const currentPage = Math.min(
        page,
        totalPages
      );

      const skip =
        (currentPage - 1) *
        limit;

      /* =====================================================
        LOAD CURRENT PAGE
        ===================================================== */

      const quotations =
        await QuotationHeader.find(
          filter
        )
          /*
          * Do not return quotation product items
          * in the list API.
          */
          .select({
            items: 0,
            Items: 0,
          })
          .sort({
            BillDate: -1,
            BillNo: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      /* =====================================================
        RESPONSE
        ===================================================== */

      return res.json({
        success: true,

        quotations,

        count:
          quotations.length,

        pagination: {
          currentPage,
          page:
            currentPage,
          limit,
          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                quotations.length,
                totalRecords
              ),
        },

        appliedFilters: {
          search,
          fromDate,
          toDate,
          billSeries,
          billType,

          companyCode,

          partyCode,
          partyName,

          salesmanCode,
          salesmanName,

          areaCode,
          areaName,

          godownCode,
          addUser,

          minAmount:
            minAmountText,

          maxAmount:
            maxAmountText,
        },
      });
    } catch (error) {
      console.error(
        "Quotation paginated list error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Quotation list",
        error:
          error.message,
      });
    }
  }
);

app.get(
  "/api/create-load/sales-bills",
  ensureConnection,
  async (req, res) => {
    try {
      const {
        distributorId,
        firmId,
        company = "",
        salesmen = "",
        fromDate = "",
        toDate = "",
        editLoadId = "",
      } = req.query;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      if (
        !company ||
        !salesmen ||
        !fromDate ||
        !toDate
      ) {
        return res.json({
          success: true,
          count: 0,
          bills: [],
        });
      }

      const salesmanList =
        String(salesmen)
          .split(",")
          .map((value) =>
            value.trim()
          )
          .filter(Boolean);

      const companyValue =
        String(company).trim();

      let editingLoad = null;

      if (
        editLoadId &&
        mongoose.Types.ObjectId.isValid(
          editLoadId
        )
      ) {
        editingLoad =
          await LoadHeader.findOne({
            _id: editLoadId,
            DistributorId:
              distributorId,
            FirmId: firmId,
            IsCancelled: {
              $ne: true,
            },
          }).lean();
      }

      /*
      * Normal create:
      * only bills not assigned to any load.
      *
      * Edit:
      * unloaded bills plus bills assigned to
      * the load currently being edited.
      */
      const loadAvailabilityConditions = [
        {
          IsLoaded: {
            $ne: true,
          },
        },
        {
          LoadNo: null,
        },
        {
          LoadNo: {
            $exists: false,
          },
        },
        {
          LoadNo: 0,
        },
      ];

      if (editingLoad) {
        loadAvailabilityConditions.push({
          LoadSeries:
            editingLoad.LoadSeries,
          LoadNo:
            Number(
              editingLoad.LoadNo
            ),
        });
      }

      const filter = {
        distributorId,
        firmId,
        isActive: true,

        BillDate: {
          $gte:
            String(fromDate).trim(),
          $lte:
            String(toDate).trim(),
        },

        $and: [
          {
            $or: [
              {
                CompanyName:
                  companyValue,
              },
              {
                CompanyCode:
                  companyValue,
              },
            ],
          },

          {
            $or:
              loadAvailabilityConditions,
          },
        ],
      };

      if (salesmanList.length > 0) {
        filter.$and.push({
          $or: [
            {
              SalesmanName: {
                $in: salesmanList,
              },
            },
            {
              SalesmanCode: {
                $in: salesmanList,
              },
            },
          ],
        });
      }

      const bills =
        await SalesHeader.find(filter)
          .sort({
            BillDate: 1,
            BillNo: 1,
          })
          .lean();

      res.json({
        success: true,
        count: bills.length,
        bills,
      });
    } catch (error) {
      console.error(
        "Create Load sales bills error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load sales bills for create load",
        error: error.message,
      });
    }
  }
);
app.put(
  "/api/create-load/:id",
  ensureConnection,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const { id } = req.params;

      const {
        LoadSeries = "",
        LoadNo,
        LoadDate = "",

        CompanyCode = "",
        CompanyName = "",

        DeliveryBoyCode = "",
        DeliveryBoyName = "",
        DeliveryBy = "",

        VehicleNo = "",
        DriverMobile = "",

        SalesmanCode = "",
        SalesmanName = "",

        SelectedSalesmen = [],
        SelectedAreas = [],

        BillFromDate = "",
        BillToDate = "",

        Narration = "",
        Remarks = "",

        Bills = [],

        TotalBills = 0,
        TotalParties = 0,
        TotalSalesmen = 0,
        TotalAreas = 0,
        TotalAmount = 0,

        LoadSummary = {},

        DistributorId,
        FirmId,
        FirmName = "",

        UpdatedBy = "ADMIN",
      } = req.body;

      if (!DistributorId || !FirmId) {
        throw new Error(
          "Distributor/Firm not found"
        );
      }

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        throw new Error(
          "Invalid Create Load ID"
        );
      }

      const existingLoad =
        await LoadHeader.findOne({
          _id: id,
          DistributorId,
          FirmId,
          IsCancelled: {
            $ne: true,
          },
        }).session(session);

      if (!existingLoad) {
        throw new Error(
          "Create Load not found"
        );
      }

      const cleanLoadSeries =
        String(LoadSeries).trim();

      const cleanLoadNo =
        Number(LoadNo || 0);

      if (!cleanLoadSeries) {
        throw new Error(
          "Load Series is required"
        );
      }

      if (!cleanLoadNo) {
        throw new Error(
          "Load No is required"
        );
      }

      if (
        !Array.isArray(Bills) ||
        Bills.length === 0
      ) {
        throw new Error(
          "Select at least one bill"
        );
      }

      /*
      * Prevent duplicate Load Series + Load No,
      * excluding the current record.
      */
      const duplicateLoad =
        await LoadHeader.findOne({
          _id: {
            $ne: id,
          },

          DistributorId,
          FirmId,

          LoadSeries:
            cleanLoadSeries,

          LoadNo:
            cleanLoadNo,

          IsCancelled: {
            $ne: true,
          },
        }).session(session);

      if (duplicateLoad) {
        throw new Error(
          "This Load Series and Load No already exists."
        );
      }

      const oldBillConditions = (
        existingLoad.Bills || []
      )
        .map(buildCreateLoadBillCondition)
        .filter(Boolean);

      /*
      * First release every bill from the old load.
      */
      if (
        oldBillConditions.length > 0
      ) {
        await SalesHeader.updateMany(
          {
            distributorId:
              DistributorId,

            firmId: FirmId,

            isActive: true,

            $or:
              oldBillConditions,
          },

          {
            $set: {
              IsLoaded: false,
              LoadSeries: "",
              LoadNo: null,
            },
          },

          {
            session,
          }
        );
      }

      const cleanBills = Bills.map(
        (bill, index) => {
          const salesBillId = String(
            bill.SalesBillId ||
            bill.salesBillId ||
            bill._id ||
            ""
          ).trim();

          const billSeries = String(
            bill.BillSeries ??
            bill.Series ??
            bill.billSeries ??
            ""
          ).trim();

          return {
            ...bill,

            Sl: index + 1,
            Selected: true,

            SalesBillId:
              salesBillId,

            BillDate:
              bill.BillDate ||
              bill.billDate ||
              "",

            Series: billSeries,
            BillSeries: billSeries,

            BillNo: Number(
              bill.BillNo ??
              bill.billNo ??
              0
            ),

            BillType:
              bill.BillType ||
              bill.billType ||
              "Credit",

            PartyCode:
              bill.PartyCode ||
              bill.partyCode ||
              "",

            PartyName:
              bill.PartyName ||
              bill.partyName ||
              "",

            SalesmanCode:
              bill.SalesmanCode ||
              bill.salesmanCode ||
              "",

            SalesmanName:
              bill.SalesmanName ||
              bill.salesmanName ||
              bill.salesman ||
              "",

            AreaCode:
              bill.AreaCode ||
              bill.areaCode ||
              "",

            AreaName:
              bill.AreaName ||
              bill.areaName ||
              bill.area ||
              "",

            Amount: Number(
              bill.Amount ??
              bill.amount ??
              bill.billAmount ??
              0
            ),
          };
        }
      ).filter((bill) => {
        const hasMongoId =
          bill.SalesBillId &&
          mongoose.Types.ObjectId.isValid(
            bill.SalesBillId
          );

        const hasBillNo =
          Number(bill.BillNo || 0) > 0;

        return hasMongoId || hasBillNo;
      });

      if (cleanBills.length === 0) {
        throw new Error(
          "No valid bill found in the load"
        );
      }

      const billConditions = cleanBills
        .map(buildCreateLoadBillCondition)
        .filter(Boolean);

      if (billConditions.length === 0) {
        throw new Error(
          "Selected bills do not contain a valid Bill No or Sales Bill ID"
        );
      }
      /*
      * Ensure another active load has not taken
      * one of these bills.
      */
      const conflictingBills =
        await SalesHeader.find({
          distributorId:
            DistributorId,

          firmId: FirmId,

          isActive: true,

          IsLoaded: true,

          $or:
            billConditions,

          $nor: [
            {
              LoadSeries:
                existingLoad.LoadSeries,

              LoadNo:
                existingLoad.LoadNo,
            },
          ],
        })
          .session(session)
          .lean();

      if (conflictingBills.length > 0) {
        throw new Error(
          "One or more selected bills are already assigned to another load."
        );
      }

      const uniqueParties =
        new Set(
          cleanBills
            .map(
              (bill) =>
                bill.PartyCode ||
                bill.PartyName
            )
            .filter(Boolean)
        );

      const uniqueSalesmen =
        new Set(
          cleanBills
            .map(
              (bill) =>
                bill.SalesmanCode ||
                bill.SalesmanName
            )
            .filter(Boolean)
        );

      const uniqueAreas =
        new Set(
          cleanBills
            .map(
              (bill) =>
                bill.AreaCode ||
                bill.AreaName
            )
            .filter(Boolean)
        );

      const calculatedTotal =
        cleanBills.reduce(
          (total, bill) =>
            total +
            Number(
              bill.Amount || 0
            ),
          0
        );

      const finalSummary = {
        totalBills:
          cleanBills.length,

        totalParties:
          uniqueParties.size,

        totalSalesmen:
          uniqueSalesmen.size,

        totalAreas:
          uniqueAreas.size,

        totalAmount:
          calculatedTotal,
      };

      const updatedLoad =
        await LoadHeader.findByIdAndUpdate(
          id,

          {
            $set: {
              LoadSeries:
                cleanLoadSeries,

              LoadNo:
                cleanLoadNo,

              LoadDate,

              CompanyCode:
                String(
                  CompanyCode || ""
                ).trim(),

              CompanyName:
                String(
                  CompanyName || ""
                ).trim(),

              DeliveryBoyCode:
                String(
                  DeliveryBoyCode || ""
                ).trim(),

              DeliveryBoyName:
                String(
                  DeliveryBoyName || ""
                ).trim(),

              DeliveryBy:
                String(
                  DeliveryBy ||
                  DeliveryBoyName ||
                  ""
                ).trim(),

              VehicleNo:
                String(
                  VehicleNo || ""
                )
                  .trim()
                  .toUpperCase(),

              DriverMobile:
                String(
                  DriverMobile || ""
                ).trim(),

              SalesmanCode:
                String(
                  SalesmanCode || ""
                ).trim(),

              SalesmanName:
                String(
                  SalesmanName || ""
                ).trim(),

              SelectedSalesmen:
                Array.isArray(
                  SelectedSalesmen
                )
                  ? SelectedSalesmen
                  : [],

              SelectedAreas:
                Array.isArray(
                  SelectedAreas
                )
                  ? SelectedAreas
                  : [],

              BillFromDate,
              BillToDate,

              Narration:
                String(
                  Narration || ""
                ).trim(),

              Remarks:
                String(
                  Remarks || ""
                ).trim(),

              Bills:
                cleanBills,

              TotalBills:
                finalSummary.totalBills,

              TotalParties:
                finalSummary.totalParties,

              TotalSalesmen:
                finalSummary.totalSalesmen,

              TotalAreas:
                finalSummary.totalAreas,

              TotalAmount:
                finalSummary.totalAmount,

              LoadSummary:
                finalSummary,

              FirmName:
                FirmName || "",

              Status: "ACTIVE",
              IsCancelled: false,

              UpdatedBy,
              UpdatedAt:
                new Date(),
            },
          },

          {
            new: true,
            session,
          }
        );

      /*
      * Mark the newly selected bills as loaded.
      */
      await SalesHeader.updateMany(
        {
          distributorId:
            DistributorId,

          firmId: FirmId,

          isActive: true,

          $or:
            billConditions,
        },

        {
          $set: {
            IsLoaded: true,
            LoadSeries:
              cleanLoadSeries,
            LoadNo:
              cleanLoadNo,
          },
        },

        {
          session,
        }
      );

      await session.commitTransaction();

      res.json({
        success: true,
        message:
          "Load updated successfully",
        data: updatedLoad,
      });
    } catch (error) {
      await session.abortTransaction();

      console.error(
        "Update Create Load error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Create Load update failed",
      });
    } finally {
      session.endSession();
    }
  }
);
app.get("/api/create-load", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const loads = await LoadHeader.find({
      DistributorId: distributorId,
      FirmId: firmId,
      IsCancelled: { $ne: true },
    })
      .sort({ LoadDate: -1, LoadNo: -1 })
      .lean();

    res.json({
      success: true,
      count: loads.length,
      loads,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load create loads",
      error: error.message,
    });
  }
});
app.get(
  "/api/create-load/list",
  ensureConnection,
  async (req, res) => {
    try {
      /* =====================================================
        REQUEST VALUES
        ===================================================== */

      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const fromDate = String(
        req.query.fromDate || ""
      ).trim();

      const toDate = String(
        req.query.toDate || ""
      ).trim();

      const loadSeries = String(
        req.query.loadSeries || ""
      ).trim();

      const loadNoText = String(
        req.query.loadNo || ""
      ).trim();

      const companyCode = String(
        req.query.companyCode ||
        req.query.company ||
        ""
      ).trim();

      const salesmanCode = String(
        req.query.salesmanCode ||
        req.query.salesman ||
        ""
      ).trim();

      const deliveryBy = String(
        req.query.deliveryBy ||
        req.query.deliveryBoy ||
        ""
      ).trim();

      const vehicleNo = String(
        req.query.vehicleNo || ""
      ).trim();

      const status = String(
        req.query.status || ""
      ).trim();

      const createdBy = String(
        req.query.createdBy ||
        req.query.addUser ||
        ""
      ).trim();

      const minAmountText = String(
        req.query.minAmount || ""
      ).trim();

      const maxAmountText = String(
        req.query.maxAmount || ""
      ).trim();

      const requestedPage =
        Number.parseInt(
          req.query.page,
          10
        );

      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10
        );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 10;

      if (
        !distributorId ||
        !firmId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      /* =====================================================
        REGEX HELPERS
        ===================================================== */

      const escapeRegex = (value) =>
        String(value || "").replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const createExactRegex = (
        value
      ) =>
        new RegExp(
          `^${escapeRegex(
            String(value || "").trim()
          )}$`,
          "i"
        );

      const createContainsRegex = (
        value
      ) =>
        new RegExp(
          escapeRegex(
            String(value || "").trim()
          ),
          "i"
        );

      /* =====================================================
        BASE FILTER
        ===================================================== */

      const filter = {
        DistributorId:
          distributorId,

        FirmId:
          firmId,

        IsCancelled: {
          $ne: true,
        },
      };

      const andConditions = [];

      /* =====================================================
        LOAD DATE
        ===================================================== */

      if (fromDate || toDate) {
        const dateCondition = {};

        if (fromDate) {
          const startDate =
            new Date(
              `${fromDate}T00:00:00.000Z`
            );

          if (
            !Number.isNaN(
              startDate.getTime()
            )
          ) {
            dateCondition.$gte =
              startDate;
          }
        }

        if (toDate) {
          const endDate =
            new Date(
              `${toDate}T23:59:59.999Z`
            );

          if (
            !Number.isNaN(
              endDate.getTime()
            )
          ) {
            dateCondition.$lte =
              endDate;
          }
        }

        if (
          Object.keys(
            dateCondition
          ).length > 0
        ) {
          andConditions.push({
            $or: [
              {
                LoadDate:
                  dateCondition,
              },
              {
                loadDate:
                  dateCondition,
              },
            ],
          });
        }
      }

      /* =====================================================
        LOAD SERIES
        ===================================================== */

      if (loadSeries) {
        const regex =
          createExactRegex(
            loadSeries
          );

        andConditions.push({
          $or: [
            {
              LoadSeries:
                regex,
            },
            {
              loadSeries:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        LOAD NUMBER
        ===================================================== */

      if (loadNoText) {
        const numericLoadNo =
          Number(loadNoText);

        const conditions = [
          {
            LoadNo:
              createExactRegex(
                loadNoText
              ),
          },
          {
            loadNo:
              createExactRegex(
                loadNoText
              ),
          },
        ];

        if (
          Number.isFinite(
            numericLoadNo
          )
        ) {
          conditions.push(
            {
              LoadNo:
                numericLoadNo,
            },
            {
              loadNo:
                numericLoadNo,
            }
          );
        }

        andConditions.push({
          $or:
            conditions,
        });
      }

      /* =====================================================
        COMPANY
        ===================================================== */

      if (companyCode) {
        const regex =
          createExactRegex(
            companyCode
          );

        andConditions.push({
          $or: [
            {
              CompanyCode:
                regex,
            },
            {
              companyCode:
                regex,
            },
            {
              CompanyName:
                regex,
            },
            {
              companyName:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        SALESMAN
        ===================================================== */

      if (salesmanCode) {
        const exactRegex =
          createExactRegex(
            salesmanCode
          );

        const containsRegex =
          createContainsRegex(
            salesmanCode
          );

        andConditions.push({
          $or: [
            {
              SalesmanCode:
                containsRegex,
            },
            {
              salesmanCode:
                containsRegex,
            },
            {
              SalesmanName:
                containsRegex,
            },
            {
              salesmanName:
                containsRegex,
            },
            {
              "SelectedSalesmen.salesmanCode":
                exactRegex,
            },
            {
              "SelectedSalesmen.salesmanName":
                exactRegex,
            },
          ],
        });
      }

      /* =====================================================
        DELIVERY BY
        ===================================================== */

      if (deliveryBy) {
        const regex =
          createContainsRegex(
            deliveryBy
          );

        andConditions.push({
          $or: [
            {
              DeliveryBy:
                regex,
            },
            {
              deliveryBy:
                regex,
            },
            {
              DeliveryBoyCode:
                regex,
            },
            {
              deliveryBoyCode:
                regex,
            },
            {
              DeliveryBoyName:
                regex,
            },
            {
              deliveryBoyName:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        VEHICLE
        ===================================================== */

      if (vehicleNo) {
        const regex =
          createContainsRegex(
            vehicleNo
          );

        andConditions.push({
          $or: [
            {
              VehicleNo:
                regex,
            },
            {
              vehicleNo:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        STATUS
        ===================================================== */

      if (status) {
        const regex =
          createExactRegex(
            status
          );

        const statusConditions = [
          {
            Status:
              regex,
          },
          {
            status:
              regex,
          },
        ];

        /*
        * UI displays ACTIVE as Pending.
        */
        if (
          status.toLowerCase() ===
          "pending"
        ) {
          statusConditions.push({
            Status:
              createExactRegex(
                "ACTIVE"
              ),
          });
        }

        andConditions.push({
          $or:
            statusConditions,
        });
      }

      /* =====================================================
        CREATED BY
        ===================================================== */

      if (createdBy) {
        const regex =
          createExactRegex(
            createdBy
          );

        andConditions.push({
          $or: [
            {
              CreatedBy:
                regex,
            },
            {
              createdBy:
                regex,
            },
            {
              UpdatedBy:
                regex,
            },
            {
              updatedBy:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        AMOUNT RANGE
        ===================================================== */

      const minAmount =
        Number(minAmountText);

      const maxAmount =
        Number(maxAmountText);

      if (
        minAmountText !== "" &&
        Number.isFinite(
          minAmount
        )
      ) {
        andConditions.push({
          $or: [
            {
              TotalAmount: {
                $gte:
                  minAmount,
              },
            },
            {
              totalAmount: {
                $gte:
                  minAmount,
              },
            },
          ],
        });
      }

      if (
        maxAmountText !== "" &&
        Number.isFinite(
          maxAmount
        )
      ) {
        andConditions.push({
          $or: [
            {
              TotalAmount: {
                $lte:
                  maxAmount,
              },
            },
            {
              totalAmount: {
                $lte:
                  maxAmount,
              },
            },
          ],
        });
      }

      /* =====================================================
        GENERAL SEARCH
        ===================================================== */

      if (search) {
        const searchRegex =
          createContainsRegex(
            search
          );

        const searchConditions = [
          {
            LoadSeries:
              searchRegex,
          },
          {
            loadSeries:
              searchRegex,
          },
          {
            CompanyCode:
              searchRegex,
          },
          {
            companyCode:
              searchRegex,
          },
          {
            CompanyName:
              searchRegex,
          },
          {
            companyName:
              searchRegex,
          },
          {
            DeliveryBy:
              searchRegex,
          },
          {
            DeliveryBoyName:
              searchRegex,
          },
          {
            DeliveryBoyCode:
              searchRegex,
          },
          {
            VehicleNo:
              searchRegex,
          },
          {
            DriverMobile:
              searchRegex,
          },
          {
            SalesmanCode:
              searchRegex,
          },
          {
            SalesmanName:
              searchRegex,
          },
          {
            Narration:
              searchRegex,
          },
          {
            Remarks:
              searchRegex,
          },
          {
            Status:
              searchRegex,
          },
          {
            CreatedBy:
              searchRegex,
          },
          {
            UpdatedBy:
              searchRegex,
          },
          {
            "SelectedSalesmen.salesmanCode":
              searchRegex,
          },
          {
            "SelectedSalesmen.salesmanName":
              searchRegex,
          },
          {
            "SelectedAreas.areaCode":
              searchRegex,
          },
          {
            "SelectedAreas.areaName":
              searchRegex,
          },
        ];

        const numericSearch =
          Number(search);

        if (
          Number.isFinite(
            numericSearch
          )
        ) {
          searchConditions.push(
            {
              LoadNo:
                numericSearch,
            },
            {
              loadNo:
                numericSearch,
            }
          );
        }

        andConditions.push({
          $or:
            searchConditions,
        });
      }

      if (
        andConditions.length > 0
      ) {
        filter.$and =
          andConditions;
      }

      /* =====================================================
        PAGINATION COUNT
        ===================================================== */

      const totalRecords =
        await LoadHeader.countDocuments(
          filter
        );

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalRecords /
            limit
          )
        );

      const currentPage =
        Math.min(
          page,
          totalPages
        );

      const skip =
        (
          currentPage -
          1
        ) *
        limit;

      /* =====================================================
        LOAD PAGE
        ===================================================== */

      const loads =
        await LoadHeader.find(
          filter
        )
          /*
          * Bills can be very large.
          * Exclude them from list API.
          */
          .select({
            Bills: 0,
            bills: 0,
          })
          .sort({
            LoadDate: -1,
            LoadNo: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        loads,

        count:
          loads.length,

        pagination: {
          currentPage,
          page:
            currentPage,
          limit,
          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                loads.length,
                totalRecords
              ),
        },

        appliedFilters: {
          search,
          fromDate,
          toDate,
          loadSeries,
          loadNo:
            loadNoText,
          companyCode,
          salesmanCode,
          deliveryBy,
          vehicleNo,
          status,
          createdBy,
          minAmount:
            minAmountText,
          maxAmount:
            maxAmountText,
        },
      });
    } catch (error) {
      console.error(
        "Create Load paginated list error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Create Load list",
        error:
          error.message,
      });
    }
  }
);
const buildCreateLoadBillCondition = (bill) => {
  const salesBillId = String(
    bill.SalesBillId ||
    bill.salesBillId ||
    bill._id ||
    ""
  ).trim();

  /*
  * First preference: MongoDB sales bill ID.
  */
  if (
    salesBillId &&
    mongoose.Types.ObjectId.isValid(salesBillId)
  ) {
    return {
      _id: new mongoose.Types.ObjectId(salesBillId),
    };
  }

  const billNo = Number(
    bill.BillNo ??
    bill.billNo ??
    0
  );

  const billSeries = String(
    bill.BillSeries ??
    bill.Series ??
    bill.billSeries ??
    ""
  ).trim();

  if (!billNo) {
    return null;
  }

  /*
  * A series is available: match Series + Bill No.
  */
  if (billSeries) {
    return {
      BillNo: billNo,

      $or: [
        { BillSeries: billSeries },
        { billSeries },
        { Series: billSeries },
      ],
    };
  }

  /*
  * Blank series is valid.
  * Match the bill number where the series is blank,
  * null, or not stored.
  */
  return {
    BillNo: billNo,

    $or: [
      { BillSeries: "" },
      { BillSeries: null },
      { BillSeries: { $exists: false } },

      { billSeries: "" },
      { billSeries: null },
      { billSeries: { $exists: false } },

      { Series: "" },
      { Series: null },
      { Series: { $exists: false } },
    ],
  };
};


app.post(
  "/api/create-load",
  ensureConnection,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const {
        LoadSeries = "",
        LoadNo,
        LoadDate = "",

        CompanyCode = "",
        CompanyName = "",

        DeliveryBoyCode = "",
        DeliveryBoyName = "",
        DeliveryBy = "",

        VehicleNo = "",
        DriverMobile = "",

        SalesmanCode = "",
        SalesmanName = "",

        SelectedSalesmen = [],
        SelectedAreas = [],

        BillFromDate = "",
        BillToDate = "",

        Narration = "",
        Remarks = "",

        Bills = [],

        TotalBills = 0,
        TotalParties = 0,
        TotalSalesmen = 0,
        TotalAreas = 0,
        TotalAmount = 0,

        LoadSummary = {},

        DistributorId,
        FirmId,
        FirmName = "",

        CreatedBy = "ADMIN",
        UpdatedBy = "ADMIN",
      } = req.body;

      const cleanLoadSeries = String(
        LoadSeries || ""
      ).trim();

      const cleanLoadNo = Number(LoadNo || 0);

      if (!DistributorId || !FirmId) {
        throw new Error(
          "Distributor/Firm not found"
        );
      }

      if (!cleanLoadSeries) {
        throw new Error(
          "Load Series is required"
        );
      }

      if (!cleanLoadNo) {
        throw new Error(
          "Load No is required"
        );
      }

      if (!Array.isArray(Bills) || Bills.length === 0) {
        throw new Error(
          "Please select at least one bill"
        );
      }

      const duplicateLoad =
        await LoadHeader.findOne({
          DistributorId,
          FirmId,
          LoadSeries: cleanLoadSeries,
          LoadNo: cleanLoadNo,
          IsCancelled: {
            $ne: true,
          },
        }).session(session);

      if (duplicateLoad) {
        throw new Error(
          `Load ${cleanLoadSeries}-${cleanLoadNo} already exists`
        );
      }

      const cleanBills = Bills.map(
        (bill, index) => {
          const salesBillId = String(
            bill.SalesBillId ||
            bill.salesBillId ||
            bill._id ||
            ""
          ).trim();

          const billSeries = String(
            bill.BillSeries ??
            bill.Series ??
            bill.billSeries ??
            ""
          ).trim();

          return {
            ...bill,

            Sl: Number(
              bill.Sl ||
              bill.sr ||
              index + 1
            ),

            Selected:
              bill.Selected !== false,

            SalesBillId:
              salesBillId,

            BillDate:
              bill.BillDate ||
              bill.billDate ||
              "",

            /*
            * An empty series is valid.
            */
            Series: billSeries,
            BillSeries: billSeries,

            BillNo: Number(
              bill.BillNo ??
              bill.billNo ??
              0
            ),

            BillType: String(
              bill.BillType ||
              bill.billType ||
              "Credit"
            ).trim(),

            PartyCode: String(
              bill.PartyCode ||
              bill.partyCode ||
              ""
            ).trim(),

            PartyName: String(
              bill.PartyName ||
              bill.partyName ||
              ""
            ).trim(),

            SalesmanCode: String(
              bill.SalesmanCode ||
              bill.salesmanCode ||
              ""
            ).trim(),

            SalesmanName: String(
              bill.SalesmanName ||
              bill.salesmanName ||
              bill.salesman ||
              ""
            ).trim(),

            AreaCode: String(
              bill.AreaCode ||
              bill.areaCode ||
              ""
            ).trim(),

            AreaName: String(
              bill.AreaName ||
              bill.areaName ||
              bill.area ||
              ""
            ).trim(),

            Amount: Number(
              bill.Amount ??
              bill.amount ??
              bill.billAmount ??
              0
            ),
          };
        }
      ).filter((bill) => {
        const hasMongoId =
          bill.SalesBillId &&
          mongoose.Types.ObjectId.isValid(
            bill.SalesBillId
          );

        const hasBillNo =
          Number(bill.BillNo || 0) > 0;

        /*
        * Bill Series is not required.
        */
        return hasMongoId || hasBillNo;
      });
      const billConditions = cleanBills
        .map(buildCreateLoadBillCondition)
        .filter(Boolean);

      if (billConditions.length === 0) {
        throw new Error(
          "Selected bills do not contain a valid Bill No or Sales Bill ID"
        );
      }

      const alreadyLoaded =
        await SalesHeader.findOne({
          distributorId: DistributorId,
          firmId: FirmId,
          isActive: true,
          IsLoaded: true,

          $or: billConditions,
        }).session(session);

      if (alreadyLoaded) {
        throw new Error(
          `Bill ${alreadyLoaded.BillSeries}-${alreadyLoaded.BillNo} is already added in Load ${alreadyLoaded.LoadSeries}-${alreadyLoaded.LoadNo}`
        );
      }

      /*
        Recalculate important summary values on the backend.
        Never depend only on values sent by the browser.
      */
      const calculatedTotalAmount =
        cleanBills.reduce(
          (sum, bill) =>
            sum + Number(bill.Amount || 0),
          0
        );

      const calculatedTotalParties =
        new Set(
          cleanBills
            .map(
              (bill) =>
                bill.PartyCode ||
                bill.PartyName
            )
            .filter(Boolean)
        ).size;

      const calculatedTotalSalesmen =
        Array.isArray(SelectedSalesmen) &&
          SelectedSalesmen.length > 0
          ? SelectedSalesmen.length
          : new Set(
            cleanBills
              .map(
                (bill) =>
                  bill.SalesmanCode ||
                  bill.SalesmanName
              )
              .filter(Boolean)
          ).size;

      const calculatedTotalAreas =
        Array.isArray(SelectedAreas) &&
          SelectedAreas.length > 0
          ? SelectedAreas.length
          : new Set(
            cleanBills
              .map(
                (bill) =>
                  bill.AreaCode ||
                  bill.AreaName
              )
              .filter(Boolean)
          ).size;

      const finalSummary = {
        totalBills: cleanBills.length,

        totalParties:
          calculatedTotalParties ||
          Number(
            LoadSummary.totalParties ||
            TotalParties ||
            0
          ),

        totalSalesmen:
          calculatedTotalSalesmen ||
          Number(
            LoadSummary.totalSalesmen ||
            TotalSalesmen ||
            0
          ),

        totalAreas:
          calculatedTotalAreas ||
          Number(
            LoadSummary.totalAreas ||
            TotalAreas ||
            0
          ),

        totalAmount: Number(
          calculatedTotalAmount.toFixed(2)
        ),
      };

      const savedLoad = await LoadHeader.create(
        [
          {
            LoadSeries: cleanLoadSeries,
            LoadNo: cleanLoadNo,
            LoadDate,

            CompanyCode: String(
              CompanyCode || ""
            ).trim(),

            CompanyName: String(
              CompanyName || ""
            ).trim(),

            DeliveryBoyCode: String(
              DeliveryBoyCode || ""
            ).trim(),

            DeliveryBoyName: String(
              DeliveryBoyName || ""
            ).trim(),

            DeliveryBy: String(
              DeliveryBy ||
              DeliveryBoyName ||
              ""
            ).trim(),

            VehicleNo: String(
              VehicleNo || ""
            )
              .trim()
              .toUpperCase(),

            DriverMobile: String(
              DriverMobile || ""
            ).trim(),

            SalesmanCode: String(
              SalesmanCode || ""
            ).trim(),

            SalesmanName: String(
              SalesmanName || ""
            ).trim(),

            SelectedSalesmen:
              Array.isArray(SelectedSalesmen)
                ? SelectedSalesmen
                : [],

            SelectedAreas:
              Array.isArray(SelectedAreas)
                ? SelectedAreas
                : [],

            BillFromDate,
            BillToDate,

            Narration: String(
              Narration || ""
            ).trim(),

            Remarks: String(
              Remarks || ""
            ).trim(),

            Bills: cleanBills,

            TotalBills:
              finalSummary.totalBills,

            TotalParties:
              finalSummary.totalParties,

            TotalSalesmen:
              finalSummary.totalSalesmen,

            TotalAreas:
              finalSummary.totalAreas,

            TotalAmount:
              finalSummary.totalAmount,

            LoadSummary: finalSummary,

            DistributorId,
            FirmId,
            FirmName,

            Status: "ACTIVE",
            IsCancelled: false,
            IsLocked: false,

            CreatedBy,
            UpdatedBy,
          },
        ],
        {
          session,
        }
      );

      await SalesHeader.updateMany(
        {
          distributorId: DistributorId,
          firmId: FirmId,
          isActive: true,
          $or: billConditions,
        },
        {
          $set: {
            IsLoaded: true,
            LoadSeries: cleanLoadSeries,
            LoadNo: cleanLoadNo,
          },
        },
        {
          session,
        }
      );

      await session.commitTransaction();

      res.status(201).json({
        success: true,
        message:
          "Load created successfully",

        data: savedLoad[0],
      });
    } catch (error) {
      await session.abortTransaction();

      console.error(
        "Create Load Error:",
        error
      );

      const duplicateError =
        error?.code === 11000;

      res
        .status(duplicateError ? 409 : 500)
        .json({
          success: false,

          message: duplicateError
            ? "This Load Series and Load No already exists."
            : error.message ||
            "Create Load save failed",
        });
    } finally {
      session.endSession();
    }
  }
);
app.get("/api/settle-load", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || "").trim();
    const firmId = String(req.query.firmId || "").trim();
    const loadSeries = String(req.query.loadSeries || "").trim();
    const loadNo = Number(req.query.loadNo || 0);

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found",
      });
    }

    if (!loadNo) {
      return res.status(400).json({
        success: false,
        message: "Load No is required",
      });
    }

    const filter = {
      DistributorId: distributorId,
      FirmId: firmId,
      LoadNo: loadNo,
      IsCancelled: { $ne: true },
    };

    if (loadSeries) {
      filter.LoadSeries = loadSeries;
    }

    const load = await LoadHeader.findOne(filter).lean();

    if (!load) {
      return res.status(404).json({
        success: false,
        message: "Load not found for entered Load Series and Load No",
      });
    }

    res.json({
      success: true,
      load: {
        id: load._id,
        loadSeries: load.LoadSeries || "",
        loadNo: load.LoadNo || "",
        loadDate: load.LoadDate || "",
        narration: load.Narration || "",
        items: load.Bills || [],
      },
    });
  } catch (error) {
    console.error("Settle Load API error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load settle load bills",
      error: error.message,
    });
  }
});
/* =========================================================
  LOAD TRANSFER HELPERS
  ========================================================= */

const escapeLoadTransferRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const loadTransferExactRegex = (value = "") =>
  new RegExp(
    `^${escapeLoadTransferRegex(String(value).trim())}$`,
    "i"
  );

/*
* Convert a Sales Header document into the same bill object
* format stored inside T_Load_Header.Bills.
*/
const createLoadTransferBillSnapshot = (bill) => {
  const source = bill?.toObject
    ? bill.toObject()
    : bill || {};

  const billSeries = String(
    source.BillSeries ??
    source.billSeries ??
    source.Series ??
    ""
  ).trim();

  const billNo = Number(
    source.BillNo ??
    source.billNo ??
    0
  );

  const netAmount = Number(
    source.NetAmount ??
    source.netAmount ??
    source.OriginalNetAmount ??
    source.originalNetAmount ??
    0
  ) || 0;

  return {
    /*
    * Keep MongoDB Sales Bill ID.
    * This provides reliable future updates.
    */
    SalesBillId:
      source._id
        ? String(source._id)
        : String(
          source.SalesBillId ||
          source.salesBillId ||
          ""
        ),

    id:
      source._id
        ? String(source._id)
        : String(
          source.id ||
          source.SalesBillId ||
          source.salesBillId ||
          `${billSeries}-${billNo}`
        ),

    _id:
      source._id
        ? String(source._id)
        : undefined,

    BillDate: String(
      source.BillDate ??
      source.billDate ??
      ""
    ),

    BillSeries: billSeries,
    BillNo: billNo,

    PartyCode: String(
      source.PartyCode ??
      source.partyCode ??
      ""
    ),

    PartyName: String(
      source.PartyName ??
      source.partyName ??
      ""
    ),

    CompanyCode: String(
      source.CompanyCode ??
      source.companyCode ??
      ""
    ),

    CompanyName: String(
      source.CompanyName ??
      source.companyName ??
      ""
    ),

    AreaCode: String(
      source.AreaCode ??
      source.areaCode ??
      ""
    ),

    AreaName: String(
      source.AreaName ??
      source.areaName ??
      ""
    ),

    SalesmanCode: String(
      source.SalesmanCode ??
      source.salesmanCode ??
      ""
    ),

    SalesmanName: String(
      source.SalesmanName ??
      source.salesmanName ??
      ""
    ),

    BillType: String(
      source.BillType ??
      source.billType ??
      ""
    ),

    NetAmount: netAmount,

    amount: netAmount,
    billAmount: netAmount,

    selected: true,
  };
};


/*
* Return a stable identifier for a bill stored in LoadHeader.Bills.
*/
const getLoadTransferBillKey = (
  bill = {}
) => {
  /*
  * Only SalesBillId represents the actual
  * SalesHeader document.
  *
  * bill._id may belong to an embedded array row.
  */
  const salesBillId =
    String(
      bill.SalesBillId ||
      bill.salesBillId ||
      ""
    ).trim();

  if (
    salesBillId &&
    mongoose.Types.ObjectId.isValid(
      salesBillId
    )
  ) {
    return `ID:${salesBillId}`;
  }

  const billSeries =
    String(
      bill.BillSeries ??
      bill.billSeries ??
      bill.Series ??
      ""
    )
      .trim()
      .toUpperCase();

  const billNo =
    Number(
      bill.BillNo ??
      bill.billNo ??
      0
    );

  return `BILL:${billSeries}:${billNo}`;
};


/*
* Calculate all LoadHeader totals after adding/removing bills.
*/
const calculateLoadTransferSummary = (bills = []) => {
  const safeBills = Array.isArray(bills)
    ? bills
    : [];

  const uniqueParties = new Set();
  const uniqueSalesmen = new Set();
  const uniqueAreas = new Set();

  let totalAmount = 0;

  safeBills.forEach((bill) => {
    const partyValue = String(
      bill.PartyCode ||
      bill.partyCode ||
      bill.PartyName ||
      bill.partyName ||
      ""
    ).trim();

    const salesmanValue = String(
      bill.SalesmanCode ||
      bill.salesmanCode ||
      bill.SalesmanName ||
      bill.salesmanName ||
      ""
    ).trim();

    const areaValue = String(
      bill.AreaCode ||
      bill.areaCode ||
      bill.AreaName ||
      bill.areaName ||
      ""
    ).trim();

    if (partyValue) {
      uniqueParties.add(partyValue);
    }

    if (salesmanValue) {
      uniqueSalesmen.add(salesmanValue);
    }

    if (areaValue) {
      uniqueAreas.add(areaValue);
    }

    totalAmount += Number(
      bill.NetAmount ??
      bill.netAmount ??
      bill.billAmount ??
      bill.amount ??
      0
    ) || 0;
  });

  const totalBills = safeBills.length;
  const totalParties = uniqueParties.size;
  const totalSalesmen = uniqueSalesmen.size;
  const totalAreas = uniqueAreas.size;

  return {
    TotalBills: totalBills,
    TotalParties: totalParties,
    TotalSalesmen: totalSalesmen,
    TotalAreas: totalAreas,
    TotalAmount: Number(totalAmount.toFixed(2)),

    LoadSummary: {
      totalBills,
      totalParties,
      totalSalesmen,
      totalAreas,
      totalAmount: Number(totalAmount.toFixed(2)),
    },
  };
};


/*
* Find one load using firm and Load Series + Load No.
*/
const findLoadForTransfer = async ({
  distributorId,
  firmId,
  loadSeries,
  loadNo,
  session = null,
}) => {
  const filter = {
    DistributorId: String(distributorId).trim(),
    FirmId: String(firmId).trim(),
    LoadNo: Number(loadNo),
    IsCancelled: {
      $ne: true,
    },
  };

  const cleanSeries = String(
    loadSeries || ""
  ).trim();

  if (cleanSeries) {
    filter.LoadSeries =
      loadTransferExactRegex(cleanSeries);
  } else {
    filter.$or = [
      { LoadSeries: "" },
      { LoadSeries: null },
      { LoadSeries: { $exists: false } },
    ];
  }

  let query = LoadHeader.findOne(filter);

  if (session) {
    query = query.session(session);
  }

  return query;
};


/* =========================================================
  GET LOAD TRANSFER SOURCE BILLS
  LOAD TO LOAD MODE
  ========================================================= */

/* =========================================================
  GET LOAD TRANSFER SOURCE BILLS
  SALES HEADER IS THE AUTHORITATIVE SOURCE
  ========================================================= */

/* =========================================================
  GET LOAD TRANSFER SOURCE BILLS
  SALES HEADER IS THE CURRENT SOURCE
  ========================================================= */

app.get(
  "/api/load-transfer/load-bills",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const loadSeries = String(
        req.query.loadSeries || ""
      ).trim();

      const loadNo = Number(
        req.query.loadNo || 0
      );

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "Distributor/Firm not found. Please login again.",
        });
      }

      if (!loadNo) {
        return res.status(400).json({
          success: false,
          message:
            "From Load No is required.",
        });
      }

      const sourceLoad =
        await findLoadForTransfer({
          distributorId,
          firmId,
          loadSeries,
          loadNo,
        });

      if (!sourceLoad) {
        return res.status(404).json({
          success: false,
          message:
            "No load found for the entered Load Series and Load No.",
        });
      }

      /*
      * IMPORTANT:
      * SalesHeader is the final source for current
      * load assignment.
      *
      * Do not use sourceLoad.Bills to prepare the list,
      * because it may contain an old transferred row.
      */
      const salesFilter = {
        distributorId,
        firmId,

        LoadNo: Number(
          sourceLoad.LoadNo
        ),

        IsLoaded: true,

        isActive: true,

        IsBillCancelled: {
          $ne: true,
        },
      };

      const actualLoadSeries = String(
        sourceLoad.LoadSeries || ""
      ).trim();

      if (actualLoadSeries) {
        salesFilter.LoadSeries =
          loadTransferExactRegex(
            actualLoadSeries
          );
      } else {
        salesFilter.$or = [
          {
            LoadSeries: "",
          },
          {
            LoadSeries: null,
          },
          {
            LoadSeries: {
              $exists: false,
            },
          },
        ];
      }

      const salesBills =
        await SalesHeader.find(
          salesFilter
        )
          .sort({
            BillDate: 1,
            BillNo: 1,
            _id: 1,
          })
          .lean();

      const bills =
        salesBills.map(
          (salesBill) =>
            createLoadTransferBillSnapshot(
              salesBill
            )
        );

      /*
      * Repair LoadHeader.Bills automatically.
      * Once a load is opened, stale embedded rows are removed.
      */
      const correctedSummary =
        calculateLoadTransferSummary(
          bills
        );

      sourceLoad.Bills = bills;

      sourceLoad.TotalBills =
        correctedSummary.TotalBills;

      sourceLoad.TotalParties =
        correctedSummary.TotalParties;

      sourceLoad.TotalSalesmen =
        correctedSummary.TotalSalesmen;

      sourceLoad.TotalAreas =
        correctedSummary.TotalAreas;

      sourceLoad.TotalAmount =
        correctedSummary.TotalAmount;

      sourceLoad.LoadSummary =
        correctedSummary.LoadSummary;

      sourceLoad.UpdatedBy =
        "LOAD_TRANSFER_RECONCILIATION";

      await sourceLoad.save();

      return res.json({
        success: true,

        sourceLoad: {
          id:
            String(sourceLoad._id),

          loadSeries:
            sourceLoad.LoadSeries || "",

          loadNo:
            sourceLoad.LoadNo || 0,

          loadDate:
            sourceLoad.LoadDate || "",

          companyCode:
            sourceLoad.CompanyCode || "",

          companyName:
            sourceLoad.CompanyName || "",

          totalBills:
            correctedSummary.TotalBills,

          totalAmount:
            correctedSummary.TotalAmount,
        },

        bills,

        count:
          bills.length,
      });
    } catch (error) {
      console.error(
        "Load Transfer load lookup error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load bills from the entered load.",

        error:
          error.message,
      });
    }
  }
);

/* =========================================================
  GET LOAD TRANSFER BILL
  BILL WISE MODE
  ========================================================= */

app.get(
  "/api/load-transfer/bill",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const billSeries = String(
        req.query.billSeries || ""
      ).trim();

      const billNo = Number(
        req.query.billNo || 0
      );

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "Distributor/Firm not found. Please login again.",
        });
      }

      if (!billNo) {
        return res.status(400).json({
          success: false,
          message: "Bill No is required.",
        });
      }

      const billFilter = {
        distributorId,
        firmId,
        BillNo: billNo,

        isActive: true,

        IsBillCancelled: {
          $ne: true,
        },
      };

      if (billSeries) {
        billFilter.BillSeries =
          loadTransferExactRegex(
            billSeries
          );
      } else {
        billFilter.$or = [
          { BillSeries: "" },
          { BillSeries: null },
          {
            BillSeries: {
              $exists: false,
            },
          },
        ];
      }

      const salesBill =
        await SalesHeader.findOne(
          billFilter
        ).lean();

      if (!salesBill) {
        return res.status(404).json({
          success: false,
          message:
            "Sales bill not found for the entered Bill Series and Bill No.",
        });
      }

      const currentLoadSeries = String(
        salesBill.LoadSeries || ""
      ).trim();

      const currentLoadNo = Number(
        salesBill.LoadNo || 0
      );

      let sourceLoad = null;

      if (currentLoadNo) {
        sourceLoad =
          await findLoadForTransfer({
            distributorId,
            firmId,
            loadSeries:
              currentLoadSeries,
            loadNo:
              currentLoadNo,
          });
      }

      return res.json({
        success: true,

        sourceLoad: sourceLoad
          ? {
            id: String(sourceLoad._id),

            loadSeries:
              sourceLoad.LoadSeries || "",

            loadNo:
              sourceLoad.LoadNo || 0,

            loadDate:
              sourceLoad.LoadDate || "",
          }
          : null,

        bill:
          createLoadTransferBillSnapshot(
            salesBill
          ),
      });
    } catch (error) {
      console.error(
        "Load Transfer bill lookup error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load the entered Sales Bill.",
        error: error.message,
      });
    }
  }
);


/* =========================================================
  SAVE LOAD TRANSFER
  ========================================================= */

app.post(
  "/api/load-transfer",
  ensureConnection,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const distributorId = String(
        req.body.distributorId || ""
      ).trim();

      const firmId = String(
        req.body.firmId || ""
      ).trim();

      const transferMode = String(
        req.body.transferMode ||
        "LOAD_TO_LOAD"
      )
        .trim()
        .toUpperCase();

      const fromLoadSeries = String(
        req.body.fromLoadSeries || ""
      ).trim();

      const fromLoadNo = Number(
        req.body.fromLoadNo || 0
      );

      const toLoadSeries = String(
        req.body.toLoadSeries || ""
      ).trim();

      const toLoadNo = Number(
        req.body.toLoadNo || 0
      );

      const selectedBillIds =
        Array.isArray(
          req.body.selectedBillIds
        )
          ? req.body.selectedBillIds
            .map((value) =>
              String(value || "").trim()
            )
            .filter(Boolean)
          : [];

      const updatedBy = String(
        req.body.updatedBy ||
        req.body.userName ||
        "ADMIN"
      ).trim();

      if (!distributorId || !firmId) {
        throw new Error(
          "Distributor/Firm not found. Please login again."
        );
      }

      if (!toLoadNo) {
        throw new Error(
          "To Load No is required."
        );
      }

      if (selectedBillIds.length === 0) {
        throw new Error(
          "Please select at least one bill to transfer."
        );
      }

      const validBillObjectIds =
        selectedBillIds
          .filter((id) =>
            mongoose.Types.ObjectId.isValid(
              id
            )
          )
          .map(
            (id) =>
              new mongoose.Types.ObjectId(id)
          );

      if (
        validBillObjectIds.length !==
        selectedBillIds.length
      ) {
        throw new Error(
          "One or more selected Bill IDs are invalid."
        );
      }

      const destinationLoad =
        await findLoadForTransfer({
          distributorId,
          firmId,
          loadSeries:
            toLoadSeries,
          loadNo:
            toLoadNo,
          session,
        });

      if (!destinationLoad) {
        throw new Error(
          "Destination load was not found. First create the To Load, then transfer bills into it."
        );
      }

      if (
        destinationLoad.IsLocked === true
      ) {
        throw new Error(
          "Destination load is locked and cannot accept transferred bills."
        );
      }

      if (
        String(
          destinationLoad.Status || ""
        )
          .trim()
          .toUpperCase() === "SETTLED"
      ) {
        throw new Error(
          "Destination load is already settled."
        );
      }

      let sourceLoad = null;

      if (fromLoadNo) {
        sourceLoad =
          await findLoadForTransfer({
            distributorId,
            firmId,
            loadSeries:
              fromLoadSeries,
            loadNo:
              fromLoadNo,
            session,
          });
      }

      if (
        transferMode ===
        "LOAD_TO_LOAD" &&
        !sourceLoad
      ) {
        throw new Error(
          "Source load was not found."
        );
      }

      if (
        sourceLoad &&
        String(sourceLoad._id) ===
        String(destinationLoad._id)
      ) {
        throw new Error(
          "From Load and To Load cannot be the same."
        );
      }

      if (
        sourceLoad?.IsLocked === true
      ) {
        throw new Error(
          "Source load is locked and cannot be changed."
        );
      }

      if (
        sourceLoad &&
        String(
          sourceLoad.Status || ""
        )
          .trim()
          .toUpperCase() === "SETTLED"
      ) {
        throw new Error(
          "Source load is already settled."
        );
      }

      const selectedSalesBills =
        await SalesHeader.find({
          _id: {
            $in:
              validBillObjectIds,
          },

          distributorId,
          firmId,

          isActive: true,

          IsBillCancelled: {
            $ne: true,
          },
        }).session(session);

      if (
        selectedSalesBills.length !==
        validBillObjectIds.length
      ) {
        throw new Error(
          "One or more selected Sales Bills were not found."
        );
      }

      /*
      * In Load To Load mode, every selected bill must
      * still belong to the entered source load.
      */
      if (
        transferMode ===
        "LOAD_TO_LOAD"
      ) {
        const invalidSourceBill =
          selectedSalesBills.find(
            (bill) =>
              String(
                bill.LoadSeries || ""
              )
                .trim()
                .toUpperCase() !==
              String(
                sourceLoad.LoadSeries ||
                ""
              )
                .trim()
                .toUpperCase() ||
              Number(
                bill.LoadNo || 0
              ) !==
              Number(
                sourceLoad.LoadNo || 0
              )
          );

        if (invalidSourceBill) {
          throw new Error(
            `Bill ${invalidSourceBill.BillSeries ||
            ""
            }-${invalidSourceBill.BillNo ||
            ""
            } no longer belongs to the selected source load. Refresh and try again.`
          );
        }
      }

      /*
      * Bill Wise mode also removes the bill from its
      * actual current source load, when it has one.
      */
      const sourceLoadMap =
        new Map();

      if (sourceLoad) {
        sourceLoadMap.set(
          String(sourceLoad._id),
          sourceLoad
        );
      }

      if (
        transferMode ===
        "BILL_WISE"
      ) {
        for (
          const salesBill of
          selectedSalesBills
        ) {
          const billCurrentLoadNo =
            Number(
              salesBill.LoadNo || 0
            );

          if (!billCurrentLoadNo) {
            continue;
          }

          const billCurrentLoad =
            await findLoadForTransfer({
              distributorId,
              firmId,

              loadSeries:
                salesBill.LoadSeries ||
                "",

              loadNo:
                billCurrentLoadNo,

              session,
            });

          if (billCurrentLoad) {
            if (
              String(
                billCurrentLoad._id
              ) ===
              String(
                destinationLoad._id
              )
            ) {
              throw new Error(
                `Bill ${salesBill.BillSeries ||
                ""
                }-${salesBill.BillNo
                } is already available in the destination load.`
              );
            }

            sourceLoadMap.set(
              String(
                billCurrentLoad._id
              ),
              billCurrentLoad
            );
          }
        }
      }

      const selectedIdSet =
        new Set(
          selectedSalesBills.map(
            (bill) =>
              String(bill._id)
          )
        );
      const selectedBillKeySet =
        new Set(
          selectedSalesBills.map(
            (bill) => {
              const billSeries =
                String(
                  bill.BillSeries ||
                  bill.billSeries ||
                  bill.Series ||
                  ""
                )
                  .trim()
                  .toUpperCase();

              const billNo =
                Number(
                  bill.BillNo ||
                  bill.billNo ||
                  0
                );

              return `${billSeries}:${billNo}`;
            }
          )
        );

      /*
      * Remove selected bills from every source load.
      */
      for (
        const currentSourceLoad of
        sourceLoadMap.values()
      ) {
        if (
          currentSourceLoad.IsLocked ===
          true
        ) {
          throw new Error(
            `Load ${currentSourceLoad.LoadSeries ||
            ""
            }-${currentSourceLoad.LoadNo
            } is locked.`
          );
        }

        const sourceBills =
          Array.isArray(
            currentSourceLoad.Bills
          )
            ? currentSourceLoad.Bills
            : [];

        const remainingBills =
          sourceBills.filter(
            (bill) => {
              /*
              * First try the explicit Sales Bill ID.
              * Do not trust an embedded subdocument _id.
              */
              const salesBillId =
                String(
                  bill.SalesBillId ||
                  bill.salesBillId ||
                  ""
                ).trim();

              if (
                salesBillId &&
                selectedIdSet.has(
                  salesBillId
                )
              ) {
                return false;
              }

              /*
              * Fallback for older LoadHeader rows:
              * match using Bill Series + Bill No.
              */
              const billSeries =
                String(
                  bill.BillSeries ??
                  bill.billSeries ??
                  bill.Series ??
                  ""
                )
                  .trim()
                  .toUpperCase();

              const billNo =
                Number(
                  bill.BillNo ??
                  bill.billNo ??
                  0
                );

              const billKey =
                `${billSeries}:${billNo}`;

              if (
                selectedBillKeySet.has(
                  billKey
                )
              ) {
                return false;
              }

              return true;
            }
          );

        const sourceSummary =
          calculateLoadTransferSummary(
            remainingBills
          );

        currentSourceLoad.Bills =
          remainingBills;

        currentSourceLoad.TotalBills =
          sourceSummary.TotalBills;

        currentSourceLoad.TotalParties =
          sourceSummary.TotalParties;

        currentSourceLoad.TotalSalesmen =
          sourceSummary.TotalSalesmen;

        currentSourceLoad.TotalAreas =
          sourceSummary.TotalAreas;

        currentSourceLoad.TotalAmount =
          sourceSummary.TotalAmount;

        currentSourceLoad.LoadSummary =
          sourceSummary.LoadSummary;

        currentSourceLoad.UpdatedBy =
          updatedBy;

        await currentSourceLoad.save({
          session,
        });
      }

      /*
      * Add selected bills to destination load.
      */
      const destinationBills =
        Array.isArray(
          destinationLoad.Bills
        )
          ? [
            ...destinationLoad.Bills,
          ]
          : [];

      const destinationKeys =
        new Set(
          destinationBills.map(
            getLoadTransferBillKey
          )
        );

      selectedSalesBills.forEach(
        (salesBill) => {
          const snapshot =
            createLoadTransferBillSnapshot(
              salesBill
            );

          const key =
            getLoadTransferBillKey(
              snapshot
            );

          if (
            destinationKeys.has(key)
          ) {
            throw new Error(
              `Bill ${snapshot.BillSeries ||
              ""
              }-${snapshot.BillNo
              } already exists in destination load.`
            );
          }

          destinationKeys.add(key);
          destinationBills.push(
            snapshot
          );
        }
      );

      const destinationSummary =
        calculateLoadTransferSummary(
          destinationBills
        );

      destinationLoad.Bills =
        destinationBills;

      destinationLoad.TotalBills =
        destinationSummary.TotalBills;

      destinationLoad.TotalParties =
        destinationSummary.TotalParties;

      destinationLoad.TotalSalesmen =
        destinationSummary.TotalSalesmen;

      destinationLoad.TotalAreas =
        destinationSummary.TotalAreas;

      destinationLoad.TotalAmount =
        destinationSummary.TotalAmount;

      destinationLoad.LoadSummary =
        destinationSummary.LoadSummary;

      destinationLoad.UpdatedBy =
        updatedBy;

      await destinationLoad.save({
        session,
      });

      /*
      * Finally update the Sales Header load assignment.
      */
      await SalesHeader.updateMany(
        {
          _id: {
            $in:
              validBillObjectIds,
          },

          distributorId,
          firmId,

          isActive: true,
        },

        {
          $set: {
            IsLoaded: true,

            LoadSeries:
              String(
                destinationLoad.LoadSeries ||
                ""
              ).trim(),

            LoadNo:
              Number(
                destinationLoad.LoadNo
              ),
          },
        },

        {
          session,
        }
      );

      await session.commitTransaction();

      return res.json({
        success: true,

        message:
          selectedSalesBills.length === 1
            ? "Bill transferred successfully."
            : `${selectedSalesBills.length} bills transferred successfully.`,

        transferredBills:
          selectedSalesBills.length,

        destinationLoad: {
          id:
            String(
              destinationLoad._id
            ),

          loadSeries:
            destinationLoad.LoadSeries ||
            "",

          loadNo:
            destinationLoad.LoadNo,

          totalBills:
            destinationSummary.TotalBills,

          totalAmount:
            destinationSummary.TotalAmount,
        },
      });
    } catch (error) {
      await session.abortTransaction();

      console.error(
        "Load Transfer save error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Load Transfer failed.",
      });
    } finally {
      session.endSession();
    }
  }
);

app.get("/api/print-load", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId, loadSeries, loadNo, reportLevel } = req.query;

    const load = await LoadHeader.findOne({
      DistributorId: distributorId,
      FirmId: firmId,
      LoadSeries: String(loadSeries).trim(),
      LoadNo: Number(loadNo),
      IsCancelled: false,
    }).lean();

    if (!load) {
      return res.status(404).json({ success: false, message: "Load not found" });
    }

    const loadBills = load.Bills || [];
    let rows = [];

    if (reportLevel === "party_wise") {
      rows = loadBills.map((b, index) => ({
        sr: index + 1,
        billDate: b.BillDate || b.billDate || "",
        companyName: b.CompanyName || load.CompanyName || "",
        billSeries: b.Series || b.BillSeries || b.billSeries || "",
        billNo: b.BillNo || b.billNo || "",
        billType: b.BillType || b.billType || "CREDIT",
        partyCode: b.PartyCode || b.partyCode || "",
        partyName: b.PartyName || b.partyName || "",
        amount: Number(b.Amount || b.billAmount || b.NetAmount || 0),
        cash: Number(b.Cash || b.cash || 0),
        cheque: Number(b.Cheque || b.cheque || 0),
        online: Number(b.Online || b.online || 0),
        upi: Number(b.UPI || b.upi || 0),
      }));
    } else {
      const billConditions = loadBills
        .map((b) => ({
          BillSeries: String(b.Series || b.BillSeries || b.billSeries || "").trim(),
          BillNo: Number(b.BillNo || b.billNo),
        }))
        .filter((b) => b.BillSeries && b.BillNo);

      const salesBills = await SalesHeader.find({
        distributorId,
        firmId,
        isActive: true,
        $or: billConditions,
      }).lean();

      const productMap = {};

      salesBills.forEach((bill) => {
        (bill.items || []).forEach((p) => {
          const prodCode = p.productCode || p.ProdCode || p.code || "";
          const prodName = p.productName || p.ProdName || p.name || p.product || "";
          const mrp = Number(p.mrp || p.MRP || 0);
          const hsnCode = p.hsnCode || p.HSNCode || p.hsn || "";

          const key = `${prodCode}_${prodName}_${mrp}_${hsnCode}`;

          if (!productMap[key]) {
            productMap[key] = {
              mrp,
              prodName,
              hsnCode,
              cases: 0,
              outer: 0,
              unitQty: 0,
              totalQty: 0,
              netAmt: 0,
            };
          }

          const qty = Number(p.qty || p.Qty || p.quantity || 0);
          const boxPack = Number(p.boxPack || p.BoxPack || 0);

          productMap[key].cases += Number(p.cases || p.Cases || (boxPack ? Math.floor(qty / boxPack) : 0));
          productMap[key].outer += Number(p.outer || p.Outer || 0);
          productMap[key].unitQty += Number(p.unitQty || p.UnitQty || 0);
          productMap[key].totalQty += Number(p.totalQty || p.TotalQty || qty);
          productMap[key].netAmt += Number(p.amount || p.Amount || p.netAmt || p.NetAmount || p.taxable || 0);
        });
      });

      rows = Object.values(productMap).map((r, index) => ({
        sr: index + 1,
        ...r,
      }));
    }

    res.json({
      success: true,
      reportLevel,
      header: {
        firmName: load.FirmName || "",
        loadSeries: load.LoadSeries,
        loadNo: load.LoadNo,
        loadDate: load.LoadDate,
        narration: load.Narration || "",
        totalBills: load.TotalBills || loadBills.length,
        totalParty: new Set(loadBills.map((b) => b.PartyCode || b.partyCode)).size,
        totalAmount: Number(load.TotalAmount || 0),
        areaName: loadBills[0]?.AreaName || "",
        userName: load.CreatedBy || "ADMIN",
      },
      rows,
    });
  } catch (error) {
    console.error("Print Load error:", error);
    res.status(500).json({ success: false, message: "Failed to load print load", error: error.message });
  }
});

const settleLoadBillSchema = new mongoose.Schema(
  {
    sr: Number,

    billSeries: String,
    billNo: String,
    billDate: String,

    partyCode: String,
    partyName: String,
    salesman: String,

    billType: String,
    billAmount: Number,
    receiptAmount: Number,
    pendingAmount: Number,

    receiptSeries: String,
    receiptNo: String,
    receiptMode: String,
    bankCash: String,
    drawerBank: {
      type: String,
      default: "",
    },
    bankName: String,
    chequeNo: String,
    chequeDate: String,
    micr: String,
    upiId: String,
    transactionNo: String,

    adjust: String,
    pending: String,
    cancel: String,
    status: String,
    originalBillAmount: {
      type: Number,
      default: 0,
    },

    receiptDate: {
      type: String,
      default: "",
    },

    bankCode: {
      type: String,
      default: "",
    },

    receiptNarration: {
      type: String,
      default: "",
    },

    transferToNextLoad: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const settleLoadSchema = new mongoose.Schema(
  {
    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },

    loadSeries: { type: String, default: "" },
    loadNo: { type: String, required: true },
    loadDate: { type: String, default: "" },
    settlementDate: { type: String, default: "" },
    narration: { type: String, default: "" },

    totalBills: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    totalReceiptAmount: { type: Number, default: 0 },
    totalPendingAmount: { type: Number, default: 0 },
    totalCancelBills: { type: Number, default: 0 },

    status: { type: String, default: "SETTLED" },
    isActive: { type: Boolean, default: true },

    bills: [settleLoadBillSchema],
  },
  { timestamps: true, collection: "T_SettleLoad" }
);

settleLoadSchema.index(
  { distributorId: 1, firmId: 1, loadSeries: 1, loadNo: 1 },
  { unique: true }
);

const SettleLoad =
  mongoose.models.T_SettleLoad ||
  mongoose.model("T_SettleLoad", settleLoadSchema);

const receiptSchema = new mongoose.Schema(
  {
    distributorId: String,
    firmId: String,
    firmName: { type: String, default: "" },

    receiptDate: String,
    receiptSeries: { type: String, default: "RC" },
    rno: Number,

    billSeries: String,
    billNo: String,
    billDate: String,
    partyName: String,

    salesman: { type: String, default: "" },
    narration: { type: String, default: "" },

    bankCode: { type: String, default: "" },
    bankCash: { type: String, default: "" },

    loadSeries: { type: String, default: "" },
    loadNo: { type: String, default: "" },

    docketNo: { type: String, default: "" },

    addUser: { type: String, default: "" },
    editUser: { type: String, default: "" },
    editDateTime: { type: String, default: "" },

    receiptAmount: Number,
    chequeNo: String,
    chequeDate: String,
    micr: String,

    receiptSource: {
      type: String,
      default: "DIRECT", // DIRECT / SETTLE_LOAD / DOCKET
    },

    receiptBills: [
      {
        trnSeries: String,
        trnNo: String,
        trnDate: String,
        amount: Number,
        adjustAmt: Number,
        balanceAmt: Number,
        nowAdjust: Number,
        remark: String,
      },
    ],
  },
  { timestamps: true, collection: "T_Receipt" }
);
receiptSchema.index(
  { distributorId: 1, firmId: 1, billSeries: 1, billNo: 1 },
  { unique: true }
);

const Receipt =
  mongoose.models.T_Receipt || mongoose.model("T_Receipt", receiptSchema);

app.post(
  "/api/settle-load/save",
  ensureConnection,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const {
        distributorId,
        firmId,
        firmName = "",
        loadSeries = "",
        loadNo,
        loadDate = "",
        settlementDate = "",
        narration = "",
        items = [],
        summary = {},
      } = req.body;

      const cleanLoadSeries = String(
        loadSeries || ""
      ).trim();

      const cleanLoadNo = String(
        loadNo || ""
      ).trim();

      if (!distributorId || !firmId) {
        throw new Error(
          "Distributor/Firm not found"
        );
      }

      if (!cleanLoadNo) {
        throw new Error(
          "Load No is required"
        );
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        throw new Error(
          "No Settle Load bills found"
        );
      }

      const load = await LoadHeader.findOne({
        DistributorId: distributorId,
        FirmId: firmId,
        LoadSeries: cleanLoadSeries,
        LoadNo: Number(cleanLoadNo),
        IsCancelled: {
          $ne: true,
        },
      }).session(session);

      if (!load) {
        throw new Error(
          "Original Load not found"
        );
      }

      const normalizedItems = items.map(
        (item, index) => {
          const isCancelled =
            item.cancel === "Y";

          const isPending =
            item.pending === "Y" ||
            item.transferToNextLoad === true;

          const originalBillAmount = Number(
            item.originalBillAmount ??
            item.billAmount ??
            0
          );

          const billAmount = isCancelled
            ? 0
            : originalBillAmount;

          const receiptAmount =
            isCancelled || isPending
              ? 0
              : Number(
                item.receiptAmount || 0
              );

          const pendingAmount = isCancelled
            ? 0
            : isPending
              ? originalBillAmount
              : Math.max(
                billAmount -
                receiptAmount,
                0
              );

          return {
            sr: index + 1,

            billSeries: String(
              item.billSeries || ""
            ).trim(),

            billNo: String(
              item.billNo || ""
            ).trim(),

            billDate:
              item.billDate || "",

            partyCode:
              item.partyCode || "",

            partyName:
              item.partyName || "",

            salesman:
              item.salesman || "",

            billType:
              item.billType || "Credit",

            originalBillAmount,
            billAmount,
            receiptAmount,
            pendingAmount,

            receiptDate:
              item.receiptDate ||
              settlementDate ||
              "",

            receiptSeries:
              item.receiptSeries || "RC",

            receiptNo: String(
              item.receiptNo || ""
            ),

            receiptMode:
              item.receiptMode || "",

            bankCode:
              item.bankCode || "",

            bankCash:
              item.bankCash ||
              item.bankName ||
              "",

            bankName:
              item.bankName ||
              item.bankCash ||
              "",
            drawerBank:
              String(
                item.drawerBank || ""
              ).trim(),
            chequeNo:
              item.chequeNo || "",

            chequeDate:
              item.chequeDate || "",

            micr:
              item.micr || "",

            upiId:
              item.upiId || "",

            transactionNo:
              item.transactionNo || "",

            receiptNarration:
              item.receiptNarration || "",

            adjust:
              isCancelled || isPending
                ? "N"
                : item.adjust || "N",

            pending:
              isPending ? "Y" : "N",

            cancel:
              isCancelled ? "Y" : "N",

            transferToNextLoad:
              isPending,

            status:
              isCancelled
                ? "Cancelled"
                : isPending
                  ? "Pending"
                  : pendingAmount <= 0 &&
                    receiptAmount > 0
                    ? "Received"
                    : receiptAmount > 0
                      ? "Partial"
                      : item.adjust === "Y"
                        ? "Adjusted"
                        : "Pending",
          };
        }
      );

      /*
      * Save or update T_SettleLoad.
      */
      const totalAmount =
        normalizedItems.reduce(
          (total, item) =>
            total +
            Number(item.billAmount || 0),
          0
        );

      const totalReceiptAmount =
        normalizedItems.reduce(
          (total, item) =>
            total +
            Number(item.receiptAmount || 0),
          0
        );

      const totalPendingAmount =
        normalizedItems.reduce(
          (total, item) =>
            total +
            Number(item.pendingAmount || 0),
          0
        );

      const totalCancelBills =
        normalizedItems.filter(
          (item) => item.cancel === "Y"
        ).length;

      const settleLoad =
        await SettleLoad.findOneAndUpdate(
          {
            distributorId,
            firmId,
            loadSeries: cleanLoadSeries,
            loadNo: cleanLoadNo,
          },
          {
            $set: {
              firmName,
              loadDate:
                loadDate ||
                load.LoadDate ||
                "",

              settlementDate,
              narration,

              totalBills:
                normalizedItems.length,

              totalAmount:
                Number(
                  summary.totalAmount ??
                  totalAmount
                ),

              totalReceiptAmount:
                Number(
                  summary.totalReceiptAmount ??
                  totalReceiptAmount
                ),

              totalPendingAmount:
                Number(
                  summary.totalPendingAmount ??
                  totalPendingAmount
                ),

              totalCancelBills:
                Number(
                  summary.totalCancelBills ??
                  totalCancelBills
                ),

              status: "SETTLED",
              isActive: true,
              bills: normalizedItems,
            },
          },
          {
            new: true,
            upsert: true,
            session,
            setDefaultsOnInsert: true,
          }
        );

      /*
      * Create or update Receipt records only now.
      */
      const receiptItems =
        normalizedItems.filter(
          (item) =>
            item.cancel !== "Y" &&
            item.pending !== "Y" &&
            Number(item.receiptAmount || 0) >
            0
        );

      for (const item of receiptItems) {
        let receiptNumber = Number(
          item.receiptNo || 0
        );

        if (!receiptNumber) {
          const lastReceipt =
            await Receipt.findOne({
              distributorId,
              firmId,
            })
              .sort({
                rno: -1,
              })
              .session(session)
              .lean();

          receiptNumber =
            Number(lastReceipt?.rno || 0) +
            1;
        }

        await Receipt.findOneAndUpdate(
          {
            distributorId,
            firmId,
            billSeries:
              item.billSeries,
            billNo:
              item.billNo,
          },
          {
            $set: {
              firmName,

              receiptDate:
                item.receiptDate ||
                settlementDate,

              receiptSeries:
                item.receiptSeries ||
                "RC",

              rno: receiptNumber,

              billSeries:
                item.billSeries,

              billNo:
                item.billNo,

              billDate:
                item.billDate,

              partyName:
                item.partyName,

              salesman:
                item.salesman,

              narration:
                item.receiptNarration ||
                narration,

              bankCode:
                item.bankCode || "",

              bankCash:
                item.bankCash ||
                item.bankName ||
                "",
              drawerBank:
                item.drawerBank || "",
              loadSeries:
                cleanLoadSeries,

              loadNo:
                cleanLoadNo,

              receiptAmount:
                Number(
                  item.receiptAmount || 0
                ),

              chequeNo:
                item.chequeNo || "",

              chequeDate:
                item.chequeDate || "",

              micr:
                item.micr || "",

              receiptSource:
                "SETTLE_LOAD",

              addUser:
                req.body.userName ||
                "ADMIN",

              receiptBills: [
                {
                  trnSeries:
                    item.billSeries,

                  trnNo:
                    item.billNo,

                  trnDate:
                    item.billDate,

                  amount:
                    item.originalBillAmount,

                  adjustAmt:
                    Number(
                      item.receiptAmount ||
                      0
                    ),

                  balanceAmt:
                    Number(
                      item.pendingAmount ||
                      0
                    ),

                  nowAdjust:
                    Number(
                      item.receiptAmount ||
                      0
                    ),

                  remark:
                    item.receiptNarration ||
                    "",
                },
              ],
            },
          },
          {
            upsert: true,
            new: true,
            session,
          }
        );
      }

      /*
      * Remove receipts when user changed a bill to
      * Pending or Cancel before saving.
      */
      const noReceiptItems =
        normalizedItems.filter(
          (item) =>
            item.cancel === "Y" ||
            item.pending === "Y" ||
            Number(item.receiptAmount || 0) <=
            0
        );

      for (const item of noReceiptItems) {
        await Receipt.deleteMany(
          {
            distributorId,
            firmId,
            billSeries:
              item.billSeries,
            billNo:
              item.billNo,
            receiptSource:
              "SETTLE_LOAD",
          },
          {
            session,
          }
        );
      }

      /*
      * Pending bills become available in Create Load.
      */
      const pendingConditions =
        normalizedItems
          .filter(
            (item) =>
              item.pending === "Y" ||
              item.transferToNextLoad ===
              true
          )
          .map((item) => ({
            BillSeries:
              item.billSeries,

            BillNo: Number(
              item.billNo || 0
            ),
          }))
          .filter(
            (item) =>
              item.BillNo
          );

      if (pendingConditions.length > 0) {
        await SalesHeader.updateMany(
          {
            distributorId,
            firmId,
            isActive: true,
            $or: pendingConditions,
          },
          {
            $set: {
              IsLoaded: false,
              LoadSeries: "",
              LoadNo: null,
            },
          },
          {
            session,
          }
        );
      }

      /*
      * Receipt, Adjust and Cancel bills remain processed
      * and must not appear in Create Load.
      */
      const completedConditions =
        normalizedItems
          .filter(
            (item) =>
              item.pending !== "Y" &&
              item.transferToNextLoad !==
              true
          )
          .map((item) => ({
            BillSeries:
              item.billSeries,

            BillNo: Number(
              item.billNo || 0
            ),
          }))
          .filter(
            (item) =>
              item.BillNo
          );

      if (
        completedConditions.length > 0
      ) {
        await SalesHeader.updateMany(
          {
            distributorId,
            firmId,
            isActive: true,
            $or: completedConditions,
          },
          {
            $set: {
              IsLoaded: true,
              LoadSeries:
                cleanLoadSeries,
              LoadNo:
                Number(cleanLoadNo),
            },
          },
          {
            session,
          }
        );
      }

      /*
      * Save F4 Bill Type changes only now.
      */
      for (const item of normalizedItems) {
        await SalesHeader.updateOne(
          {
            distributorId,
            firmId,
            isActive: true,
            BillSeries:
              item.billSeries,
            BillNo:
              Number(item.billNo || 0),
          },
          {
            $set: {
              BillType:
                item.billType ||
                "Credit",
            },
          },
          {
            session,
          }
        );
      }

      /*
      * Update original Load only after Save.
      */
      load.Bills = normalizedItems
        .filter(
          (item) =>
            item.cancel !== "Y" &&
            item.pending !== "Y"
        )
        .map((item, index) => ({
          Sl: index + 1,
          Selected: true,

          BillDate:
            item.billDate,

          Series:
            item.billSeries,

          BillSeries:
            item.billSeries,

          BillNo:
            Number(item.billNo || 0),

          BillType:
            item.billType,

          PartyCode:
            item.partyCode,

          PartyName:
            item.partyName,

          SalesmanName:
            item.salesman,

          Amount:
            Number(
              item.billAmount || 0
            ),

          ReceiptAmount:
            Number(
              item.receiptAmount || 0
            ),

          Adjust:
            item.adjust,

          Pending:
            item.pending,

          Status:
            item.status,

          ReceiptSeries:
            item.receiptSeries,

          ReceiptNo:
            item.receiptNo,

          ReceiptMode:
            item.receiptMode,

          ChequeNo:
            item.chequeNo,

          ChequeDate:
            item.chequeDate,

          BankName:
            item.bankName,

          MICR:
            item.micr,
        }));

      load.CancelledBills =
        normalizedItems.filter(
          (item) =>
            item.cancel === "Y"
        );

      load.PendingBills =
        normalizedItems.filter(
          (item) =>
            item.pending === "Y"
        );

      load.TotalBills =
        load.Bills.length;

      load.TotalAmount =
        load.Bills.reduce(
          (total, bill) =>
            total +
            Number(bill.Amount || 0),
          0
        );

      load.SettlementDate =
        settlementDate;

      load.SettlementNarration =
        narration;

      load.Status = "SETTLED";
      load.IsSettled = true;

      await load.save({
        session,
      });

      await session.commitTransaction();

      return res.json({
        success: true,
        message:
          "Settle Load and all bill changes saved successfully",
        data: settleLoad,
      });
    } catch (error) {
      await session.abortTransaction();

      console.error(
        "Settle Load transaction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Settle Load save failed",
      });
    } finally {
      session.endSession();
    }
  }
);
app.post("/api/settle-load", ensureConnection, async (req, res) => {
  try {
    const {
      distributorId,
      firmId,
      firmName = "",
      loadSeries = "",
      loadNo = "",
      loadDate = "",
      settlementDate = "",
      narration = "",
      items = [],
    } = req.body;

    const cleanLoadSeries = String(loadSeries || "").trim();
    const cleanLoadNo = String(loadNo || "").trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found",
      });
    }

    if (!cleanLoadNo) {
      return res.status(400).json({
        success: false,
        message: "Load No is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No settle load bills found",
      });
    }

    const exists = await SettleLoad.findOne({
      distributorId,
      firmId,
      loadSeries: cleanLoadSeries,
      loadNo: cleanLoadNo,
      isActive: true,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate load not saved. This Load Series and Load No is already settled.",
      });
    }

    const bills = items.map((item, index) => {
      const billAmount = Number(item.billAmount || 0);
      const receiptAmount = Number(item.receiptAmount || 0);
      const pendingAmount = Math.max(billAmount - receiptAmount, 0);

      return {
        sr: index + 1,

        billSeries: String(item.billSeries || ""),
        billNo: String(item.billNo || ""),
        billDate: item.billDate || "",

        partyCode: item.partyCode || "",
        partyName: item.partyName || "",
        salesman: item.salesman || "",

        billType: item.billType || "Credit",
        billAmount,
        receiptAmount,
        pendingAmount,

        receiptSeries: item.receiptSeries || "",
        receiptNo: String(item.receiptNo || ""),
        receiptMode: item.receiptMode || "",
        bankCash: item.bankCash || item.bankName || "",
        bankName: item.bankName || item.bankCash || "",
        chequeNo: item.chequeNo || "",
        chequeDate: item.chequeDate || "",
        micr: item.micr || "",
        upiId: item.upiId || "",
        transactionNo: item.transactionNo || "",

        adjust: item.adjust || "N",
        pending: item.pending || "N",
        cancel: item.cancel || "N",
        status:
          item.cancel === "Y"
            ? "Cancelled"
            : pendingAmount <= 0 && billAmount > 0
              ? "Receipt"
              : "Pending",
      };
    });

    const totalAmount = bills.reduce((sum, x) => sum + Number(x.billAmount || 0), 0);
    const totalReceiptAmount = bills.reduce((sum, x) => sum + Number(x.receiptAmount || 0), 0);
    const totalPendingAmount = bills.reduce((sum, x) => sum + Number(x.pendingAmount || 0), 0);
    const totalCancelBills = bills.filter((x) => x.cancel === "Y").length;

    const saved = await SettleLoad.create({
      distributorId,
      firmId,
      firmName,
      loadSeries: cleanLoadSeries,
      loadNo: cleanLoadNo,
      loadDate,
      settlementDate,
      narration,
      totalBills: bills.length,
      totalAmount,
      totalReceiptAmount,
      totalPendingAmount,
      totalCancelBills,
      status: "SETTLED",
      bills,
    });

    // ✅ Make Pending bills available again in Create Load
    const pendingConditions = items
      .filter((x) => x.pending === "Y" || x.transferToNextLoad === true)
      .map((x) => ({
        BillSeries: String(x.billSeries || "").trim(),
        BillNo: Number(x.billNo || 0),
      }))
      .filter((x) => x.BillSeries && x.BillNo);

    if (pendingConditions.length > 0) {
      await SalesHeader.updateMany(
        {
          distributorId,
          firmId,
          isActive: true,
          $or: pendingConditions,
        },
        {
          $set: {
            IsLoaded: false,
            LoadSeries: "",
            LoadNo: null,
          },
        }
      );
    }

    res.json({
      success: true,
      message: "Settle Load saved successfully",
      data: saved,
    });
  } catch (error) {
    console.error("Settle load save error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate load not saved. This Load Series and Load No is already settled.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Settle load save failed",
      error: error.message,
    });
  }
});
app.get("/api/settle-load/list", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || "").trim();
    const firmId = String(req.query.firmId || "").trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm not found",
      });
    }

    const records = await SettleLoad.find({
      distributorId,
      firmId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load settle load list",
      error: error.message,
    });
  }
});
app.get(
  "/api/settle-load/list",
  ensureConnection,
  async (req, res) => {
    try {
      /* =====================================================
        REQUEST PARAMETERS
        ===================================================== */

      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const fromDate = String(
        req.query.fromDate || ""
      ).trim();

      const toDate = String(
        req.query.toDate || ""
      ).trim();

      const settlementFromDate = String(
        req.query.settlementFromDate || ""
      ).trim();

      const settlementToDate = String(
        req.query.settlementToDate || ""
      ).trim();

      const loadSeries = String(
        req.query.loadSeries || ""
      ).trim();

      const loadNoText = String(
        req.query.loadNo || ""
      ).trim();

      const status = String(
        req.query.status || ""
      ).trim();

      const createdBy = String(
        req.query.createdBy ||
        req.query.addUser ||
        ""
      ).trim();

      const minAmountText = String(
        req.query.minAmount || ""
      ).trim();

      const maxAmountText = String(
        req.query.maxAmount || ""
      ).trim();

      const minReceiptText = String(
        req.query.minReceiptAmount || ""
      ).trim();

      const maxReceiptText = String(
        req.query.maxReceiptAmount || ""
      ).trim();

      const minPendingText = String(
        req.query.minPendingAmount || ""
      ).trim();

      const maxPendingText = String(
        req.query.maxPendingAmount || ""
      ).trim();

      const requestedPage =
        Number.parseInt(
          req.query.page,
          10
        );

      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10
        );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 10;

      if (
        !distributorId ||
        !firmId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Distributor/Firm not found",
        });
      }

      /* =====================================================
        REGEX HELPERS
        ===================================================== */

      const escapeRegex = (value) =>
        String(value || "").replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const exactRegex = (value) =>
        new RegExp(
          `^${escapeRegex(
            String(value || "").trim()
          )}$`,
          "i"
        );

      const containsRegex = (value) =>
        new RegExp(
          escapeRegex(
            String(value || "").trim()
          ),
          "i"
        );

      /* =====================================================
        BASE FILTER
        ===================================================== */

      const filter = {
        distributorId,
        firmId,

        isActive: {
          $ne: false,
        },
      };

      const andConditions = [];

      /* =====================================================
        LOAD DATE FILTER
        ===================================================== */

      if (
        fromDate ||
        toDate
      ) {
        const dateCondition = {};

        if (fromDate) {
          const startDate =
            new Date(
              `${fromDate}T00:00:00.000Z`
            );

          if (
            !Number.isNaN(
              startDate.getTime()
            )
          ) {
            dateCondition.$gte =
              startDate;
          }
        }

        if (toDate) {
          const endDate =
            new Date(
              `${toDate}T23:59:59.999Z`
            );

          if (
            !Number.isNaN(
              endDate.getTime()
            )
          ) {
            dateCondition.$lte =
              endDate;
          }
        }

        if (
          Object.keys(
            dateCondition
          ).length > 0
        ) {
          andConditions.push({
            $or: [
              {
                loadDate:
                  dateCondition,
              },
              {
                LoadDate:
                  dateCondition,
              },
            ],
          });
        }
      }

      /* =====================================================
        SETTLEMENT DATE FILTER
        ===================================================== */

      if (
        settlementFromDate ||
        settlementToDate
      ) {
        const dateCondition = {};

        if (settlementFromDate) {
          const startDate =
            new Date(
              `${settlementFromDate}T00:00:00.000Z`
            );

          if (
            !Number.isNaN(
              startDate.getTime()
            )
          ) {
            dateCondition.$gte =
              startDate;
          }
        }

        if (settlementToDate) {
          const endDate =
            new Date(
              `${settlementToDate}T23:59:59.999Z`
            );

          if (
            !Number.isNaN(
              endDate.getTime()
            )
          ) {
            dateCondition.$lte =
              endDate;
          }
        }

        if (
          Object.keys(
            dateCondition
          ).length > 0
        ) {
          andConditions.push({
            $or: [
              {
                settlementDate:
                  dateCondition,
              },
              {
                SettlementDate:
                  dateCondition,
              },
            ],
          });
        }
      }

      /* =====================================================
        LOAD SERIES
        ===================================================== */

      if (loadSeries) {
        const regex =
          exactRegex(
            loadSeries
          );

        andConditions.push({
          $or: [
            {
              loadSeries:
                regex,
            },
            {
              LoadSeries:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        LOAD NUMBER
        ===================================================== */

      if (loadNoText) {
        const numericLoadNo =
          Number(loadNoText);

        const loadNoConditions = [
          {
            loadNo:
              exactRegex(
                loadNoText
              ),
          },
          {
            LoadNo:
              exactRegex(
                loadNoText
              ),
          },
        ];

        if (
          Number.isFinite(
            numericLoadNo
          )
        ) {
          loadNoConditions.push(
            {
              loadNo:
                numericLoadNo,
            },
            {
              LoadNo:
                numericLoadNo,
            }
          );
        }

        andConditions.push({
          $or:
            loadNoConditions,
        });
      }

      /* =====================================================
        STATUS
        ===================================================== */

      if (status) {
        const regex =
          exactRegex(
            status
          );

        andConditions.push({
          $or: [
            {
              status:
                regex,
            },
            {
              Status:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        CREATED BY
        ===================================================== */

      if (createdBy) {
        const regex =
          exactRegex(
            createdBy
          );

        andConditions.push({
          $or: [
            {
              createdBy:
                regex,
            },
            {
              CreatedBy:
                regex,
            },
            {
              updatedBy:
                regex,
            },
            {
              UpdatedBy:
                regex,
            },
          ],
        });
      }

      /* =====================================================
        TOTAL AMOUNT
        ===================================================== */

      const minAmount =
        Number(minAmountText);

      const maxAmount =
        Number(maxAmountText);

      if (
        minAmountText !== "" &&
        Number.isFinite(
          minAmount
        )
      ) {
        andConditions.push({
          totalAmount: {
            $gte:
              minAmount,
          },
        });
      }

      if (
        maxAmountText !== "" &&
        Number.isFinite(
          maxAmount
        )
      ) {
        andConditions.push({
          totalAmount: {
            $lte:
              maxAmount,
          },
        });
      }

      /* =====================================================
        RECEIPT AMOUNT
        ===================================================== */

      const minReceiptAmount =
        Number(minReceiptText);

      const maxReceiptAmount =
        Number(maxReceiptText);

      if (
        minReceiptText !== "" &&
        Number.isFinite(
          minReceiptAmount
        )
      ) {
        andConditions.push({
          totalReceiptAmount: {
            $gte:
              minReceiptAmount,
          },
        });
      }

      if (
        maxReceiptText !== "" &&
        Number.isFinite(
          maxReceiptAmount
        )
      ) {
        andConditions.push({
          totalReceiptAmount: {
            $lte:
              maxReceiptAmount,
          },
        });
      }

      /* =====================================================
        PENDING AMOUNT
        ===================================================== */

      const minPendingAmount =
        Number(minPendingText);

      const maxPendingAmount =
        Number(maxPendingText);

      if (
        minPendingText !== "" &&
        Number.isFinite(
          minPendingAmount
        )
      ) {
        andConditions.push({
          totalPendingAmount: {
            $gte:
              minPendingAmount,
          },
        });
      }

      if (
        maxPendingText !== "" &&
        Number.isFinite(
          maxPendingAmount
        )
      ) {
        andConditions.push({
          totalPendingAmount: {
            $lte:
              maxPendingAmount,
          },
        });
      }

      /* =====================================================
        GENERAL SEARCH
        ===================================================== */

      if (search) {
        const regex =
          containsRegex(
            search
          );

        const searchConditions = [
          {
            loadSeries:
              regex,
          },
          {
            LoadSeries:
              regex,
          },
          {
            status:
              regex,
          },
          {
            Status:
              regex,
          },
          {
            narration:
              regex,
          },
          {
            Narration:
              regex,
          },
          {
            firmName:
              regex,
          },
          {
            FirmName:
              regex,
          },
          {
            createdBy:
              regex,
          },
          {
            CreatedBy:
              regex,
          },
          {
            "bills.partyCode":
              regex,
          },
          {
            "bills.partyName":
              regex,
          },
          {
            "bills.salesman":
              regex,
          },
          {
            "bills.billSeries":
              regex,
          },
          {
            "bills.receiptSeries":
              regex,
          },
          {
            "bills.receiptNo":
              regex,
          },
          {
            "bills.chequeNo":
              regex,
          },
          {
            "bills.transactionNo":
              regex,
          },
        ];

        const numericSearch =
          Number(search);

        if (
          Number.isFinite(
            numericSearch
          )
        ) {
          searchConditions.push(
            {
              loadNo:
                numericSearch,
            },
            {
              LoadNo:
                numericSearch,
            },
            {
              "bills.billNo":
                numericSearch,
            }
          );
        }

        andConditions.push({
          $or:
            searchConditions,
        });
      }

      if (
        andConditions.length > 0
      ) {
        filter.$and =
          andConditions;
      }

      /* =====================================================
        RECORD COUNT
        ===================================================== */

      const totalRecords =
        await SettleLoad.countDocuments(
          filter
        );

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalRecords /
            limit
          )
        );

      const currentPage =
        Math.min(
          page,
          totalPages
        );

      const skip =
        (
          currentPage -
          1
        ) *
        limit;

      /* =====================================================
        LOAD CURRENT PAGE
        ===================================================== */

      const records =
        await SettleLoad.find(
          filter
        )
          /*
          * Edit already loads the complete record using
          * GET /api/settle-load/:id.
          *
          * Do not send all bill details in the list.
          */
          .select({
            bills: 0,
            Bills: 0,
          })
          .sort({
            settlementDate: -1,
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      /* =====================================================
        RESPONSE
        ===================================================== */

      return res.json({
        success: true,

        records,

        count:
          records.length,

        pagination: {
          currentPage,
          page:
            currentPage,
          limit,
          totalRecords,
          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                records.length,
                totalRecords
              ),
        },

        appliedFilters: {
          search,

          fromDate,
          toDate,

          settlementFromDate,
          settlementToDate,

          loadSeries,
          loadNo:
            loadNoText,

          status,
          createdBy,

          minAmount:
            minAmountText,

          maxAmount:
            maxAmountText,

          minReceiptAmount:
            minReceiptText,

          maxReceiptAmount:
            maxReceiptText,

          minPendingAmount:
            minPendingText,

          maxPendingAmount:
            maxPendingText,
        },
      });
    } catch (error) {
      console.error(
        "Settle Load paginated list error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Settle Load list",
        error:
          error.message,
      });
    }
  }
);

app.get("/api/settle-load/:id", ensureConnection, async (req, res) => {
  try {
    const record = await SettleLoad.findById(req.params.id).lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Settle Load record not found",
      });
    }

    res.json({
      success: true,
      record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load settle load record",
      error: error.message,
    });
  }
});

app.put("/api/settle-load/:id", ensureConnection, async (req, res) => {
  try {
    const {
      settlementDate = "",
      narration = "",
      items = [],
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No bills found",
      });
    }

    const bills = items.map((item, index) => {
      const billAmount = Number(item.billAmount || 0);
      const receiptAmount = Number(item.receiptAmount || 0);

      return {
        sr: index + 1,
        billSeries: String(item.billSeries || ""),
        billNo: String(item.billNo || ""),
        billDate: item.billDate || "",
        partyCode: item.partyCode || "",
        partyName: item.partyName || "",
        salesman: item.salesman || "",
        billType: item.billType || "Credit",
        billAmount,
        receiptAmount,
        pendingAmount: Math.max(billAmount - receiptAmount, 0),

        receiptSeries: item.receiptSeries || "",
        receiptNo: String(item.receiptNo || ""),
        receiptMode: item.receiptMode || "",
        bankCash: item.bankCash || item.bankName || "",
        bankName: item.bankName || item.bankCash || "",
        chequeNo: item.chequeNo || "",
        chequeDate: item.chequeDate || "",
        micr: item.micr || "",
        upiId: item.upiId || "",
        transactionNo: item.transactionNo || "",

        adjust: item.adjust || "N",
        pending: item.pending || "N",
        cancel: item.cancel || "N",
        status: item.status || "Pending",
      };
    });

    const totalAmount = bills.reduce((sum, x) => sum + Number(x.billAmount || 0), 0);
    const totalReceiptAmount = bills.reduce((sum, x) => sum + Number(x.receiptAmount || 0), 0);
    const totalPendingAmount = bills.reduce((sum, x) => sum + Number(x.pendingAmount || 0), 0);
    const totalCancelBills = bills.filter((x) => x.cancel === "Y").length;

    const updated = await SettleLoad.findByIdAndUpdate(
      req.params.id,
      {
        settlementDate,
        narration,
        bills,
        totalBills: bills.length,
        totalAmount,
        totalReceiptAmount,
        totalPendingAmount,
        totalCancelBills,
        status: "SETTLED",
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Settle Load record not found",
      });
    }

    res.json({
      success: true,
      message: "Settle Load updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Settle Load update failed",
      error: error.message,
    });
  }
});
app.post("/api/receipt", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const billSeries = String(req.body.billSeries || "").trim();
    const billNo = String(req.body.billNo || "").trim();

    if (!distributorId || !firmId || !billSeries || !billNo) {
      return res.status(400).json({
        success: false,
        message: "Distributor, Firm, Bill Series and Bill No are required",
      });
    }

    const exists = await Receipt.findOne({
      distributorId,
      firmId,
      billSeries,
      billNo,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Receipt already saved for this bill. One bill cannot have multiple receipts.",
      });
    }

    const lastReceipt = await Receipt.findOne({ distributorId, firmId })
      .sort({ rno: -1 })
      .lean();

    const rno = Number(lastReceipt?.rno || 0) + 1;

    const receipt = await Receipt.create({
      distributorId,
      firmId,
      firmName: req.body.firmName || "",

      receiptDate: req.body.receiptDate || new Date().toISOString().split("T")[0],
      receiptSeries: req.body.receiptSeries || "RC",
      rno,

      billSeries,
      billNo,
      billDate: req.body.billDate || "",
      partyName: req.body.partyName || "",

      salesman: req.body.salesman || "",
      narration: req.body.narration || "",

      bankCode: req.body.bankCode || "",
      bankCash: req.body.bankCash || "",

      loadSeries: req.body.loadSeries || "",
      loadNo: req.body.loadNo || "",

      docketNo: req.body.docketNo || "",

      addUser: req.body.addUser || req.body.userName || "ADMIN",
      editUser: req.body.editUser || "",
      editDateTime: req.body.editDateTime || "",

      receiptSource: req.body.receiptSource || "DIRECT",

      receiptAmount: Number(req.body.receiptAmount || 0),
      chequeNo: req.body.chequeNo || "",
      chequeDate: req.body.chequeDate || "",
      micr: req.body.micr || "",

      receiptBills: [
        {
          trnSeries: billSeries,
          trnNo: billNo,
          trnDate: req.body.billDate || "",
          amount: Number(req.body.receiptAmount || 0),
          adjustAmt: 0,
          balanceAmt: 0,
          nowAdjust: Number(req.body.receiptAmount || 0),
          remark: req.body.narration || "",
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Receipt saved successfully",
      receipt,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Receipt already exists for this bill",
      });
    }

    res.status(500).json({
      success: false,
      message: "Receipt save failed",
      error: error.message,
    });
  }
});
app.get("/api/receipt", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || "").trim();
    const firmId = String(req.query.firmId || "").trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const receipts = await Receipt.find({ distributorId, firmId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      receipts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load receipt list",
      error: error.message,
    });
  }
});
app.get("/api/receipt/next-no", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || "").trim();
    const firmId = String(req.query.firmId || "").trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({ success: false, message: "Distributor/Firm required" });
    }

    const lastReceipt = await Receipt.findOne({ distributorId, firmId })
      .sort({ rno: -1 })
      .lean();

    res.json({
      success: true,
      nextReceiptNo: Number(lastReceipt?.rno || 0) + 1,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get receipt no", error: error.message });
  }
});

app.get("/api/receipt/bill-balance", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || "").trim();
    const firmId = String(req.query.firmId || "").trim();
    const billSeries = String(req.query.billSeries || "").trim();
    const billNo = String(req.query.billNo || "").trim();
    const billAmount = Number(req.query.billAmount || 0);

    const receipts = await Receipt.find({ distributorId, firmId, billSeries, billNo }).lean();
    const paidAmount = receipts.reduce((sum, r) => sum + Number(r.receiptAmount || 0), 0);
    const pendingAmount = Math.max(billAmount - paidAmount, 0);

    res.json({ success: true, paidAmount, pendingAmount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Balance check failed", error: error.message });
  }
});

app.get("/api/create-load/next-no", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || "").trim();
    const firmId = String(req.query.firmId || "").trim();
    const loadSeries = String(req.query.loadSeries || "").trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const filter = {
      DistributorId: distributorId,
      FirmId: firmId,
      IsCancelled: { $ne: true },
      LoadSeries: loadSeries,
    };

    const lastLoad = await LoadHeader.findOne(filter)
      .sort({ LoadNo: -1 })
      .lean();

    const nextLoadNo = Number(lastLoad?.LoadNo || 0) + 1;

    res.json({
      success: true,
      nextLoadNo,
    });
  } catch (error) {
    console.error("Next Load No error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get next load no",
      error: error.message,
    });
  }
});
app.put("/api/sales/cancel-bill", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();
    const billSeries = String(req.body.billSeries || "").trim();
    const billNo = Number(req.body.billNo || 0);

    if (!distributorId || !firmId || !billNo) {
      return res.status(400).json({
        success: false,
        message: "Distributor, Firm and Bill No are required",
      });
    }

    const filter = {
      distributorId,
      firmId,
      BillNo: billNo,
      isActive: true,
    };

    if (billSeries) filter.BillSeries = billSeries;

    const updated = await SalesHeader.findOneAndUpdate(
      filter,
      {
        $set: {
          GrossAmount: 0,
          TPRAmount: 0,
          SchemeAmount: 0,
          StarDiscountAmount: 0,
          CashDiscountAmount: 0,
          TaxableValue: 0,
          SGSTAmount: 0,
          CGSTAmount: 0,
          IGSTAmount: 0,
          NetAmount: 0,
          TotalQty: 0,
          TotalFreeQty: 0,
          TotalItems: 0,
          items: [],
          BillStatus: "CANCELLED",
          IsBillCancelled: true,
          CancelledAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Sales bill not found",
      });
    }

    res.json({
      success: true,
      message: "Bill cancelled successfully",
      bill: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Bill cancel failed",
      error: error.message,
    });
  }
});
// Credit Note Schema
const creditNoteSchema = new mongoose.Schema(
  {
    distributorId: String,
    firmId: String,
    firmName: String,

    VDate: String,
    VNo: Number,

    CreditNoteSeries: String,
    CreditNoteNo: Number,

    BillSeries: String,
    BillNo: Number,

    PartyCode: String,
    PartyName: String,

    Godown: String,
    GDCode: String,

    CompanyCode: String,
    CompanyName: String,

    SalesmanCode: String,
    SalesmanName: String,

    TinNo: String,
    Settlement: String,
    RefBy: String,
    RefDate: String,
    Narration: String,

    GrossAmount: Number,
    SchemeAmount: Number,
    TPRAmount: Number,
    CashDiscountAmount: Number,
    GSTAmount: Number,
    StarAmount: Number,
    StarPercent: Number,
    AddLess: Number,
    DisplayAmount: Number,
    CouponAmount: Number,
    Rounding: Number,
    CessAmount: Number,
    TCSPercent: Number,
    TCSAmount: Number,
    BillBalanceAmount: Number,
    NetAmount: Number,

    TotalQty: Number,
    TotalFreeQty: Number,
    TotalItems: Number,

    items: Array,
    amount: Number,

    Status: { type: String, default: "Approved" },
    isActive: { type: Boolean, default: true },
    CreatedBy: String,
    UpdatedBy: String,
  },
  { timestamps: true, collection: "T_CreditNote_Header" }
);

creditNoteSchema.index(
  { distributorId: 1, firmId: 1, CreditNoteSeries: 1, CreditNoteNo: 1 },
  { unique: true }
);

const CreditNote = mongoose.model("T_CreditNote_Header", creditNoteSchema);

// =========================================================
// DEBIT NOTE SCHEMA
// Collection: T_DebitNote_Header
// =========================================================

const debitNoteItemSchema =
  new mongoose.Schema(
    {
      Sr: {
        type: Number,
        default: 0,
      },

      TRN: {
        type: String,
        enum: ["GDR", "DGR"],
        default: "GDR",
      },

      ProductCode: {
        type: String,
        trim: true,
        default: "",
      },

      ProductName: {
        type: String,
        trim: true,
        default: "",
      },

      Batch: {
        type: String,
        trim: true,
        default: ".",
      },

      MRP: {
        type: Number,
        default: 0,
      },

      Unit: {
        type: String,
        default: "PCS",
      },

      Qty: {
        type: Number,
        default: 0,
      },

      Free: {
        type: Number,
        default: 0,
      },

      Rate: {
        type: Number,
        default: 0,
      },

      SRate: {
        type: Number,
        default: 0,
      },

      PRate: {
        type: Number,
        default: 0,
      },

      BoxPack: {
        type: Number,
        default: 1,
      },

      InBoxPack: {
        type: Number,
        default: 1,
      },

      GrossAmount: {
        type: Number,
        default: 0,
      },

      BVDisc1: {
        type: Number,
        default: 0,
      },

      BVDisc2: {
        type: Number,
        default: 0,
      },

      BVAdd1: {
        type: Number,
        default: 0,
      },

      BVAdd2: {
        type: Number,
        default: 0,
      },

      TaxableValue: {
        type: Number,
        default: 0,
      },

      GSTPercent: {
        type: Number,
        default: 0,
      },

      GSTAmount: {
        type: Number,
        default: 0,
      },

      AVDisc1: {
        type: Number,
        default: 0,
      },

      AVDisc2: {
        type: Number,
        default: 0,
      },

      CGST: {
        type: Number,
        default: 0,
      },

      SGST: {
        type: Number,
        default: 0,
      },

      IGST: {
        type: Number,
        default: 0,
      },

      CessPercent: {
        type: Number,
        default: 0,
      },

      CessAmount: {
        type: Number,
        default: 0,
      },

      CessPerP: {
        type: Number,
        default: 0,
      },
    },
    {
      _id: true,
    }
  );

const debitNoteSchema =
  new mongoose.Schema(
    {
      distributorId: {
        type: String,
        required: true,
        index: true,
      },

      firmId: {
        type: String,
        required: true,
        index: true,
      },

      firmName: {
        type: String,
        default: "",
      },

      VDate: {
        type: String,
        required: true,
      },

      VNo: {
        type: Number,
        required: true,
      },

      DebitNoteSeries: {
        type: String,
        default: "DH",
      },

      DebitNoteNo: {
        type: Number,
        required: true,
      },

      BillSeries: {
        type: String,
        default: "",
      },

      BillNo: {
        type: Number,
        default: 0,
      },

      SupplierCode: {
        type: String,
        default: "",
      },

      SupplierName: {
        type: String,
        default: "",
      },

      Godown: {
        type: String,
        default: "",
      },

      GDCode: {
        type: String,
        required: true,
      },

      CompanyCode: {
        type: String,
        default: "",
      },

      CompanyName: {
        type: String,
        default: "",
      },

      SalesmanCode: {
        type: String,
        default: "",
      },

      SalesmanName: {
        type: String,
        default: "",
      },

      ReturnType: {
        type: String,
        default: "",
      },

      IGST: {
        type: String,
        enum: ["Y", "N"],
        default: "N",
      },

      Narration: {
        type: String,
        default: "",
      },

      GrossAmount: {
        type: Number,
        default: 0,
      },

      GSTAmount: {
        type: Number,
        default: 0,
      },

      TCSPercent: {
        type: Number,
        default: 0,
      },

      TCSAmount: {
        type: Number,
        default: 0,
      },

      BeforeVatDiscAmount: {
        type: Number,
        default: 0,
      },

      Surcharge: {
        type: Number,
        default: 0,
      },

      RoundingAmount: {
        type: Number,
        default: 0,
      },

      BeforeVatAddAmount: {
        type: Number,
        default: 0,
      },

      AfterVatDiscAmount: {
        type: Number,
        default: 0,
      },

      NetAmount: {
        type: Number,
        default: 0,
      },

      amount: {
        type: Number,
        default: 0,
      },

      TotalQty: {
        type: Number,
        default: 0,
      },

      TotalFreeQty: {
        type: Number,
        default: 0,
      },

      TotalItems: {
        type: Number,
        default: 0,
      },

      items: {
        type: [debitNoteItemSchema],
        default: [],
      },

      Status: {
        type: String,
        default: "Approved",
      },

      isActive: {
        type: Boolean,
        default: true,
      },

      CreatedBy: {
        type: String,
        default: "",
      },

      UpdatedBy: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
      collection: "T_DebitNote_Header",
    }
  );

debitNoteSchema.index(
  {
    distributorId: 1,
    firmId: 1,
    DebitNoteSeries: 1,
    DebitNoteNo: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isActive: true,
    },
  }
);

const DebitNote =
  mongoose.models.DebitNote ||
  mongoose.model(
    "DebitNote",
    debitNoteSchema
  );

const debitNumber = (value) => {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const normalizeDebitNoteItems = (
  sourceItems = []
) => {
  if (!Array.isArray(sourceItems)) {
    return [];
  }

  return sourceItems.map(
    (item, index) => {
      const productCode = String(
        item.ProductCode ||
        item.productCode ||
        item.itemCode ||
        ""
      ).trim();

      const productName = String(
        item.ProductName ||
        item.productName ||
        item.itemName ||
        ""
      ).trim();

      const trn = String(
        item.TRN ||
        item.trn ||
        "GDR"
      )
        .trim()
        .toUpperCase();

      const batch =
        String(
          item.Batch ||
          item.batchNo ||
          item.selectedBatch?.batchNo ||
          item.selectedBatch?.Batch ||
          "."
        ).trim() || ".";

      const mrp = debitNumber(
        item.MRP ??
        item.mrp ??
        item.selectedBatch?.MRP ??
        item.selectedBatch?.mrp
      );

      const qty = debitNumber(
        item.Qty ??
        item.qty
      );

      const free = debitNumber(
        item.Free ??
        item.free
      );

      const totalStockQty =
        qty + free;

      if (!productCode) {
        throw new Error(
          `Product code missing in row ${index + 1
          }.`
        );
      }

      if (
        trn !== "GDR" &&
        trn !== "DGR"
      ) {
        throw new Error(
          `Invalid TRN in row ${index + 1
          }.`
        );
      }

      if (totalStockQty <= 0) {
        throw new Error(
          `Quantity must be greater than zero in row ${index + 1
          }.`
        );
      }

      return {
        ...item,

        Sr:
          index + 1,

        TRN:
          trn,

        ProductCode:
          productCode,

        ProductName:
          productName,

        Batch:
          batch,

        MRP:
          mrp,

        Unit:
          item.Unit ||
          item.unit ||
          "PCS",

        Qty:
          qty,

        Free:
          free,

        Rate:
          debitNumber(
            item.Rate ??
            item.rate ??
            item.SRate
          ),

        SRate:
          debitNumber(
            item.SRate ??
            item.salesRate ??
            item.Rate ??
            item.rate
          ),

        PRate:
          debitNumber(
            item.PRate ??
            item.purchaseRate
          ),

        BoxPack:
          debitNumber(
            item.BoxPack ??
            item.boxPack ??
            1
          ) || 1,

        InBoxPack:
          debitNumber(
            item.InBoxPack ??
            item.inboxPack ??
            1
          ) || 1,

        GrossAmount:
          debitNumber(
            item.GrossAmount ??
            item.grossAmt
          ),

        BVDisc1:
          debitNumber(
            item.BVDisc1 ??
            item.bvDisc1
          ),

        BVDisc2:
          debitNumber(
            item.BVDisc2 ??
            item.bvDisc2
          ),

        BVAdd1:
          debitNumber(
            item.BVAdd1 ??
            item.bvAdd1
          ),

        BVAdd2:
          debitNumber(
            item.BVAdd2 ??
            item.bvAdd2
          ),

        TaxableValue:
          debitNumber(
            item.TaxableValue ??
            item.taxable
          ),

        GSTPercent:
          debitNumber(
            item.GSTPercent ??
            item.gstPercent
          ),

        GSTAmount:
          debitNumber(
            item.GSTAmount ??
            item.gstArt ??
            item.gstAmt
          ),

        AVDisc1:
          debitNumber(
            item.AVDisc1 ??
            item.avDisc1
          ),

        AVDisc2:
          debitNumber(
            item.AVDisc2 ??
            item.avDisc2
          ),

        CGST:
          debitNumber(
            item.CGST ??
            item.cgst
          ),

        SGST:
          debitNumber(
            item.SGST ??
            item.sgst
          ),

        IGST:
          debitNumber(
            item.IGST ??
            item.igst
          ),

        CessPercent:
          debitNumber(
            item.CessPercent ??
            item.cessPercent
          ),

        CessAmount:
          debitNumber(
            item.CessAmount ??
            item.cessAmt
          ),

        CessPerP:
          debitNumber(
            item.CessPerP ??
            item.cessPerP
          ),

        totalStockQty,
      };
    }
  );
};

const getDebitStockModel = (
  trn
) =>
  String(trn).toUpperCase() ===
    "DGR"
    ? DamStock
    : Stock;

/*
* direction:
* -1 = apply Debit Note and deduct stock
* +1 = reverse Debit Note and restore stock
*/
const applyDebitNoteStockMovement =
  async ({
    items,
    distributorId,
    firmId,
    firmName,
    gdCode,
    direction,
    session,
  }) => {
    for (const item of items) {
      const stockModel =
        getDebitStockModel(
          item.TRN
        );

      const quantity =
        debitNumber(
          item.totalStockQty ??
          (
            debitNumber(item.Qty) +
            debitNumber(item.Free)
          )
        );

      const stockFilter = {
        distributorId,
        firmId,

        GDCode:
          gdCode,

        ProdCode:
          item.ProductCode,

        Batch:
          item.Batch || ".",

        MRP:
          debitNumber(item.MRP),
      };

      /*
      * Saving Debit Note subtracts stock.
      */
      if (direction < 0) {
        const result =
          await stockModel.updateOne(
            {
              ...stockFilter,

              Qty: {
                $gte:
                  quantity,
              },
            },
            {
              $inc: {
                Qty:
                  -quantity,
              },
            },
            {
              session,
            }
          );

        if (
          result.modifiedCount !== 1
        ) {
          const current =
            await stockModel.findOne(
              stockFilter
            )
              .session(session)
              .lean();

          const available =
            debitNumber(
              current?.Qty
            );

          throw new Error(
            `Insufficient stock for ${item.ProductCode
            }, batch ${item.Batch
            }. Available: ${available
            }, required: ${quantity
            }.`
          );
        }
      } else {
        /*
        * Delete/update reversal restores stock.
        */
        await stockModel.findOneAndUpdate(
          stockFilter,
          {
            $setOnInsert: {
              distributorId,
              firmId,
              firmName,

              GDCode:
                gdCode,

              ProdCode:
                item.ProductCode,

              Batch:
                item.Batch || ".",

              MRP:
                debitNumber(
                  item.MRP
                ),
            },

            $set: {
              PRate:
                debitNumber(
                  item.PRate
                ),

              SRate:
                debitNumber(
                  item.Rate
                ),

              BoxPack:
                debitNumber(
                  item.BoxPack
                ) || 1,

              InBoxPack:
                debitNumber(
                  item.InBoxPack
                ) || 1,

              IsLocked:
                "N",
            },

            $inc: {
              Qty:
                quantity,
            },
          },
          {
            upsert:
              true,

            new:
              true,

            session,
          }
        );
      }
    }
  };


app.get(
  "/api/debit-note/next-no",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const debitNoteSeries =
        String(
          req.query.debitNoteSeries ||
          "DH"
        )
          .trim()
          .toUpperCase();

      if (
        !distributorId ||
        !firmId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required.",
        });
      }

      if (!debitNoteSeries) {
        return res.status(400).json({
          success: false,
          message:
            "Debit Note Series is required.",
        });
      }

      const lastDebitNote =
        await DebitNote.findOne({
          distributorId,
          firmId,

          DebitNoteSeries:
            debitNoteSeries,

          isActive: true,
        })
          .sort({
            DebitNoteNo: -1,
          })
          .select({
            DebitNoteNo: 1,
          })
          .lean();

      const nextDebitNoteNo =
        Number(
          lastDebitNote?.DebitNoteNo ||
          0
        ) + 1;

      return res.json({
        success: true,

        debitNoteSeries,

        nextDebitNoteNo,
      });
    } catch (error) {
      console.error(
        "Debit Note next number error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to generate next Debit Note number.",

        error:
          error.message,
      });
    }
  }
);

app.get(
  "/api/debit-note",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      if (
        !distributorId ||
        !firmId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required.",
        });
      }

      const debitNotes =
        await DebitNote.find({
          distributorId,
          firmId,
          isActive:
            true,
        })
          .sort({
            VDate:
              -1,

            DebitNoteNo:
              -1,
          })
          .lean();

      return res.json({
        success:
          true,

        debitNotes,
      });
    } catch (error) {
      return res.status(500).json({
        success:
          false,

        message:
          "Failed to load Debit Notes.",

        error:
          error.message,
      });
    }
  }
);
/* =========================================================
  DEBIT NOTE LIST - BACKEND PAGINATION
  ========================================================= */

app.get(
  "/api/debit-note/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const fromDate = String(
        req.query.fromDate || ""
      ).trim();

      const toDate = String(
        req.query.toDate || ""
      ).trim();

      const debitNoteSeries = String(
        req.query.debitNoteSeries ||
        req.query.vouSer ||
        ""
      ).trim();

      const supplierCode = String(
        req.query.supplierCode ||
        req.query.partyCode ||
        ""
      ).trim();

      const supplierName = String(
        req.query.supplierName ||
        req.query.partyName ||
        ""
      ).trim();

      const company = String(
        req.query.company || ""
      ).trim();

      const gdCode = String(
        req.query.gdCode || ""
      ).trim();

      const godownName = String(
        req.query.godownName || ""
      ).trim();

      const salesmanCode = String(
        req.query.salesmanCode || ""
      ).trim();

      const salesmanName = String(
        req.query.salesmanName || ""
      ).trim();

      const referenceBillSeries = String(
        req.query.referenceBillSeries || ""
      ).trim();

      const referenceBillNo = String(
        req.query.referenceBillNo || ""
      ).trim();

      const returnType = String(
        req.query.returnType || ""
      ).trim();

      const status = String(
        req.query.status || ""
      ).trim();

      const createdBy = String(
        req.query.createdBy || ""
      ).trim();

      const minAmountText = String(
        req.query.minAmount || ""
      ).trim();

      const maxAmountText = String(
        req.query.maxAmount || ""
      ).trim();

      const requestedPage =
        Number.parseInt(
          req.query.page,
          10
        );

      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10
        );

      const page =
        Number.isFinite(
          requestedPage
        ) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(
          requestedLimit
        ) &&
          requestedLimit > 0
          ? Math.min(
            requestedLimit,
            100
          )
          : 10;

      if (
        !distributorId ||
        !firmId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required.",
        });
      }

      const escapeRegex = (
        value
      ) =>
        String(value || "").replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const containsRegex = (
        value
      ) =>
        new RegExp(
          escapeRegex(value),
          "i"
        );

      const exactRegex = (
        value
      ) =>
        new RegExp(
          `^${escapeRegex(
            value
          )}$`,
          "i"
        );

      const filter = {
        distributorId,
        firmId,

        isActive: {
          $ne: false,
        },
      };

      /*
      * Every grouped OR condition is pushed
      * into this array so none overwrite another.
      */
      const andConditions = [];

      /* =========================================
        DATE
        ========================================= */

      if (
        fromDate ||
        toDate
      ) {
        filter.VDate = {};

        if (fromDate) {
          filter.VDate.$gte =
            fromDate;
        }

        if (toDate) {
          filter.VDate.$lte =
            toDate;
        }
      }

      /* =========================================
        DEBIT NOTE SERIES
        ========================================= */

      if (debitNoteSeries) {
        filter.DebitNoteSeries =
          exactRegex(
            debitNoteSeries
          );
      }

      /* =========================================
        SUPPLIER
        ========================================= */

      if (supplierCode) {
        filter.SupplierCode =
          exactRegex(
            supplierCode
          );
      }

      if (supplierName) {
        filter.SupplierName =
          containsRegex(
            supplierName
          );
      }

      /* =========================================
        COMPANY
        ========================================= */

      if (company) {
        const companyRegex =
          containsRegex(
            company
          );

        andConditions.push({
          $or: [
            {
              CompanyCode:
                companyRegex,
            },
            {
              CompanyName:
                companyRegex,
            },
            {
              companyCode:
                companyRegex,
            },
            {
              companyName:
                companyRegex,
            },
          ],
        });
      }

      /* =========================================
        GODOWN
        ========================================= */

      if (gdCode) {
        filter.GDCode =
          exactRegex(
            gdCode
          );
      }

      if (godownName) {
        filter.Godown =
          containsRegex(
            godownName
          );
      }

      /* =========================================
        SALESMAN
        ========================================= */

      if (salesmanCode) {
        filter.SalesmanCode =
          exactRegex(
            salesmanCode
          );
      }

      if (salesmanName) {
        filter.SalesmanName =
          containsRegex(
            salesmanName
          );
      }

      /* =========================================
        REFERENCED PURCHASE BILL
        ========================================= */

      if (referenceBillSeries) {
        filter.BillSeries =
          exactRegex(
            referenceBillSeries
          );
      }

      if (referenceBillNo) {
        const numericBillNo =
          Number(
            referenceBillNo
          );

        if (
          Number.isFinite(
            numericBillNo
          )
        ) {
          filter.BillNo =
            numericBillNo;
        }
      }

      /* =========================================
        RETURN TYPE / STATUS / USER
        ========================================= */

      if (returnType) {
        filter.ReturnType =
          exactRegex(
            returnType
          );
      }

      if (status) {
        filter.Status =
          exactRegex(status);
      }

      if (createdBy) {
        filter.CreatedBy =
          containsRegex(
            createdBy
          );
      }

      /* =========================================
        AMOUNT RANGE
        ========================================= */

      const minAmount =
        Number(minAmountText);

      const maxAmount =
        Number(maxAmountText);

      if (
        (
          minAmountText &&
          Number.isFinite(
            minAmount
          )
        ) ||
        (
          maxAmountText &&
          Number.isFinite(
            maxAmount
          )
        )
      ) {
        filter.NetAmount = {};

        if (
          minAmountText &&
          Number.isFinite(
            minAmount
          )
        ) {
          filter.NetAmount.$gte =
            minAmount;
        }

        if (
          maxAmountText &&
          Number.isFinite(
            maxAmount
          )
        ) {
          filter.NetAmount.$lte =
            maxAmount;
        }
      }

      /* =========================================
        GENERAL SEARCH
        ========================================= */

      if (search) {
        const searchRegex =
          containsRegex(search);

        const numericSearch =
          Number(search);

        const searchConditions = [
          {
            DebitNoteSeries:
              searchRegex,
          },
          {
            BillSeries:
              searchRegex,
          },
          {
            SupplierCode:
              searchRegex,
          },
          {
            SupplierName:
              searchRegex,
          },
          {
            CompanyCode:
              searchRegex,
          },
          {
            CompanyName:
              searchRegex,
          },
          {
            GDCode:
              searchRegex,
          },
          {
            Godown:
              searchRegex,
          },
          {
            SalesmanCode:
              searchRegex,
          },
          {
            SalesmanName:
              searchRegex,
          },
          {
            ReturnType:
              searchRegex,
          },
          {
            Status:
              searchRegex,
          },
          {
            CreatedBy:
              searchRegex,
          },
          {
            Narration:
              searchRegex,
          },
        ];

        if (
          Number.isFinite(
            numericSearch
          )
        ) {
          searchConditions.push(
            {
              DebitNoteNo:
                numericSearch,
            },
            {
              VNo:
                numericSearch,
            },
            {
              BillNo:
                numericSearch,
            },
            {
              NetAmount:
                numericSearch,
            }
          );
        }

        andConditions.push({
          $or:
            searchConditions,
        });
      }

      if (
        andConditions.length > 0
      ) {
        filter.$and =
          andConditions;
      }

      const totalRecords =
        await DebitNote
          .countDocuments(
            filter
          );

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalRecords /
            limit
          )
        );

      const currentPage =
        Math.min(
          page,
          totalPages
        );

      const skip =
        (
          currentPage -
          1
        ) *
        limit;

      const debitNotes =
        await DebitNote.find(
          filter
        )
          .sort({
            VDate: -1,
            DebitNoteNo: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        debitNotes,

        count:
          debitNotes.length,

        pagination: {
          currentPage,

          page:
            currentPage,

          limit,

          totalRecords,

          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                debitNotes.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Debit Note pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Debit Notes.",
        error:
          error.message,
      });
    }
  }
);

app.post(
  "/api/debit-note",
  ensureConnection,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const distributorId = String(
        req.body.distributorId || ""
      ).trim();

      const firmId = String(
        req.body.firmId || ""
      ).trim();

      const firmName = String(
        req.body.firmName || ""
      ).trim();

      const debitNoteSeries =
        String(
          req.body.DebitNoteSeries ||
          req.body.debitNoteSeries ||
          "DN"
        ).trim();

      const debitNoteNo =
        debitNumber(
          req.body.DebitNoteNo ||
          req.body.debitNoteNo ||
          req.body.VNo
        );

      const gdCode = String(
        req.body.GDCode ||
        req.body.gdCode ||
        ""
      ).trim();

      if (
        !distributorId ||
        !firmId
      ) {
        throw new Error(
          "Distributor/Firm not found."
        );
      }

      if (!debitNoteNo) {
        throw new Error(
          "Debit Note number is required."
        );
      }

      if (!gdCode) {
        throw new Error(
          "Godown code is required."
        );
      }

      const items =
        normalizeDebitNoteItems(
          req.body.items || []
        );

      if (!items.length) {
        throw new Error(
          "At least one product is required."
        );
      }

      const duplicate =
        await DebitNote.findOne({
          distributorId,
          firmId,

          DebitNoteSeries:
            debitNoteSeries,

          DebitNoteNo:
            debitNoteNo,

          isActive:
            true,
        }).session(session);

      if (duplicate) {
        throw new Error(
          "Debit Note already exists."
        );
      }

      /*
      * Deduct stock first.
      */
      await applyDebitNoteStockMovement({
        items,

        distributorId,
        firmId,
        firmName,

        gdCode,

        direction:
          -1,

        session,
      });

      const created =
        await DebitNote.create(
          [
            {
              ...req.body,

              distributorId,
              firmId,
              firmName,

              VNo:
                debitNoteNo,

              DebitNoteSeries:
                debitNoteSeries,

              DebitNoteNo:
                debitNoteNo,

              debitNoteSeries,
              debitNoteNo,

              GDCode:
                gdCode,

              GrossAmount:
                debitNumber(
                  req.body.GrossAmount
                ),

              GSTAmount:
                debitNumber(
                  req.body.GSTAmount
                ),

              NetAmount:
                debitNumber(
                  req.body.NetAmount ??
                  req.body.amount
                ),

              amount:
                debitNumber(
                  req.body.NetAmount ??
                  req.body.amount
                ),

              TotalQty:
                items.reduce(
                  (sum, item) =>
                    sum +
                    debitNumber(
                      item.Qty
                    ),
                  0
                ),

              TotalFreeQty:
                items.reduce(
                  (sum, item) =>
                    sum +
                    debitNumber(
                      item.Free
                    ),
                  0
                ),

              TotalItems:
                items.length,

              items,

              Status:
                req.body.Status ||
                "Approved",

              isActive:
                true,
            },
          ],
          {
            session,
          }
        );

      await session.commitTransaction();

      return res.status(201).json({
        success:
          true,

        message:
          "Debit Note saved and stock deducted successfully.",

        data:
          created[0],
      });
    } catch (error) {
      if (
        session.inTransaction()
      ) {
        await session.abortTransaction();
      }

      console.error(
        "Debit Note save error:",
        error
      );

      return res.status(400).json({
        success:
          false,

        message:
          error.message ||
          "Debit Note save failed.",
      });
    } finally {
      await session.endSession();
    }
  }
);

app.put(
  "/api/debit-note/:id",
  ensureConnection,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const id =
        String(
          req.params.id || ""
        ).trim();

      const distributorId = String(
        req.body.distributorId || ""
      ).trim();

      const firmId = String(
        req.body.firmId || ""
      ).trim();

      const firmName = String(
        req.body.firmName || ""
      ).trim();

      if (
        !mongoose.Types.ObjectId
          .isValid(id)
      ) {
        throw new Error(
          "Invalid Debit Note ID."
        );
      }

      const oldDebitNote =
        await DebitNote.findOne({
          _id:
            id,

          distributorId,
          firmId,

          isActive:
            true,
        }).session(session);

      if (!oldDebitNote) {
        throw new Error(
          "Debit Note not found."
        );
      }

      const oldItems =
        normalizeDebitNoteItems(
          oldDebitNote.items || []
        );

      const oldGdCode = String(
        oldDebitNote.GDCode || ""
      ).trim();

      /*
      * Restore stock deducted by old Debit Note.
      */
      await applyDebitNoteStockMovement({
        items:
          oldItems,

        distributorId,
        firmId,

        firmName:
          oldDebitNote.firmName ||
          firmName,

        gdCode:
          oldGdCode,

        direction:
          1,

        session,
      });

      const newItems =
        normalizeDebitNoteItems(
          req.body.items || []
        );

      const newGdCode = String(
        req.body.GDCode ||
        req.body.gdCode ||
        ""
      ).trim();

      if (!newGdCode) {
        throw new Error(
          "Godown code is required."
        );
      }

      /*
      * Deduct new edited quantities.
      */
      await applyDebitNoteStockMovement({
        items:
          newItems,

        distributorId,
        firmId,
        firmName,

        gdCode:
          newGdCode,

        direction:
          -1,

        session,
      });

      const debitNoteSeries =
        String(
          req.body.DebitNoteSeries ||
          req.body.debitNoteSeries ||
          oldDebitNote
            .DebitNoteSeries ||
          "DN"
        ).trim();

      const debitNoteNo =
        debitNumber(
          req.body.DebitNoteNo ||
          req.body.debitNoteNo ||
          req.body.VNo ||
          oldDebitNote
            .DebitNoteNo
        );

      const duplicate =
        await DebitNote.findOne({
          _id: {
            $ne:
              oldDebitNote._id,
          },

          distributorId,
          firmId,

          DebitNoteSeries:
            debitNoteSeries,

          DebitNoteNo:
            debitNoteNo,

          isActive:
            true,
        }).session(session);

      if (duplicate) {
        throw new Error(
          "Another Debit Note exists with this number."
        );
      }

      const updated =
        await DebitNote.findByIdAndUpdate(
          id,
          {
            $set: {
              ...req.body,

              distributorId,
              firmId,
              firmName,

              VNo:
                debitNoteNo,

              DebitNoteSeries:
                debitNoteSeries,

              DebitNoteNo:
                debitNoteNo,

              debitNoteSeries,
              debitNoteNo,

              GDCode:
                newGdCode,

              GrossAmount:
                debitNumber(
                  req.body.GrossAmount
                ),

              GSTAmount:
                debitNumber(
                  req.body.GSTAmount
                ),

              NetAmount:
                debitNumber(
                  req.body.NetAmount ??
                  req.body.amount
                ),

              amount:
                debitNumber(
                  req.body.NetAmount ??
                  req.body.amount
                ),

              TotalQty:
                newItems.reduce(
                  (sum, item) =>
                    sum +
                    debitNumber(
                      item.Qty
                    ),
                  0
                ),

              TotalFreeQty:
                newItems.reduce(
                  (sum, item) =>
                    sum +
                    debitNumber(
                      item.Free
                    ),
                  0
                ),

              TotalItems:
                newItems.length,

              items:
                newItems,

              UpdatedBy:
                req.body.UpdatedBy ||
                "",

              isActive:
                true,
            },
          },
          {
            new:
              true,

            session,

            runValidators:
              true,
          }
        );

      await session.commitTransaction();

      return res.json({
        success:
          true,

        message:
          "Debit Note updated and stock corrected successfully.",

        data:
          updated,
      });
    } catch (error) {
      if (
        session.inTransaction()
      ) {
        await session.abortTransaction();
      }

      return res.status(400).json({
        success:
          false,

        message:
          error.message ||
          "Debit Note update failed.",
      });
    } finally {
      await session.endSession();
    }
  }
);

app.delete(
  "/api/debit-note/:id",
  ensureConnection,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const id =
        String(
          req.params.id || ""
        ).trim();

      const distributorId =
        String(
          req.body.distributorId ||
          req.query.distributorId ||
          ""
        ).trim();

      const firmId =
        String(
          req.body.firmId ||
          req.query.firmId ||
          ""
        ).trim();

      const debitNote =
        await DebitNote.findOne({
          _id:
            id,

          distributorId,
          firmId,

          isActive:
            true,
        }).session(session);

      if (!debitNote) {
        throw new Error(
          "Debit Note not found."
        );
      }

      const items =
        normalizeDebitNoteItems(
          debitNote.items || []
        );

      /*
      * Restore stock deducted by Debit Note.
      */
      await applyDebitNoteStockMovement({
        items,

        distributorId,
        firmId,

        firmName:
          debitNote.firmName ||
          "",

        gdCode:
          debitNote.GDCode,

        direction:
          1,

        session,
      });

      await DebitNote.findByIdAndDelete(
        id,
        {
          session,
        }
      );

      await session.commitTransaction();

      return res.json({
        success:
          true,

        message:
          "Debit Note deleted and stock restored successfully.",
      });
    } catch (error) {
      if (
        session.inTransaction()
      ) {
        await session.abortTransaction();
      }

      return res.status(400).json({
        success:
          false,

        message:
          error.message ||
          "Debit Note delete failed.",
      });
    } finally {
      await session.endSession();
    }
  }
);

/* =========================================================
  CREDIT NOTE STOCK AND BILL HELPERS
  ========================================================= */

const creditNoteNumber = (value) => {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const normalizeCreditNoteItems = (
  sourceItems = []
) => {
  if (!Array.isArray(sourceItems)) {
    return [];
  }

  return sourceItems.map(
    (item, index) => {
      const productCode = String(
        item.ProductCode ||
        item.productCode ||
        item.itemCode ||
        ""
      ).trim();

      const productName = String(
        item.ProductName ||
        item.productName ||
        item.itemName ||
        ""
      ).trim();

      const batchNo =
        String(
          item.Batch ||
          item.batchNo ||
          item.selectedBatch?.batchNo ||
          item.selectedBatch?.Batch ||
          "."
        ).trim() || ".";

      const mrp = creditNoteNumber(
        item.MRP ??
        item.mrp ??
        item.selectedBatch?.MRP ??
        item.selectedBatch?.mrp
      );

      const qty = creditNoteNumber(
        item.Qty ??
        item.qty
      );

      const free = creditNoteNumber(
        item.Free ??
        item.free
      );

      const totalStockQty =
        qty + free;

      const trn = String(
        item.TRN ||
        item.trn ||
        "GDR"
      )
        .trim()
        .toUpperCase();

      if (!productCode) {
        throw new Error(
          `Product code is missing in row ${index + 1
          }.`
        );
      }

      if (
        trn !== "GDR" &&
        trn !== "DGR"
      ) {
        throw new Error(
          `Invalid TRN in row ${index + 1
          }. Use GDR or DGR.`
        );
      }

      if (
        !Number.isFinite(totalStockQty) ||
        totalStockQty <= 0
      ) {
        throw new Error(
          `Quantity must be greater than zero in row ${index + 1
          }.`
        );
      }

      if (
        !Number.isFinite(mrp) ||
        mrp < 0
      ) {
        throw new Error(
          `Invalid MRP in row ${index + 1
          }.`
        );
      }

      return {
        ...item,

        Sr:
          item.Sr ||
          item.sr ||
          index + 1,

        TRN:
          trn,

        ProductCode:
          productCode,

        ProductName:
          productName,

        Batch:
          batchNo,

        MRP:
          mrp,

        Qty:
          qty,

        Free:
          free,

        Rate: creditNoteNumber(
          item.Rate ??
          item.rate ??
          item.SRate
        ),

        PRate: creditNoteNumber(
          item.PRate ??
          item.purchaseRate
        ),

        BoxPack:
          creditNoteNumber(
            item.BoxPack ??
            item.boxPack ??
            1
          ) || 1,

        InBoxPack:
          creditNoteNumber(
            item.InBoxPack ??
            item.inBoxPack ??
            item.inboxPack ??
            1
          ) || 1,

        totalStockQty,
      };
    }
  );
};

const getCreditNoteStockModel = (
  trn
) => {
  return String(trn)
    .trim()
    .toUpperCase() === "DGR"
    ? DamStock
    : Stock;
};

/*
* direction:
* +1 = apply Credit Note stock
* -1 = reverse Credit Note stock
*/
const applyCreditNoteStockMovement =
  async ({
    items,
    distributorId,
    firmId,
    firmName,
    gdCode,
    direction,
    session,
    preventNegative = true,
  }) => {
    for (const item of items) {
      const stockModel =
        getCreditNoteStockModel(
          item.TRN
        );

      const movementQty =
        creditNoteNumber(
          item.totalStockQty ??
          (
            creditNoteNumber(item.Qty) +
            creditNoteNumber(item.Free)
          )
        ) * direction;

      const stockFilter = {
        distributorId,
        firmId,

        GDCode:
          gdCode,

        ProdCode:
          item.ProductCode,

        Batch:
          item.Batch || ".",

        MRP:
          creditNoteNumber(item.MRP),
      };

      /*
      * Reversing a Credit Note subtracts stock.
      * Do not allow that reversal to make stock negative.
      */
      if (
        direction < 0 &&
        preventNegative
      ) {
        const existingStock =
          await stockModel.findOne(
            stockFilter
          )
            .session(session)
            .lean();

        if (!existingStock) {
          throw new Error(
            `Stock row not found for ${item.ProductCode
            }, batch ${item.Batch || "."
            }, MRP ${item.MRP
            }.`
          );
        }

        const availableQty =
          creditNoteNumber(
            existingStock.Qty
          );

        const requiredQty =
          Math.abs(
            movementQty
          );

        if (
          availableQty <
          requiredQty
        ) {
          throw new Error(
            `Cannot reverse Credit Note for ${item.ProductCode
            }. Available stock is ${availableQty
            }, but ${requiredQty
            } is required.`
          );
        }
      }

      if (direction > 0) {
        await stockModel.findOneAndUpdate(
          stockFilter,
          {
            $setOnInsert: {
              distributorId,
              firmId,
              firmName,

              GDCode:
                gdCode,

              ProdCode:
                item.ProductCode,

              Batch:
                item.Batch || ".",

              MRP:
                creditNoteNumber(
                  item.MRP
                ),
            },

            $set: {
              PRate:
                creditNoteNumber(
                  item.PRate
                ),

              SRate:
                creditNoteNumber(
                  item.Rate
                ),

              BoxPack:
                creditNoteNumber(
                  item.BoxPack
                ) || 1,

              InBoxPack:
                creditNoteNumber(
                  item.InBoxPack
                ) || 1,

              IsLocked:
                "N",
            },

            $inc: {
              Qty:
                movementQty,
            },
          },
          {
            upsert:
              true,

            new:
              true,

            session,

            setDefaultsOnInsert:
              true,
          }
        );
      } else {
        const result =
          await stockModel.updateOne(
            {
              ...stockFilter,

              Qty: {
                $gte:
                  Math.abs(
                    movementQty
                  ),
              },
            },
            {
              $inc: {
                Qty:
                  movementQty,
              },
            },
            {
              session,
            }
          );

        if (
          result.modifiedCount !== 1
        ) {
          throw new Error(
            `Unable to reverse stock for ${item.ProductCode
            }, batch ${item.Batch || "."
            }.`
          );
        }
      }
    }
  };

const getCreditNoteAmounts = (
  source = {}
) => {
  return {
    creditAmount:
      creditNoteNumber(
        source.NetAmount ??
        source.amount
      ),

    grossAmount:
      creditNoteNumber(
        source.GrossAmount
      ),

    taxableValue:
      creditNoteNumber(
        source.TaxableValue ??
        source.taxableValue
      ),

    cgstAmount:
      creditNoteNumber(
        source.CGSTAmount ??
        source.cgstAmount
      ),

    sgstAmount:
      creditNoteNumber(
        source.SGSTAmount ??
        source.sgstAmount
      ),

    igstAmount:
      creditNoteNumber(
        source.IGSTAmount ??
        source.igstAmount
      ),
  };
};

/*
* direction:
* +1 = apply Credit Note to Sales Bill
* -1 = reverse Credit Note from Sales Bill
*/
const adjustSalesBillForCreditNote =
  async ({
    salesBill,
    amounts,
    direction,
    creditNoteSeries,
    creditNoteNo,
    session,
  }) => {
    if (!salesBill) {
      return;
    }

    const applyCreditNote =
      direction > 0;

    const update = {
      $inc: {
        CreditNoteAmount:
          applyCreditNote
            ? amounts.creditAmount
            : -amounts.creditAmount,

        NetAmount:
          applyCreditNote
            ? -amounts.creditAmount
            : amounts.creditAmount,

        GrossAmount:
          applyCreditNote
            ? -amounts.grossAmount
            : amounts.grossAmount,

        TaxableValue:
          applyCreditNote
            ? -amounts.taxableValue
            : amounts.taxableValue,

        CGSTAmount:
          applyCreditNote
            ? -amounts.cgstAmount
            : amounts.cgstAmount,

        SGSTAmount:
          applyCreditNote
            ? -amounts.sgstAmount
            : amounts.sgstAmount,

        IGSTAmount:
          applyCreditNote
            ? -amounts.igstAmount
            : amounts.igstAmount,
      },
    };

    if (applyCreditNote) {
      update.$set = {
        CreditNoteAdjusted:
          true,

        LastCreditNoteSeries:
          creditNoteSeries,

        LastCreditNoteNo:
          creditNoteNo,
      };
    }

    await SalesHeader.updateOne(
      {
        _id:
          salesBill._id,
      },
      update,
      {
        session,
      }
    );
  };

const findReferencedSalesBill =
  async ({
    distributorId,
    firmId,
    billSeries,
    billNo,
    session,
  }) => {
    if (!billNo) {
      return null;
    }

    const filter = {
      distributorId,
      firmId,

      BillNo:
        Number(billNo),

      isActive:
        true,
    };

    if (billSeries) {
      filter.BillSeries =
        String(billSeries).trim();
    }

    return SalesHeader.findOne(
      filter
    ).session(session);
  };

app.get("/api/credit-note/sales-bill", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || "").trim();
    const firmId = String(req.query.firmId || "").trim();
    const billSeries = String(req.query.billSeries || "").trim();
    const billNo = Number(req.query.billNo || 0);

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    if (!billNo) {
      return res.status(400).json({
        success: false,
        message: "Bill No is required",
      });
    }

    const filter = {
      distributorId,
      firmId,
      BillNo: billNo,
      isActive: true,
    };

    if (billSeries) filter.BillSeries = billSeries;

    const bill = await SalesHeader.findOne(filter);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: `Sales bill not found: ${billSeries}/${billNo}`,
      });
    }

    res.json({
      success: true,
      bill,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Sales bill load failed",
      error: error.message,
    });
  }
});
// Get next credit note bill number
app.get("/api/credit-note/next-bill-no", ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || "").trim();
    const firmId = String(req.query.firmId || "").trim();
    const creditNoteSeries = String(req.query.creditNoteSeries || "CN").trim();

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const lastBill = await CreditNote.findOne({
      distributorId,
      firmId,
      CreditNoteSeries: creditNoteSeries,
      isActive: true,
    }).sort({ CreditNoteNo: -1 });

    res.json({
      success: true,
      nextCreditNoteNo: Number(lastBill?.CreditNoteNo || 0) + 1,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate next credit note number",
      error: error.message,
    });
  }
});
// Save Credit Note
// =========================================================
// SAVE CREDIT NOTE
//
// STOCK MOVEMENT:
// GDR -> MAS_STOCK     -> ADD Qty + Free
// DGR -> MAS_DAMSTOCK  -> ADD Qty + Free
//
// Supports:
// 1. Credit Note against a saved Sales Bill
// 2. Credit Note against an unsaved/reserved Sales Bill
// 3. Manual Credit Note without Bill Series/Bill No
// =========================================================

app.post(
  "/api/credit-note",
  ensureConnection,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const distributorId = String(
        req.body.distributorId || ""
      ).trim();

      const firmId = String(
        req.body.firmId || ""
      ).trim();

      const firmName = String(
        req.body.firmName || ""
      ).trim();

      const creditNoteSeries = String(
        req.body.CreditNoteSeries ||
        req.body.creditNoteSeries ||
        "CN"
      ).trim();

      const creditNoteNo = Number(
        req.body.CreditNoteNo ||
        req.body.creditNoteNo ||
        req.body.VNo ||
        0
      );

      /*
      * Bill details are optional because
      * manual Credit Note entry is allowed.
      */
      const billSeries = String(
        req.body.BillSeries ||
        req.body.billSeries ||
        ""
      ).trim();

      const billNo = Number(
        req.body.BillNo ||
        req.body.billNo ||
        0
      );

      const gdCode = String(
        req.body.GDCode ||
        req.body.gdCode ||
        ""
      ).trim();

      const godownName = String(
        req.body.Godown ||
        req.body.godown ||
        ""
      ).trim();

      const sourceItems =
        Array.isArray(req.body.items)
          ? req.body.items
          : [];

      if (
        !distributorId ||
        !firmId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Distributor/Firm not found. Please login again.",
        });
      }

      if (!creditNoteNo) {
        return res.status(400).json({
          success: false,
          message:
            "Credit Note Number is required.",
        });
      }

      if (!gdCode) {
        return res.status(400).json({
          success: false,
          message:
            "Valid Godown Code is required.",
        });
      }

      /*
      * Normalize and validate every item.
      */
      const normalizedItems =
        sourceItems.map(
          (item, index) => {
            const productCode = String(
              item.ProductCode ||
              item.productCode ||
              item.itemCode ||
              ""
            ).trim();

            const productName = String(
              item.ProductName ||
              item.productName ||
              item.itemName ||
              ""
            ).trim();

            const batchNo =
              String(
                item.Batch ||
                item.batchNo ||
                item.selectedBatch
                  ?.batchNo ||
                item.selectedBatch
                  ?.Batch ||
                "."
              ).trim() || ".";

            const mrp = Number(
              item.MRP ??
              item.mrp ??
              item.selectedBatch?.MRP ??
              item.selectedBatch?.mrp ??
              0
            );

            const qty = Number(
              item.Qty ??
              item.qty ??
              0
            );

            const free = Number(
              item.Free ??
              item.free ??
              0
            );

            const totalStockQty =
              qty + free;

            const trn = String(
              item.TRN ||
              item.trn ||
              "GDR"
            )
              .trim()
              .toUpperCase();

            if (!productCode) {
              throw new Error(
                `Product code is missing in row ${index + 1
                }.`
              );
            }

            if (
              trn !== "GDR" &&
              trn !== "DGR"
            ) {
              throw new Error(
                `Invalid transaction type in row ${index + 1
                }. Use GDR or DGR.`
              );
            }

            if (
              !Number.isFinite(
                totalStockQty
              ) ||
              totalStockQty <= 0
            ) {
              throw new Error(
                `Quantity must be greater than zero in row ${index + 1
                }.`
              );
            }

            if (
              !Number.isFinite(mrp) ||
              mrp < 0
            ) {
              throw new Error(
                `Invalid MRP in row ${index + 1
                }.`
              );
            }

            return {
              ...item,

              Sr:
                item.Sr ||
                index + 1,

              TRN: trn,

              ProductCode:
                productCode,

              ProductName:
                productName,

              Batch:
                batchNo,

              MRP:
                mrp,

              Qty:
                qty,

              Free:
                free,

              Rate: Number(
                item.Rate ??
                item.rate ??
                item.SRate ??
                0
              ),

              PRate: Number(
                item.PRate ??
                item.purchaseRate ??
                0
              ),

              BoxPack: Number(
                item.BoxPack ??
                item.boxPack ??
                1
              ),

              InBoxPack: Number(
                item.InBoxPack ??
                item.inBoxPack ??
                item.inboxPack ??
                1
              ),

              totalStockQty,
            };
          }
        );

      if (
        normalizedItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one valid product is required.",
        });
      }

      const existingCreditNote =
        await CreditNote.findOne({
          distributorId,
          firmId,

          CreditNoteSeries:
            creditNoteSeries,

          CreditNoteNo:
            creditNoteNo,

          isActive: true,
        }).session(session);

      if (existingCreditNote) {
        await session.abortTransaction();

        return res.status(409).json({
          success: false,
          message:
            "Credit Note already exists for this series and number.",
        });
      }

      /*
      * Bill may not exist when Credit Note is
      * created from an unsaved Sales Invoice.
      */
      let salesBill = null;

      if (billNo > 0) {
        const salesBillFilter = {
          distributorId,
          firmId,
          BillNo: billNo,
          isActive: true,
        };

        if (billSeries) {
          salesBillFilter.BillSeries =
            billSeries;
        }

        salesBill =
          await SalesHeader.findOne(
            salesBillFilter
          ).session(session);
      }

      const creditAmount = Number(
        req.body.NetAmount ??
        req.body.amount ??
        0
      );

      const grossAmount = Number(
        req.body.GrossAmount || 0
      );

      const taxableValue = Number(
        req.body.TaxableValue ??
        req.body.taxableValue ??
        0
      );

      const cgstAmount = Number(
        req.body.CGSTAmount ??
        req.body.cgstAmount ??
        0
      );

      const sgstAmount = Number(
        req.body.SGSTAmount ??
        req.body.sgstAmount ??
        0
      );

      const igstAmount = Number(
        req.body.IGSTAmount ??
        req.body.igstAmount ??
        0
      );

      if (
        !Number.isFinite(
          creditAmount
        ) ||
        creditAmount < 0
      ) {
        throw new Error(
          "Invalid Credit Note amount."
        );
      }

      /*
      * When a saved Sales Bill exists,
      * do not allow a Credit Note exceeding
      * the current bill balance.
      */
      if (
        salesBill &&
        creditAmount >
        Number(
          salesBill.NetAmount || 0
        )
      ) {
        throw new Error(
          `Credit Note amount ₹${creditAmount.toFixed(
            2
          )} exceeds Sales Bill balance ₹${Number(
            salesBill.NetAmount || 0
          ).toFixed(2)}.`
        );
      }

      const createdCreditNotes =
        await CreditNote.create(
          [
            {
              ...req.body,

              distributorId,
              firmId,
              firmName,

              VNo:
                creditNoteNo,

              CreditNoteSeries:
                creditNoteSeries,

              CreditNoteNo:
                creditNoteNo,

              BillSeries:
                billSeries,

              BillNo:
                billNo,

              creditNoteSeries:
                creditNoteSeries,

              creditNoteNo:
                creditNoteNo,

              billSeries,
              billNo,

              Godown:
                godownName,

              GDCode:
                gdCode,

              GrossAmount:
                grossAmount,

              TaxableValue:
                taxableValue,

              CGSTAmount:
                cgstAmount,

              SGSTAmount:
                sgstAmount,

              IGSTAmount:
                igstAmount,

              NetAmount:
                creditAmount,

              amount:
                creditAmount,

              items:
                normalizedItems,

              TotalQty:
                normalizedItems.reduce(
                  (total, item) =>
                    total +
                    Number(
                      item.Qty || 0
                    ),
                  0
                ),

              TotalFreeQty:
                normalizedItems.reduce(
                  (total, item) =>
                    total +
                    Number(
                      item.Free || 0
                    ),
                  0
                ),

              TotalItems:
                normalizedItems.length,

              isActive:
                true,

              Status:
                req.body.Status ||
                "Approved",
            },
          ],
          {
            session,
          }
        );

      /*
      * Credit Note stock movement:
      *
      * GDR -> MAS_STOCK    -> increase
      * DGR -> MAS_DAMSTOCK -> increase
      */
      for (
        const item of
        normalizedItems
      ) {
        const stockModel =
          item.TRN === "DGR"
            ? DamStock
            : Stock;

        const stockFilter = {
          distributorId,
          firmId,

          GDCode:
            gdCode,

          ProdCode:
            item.ProductCode,

          Batch:
            item.Batch,

          MRP:
            item.MRP,
        };

        const stockUpdate = {
          $setOnInsert: {
            distributorId,
            firmId,
            firmName,

            GDCode:
              gdCode,

            ProdCode:
              item.ProductCode,

            Batch:
              item.Batch,

            MRP:
              item.MRP,


          },

          $set: {
            PRate:
              item.PRate,

            SRate:
              item.Rate,

            BoxPack:
              item.BoxPack,

            InBoxPack:
              item.InBoxPack,

            IsLocked:
              "N",
          },

          $inc: {
            Qty:
              item.totalStockQty,
          },
        };

        await stockModel.findOneAndUpdate(
          stockFilter,
          stockUpdate,
          {
            upsert: true,
            new: true,
            session,
            setDefaultsOnInsert: true,
          }
        );
      }

      /*
      * Update Sales Bill only when it already
      * exists in the database.
      *
      * If the Sales Bill is still unsaved,
      * the frontend will save it later with
      * CreditNoteAmount and reduced NetAmount.
      */
      if (salesBill) {
        await SalesHeader.updateOne(
          {
            _id:
              salesBill._id,
          },
          {
            $inc: {
              CreditNoteAmount:
                creditAmount,

              NetAmount:
                -creditAmount,

              GrossAmount:
                -grossAmount,

              TaxableValue:
                -taxableValue,

              CGSTAmount:
                -cgstAmount,

              SGSTAmount:
                -sgstAmount,

              IGSTAmount:
                -igstAmount,
            },

            $set: {
              CreditNoteAdjusted:
                true,

              LastCreditNoteSeries:
                creditNoteSeries,

              LastCreditNoteNo:
                creditNoteNo,
            },
          },
          {
            session,
          }
        );
      }

      await session.commitTransaction();

      return res.status(201).json({
        success: true,

        message:
          salesBill
            ? "Credit Note saved and Sales Bill adjusted successfully."
            : billNo > 0
              ? "Credit Note saved. Referenced Sales Bill is not saved yet, so bill adjustment was deferred."
              : "Manual Credit Note saved successfully.",

        data:
          createdCreditNotes[0],

        salesBillAdjusted:
          Boolean(salesBill),
      });
    } catch (error) {
      if (
        session.inTransaction()
      ) {
        await session.abortTransaction();
      }

      console.error(
        "Credit Note save error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Credit Note save failed.",
      });
    } finally {
      await session.endSession();
    }
  }
);
// =========================================================
// UPDATE CREDIT NOTE
//
// 1. Reverse old Credit Note stock
// 2. Restore old Sales Bill amounts
// 3. Validate edited Credit Note
// 4. Apply new stock
// 5. Adjust new Sales Bill
// 6. Save edited Credit Note
// =========================================================

app.put(
  "/api/credit-note/:id",
  ensureConnection,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const id = String(
        req.params.id || ""
      ).trim();

      const distributorId = String(
        req.body.distributorId || ""
      ).trim();

      const firmId = String(
        req.body.firmId || ""
      ).trim();

      const firmName = String(
        req.body.firmName || ""
      ).trim();

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        throw new Error(
          "Invalid Credit Note ID."
        );
      }

      if (
        !distributorId ||
        !firmId
      ) {
        throw new Error(
          "Distributor/Firm not found."
        );
      }

      const oldCreditNote =
        await CreditNote.findOne({
          _id:
            id,

          distributorId,
          firmId,

          isActive:
            true,
        }).session(session);

      if (!oldCreditNote) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message:
            "Credit Note not found.",
        });
      }

      const oldItems =
        normalizeCreditNoteItems(
          oldCreditNote.items || []
        );

      const oldGdCode = String(
        oldCreditNote.GDCode ||
        ""
      ).trim();

      if (!oldGdCode) {
        throw new Error(
          "Old Credit Note does not contain a valid Godown Code."
        );
      }

      /*
      * First reverse stock added by the old Credit Note.
      */
      await applyCreditNoteStockMovement({
        items:
          oldItems,

        distributorId,
        firmId,

        firmName:
          oldCreditNote.firmName ||
          firmName,

        gdCode:
          oldGdCode,

        direction:
          -1,

        session,
      });

      const oldBillSeries =
        String(
          oldCreditNote.BillSeries ||
          oldCreditNote.billSeries ||
          ""
        ).trim();

      const oldBillNo =
        Number(
          oldCreditNote.BillNo ||
          oldCreditNote.billNo ||
          0
        );

      const oldSalesBill =
        await findReferencedSalesBill({
          distributorId,
          firmId,

          billSeries:
            oldBillSeries,

          billNo:
            oldBillNo,

          session,
        });

      /*
      * Restore the original Sales Bill amounts.
      */
      if (oldSalesBill) {
        await adjustSalesBillForCreditNote({
          salesBill:
            oldSalesBill,

          amounts:
            getCreditNoteAmounts(
              oldCreditNote
            ),

          direction:
            -1,

          creditNoteSeries:
            oldCreditNote.CreditNoteSeries,

          creditNoteNo:
            oldCreditNote.CreditNoteNo,

          session,
        });
      }

      const creditNoteSeries =
        String(
          req.body.CreditNoteSeries ||
          req.body.creditNoteSeries ||
          oldCreditNote.CreditNoteSeries ||
          "CN"
        ).trim();

      const creditNoteNo =
        Number(
          req.body.CreditNoteNo ||
          req.body.creditNoteNo ||
          req.body.VNo ||
          oldCreditNote.CreditNoteNo ||
          0
        );

      if (!creditNoteNo) {
        throw new Error(
          "Credit Note Number is required."
        );
      }

      const duplicate =
        await CreditNote.findOne({
          _id: {
            $ne:
              oldCreditNote._id,
          },

          distributorId,
          firmId,

          CreditNoteSeries:
            creditNoteSeries,

          CreditNoteNo:
            creditNoteNo,

          isActive:
            true,
        }).session(session);

      if (duplicate) {
        throw new Error(
          "Another Credit Note already exists with this series and number."
        );
      }

      const newBillSeries =
        String(
          req.body.BillSeries ||
          req.body.billSeries ||
          ""
        ).trim();

      const newBillNo =
        Number(
          req.body.BillNo ||
          req.body.billNo ||
          0
        );

      const newGdCode =
        String(
          req.body.GDCode ||
          req.body.gdCode ||
          ""
        ).trim();

      const newGodown =
        String(
          req.body.Godown ||
          req.body.godown ||
          ""
        ).trim();

      if (!newGdCode) {
        throw new Error(
          "Valid Godown Code is required."
        );
      }

      const newItems =
        normalizeCreditNoteItems(
          req.body.items || []
        );

      if (
        newItems.length === 0
      ) {
        throw new Error(
          "At least one product is required."
        );
      }

      const newAmounts =
        getCreditNoteAmounts(
          req.body
        );

      const newSalesBill =
        await findReferencedSalesBill({
          distributorId,
          firmId,

          billSeries:
            newBillSeries,

          billNo:
            newBillNo,

          session,
        });

      /*
      * The old adjustment has already been reversed.
      * The current Sales Bill NetAmount now represents
      * the available balance before applying the edit.
      */
      if (
        newSalesBill &&
        newAmounts.creditAmount >
        creditNoteNumber(
          newSalesBill.NetAmount
        )
      ) {
        throw new Error(
          `Credit Note amount ₹${newAmounts.creditAmount.toFixed(
            2
          )} exceeds Sales Bill balance ₹${creditNoteNumber(
            newSalesBill.NetAmount
          ).toFixed(2)}.`
        );
      }

      /*
      * Apply edited Credit Note stock.
      */
      await applyCreditNoteStockMovement({
        items:
          newItems,

        distributorId,
        firmId,
        firmName,

        gdCode:
          newGdCode,

        direction:
          1,

        session,
      });

      /*
      * Apply edited Credit Note to the referenced Sales Bill.
      */
      if (newSalesBill) {
        await adjustSalesBillForCreditNote({
          salesBill:
            newSalesBill,

          amounts:
            newAmounts,

          direction:
            1,

          creditNoteSeries,
          creditNoteNo,

          session,
        });
      }

      const totalQty =
        newItems.reduce(
          (total, item) =>
            total +
            creditNoteNumber(
              item.Qty
            ),
          0
        );

      const totalFreeQty =
        newItems.reduce(
          (total, item) =>
            total +
            creditNoteNumber(
              item.Free
            ),
          0
        );

      const updatedCreditNote =
        await CreditNote.findByIdAndUpdate(
          id,
          {
            $set: {
              ...req.body,

              distributorId,
              firmId,
              firmName,

              VNo:
                creditNoteNo,

              CreditNoteSeries:
                creditNoteSeries,

              CreditNoteNo:
                creditNoteNo,

              creditNoteSeries,
              creditNoteNo,

              BillSeries:
                newBillSeries,

              BillNo:
                newBillNo,

              billSeries:
                newBillSeries,

              billNo:
                newBillNo,

              Godown:
                newGodown,

              GDCode:
                newGdCode,

              NetAmount:
                newAmounts.creditAmount,

              amount:
                newAmounts.creditAmount,

              GrossAmount:
                newAmounts.grossAmount,

              TaxableValue:
                newAmounts.taxableValue,

              CGSTAmount:
                newAmounts.cgstAmount,

              SGSTAmount:
                newAmounts.sgstAmount,

              IGSTAmount:
                newAmounts.igstAmount,

              items:
                newItems,

              TotalQty:
                totalQty,

              TotalFreeQty:
                totalFreeQty,

              TotalItems:
                newItems.length,

              UpdatedBy:
                String(
                  req.body.UpdatedBy ||
                  req.body.updatedBy ||
                  ""
                ),

              Status:
                req.body.Status ||
                oldCreditNote.Status ||
                "Approved",

              isActive:
                true,
            },
          },
          {
            new:
              true,

            runValidators:
              true,

            session,
          }
        );

      await session.commitTransaction();

      return res.json({
        success:
          true,

        message:
          newSalesBill
            ? "Credit Note updated, stock corrected and Sales Bill adjusted successfully."
            : "Credit Note updated and stock corrected successfully.",

        data:
          updatedCreditNote,

        salesBillAdjusted:
          Boolean(newSalesBill),
      });
    } catch (error) {
      if (
        session.inTransaction()
      ) {
        await session.abortTransaction();
      }

      console.error(
        "Credit Note update error:",
        error
      );

      return res.status(400).json({
        success:
          false,

        message:
          error.message ||
          "Credit Note update failed.",
      });
    } finally {
      await session.endSession();
    }
  }
);

// Get Credit Notes list
app.get("/api/credit-note", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
      });
    }

    const creditNotes = await CreditNote.find({
      distributorId,
      firmId,
      isActive: true,
    })
      .sort({ vDate: -1, billNo: -1 })
      .lean();

    res.json({
      success: true,
      count: creditNotes.length,
      creditNotes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load credit notes",
      error: error.message,
    });
  }
});
/* =========================================================
  CREDIT NOTE LIST - BACKEND PAGINATION
  ========================================================= */

app.get(
  "/api/credit-note/list",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const search = String(
        req.query.search || ""
      ).trim();

      const fromDate = String(
        req.query.fromDate || ""
      ).trim();

      const toDate = String(
        req.query.toDate || ""
      ).trim();

      const creditNoteSeries = String(
        req.query.creditNoteSeries ||
        req.query.vouSer ||
        ""
      ).trim();

      const partyCode = String(
        req.query.partyCode || ""
      ).trim();

      const partyName = String(
        req.query.partyName || ""
      ).trim();

      const company = String(
        req.query.company || ""
      ).trim();

      const gdCode = String(
        req.query.gdCode || ""
      ).trim();

      const godownName = String(
        req.query.godownName || ""
      ).trim();

      const salesmanCode = String(
        req.query.salesmanCode || ""
      ).trim();

      const salesmanName = String(
        req.query.salesmanName || ""
      ).trim();

      const referenceBillSeries = String(
        req.query.referenceBillSeries || ""
      ).trim();

      const referenceBillNo = String(
        req.query.referenceBillNo || ""
      ).trim();

      const status = String(
        req.query.status || ""
      ).trim();

      const createdBy = String(
        req.query.createdBy || ""
      ).trim();

      const minAmountText = String(
        req.query.minAmount || ""
      ).trim();

      const maxAmountText = String(
        req.query.maxAmount || ""
      ).trim();

      const requestedPage = Number.parseInt(
        req.query.page,
        10
      );

      const requestedLimit = Number.parseInt(
        req.query.limit,
        10
      );

      const page =
        Number.isFinite(requestedPage) &&
          requestedPage > 0
          ? requestedPage
          : 1;

      const limit =
        Number.isFinite(requestedLimit) &&
          requestedLimit > 0
          ? Math.min(requestedLimit, 100)
          : 10;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      const escapeRegex = (value) =>
        String(value || "").replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const containsRegex = (value) =>
        new RegExp(
          escapeRegex(value),
          "i"
        );

      const exactRegex = (value) =>
        new RegExp(
          `^${escapeRegex(value)}$`,
          "i"
        );

      const filter = {
        distributorId,
        firmId,

        isActive: {
          $ne: false,
        },
      };

      /*
      * Use $and so multiple groups of $or
      * conditions do not overwrite one another.
      */
      const andConditions = [];

      /* =========================================
        DATE FILTER
        ========================================= */

      if (fromDate || toDate) {
        const dateFilter = {};

        if (fromDate) {
          dateFilter.$gte =
            fromDate;
        }

        if (toDate) {
          dateFilter.$lte =
            toDate;
        }

        filter.VDate =
          dateFilter;
      }

      /* =========================================
        CREDIT NOTE SERIES
        ========================================= */

      if (creditNoteSeries) {
        filter.CreditNoteSeries =
          exactRegex(
            creditNoteSeries
          );
      }

      /* =========================================
        PARTY FILTERS
        ========================================= */

      if (partyCode) {
        filter.PartyCode =
          exactRegex(
            partyCode
          );
      }

      if (partyName) {
        filter.PartyName =
          containsRegex(
            partyName
          );
      }

      /* =========================================
        COMPANY FILTER
        ========================================= */

      if (company) {
        const companyRegex =
          containsRegex(
            company
          );

        andConditions.push({
          $or: [
            {
              CompanyCode:
                companyRegex,
            },
            {
              CompanyName:
                companyRegex,
            },
            {
              companyCode:
                companyRegex,
            },
            {
              companyName:
                companyRegex,
            },
          ],
        });
      }

      /* =========================================
        GODOWN FILTERS
        ========================================= */

      if (gdCode) {
        filter.GDCode =
          exactRegex(
            gdCode
          );
      }

      if (godownName) {
        filter.Godown =
          containsRegex(
            godownName
          );
      }

      /* =========================================
        SALESMAN FILTERS
        ========================================= */

      if (salesmanCode) {
        filter.SalesmanCode =
          exactRegex(
            salesmanCode
          );
      }

      if (salesmanName) {
        filter.SalesmanName =
          containsRegex(
            salesmanName
          );
      }

      /* =========================================
        ORIGINAL SALES BILL REFERENCE
        ========================================= */

      if (referenceBillSeries) {
        filter.BillSeries =
          exactRegex(
            referenceBillSeries
          );
      }

      if (referenceBillNo) {
        const numericReferenceBillNo =
          Number(
            referenceBillNo
          );

        if (
          Number.isFinite(
            numericReferenceBillNo
          )
        ) {
          filter.BillNo =
            numericReferenceBillNo;
        }
      }

      /* =========================================
        STATUS / CREATED BY
        ========================================= */

      if (status) {
        filter.Status =
          exactRegex(
            status
          );
      }

      if (createdBy) {
        filter.CreatedBy =
          containsRegex(
            createdBy
          );
      }

      /* =========================================
        AMOUNT RANGE
        ========================================= */

      const minAmount =
        Number(minAmountText);

      const maxAmount =
        Number(maxAmountText);

      if (
        (
          minAmountText &&
          Number.isFinite(minAmount)
        ) ||
        (
          maxAmountText &&
          Number.isFinite(maxAmount)
        )
      ) {
        filter.NetAmount = {};

        if (
          minAmountText &&
          Number.isFinite(minAmount)
        ) {
          filter.NetAmount.$gte =
            minAmount;
        }

        if (
          maxAmountText &&
          Number.isFinite(maxAmount)
        ) {
          filter.NetAmount.$lte =
            maxAmount;
        }
      }

      /* =========================================
        GENERAL SEARCH
        ========================================= */

      if (search) {
        const searchRegex =
          containsRegex(search);

        const numericSearch =
          Number(search);

        const searchConditions = [
          {
            CreditNoteSeries:
              searchRegex,
          },
          {
            PartyCode:
              searchRegex,
          },
          {
            PartyName:
              searchRegex,
          },
          {
            BillSeries:
              searchRegex,
          },
          {
            CompanyCode:
              searchRegex,
          },
          {
            CompanyName:
              searchRegex,
          },
          {
            GDCode:
              searchRegex,
          },
          {
            Godown:
              searchRegex,
          },
          {
            SalesmanCode:
              searchRegex,
          },
          {
            SalesmanName:
              searchRegex,
          },
          {
            Status:
              searchRegex,
          },
          {
            CreatedBy:
              searchRegex,
          },
          {
            Narration:
              searchRegex,
          },
        ];

        if (
          Number.isFinite(
            numericSearch
          )
        ) {
          searchConditions.push(
            {
              CreditNoteNo:
                numericSearch,
            },
            {
              VNo:
                numericSearch,
            },
            {
              BillNo:
                numericSearch,
            },
            {
              NetAmount:
                numericSearch,
            }
          );
        }

        andConditions.push({
          $or:
            searchConditions,
        });
      }

      if (
        andConditions.length > 0
      ) {
        filter.$and =
          andConditions;
      }

      const totalRecords =
        await CreditNote.countDocuments(
          filter
        );

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalRecords /
            limit
          )
        );

      const currentPage =
        Math.min(
          page,
          totalPages
        );

      const skip =
        (
          currentPage -
          1
        ) *
        limit;

      const creditNotes =
        await CreditNote.find(
          filter
        )
          .sort({
            VDate: -1,
            CreditNoteNo: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        creditNotes,

        count:
          creditNotes.length,

        pagination: {
          currentPage,

          page:
            currentPage,

          limit,

          totalRecords,

          totalPages,

          hasPreviousPage:
            currentPage > 1,

          hasNextPage:
            currentPage <
            totalPages,

          startRecord:
            totalRecords === 0
              ? 0
              : skip + 1,

          endRecord:
            totalRecords === 0
              ? 0
              : Math.min(
                skip +
                creditNotes.length,
                totalRecords
              ),
        },
      });
    } catch (error) {
      console.error(
        "Credit Note pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Credit Notes",
        error:
          error.message,
      });
    }
  }
);
const damStockSchema = new mongoose.Schema(
  {
    GDCode: String,
    ProdCode: String,
    Batch: { type: String, default: "." },
    MRP: { type: Number, default: 0 },
    PRate: { type: Number, default: 0 },
    SRate: { type: Number, default: 0 },
    Qty: { type: Number, default: 0 },
    BoxPack: { type: Number, default: 1 },
    InBoxPack: { type: Number, default: 1 },
    IsLocked: { type: String, default: "N" },

    distributorId: { type: String, required: true },
    firmId: { type: String, required: true },
    firmName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_DamStock" }
);

damStockSchema.index(
  { distributorId: 1, firmId: 1, GDCode: 1, ProdCode: 1, Batch: 1, MRP: 1 },
  { unique: true }
);

const DamStock = mongoose.model("Mas_DamStock", damStockSchema);

app.put("/api/firms/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;

    const updatedFirm = await Register.findByIdAndUpdate(
      id,
      {
        firmCode: String(req.body.firmCode || "").trim(),
        firmName: String(req.body.firmName || "").trim(),
        address1: req.body.address1 || "",
        address2: req.body.address2 || "",
        city: req.body.city || "",
        pinCode: req.body.pinCode || "",
        state: req.body.state || "",
        country: req.body.country || "India",
        phoneNo: req.body.phoneNo || "",
        mobileNo: req.body.mobileNo || "",
        tinNo: req.body.tinNo || "",
        regNo: req.body.regNo || "",
        gstNo: req.body.gstNo || "",
        drugLicNo: req.body.drugLicNo || "",
        foodLicenceNo: req.body.foodLicenceNo || "",
        apiKey: req.body.apiKey || "",
      },
      { new: true }
    ).select("-password");

    if (!updatedFirm) {
      return res.status(404).json({
        success: false,
        message: "Firm not found",
      });
    }

    res.json({
      success: true,
      message: "Firm updated successfully",
      data: updatedFirm,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Firm update failed",
      error: error.message,
    });
  }
});

// ---------- FIRM ----------
app.delete("/api/firms/:id", ensureConnection, async (req, res) => {
  try {
    const deletedFirm = await Register.findByIdAndDelete(req.params.id);

    if (!deletedFirm) {
      return res.status(404).json({ success: false, message: "Firm not found" });
    }

    res.json({ success: true, message: "Firm deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Firm delete failed",
      error: error.message
    });
  }
});
// ==================== MASTER FORMS EDIT & DELETE ENDPOINTS ====================

// ---------- GROUP MASTER ----------
app.put("/api/groups/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Group Code and Name are required"
      });
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      {
        groupCode: code.trim(),
        groupName: name.trim(),
      },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    res.json({
      success: true,
      message: "Group updated successfully",
      data: updatedGroup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Group update failed",
      error: error.message
    });
  }
});

// ---------- GROUP MASTER ----------
app.delete("/api/groups/:id", ensureConnection, async (req, res) => {
  try {
    const deletedGroup = await Group.findByIdAndDelete(req.params.id);

    if (!deletedGroup) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    res.json({ success: true, message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Group delete failed",
      error: error.message
    });
  }
});

// ---------- CATEGORY MASTER ----------
app.put("/api/categories/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Category Code and Name are required"
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      {
        categoryCode: code.trim(),
        categoryName: name.trim(),
      },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Category update failed",
      error: error.message
    });
  }
});

// ---------- CATEGORY MASTER ----------
app.delete("/api/categories/:id", ensureConnection, async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);

    if (!deletedCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Category delete failed",
      error: error.message
    });
  }
});

// ---------- PRODUCT ----------
app.put("/api/products/:id", ensureConnection, async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      productCode: String(req.body.code || req.body.productCode || "").trim(),
      productName: String(req.body.name || req.body.productName || "").trim(),
      hsn: String(req.body.hsn || "").trim(),
    };

    delete updateData._id;
    delete updateData.distributorId;
    delete updateData.firmId;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Product update failed",
      error: error.message,
    });
  }
});

// ---------- PRODUCT ----------
app.delete("/api/products/:id", ensureConnection, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Product delete failed",
      error: error.message
    });
  }
});

// ---------- ACCOUNT ----------
app.put("/api/accounts/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const distributorId = String(req.body.distributorId || "").trim();
    const firmId = String(req.body.firmId || "").trim();

    let townValue = req.body.town || "Pune";
    const areaCodeValue = req.body.areaCode || "";

    if (areaCodeValue) {
      const area = await Area.findOne({
        distributorId,
        firmId,
        areaCode: areaCodeValue,
        isActive: true,
      });

      if (area) {
        townValue = area.areaName;
      }
    }

    // 🔥 FIX: Properly handle blackListed value
    const blackListedValue = String(req.body.blackListed || "NO").trim().toUpperCase();
    const normalizedBlackListed = blackListedValue === "YES" || blackListedValue === "Y" || blackListedValue === "TRUE" || blackListedValue === "1" ? "YES" : "NO";

    console.log("📝 Updating account with blackListed:", normalizedBlackListed);

    const updateData = {
      accountCode: String(req.body.accountCode || "").trim(),
      accountName: String(req.body.accountName || "").trim(),
      openingDate: req.body.openingDate || "",
      address: req.body.address || "",
      town: townValue,
      state: req.body.state || "MAHARASHTRA",
      pinCode: req.body.pinCode || "",
      phoneNo: req.body.phoneNo || "",
      mobileNo: req.body.mobileNo || "",
      emailId: req.body.emailId || "",
      tinNo: req.body.tinNo || "",
      openingBal: Number(req.body.openingBal || 0),
      openingBalType: req.body.openingBalType || "Dr",
      contactPerson: req.body.contactPerson || "",
      invType: req.body.invType || "TAXABLE",
      taxOn: req.body.taxOn || "SRATE",
      panNo: req.body.panNo || "",
      foodLicense: req.body.foodLicense || "",
      gstNo: req.body.gstNo || "",
      billToAdd1: req.body.billToAdd1 || "",
      tanNo: req.body.tanNo || "",
      gstType: req.body.gstType || "Unregistered",
      gstDate: req.body.gstDate || "",
      gstClsDate: req.body.gstClsDate || "",
      add2: req.body.add2 || "",
      tcsPercent: Number(req.body.tcsPercent || 0),
      allowInPurchase: req.body.allowInPurchase || "N",
      drugLicNo: req.body.drugLicNo || "",
      drugExpDate: req.body.drugExpDate || "",
      // 🔥 FIX: Properly handle credit fields
      creditDays: Number(req.body.creditDays || 0),
      creditBills: Number(req.body.creditBills || 0),
      lockDays: Number(req.body.lockDays || 0),
      creditAmt: Number(req.body.creditAmt || 0),
      blackListed: normalizedBlackListed,
      areaCode: areaCodeValue || "",
    };

    console.log("📝 Final update data:", {
      blackListed: updateData.blackListed,
      creditDays: updateData.creditDays,
      creditBills: updateData.creditBills,
      lockDays: updateData.lockDays,
      creditAmt: updateData.creditAmt
    });

    const updatedAccount = await Account.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedAccount) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    res.json({
      success: true,
      message: "Account updated successfully",
      data: updatedAccount
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Account code already exists for this firm"
      });
    }
    res.status(500).json({
      success: false,
      message: "Account update failed",
      error: error.message
    });
  }
});
// ==================== GET AREAS FOR DROPDOWN ====================
app.get("/api/areas-for-account", ensureConnection, async (req, res) => {
  try {
    const { distributorId, firmId } = req.query;

    console.log("📡 /api/areas-for-account called with:", { distributorId, firmId });

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required",
        received: { distributorId, firmId }
      });
    }

    const areas = await Area.find({
      distributorId,
      firmId,
      isActive: true,
    }).select('areaCode areaName').sort({ areaName: 1 });

    console.log(`✅ Found ${areas.length} areas for firm ${firmId}`);

    // Return consistent response format
    res.json({
      success: true,
      areas: areas.map(area => ({
        value: area.areaCode,
        label: area.areaName
      }))
    });
  } catch (error) {
    console.error("❌ Areas fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch areas",
      error: error.message,
    });
  }
});
// ---------- ACCOUNT ----------
app.delete("/api/accounts/:id", ensureConnection, async (req, res) => {
  try {
    const deletedAccount = await Account.findByIdAndDelete(req.params.id);

    if (!deletedAccount) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Account delete failed",
      error: error.message
    });
  }
});

// ---------- OTHER ACCOUNT ----------
app.put("/api/other-accounts/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData._id;
    delete updateData.distributorId;
    delete updateData.firmId;

    const updatedOtherAccount = await OtherAccount.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedOtherAccount) {
      return res.status(404).json({ success: false, message: "Other Account not found" });
    }

    res.json({
      success: true,
      message: "Other Account updated successfully",
      data: updatedOtherAccount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Other Account update failed",
      error: error.message
    });
  }
});

// ---------- OTHER ACCOUNT ----------
app.delete("/api/other-accounts/:id", ensureConnection, async (req, res) => {
  try {
    const deletedOtherAccount = await OtherAccount.findByIdAndDelete(req.params.id);

    if (!deletedOtherAccount) {
      return res.status(404).json({ success: false, message: "Other Account not found" });
    }

    res.json({ success: true, message: "Other Account deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Other Account delete failed",
      error: error.message
    });
  }
});

// ---------- GST MASTER ----------
app.put("/api/gst/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { gstCode, vatPercent, purchaseType, salesType } = req.body;

    if (!gstCode || vatPercent === undefined || vatPercent === null) {
      return res.status(400).json({
        success: false,
        message: "GST Code and VAT Percent are required"
      });
    }

    const updatedGst = await GST.findByIdAndUpdate(
      id,
      {
        gstCode: gstCode.trim(),
        vatPercent: Number(vatPercent),
        purchaseType: purchaseType || "VAT ON PURCHASE PRICE",
        salesType: salesType || "VAT ON SALES PRICE",
      },
      { new: true }
    );

    if (!updatedGst) {
      return res.status(404).json({ success: false, message: "GST not found" });
    }

    res.json({
      success: true,
      message: "GST updated successfully",
      data: updatedGst
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This GST Code already exists for this firm"
      });
    }
    res.status(500).json({
      success: false,
      message: "GST update failed",
      error: error.message
    });
  }
});

// ---------- GST MASTER ----------
app.delete("/api/gst/:id", ensureConnection, async (req, res) => {
  try {
    const deletedGst = await GST.findByIdAndDelete(req.params.id);

    if (!deletedGst) {
      return res.status(404).json({ success: false, message: "GST not found" });
    }

    res.json({ success: true, message: "GST deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "GST delete failed",
      error: error.message
    });
  }
});

// ---------- SALESMAN ----------
app.put("/api/salesmen/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData._id;
    delete updateData.distributorId;
    delete updateData.firmId;

    const updatedSalesman = await Salesman.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedSalesman) {
      return res.status(404).json({ success: false, message: "Salesman not found" });
    }

    res.json({
      success: true,
      message: "Salesman updated successfully",
      data: updatedSalesman
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Salesman Code already exists for this firm"
      });
    }
    res.status(500).json({
      success: false,
      message: "Salesman update failed",
      error: error.message
    });
  }
});

// ---------- SALESMAN ----------
app.delete("/api/salesmen/:id", ensureConnection, async (req, res) => {
  try {
    const deletedSalesman = await Salesman.findByIdAndDelete(req.params.id);

    if (!deletedSalesman) {
      return res.status(404).json({ success: false, message: "Salesman not found" });
    }

    res.json({ success: true, message: "Salesman deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Salesman delete failed",
      error: error.message
    });
  }
});

// ---------- AREA ----------
app.put("/api/areas/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { areaCode, areaName } = req.body;

    if (!areaCode || !areaName) {
      return res.status(400).json({
        success: false,
        message: "Area Code and Area Name are required"
      });
    }

    const updatedArea = await Area.findByIdAndUpdate(
      id,
      {
        areaCode: areaCode.trim(),
        areaName: areaName.trim(),
      },
      { new: true }
    );

    if (!updatedArea) {
      return res.status(404).json({ success: false, message: "Area not found" });
    }

    res.json({
      success: true,
      message: "Area updated successfully",
      data: updatedArea
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Area Code already exists for this firm"
      });
    }
    res.status(500).json({
      success: false,
      message: "Area update failed",
      error: error.message
    });
  }
});

// ---------- AREA ----------
app.delete("/api/areas/:id", ensureConnection, async (req, res) => {
  try {
    const deletedArea = await Area.findByIdAndDelete(req.params.id);

    if (!deletedArea) {
      return res.status(404).json({ success: false, message: "Area not found" });
    }

    res.json({ success: true, message: "Area deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Area delete failed",
      error: error.message
    });
  }
});

// ---------- GODOWN MASTER ----------
app.put("/api/godowns/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { godownCode, godownName, address, location } = req.body;

    if (!godownCode || !godownName) {
      return res.status(400).json({
        success: false,
        message: "Godown Code and Godown Name are required"
      });
    }

    const updatedGodown = await Godown.findByIdAndUpdate(
      id,
      {
        godownCode: godownCode.trim(),
        godownName: godownName.trim(),
        address: address || "",
        location: location || "",
      },
      { new: true }
    );

    if (!updatedGodown) {
      return res.status(404).json({ success: false, message: "Godown not found" });
    }

    res.json({
      success: true,
      message: "Godown updated successfully",
      data: updatedGodown
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Godown Code already exists for this firm"
      });
    }
    res.status(500).json({
      success: false,
      message: "Godown update failed",
      error: error.message
    });
  }
});
// ---------- GODOWN MASTER ----------
app.delete("/api/godowns/:id", ensureConnection, async (req, res) => {
  try {
    const deletedGodown = await Godown.findByIdAndDelete(req.params.id);

    if (!deletedGodown) {
      return res.status(404).json({ success: false, message: "Godown not found" });
    }

    res.json({ success: true, message: "Godown deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Godown delete failed",
      error: error.message
    });
  }
});

app.put("/api/customer-banks/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = {
      bankCode: String(req.body.bankCode || "").trim(),
      bankName: String(req.body.bankName || "").trim(),
      accountNumber: req.body.accountNumber || "",
      ifscCode: req.body.ifscCode || "",
      branchName: req.body.branchName || "",
      accountType: req.body.accountType || "Savings",
      clearingType: String(req.body.clearingType || "LOCAL").trim(), // ✅ FIX

      customerName: req.body.customerName || "",
      customerCode: req.body.customerCode || "",
      mobileNo: req.body.mobileNo || "",
      emailId: req.body.emailId || "",
      upiId: req.body.upiId || "",
      swiftCode: req.body.swiftCode || "",
      micrCode: req.body.micrCode || "",
      panNumber: req.body.panNumber || "",
      beneficiaryName: req.body.beneficiaryName || "",
      remarks: req.body.remarks || "",
    };

    const updatedBank = await CustomerBank.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedBank) {
      return res.status(404).json({
        success: false,
        message: "Customer Bank not found",
      });
    }

    res.json({
      success: true,
      message: "Customer Bank updated successfully",
      data: updatedBank,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Customer Bank update failed",
      error: error.message,
    });
  }
});

// ---------- CUSTOMER BANK MASTER ----------
app.delete("/api/customer-banks/:id", ensureConnection, async (req, res) => {
  try {
    const deletedBank = await CustomerBank.findByIdAndDelete(req.params.id);

    if (!deletedBank) {
      return res.status(404).json({ success: false, message: "Customer Bank not found" });
    }

    res.json({ success: true, message: "Customer Bank deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Customer Bank delete failed",
      error: error.message
    });
  }
});
// ==================== PRODUCT MAPPING API ENDPOINTS (FULLY FIXED) ====================
const productMappingSchema = new mongoose.Schema({

  distributorId: String,
  firmId: String,
  firmName: String,

  sourceProductCode: String,
  sourceProductName: String,

  mappings: [
    {
      companyProdCode: String,
      companyProdName: String,
      seqNo: Number
    }
  ],

  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true,
  collection: "Mas_ProductMapping"
});

// ---------- POST/Create Product Mapping ----------
app.post('/api/product-mappings', ensureConnection, async (req, res) => {
  try {
    const { sourceProductId, sourceProductCode, mappedProductIds, distributorId, firmId } = req.body;

    console.log('POST /api/product-mappings - body:', { sourceProductId, sourceProductCode, mappedProductIds, distributorId, firmId });

    // FIXED: Proper validation
    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: 'distributorId and firmId are required'
      });
    }

    if (!sourceProductId || !mappedProductIds || !mappedProductIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Source product and at least one mapped product are required'
      });
    }

    // Check if mapping already exists
    let existingMapping = await ProductMapping.findOne({
      sourceProductId,
      distributorId,
      firmId,
      isActive: true
    });

    if (existingMapping) {
      // Update existing mapping
      existingMapping.mappedProductIds = mappedProductIds;
      existingMapping.sourceProductCode = sourceProductCode || existingMapping.sourceProductCode;
      await existingMapping.save();

      res.json({
        success: true,
        message: 'Product mapping updated successfully'
      });
    } else {
      // Create new mapping
      await ProductMapping.create({
        sourceProductId,
        sourceProductCode,
        mappedProductIds,
        distributorId,
        firmId
      });

      res.json({
        success: true,
        message: 'Product mapping saved successfully'
      });
    }
  } catch (error) {
    console.error('Product mapping save error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A mapping already exists for this product'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Product mapping save failed',
      error: error.message
    });
  }
});

// ---------- GET Product Mappings (LIST) ----------
app.get('/api/product-mappings', ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.query.distributorId || '').trim();
    const firmId = String(req.query.firmId || '').trim();

    console.log('GET /api/product-mappings - distributorId:', distributorId, 'firmId:', firmId);

    // FIXED: Proper validation for distributorId and firmId
    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: 'distributorId and firmId are required'
      });
    }

    const filter = {
      distributorId,
      firmId,
      isActive: true
    };

    // Optional productId filter
    const productId = req.query.productId;
    if (productId) {
      filter.$or = [
        { sourceProductId: productId },
        { mappedProductIds: productId }
      ];
    }

    const mappings = await ProductMapping.find(filter)
      .populate('sourceProductId', 'productCode productName')
      .populate('mappedProductIds', 'productCode productName')
      .lean();

    console.log('Found mappings:', mappings.length);

    res.json({
      success: true,
      mappings
    });
  } catch (error) {
    console.error('Product mappings fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load product mappings',
      error: error.message
    });
  }
});
// ---------- GET Single Product Mapping by ID ----------
app.get('/api/product-mappings/:productId', ensureConnection, async (req, res) => {
  try {
    const { productId } = req.params;
    const distributorId = String(req.query.distributorId || '').trim();
    const firmId = String(req.query.firmId || '').trim();

    console.log('GET /api/product-mappings/:productId - productId:', productId, 'distributorId:', distributorId, 'firmId:', firmId);

    // FIXED: Proper validation for distributorId and firmId
    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: 'distributorId and firmId are required'
      });
    }

    const mapping = await ProductMapping.findOne({
      sourceProductId: productId,
      distributorId,
      firmId,
      isActive: true
    })
      .populate('sourceProductId', 'productCode productName')
      .populate('mappedProductIds', 'productCode productName')
      .lean();

    res.json({
      success: true,
      mapping: mapping || null
    });
  } catch (error) {
    console.error('Product mapping fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load product mapping',
      error: error.message
    });
  }
});

// ---------- DELETE Product Mapping ----------
app.delete('/api/product-mappings/:id', ensureConnection, async (req, res) => {
  try {
    const distributorId = String(req.body.distributorId || req.query.distributorId || '').trim();
    const firmId = String(req.body.firmId || req.query.firmId || '').trim();

    console.log('DELETE /api/product-mappings/:id - id:', req.params.id, 'distributorId:', distributorId, 'firmId:', firmId);

    // FIXED: Proper validation
    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: 'distributorId and firmId are required'
      });
    }

    const mapping = await ProductMapping.findOneAndUpdate(
      {
        _id: req.params.id,
        distributorId,
        firmId,
        isActive: true
      },
      { isActive: false },
      { new: true }
    );

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Product mapping not found'
      });
    }

    res.json({
      success: true,
      message: 'Product mapping deleted successfully'
    });
  } catch (error) {
    console.error('Product mapping delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Product mapping delete failed',
      error: error.message
    });
  }
});
app.post("/api/product-mappings", ensureConnection, async (req, res) => {
  try {

    const {
      distributorId,
      firmId,
      firmName,
      sourceProductCode,
      sourceProductName,
      mappings
    } = req.body;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "Distributor/Firm missing."
      });
    }

    if (!sourceProductCode) {
      return res.status(400).json({
        success: false,
        message: "Source Product is required."
      });
    }

    const validMappings = (mappings || []).filter(x =>
      String(x.companyProdCode || "").trim() ||
      String(x.companyProdName || "").trim()
    );

    if (!validMappings.length) {
      return res.status(400).json({
        success: false,
        message: "Please enter at least one mapped product."
      });
    }

    let existing = await ProductMapping.findOne({
      distributorId,
      firmId,
      sourceProductCode,
      isActive: true
    });

    if (existing) {

      existing.sourceProductName = sourceProductName;
      existing.mappings = validMappings;
      existing.firmName = firmName;

      await existing.save();

      return res.json({
        success: true,
        message: "Product Mapping Updated"
      });
    }

    await ProductMapping.create({

      distributorId,
      firmId,
      firmName,

      sourceProductCode,
      sourceProductName,

      mappings: validMappings,

      isActive: true
    });

    res.json({
      success: true,
      message: "Product Mapping Saved"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});

app.get("/api/product-mappings/:productCode", async (req, res) => {
  try {
    const { productCode } = req.params;
    const { distributorId, firmId } = req.query;

    const mapping = await db.collection("Mas_ProductMapping").findOne({
      distributorId,
      firmId,
      sourceProductCode: productCode,
    });

    res.json({ success: true, mapping });
  } catch (err) {
    console.error("Product mapping load error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// ---------- PERMANENT DELETE SALES BILL ----------
app.delete("/api/sales/:id", ensureConnection, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { distributorId, firmId } = req.body;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required"
      });
    }

    // Find the sales bill first
    const salesBill = await SalesHeader.findOne({
      _id: id,
      distributorId,
      firmId,
      isActive: true
    }).session(session);

    if (!salesBill) {
      return res.status(404).json({
        success: false,
        message: "Sales bill not found"
      });
    }

    // Check if bill is already loaded
    if (salesBill.IsLoaded === true) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete bill that is already loaded. Please remove from load first."
      });
    }

    // Check if bill has receipts
    const hasReceipts = await Receipt.findOne({
      distributorId,
      firmId,
      billSeries: salesBill.BillSeries,
      billNo: salesBill.BillNo
    }).session(session);

    if (hasReceipts) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete bill ${salesBill.BillSeries}-${salesBill.BillNo}. Receipt(s) exist for this bill. Please delete receipts first.`
      });
    }

    // Restore stock for each item
    for (const item of salesBill.items || []) {
      const prodCode = String(item.productCode || item.productId || "").trim();
      const batchNo = String(item.batchNo || item.selectedBatch?.batchNo || ".").trim() || ".";
      const mrp = Number(item.mrp || 0);
      const qty = Number(item.qty || item.quantity || 0) + Number(item.free || 0);

      if (prodCode && qty > 0) {
        await Stock.updateOne(
          {
            distributorId,
            firmId,
            GDCode: salesBill.GDCode,
            ProdCode: prodCode,
            Batch: batchNo,
            MRP: mrp,
          },
          { $inc: { Qty: qty } }
        ).session(session);
      }
    }

    // PERMANENTLY DELETE the bill from collection
    const deleted = await SalesHeader.findByIdAndDelete(id).session(session);

    // Also delete any associated receipts
    await Receipt.deleteMany({
      distributorId,
      firmId,
      billSeries: salesBill.BillSeries,
      billNo: salesBill.BillNo
    }).session(session);

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Sales bill ${salesBill.BillSeries}-${salesBill.BillNo} permanently deleted from database`,
      data: deleted
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete sales bill error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Sales bill delete failed"
    });
  } finally {
    session.endSession();
  }
});
/* =========================================================
  GET ONE QUOTATION FOR EDIT
  ========================================================= */

app.get(
  "/api/quotation/:id",
  ensureConnection,
  async (req, res) => {
    try {
      const quotationId = String(
        req.params.id || ""
      ).trim();

      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      if (
        !quotationId ||
        !mongoose.Types.ObjectId.isValid(
          quotationId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid quotation ID",
        });
      }

      /*
      * IMPORTANT:
      * Your actual model is QuotationHeader,
      * not Quotation.
      */
      const quotation =
        await QuotationHeader.findOne({
          _id: quotationId,
          distributorId,
          firmId,
          isActive: true,
        }).lean();

      if (!quotation) {
        return res.status(404).json({
          success: false,
          message:
            "Quotation not found for this firm",
        });
      }

      return res.json({
        success: true,
        quotation,
      });
    } catch (error) {
      console.error(
        "GET QUOTATION FOR EDIT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to load quotation",
      });
    }
  }
);

/* =========================================================
  UPDATE QUOTATION
  ========================================================= */

app.put(
  "/api/quotation/:id",
  ensureConnection,
  async (req, res) => {
    try {
      const quotationId = String(
        req.params.id || ""
      ).trim();

      const {
        distributorId,
        firmId,
        firmName = "",

        BillDate = "",
        Godown = "",
        GDCode = "",

        CompanyCode = "",
        CompanyName = "",

        AreaCode = "",
        AreaName = "",

        PartyCode = "",
        PartyName = "",

        BillSeries = "",
        BillNo,
        BillType = "Credit",
        DueDate = "",

        SalesmanCode = "",
        SalesmanName = "",
        Narration = "",

        items = [],
      } = req.body;

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "Distributor/Firm not found",
        });
      }

      if (
        !quotationId ||
        !mongoose.Types.ObjectId.isValid(
          quotationId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid quotation ID",
        });
      }

      if (!Number(BillNo)) {
        return res.status(400).json({
          success: false,
          message:
            "Quotation Bill No is required",
        });
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one product is required",
        });
      }

      const existingQuotation =
        await QuotationHeader.findOne({
          _id: quotationId,
          distributorId:
            String(distributorId).trim(),
          firmId:
            String(firmId).trim(),
          isActive: true,
        });

      if (!existingQuotation) {
        return res.status(404).json({
          success: false,
          message:
            "Quotation not found",
        });
      }

      /*
      * Prevent another quotation from using
      * the same Series + Bill No.
      */
      const duplicateQuotation =
        await QuotationHeader.findOne({
          _id: {
            $ne: quotationId,
          },

          distributorId:
            String(distributorId).trim(),

          firmId:
            String(firmId).trim(),

          BillSeries:
            String(
              BillSeries || ""
            ).trim(),

          BillNo:
            Number(BillNo),

          isActive: true,
        });

      if (duplicateQuotation) {
        return res.status(409).json({
          success: false,
          message:
            `Quotation ${BillSeries}-${BillNo} already exists`,
        });
      }

      const normalizedItems =
        items.map(
          (item, index) => {
            const combinedProduct =
              String(
                item.product || ""
              ).trim();

            const separatedProduct =
              combinedProduct.split(
                " - "
              );

            const productCode =
              String(
                item.productCode ||
                item.productId ||
                item.code ||
                separatedProduct[0] ||
                ""
              ).trim();

            const productName =
              String(
                item.productName ||
                item.name ||
                separatedProduct
                  .slice(1)
                  .join(" - ") ||
                ""
              ).trim();

            return {
              ...item,

              sr:
                Number(
                  item.sr ||
                  index + 1
                ),

              product:
                combinedProduct ||
                (
                  productCode ||
                    productName
                    ? `${productCode}${productCode &&
                      productName
                      ? " - "
                      : ""
                    }${productName}`
                    : ""
                ),

              productCode,
              productId:
                productCode,
              productName,

              batchNo:
                String(
                  item.batchNo ||
                  item.batch ||
                  item.selectedBatch
                    ?.batchNo ||
                  "."
                ).trim(),

              units:
                item.units ||
                item.unit ||
                "PCS",

              qty:
                Number(
                  item.qty ||
                  item.quantity ||
                  0
                ),

              quantity:
                Number(
                  item.qty ||
                  item.quantity ||
                  0
                ),

              free:
                Number(
                  item.free || 0
                ),

              mrp:
                Number(
                  item.mrp || 0
                ),

              rate:
                Number(
                  item.rate || 0
                ),

              rateGst:
                Number(
                  item.rateGst || 0
                ),

              tprAmt:
                Number(
                  item.tprAmt || 0
                ),

              schemePct:
                Number(
                  item.schemePct || 0
                ),

              schemeAmt:
                Number(
                  item.schemeAmt || 0
                ),

              cdPct:
                Number(
                  item.cdPct || 0
                ),

              cdAmt:
                Number(
                  item.cdAmt || 0
                ),

              starPct:
                Number(
                  item.starPct || 0
                ),

              starAmt:
                Number(
                  item.starAmt || 0
                ),

              taxable:
                Number(
                  item.taxable || 0
                ),

              gst:
                Number(
                  item.gst || 0
                ),

              sgst:
                Number(
                  item.sgst || 0
                ),

              cgst:
                Number(
                  item.cgst || 0
                ),

              igst:
                Number(
                  item.igst || 0
                ),

              amount:
                Number(
                  item.amount || 0
                ),
            };
          }
        );

      const updateData = {
        firmName:
          String(
            firmName || ""
          ).trim(),

        BillDate,
        Godown,
        GDCode,

        CompanyCode:
          String(
            CompanyCode || ""
          ).trim(),

        CompanyName:
          String(
            CompanyName || ""
          ).trim(),

        AreaCode:
          String(
            AreaCode || ""
          ).trim(),

        AreaName:
          String(
            AreaName || ""
          ).trim(),

        PartyCode:
          String(
            PartyCode || ""
          ).trim(),

        PartyName:
          String(
            PartyName || ""
          ).trim(),

        BillSeries:
          String(
            BillSeries || ""
          ).trim(),

        BillNo:
          Number(BillNo),

        BillType:
          BillType || "Credit",

        DueDate,

        SalesmanCode:
          String(
            SalesmanCode || ""
          ).trim(),

        SalesmanName:
          String(
            SalesmanName || ""
          ).trim(),

        Narration:
          String(
            Narration || ""
          ).trim(),

        GrossAmount:
          Number(
            req.body.GrossAmount || 0
          ),

        TPRAmount:
          Number(
            req.body.TPRAmount || 0
          ),

        SchemeAmount:
          Number(
            req.body.SchemeAmount || 0
          ),

        StarDiscountAmount:
          Number(
            req.body
              .StarDiscountAmount ||
            0
          ),

        CashDiscountAmount:
          Number(
            req.body
              .CashDiscountAmount ||
            0
          ),

        DisplayAmount:
          Number(
            req.body.DisplayAmount || 0
          ),

        CouponAmount:
          Number(
            req.body.CouponAmount || 0
          ),

        AddLessAmount:
          Number(
            req.body.AddLessAmount || 0
          ),

        TaxableValue:
          Number(
            req.body.TaxableValue || 0
          ),

        SGSTAmount:
          Number(
            req.body.SGSTAmount || 0
          ),

        CGSTAmount:
          Number(
            req.body.CGSTAmount || 0
          ),

        IGSTAmount:
          Number(
            req.body.IGSTAmount || 0
          ),

        OriginalNetAmount:
          Number(
            req.body
              .OriginalNetAmount ??
            req.body.NetAmount ??
            0
          ),

        NetAmount:
          Number(
            req.body.NetAmount || 0
          ),

        TotalQty:
          Number(
            req.body.TotalQty ||
            normalizedItems.reduce(
              (
                total,
                item
              ) =>
                total +
                Number(
                  item.qty || 0
                ),
              0
            )
          ),

        TotalFreeQty:
          Number(
            req.body.TotalFreeQty ||
            normalizedItems.reduce(
              (
                total,
                item
              ) =>
                total +
                Number(
                  item.free || 0
                ),
              0
            )
          ),

        TotalItems:
          normalizedItems.length,

        items:
          normalizedItems,

        isActive: true,
      };

      const updatedQuotation =
        await QuotationHeader.findOneAndUpdate(
          {
            _id: quotationId,
            distributorId:
              String(
                distributorId
              ).trim(),
            firmId:
              String(
                firmId
              ).trim(),
          },
          {
            $set: updateData,
          },
          {
            new: true,
            runValidators: true,
          }
        ).lean();

      if (!updatedQuotation) {
        return res.status(404).json({
          success: false,
          message:
            "Quotation not found during update",
        });
      }

      return res.json({
        success: true,
        message:
          "Quotation updated successfully",

        quotation:
          updatedQuotation,

        data: {
          header:
            updatedQuotation,
        },
      });
    } catch (error) {
      console.error(
        "UPDATE QUOTATION ERROR:",
        error
      );

      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "Quotation Series and Bill No already exist",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Quotation update failed",
      });
    }
  }
);
// ---------- PERMANENT DELETE QUOTATION ----------
app.delete("/api/quotation/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId, firmId } = req.body;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required"
      });
    }

    const quotation = await QuotationHeader.findOne({
      _id: id,
      distributorId,
      firmId,
      isActive: true
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    // PERMANENTLY DELETE the quotation
    await QuotationHeader.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Quotation ${quotation.BillSeries}-${quotation.BillNo} permanently deleted from database`
    });
  } catch (error) {
    console.error("Delete quotation error:", error);
    res.status(500).json({
      success: false,
      message: "Quotation delete failed",
      error: error.message
    });
  }
});
// ---------- PERMANENT DELETE PURCHASE ----------
app.delete("/api/purchase/:id", ensureConnection, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { distributorId, firmId } = req.body;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required"
      });
    }

    const purchase = await PurchaseHeader.findOne({
      _id: id,
      distributorId,
      firmId,
      isActive: true
    }).session(session);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase bill not found"
      });
    }

    // Restore stock for each item (remove the added stock)
    for (const item of purchase.items || []) {
      const prodCode = String(item.productCode || item.productId || "").trim();
      const batchNo = String(item.batchNo || item.selectedBatch?.batchNo || ".").trim() || ".";
      const qty = Number(item.quantity || 0) + Number(item.free || 0);

      if (prodCode && qty > 0) {
        await Stock.updateOne(
          {
            distributorId,
            firmId,
            GDCode: purchase.gdCode,
            ProdCode: prodCode,
            Batch: batchNo,
          },
          { $inc: { Qty: -qty } }
        ).session(session);
      }
    }

    // PERMANENTLY DELETE the purchase bill
    await PurchaseHeader.findByIdAndDelete(id).session(session);

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Purchase bill ${purchase.vouSer}-${purchase.vouNo} permanently deleted from database`
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete purchase error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Purchase bill delete failed"
    });
  } finally {
    session.endSession();
  }
});
// ---------- PERMANENT DELETE CREDIT NOTE ----------
// =========================================================
// PERMANENT DELETE CREDIT NOTE
//
// 1. Reverse Credit Note stock
// 2. Restore Sales Bill totals
// 3. Delete Credit Note
// =========================================================

app.delete(
  "/api/credit-note/:id",
  ensureConnection,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const id = String(
        req.params.id || ""
      ).trim();

      const distributorId =
        String(
          req.body.distributorId ||
          req.query.distributorId ||
          ""
        ).trim();

      const firmId =
        String(
          req.body.firmId ||
          req.query.firmId ||
          ""
        ).trim();

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        throw new Error(
          "Invalid Credit Note ID."
        );
      }

      if (
        !distributorId ||
        !firmId
      ) {
        throw new Error(
          "distributorId and firmId are required."
        );
      }

      const creditNote =
        await CreditNote.findOne({
          _id:
            id,

          distributorId,
          firmId,

          isActive:
            true,
        }).session(session);

      if (!creditNote) {
        await session.abortTransaction();

        return res.status(404).json({
          success:
            false,

          message:
            "Credit Note not found.",
        });
      }

      const gdCode = String(
        creditNote.GDCode ||
        ""
      ).trim();

      if (!gdCode) {
        throw new Error(
          "Credit Note does not contain a valid Godown Code."
        );
      }

      const items =
        normalizeCreditNoteItems(
          creditNote.items || []
        );

      /*
      * Reverse stock added by Credit Note.
      *
      * GDR -> subtract from MAS_STOCK
      * DGR -> subtract from MAS_DAMSTOCK
      */
      await applyCreditNoteStockMovement({
        items,

        distributorId,
        firmId,

        firmName:
          creditNote.firmName ||
          "",

        gdCode,

        direction:
          -1,

        session,
      });

      const billSeries =
        String(
          creditNote.BillSeries ||
          creditNote.billSeries ||
          ""
        ).trim();

      const billNo =
        Number(
          creditNote.BillNo ||
          creditNote.billNo ||
          0
        );

      const salesBill =
        await findReferencedSalesBill({
          distributorId,
          firmId,

          billSeries,
          billNo,

          session,
        });

      /*
      * Restore Sales Bill only when the Credit Note
      * was linked to a saved Sales Bill.
      */
      if (salesBill) {
        await adjustSalesBillForCreditNote({
          salesBill,

          amounts:
            getCreditNoteAmounts(
              creditNote
            ),

          direction:
            -1,

          creditNoteSeries:
            creditNote.CreditNoteSeries,

          creditNoteNo:
            creditNote.CreditNoteNo,

          session,
        });
      }

      await CreditNote.findByIdAndDelete(
        id,
        {
          session,
        }
      );

      /*
      * Update adjustment marker after deleting.
      */
      if (salesBill) {
        const remainingCreditNote =
          await CreditNote.findOne({
            distributorId,
            firmId,

            BillSeries:
              billSeries,

            BillNo:
              billNo,

            isActive:
              true,
          })
            .sort({
              createdAt:
                -1,
            })
            .session(session);

        await SalesHeader.updateOne(
          {
            _id:
              salesBill._id,
          },
          {
            $set: {
              CreditNoteAdjusted:
                Boolean(
                  remainingCreditNote
                ),

              LastCreditNoteSeries:
                remainingCreditNote
                  ?.CreditNoteSeries ||
                "",

              LastCreditNoteNo:
                remainingCreditNote
                  ?.CreditNoteNo ||
                0,
            },
          },
          {
            session,
          }
        );
      }

      await session.commitTransaction();

      return res.json({
        success:
          true,

        message:
          salesBill
            ? `Credit Note ${creditNote.CreditNoteSeries}-${creditNote.CreditNoteNo} deleted. Stock and Sales Bill were restored.`
            : `Credit Note ${creditNote.CreditNoteSeries}-${creditNote.CreditNoteNo} deleted. Stock was restored.`,

        deletedId:
          id,

        salesBillRestored:
          Boolean(salesBill),
      });
    } catch (error) {
      if (
        session.inTransaction()
      ) {
        await session.abortTransaction();
      }

      console.error(
        "Credit Note delete error:",
        error
      );

      return res.status(400).json({
        success:
          false,

        message:
          error.message ||
          "Credit Note delete failed.",
      });
    } finally {
      await session.endSession();
    }
  }
);
// ---------- PERMANENT DELETE CREATE LOAD ----------
app.delete("/api/create-load/:id", ensureConnection, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { distributorId, firmId } = req.body;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required"
      });
    }

    const load = await LoadHeader.findOne({
      _id: id,
      DistributorId: distributorId,
      FirmId: firmId,
      IsCancelled: { $ne: true }
    }).session(session);

    if (!load) {
      return res.status(404).json({
        success: false,
        message: "Load not found"
      });
    }

    // Check if load is already settled
    const settledLoad = await SettleLoad.findOne({
      distributorId,
      firmId,
      loadSeries: load.LoadSeries,
      loadNo: load.LoadNo,
      isActive: true
    }).session(session);

    if (settledLoad) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete load ${load.LoadSeries}-${load.LoadNo}. It is already settled. Please delete the settlement first.`
      });
    }

    // Reset IsLoaded status for all bills in this load
    const billConditions = (load.Bills || [])
      .map(b => ({
        BillSeries: String(b.Series || b.BillSeries || b.billSeries || "").trim(),
        BillNo: Number(b.BillNo || b.billNo || 0)
      }))
      .filter(b => b.BillSeries && b.BillNo);

    if (billConditions.length > 0) {
      await SalesHeader.updateMany(
        {
          distributorId,
          firmId,
          isActive: true,
          $or: billConditions
        },
        {
          $set: {
            IsLoaded: false,
            LoadSeries: "",
            LoadNo: null
          }
        },
        { session }
      );
    }

    // PERMANENTLY DELETE the load
    await LoadHeader.findByIdAndDelete(id).session(session);

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Load ${load.LoadSeries}-${load.LoadNo} permanently deleted from database and bills are unloaded`
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete load error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Load delete failed"
    });
  } finally {
    session.endSession();
  }
});
// ---------- PERMANENT DELETE SETTLE LOAD ----------
app.delete("/api/settle-load/:id", ensureConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId, firmId } = req.body;

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message: "distributorId and firmId are required"
      });
    }

    const settleLoad = await SettleLoad.findOne({
      _id: id,
      distributorId,
      firmId,
      isActive: true
    });

    if (!settleLoad) {
      return res.status(404).json({
        success: false,
        message: "Settle Load not found"
      });
    }

    // Get all bills from this settle load
    const billConditions = (settleLoad.bills || [])
      .map(b => ({
        BillSeries: String(b.billSeries || "").trim(),
        BillNo: Number(b.billNo || 0)
      }))
      .filter(b => b.BillSeries && b.BillNo);

    // Unload bills back to pending state
    if (billConditions.length > 0) {
      await SalesHeader.updateMany(
        {
          distributorId,
          firmId,
          isActive: true,
          $or: billConditions
        },
        {
          $set: {
            IsLoaded: false,
            LoadSeries: "",
            LoadNo: null
          }
        }
      );
    }

    // PERMANENTLY DELETE the settle load
    await SettleLoad.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Settle Load ${settleLoad.loadSeries}-${settleLoad.loadNo} permanently deleted from database and bills are unloaded`
    });
  } catch (error) {
    console.error("Delete settle load error:", error);
    res.status(500).json({
      success: false,
      message: "Settle Load delete failed",
      error: error.message
    });
  }
});
/* =========================================================
  BILL PRINT SETTINGS SCHEMA
  ========================================================= */

const billPrintSettingsSchema = new mongoose.Schema(
  {
    distributorId: {
      type: String,
      required: true,
      trim: true,
    },

    firmId: {
      type: String,
      required: true,
      trim: true,
    },

    NoOfCopies: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },

    GoodsReturn: {
      type: String,
      enum: ["Y", "N"],
      default: "N",
    },

    DamageReturn: {
      type: String,
      enum: ["Y", "N"],
      default: "N",
    },

    SchemeSummary: {
      type: String,
      enum: ["Y", "N"],
      default: "Y",
    },

    VatSummary: {
      type: String,
      enum: ["Y", "N"],
      default: "Y",
    },

    HSNSummary: {
      type: String,
      enum: ["Y", "N"],
      default: "Y",
    },
  },
  {
    collection: "T_Bill_Print_Settings",
    timestamps: true,
  }
);

billPrintSettingsSchema.index(
  {
    distributorId: 1,
    firmId: 1,
  },
  {
    unique: true,
    name: "unique_bill_print_settings",
  }
);

const BillPrintSettings =
  mongoose.models.BillPrintSettings ||
  mongoose.model(
    "BillPrintSettings",
    billPrintSettingsSchema
  );

/* =========================================================
  BILL PRINT HEALTH
  ========================================================= */

app.get("/api/bill-print/health", (req, res) => {
  res.json({
    success: true,
    message: "Bill Print API is working",
  });
});

/* =========================================================
  GET BILL PRINT SETTINGS
  ========================================================= */

app.get(
  "/api/bill-print/settings",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required.",
        });
      }

      const settings =
        await BillPrintSettings.findOne({
          distributorId,
          firmId,
        }).lean();

      return res.json({
        success: true,

        settings:
          settings || {
            NoOfCopies: 1,
            GoodsReturn: "N",
            DamageReturn: "N",
            SchemeSummary: "Y",
            VatSummary: "Y",
            HSNSummary: "Y",
          },
      });
    } catch (error) {
      console.error(
        "Bill Print settings GET error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Bill Print settings.",
        error: error.message,
      });
    }
  }
);

/* =========================================================
  SAVE BILL PRINT SETTINGS
  ========================================================= */

app.put(
  "/api/bill-print/settings",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.body.distributorId || ""
      ).trim();

      const firmId = String(
        req.body.firmId || ""
      ).trim();

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required.",
        });
      }

      const normalizeYesNo = (
        value,
        defaultValue
      ) => {
        return String(value || defaultValue)
          .trim()
          .toUpperCase() === "Y"
          ? "Y"
          : "N";
      };

      const updateData = {
        NoOfCopies: Math.min(
          10,
          Math.max(
            1,
            Number(req.body.NoOfCopies || 1)
          )
        ),

        GoodsReturn: normalizeYesNo(
          req.body.GoodsReturn,
          "N"
        ),

        DamageReturn: normalizeYesNo(
          req.body.DamageReturn,
          "N"
        ),

        SchemeSummary: normalizeYesNo(
          req.body.SchemeSummary,
          "Y"
        ),

        VatSummary: normalizeYesNo(
          req.body.VatSummary,
          "Y"
        ),

        HSNSummary: normalizeYesNo(
          req.body.HSNSummary,
          "Y"
        ),
      };

      const settings =
        await BillPrintSettings.findOneAndUpdate(
          {
            distributorId,
            firmId,
          },
          {
            $set: updateData,
            $setOnInsert: {
              distributorId,
              firmId,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
          }
        ).lean();

      return res.json({
        success: true,
        message:
          "Bill Print settings saved successfully.",
        settings,
      });
    } catch (error) {
      console.error(
        "Bill Print settings PUT error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to save Bill Print settings.",
        error: error.message,
      });
    }
  }
);

/* =========================================================
  LOAD REAL BILL PRINT DATA
  GET /api/bill-print/load-details
  ========================================================= */

app.get(
  "/api/bill-print/load-details",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const loadSeries = String(
        req.query.loadSeries || ""
      )
        .trim()
        .toUpperCase();

      const loadNo = String(
        req.query.loadNo || ""
      ).trim();

      if (
        !distributorId ||
        !firmId ||
        !loadSeries ||
        !loadNo
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Distributor, Firm, Load Series and Load No are required.",
        });
      }

      /*
      * Your LoadHeader schema uses:
      * DistributorId
      * FirmId
      * LoadSeries
      * LoadNo
      */
      const load = await LoadHeader.findOne({
        DistributorId: distributorId,
        FirmId: firmId,
        LoadSeries: loadSeries,
        LoadNo: Number(loadNo),
        IsCancelled: {
          $ne: true,
        },
      }).lean();

      if (!load) {
        return res.status(404).json({
          success: false,
          message: `Load ${loadSeries}-${loadNo} not found.`,
        });
      }

      const loadBills = Array.isArray(load.Bills)
        ? load.Bills
        : [];

      if (loadBills.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "No bills are available in the selected load.",
        });
      }

      const salesBillIds = loadBills
        .map((bill) =>
          String(
            bill.SalesBillId ||
            bill.salesBillId ||
            ""
          ).trim()
        )
        .filter((id) =>
          mongoose.Types.ObjectId.isValid(id)
        );

      const billConditions = loadBills
        .map((bill) => {
          const BillSeries = String(
            bill.BillSeries ||
            bill.Series ||
            bill.billSeries ||
            ""
          ).trim();

          const BillNo = Number(
            bill.BillNo ||
            bill.billNo ||
            0
          );

          if (!BillNo) {
            return null;
          }

          return {
            BillSeries,
            BillNo,
          };
        })
        .filter(Boolean);

      const salesQueryConditions = [];

      if (salesBillIds.length > 0) {
        salesQueryConditions.push({
          _id: {
            $in: salesBillIds,
          },
        });
      }

      if (billConditions.length > 0) {
        salesQueryConditions.push({
          $or: billConditions,
        });
      }

      let bills = [];

      if (salesQueryConditions.length > 0) {
        bills = await SalesHeader.find({
          distributorId,
          firmId,
          isActive: {
            $ne: false,
          },
          $or: salesQueryConditions,
        })
          .sort({
            BillSeries: 1,
            BillNo: 1,
          })
          .lean();
      }

      /*
      * Use the bills stored inside the load if older
      * loads do not contain SalesBillId references.
      */
      if (bills.length === 0) {
        bills = loadBills.map((bill) => ({
          ...bill,

          BillSeries:
            bill.BillSeries ||
            bill.Series ||
            bill.billSeries ||
            "",

          BillNo:
            bill.BillNo ||
            bill.billNo ||
            "",

          BillDate:
            bill.BillDate ||
            bill.billDate ||
            "",

          PartyCode:
            bill.PartyCode ||
            bill.partyCode ||
            "",

          PartyName:
            bill.PartyName ||
            bill.partyName ||
            "",

          NetAmount: Number(
            bill.Amount ||
            bill.billAmount ||
            bill.NetAmount ||
            0
          ),

          items:
            bill.items ||
            bill.Items ||
            bill.products ||
            [],
        }));
      }

      const sortedBillNumbers = bills
        .map((bill) =>
          Number(
            bill.BillNo ||
            bill.billNo ||
            0
          )
        )
        .filter((number) => number > 0)
        .sort((a, b) => a - b);

      const transactionSeries =
        String(
          bills[0]?.BillSeries ||
          bills[0]?.billSeries ||
          loadBills[0]?.BillSeries ||
          loadBills[0]?.Series ||
          ""
        ).trim();

      const totalAmount = bills.reduce(
        (sum, bill) =>
          sum +
          Number(
            bill.NetAmount ||
            bill.netAmount ||
            bill.Amount ||
            bill.billAmount ||
            0
          ),
        0
      );

      const uniqueParties = new Set(
        bills
          .map(
            (bill) =>
              bill.PartyCode ||
              bill.partyCode ||
              bill.PartyName ||
              bill.partyName
          )
          .filter(Boolean)
      );

      const firm = await Register.findOne({
        distributorId,
        firmId,
        isActive: true,
      })
        .select(
          "firmName address1 address2 city pinCode state phoneNo mobileNo gstNo email"
        )
        .lean();

      return res.json({
        success: true,

        header: {
          LoadSeries:
            load.LoadSeries || loadSeries,

          LoadNo:
            load.LoadNo || Number(loadNo),

          LoadDate:
            load.LoadDate || "",

          TrnSeries: transactionSeries,

          FromTrnNo:
            sortedBillNumbers.length > 0
              ? sortedBillNumbers[0]
              : "",

          ToTrnNo:
            sortedBillNumbers.length > 0
              ? sortedBillNumbers[
              sortedBillNumbers.length - 1
              ]
              : "",

          TotalBills: bills.length,

          TotalParties: uniqueParties.size,

          TotalAmount: totalAmount,

          Narration:
            load.Narration || "",
        },

        firm: {
          firmName:
            firm?.firmName ||
            load.FirmName ||
            "",

          address1: firm?.address1 || "",
          address2: firm?.address2 || "",
          city: firm?.city || "",
          pinCode: firm?.pinCode || "",
          state: firm?.state || "",
          phoneNo:
            firm?.phoneNo ||
            firm?.mobileNo ||
            "",
          gstNo: firm?.gstNo || "",
          email: firm?.email || "",
        },

        bills,
      });
    } catch (error) {
      console.error(
        "Bill Print load-details error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to load Bill Print data.",
      });
    }
  }
);
/* =========================================================
  GET ONE SALES BILL FOR PRINT / PREVIEW
  ========================================================= */

app.get(
  "/api/sales/:id/print-details",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const salesId = String(req.params.id || "").trim();

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(salesId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Sales Bill ID.",
        });
      }

      const bill = await SalesHeader.findOne({
        _id: salesId,
        distributorId,
        firmId,
        isActive: true,
      }).lean();

      if (!bill) {
        return res.status(404).json({
          success: false,
          message: "Sales bill not found.",
        });
      }

      const [firm, party, salesman, area] =
        await Promise.all([
          Register.findOne({
            distributorId,
            firmId,
            isActive: true,
          }).lean(),

          Account.findOne({
            distributorId,
            firmId,
            $or: [
              {
                accountCode: String(
                  bill.PartyCode || ""
                ).trim(),
              },
              {
                accountName: String(
                  bill.PartyName || ""
                ).trim(),
              },
            ],
            isActive: true,
          }).lean(),

          Salesman.findOne({
            distributorId,
            firmId,
            $or: [
              {
                salesmanCode: String(
                  bill.SalesmanCode || ""
                ).trim(),
              },
              {
                salesmanName: String(
                  bill.SalesmanName || ""
                ).trim(),
              },
            ],
            isActive: true,
          }).lean(),

          Area.findOne({
            distributorId,
            firmId,
            $or: [
              {
                areaCode: String(
                  bill.AreaCode || ""
                ).trim(),
              },
              {
                areaName: String(
                  bill.AreaName || ""
                ).trim(),
              },
            ],
            isActive: true,
          }).lean(),
        ]);

      /*
      * Get bank details from Other Account.
      * Change accountGroup values here if your bank group
      * uses another name.
      */
      const bank = await OtherAccount.findOne({
        distributorId,
        firmId,
        isActive: true,
        $or: [
          {
            accountGroup: {
              $regex: /bank/i,
            },
          },
          {
            bankAccountNo: {
              $nin: ["", null],
            },
          },
        ],
      })
        .sort({ createdAt: 1 })
        .lean();

      const normalizedItems = (
        Array.isArray(bill.items)
          ? bill.items
          : []
      ).map((item, index) => {
        const qty = Number(
          item.qty ??
          item.Qty ??
          item.quantity ??
          0
        );

        const free = Number(
          item.free ??
          item.Free ??
          0
        );

        const rate = Number(
          item.rate ??
          item.Rate ??
          item.salesRate ??
          0
        );

        const grossAmount = Number(
          item.grossAmount ??
          item.GrossAmount ??
          item.gross ??
          qty * rate
        );

        const schemePercent = Number(
          item.schemePct ??
          item.schemePercent ??
          item.SchemePercent ??
          0
        );

        const schemeAmount = Number(
          item.schemeAmt ??
          item.schemeAmount ??
          item.SchemeAmount ??
          0
        );

        const cashDiscountPercent = Number(
          item.cdPct ??
          item.cashDiscountPercent ??
          item.CashDiscountPercent ??
          0
        );

        const cashDiscountAmount = Number(
          item.cdAmt ??
          item.cashDiscountAmount ??
          item.CashDiscountAmount ??
          0
        );

        const taxableAmount = Number(
          item.taxable ??
          item.taxableAmount ??
          item.TaxableAmount ??
          grossAmount -
          schemeAmount -
          cashDiscountAmount
        );

        const gstPercent = Number(
          item.gst ??
          item.gstPercent ??
          item.GSTPercent ??
          0
        );

        const cgstPercent = Number(
          item.cgstPercent ??
          item.CGSTPercent ??
          gstPercent / 2
        );

        const sgstPercent = Number(
          item.sgstPercent ??
          item.SGSTPercent ??
          gstPercent / 2
        );

        const igstPercent = Number(
          item.igstPercent ??
          item.IGSTPercent ??
          0
        );

        const cgstAmount = Number(
          item.cgst ??
          item.cgstAmount ??
          item.CGSTAmount ??
          0
        );

        const sgstAmount = Number(
          item.sgst ??
          item.sgstAmount ??
          item.SGSTAmount ??
          0
        );

        const igstAmount = Number(
          item.igst ??
          item.igstAmount ??
          item.IGSTAmount ??
          0
        );

        const netAmount = Number(
          item.amount ??
          item.netAmount ??
          item.NetAmount ??
          taxableAmount +
          cgstAmount +
          sgstAmount +
          igstAmount
        );

        return {
          srNo: index + 1,

          productCode:
            item.productCode ||
            item.ProdCode ||
            item.productId ||
            "",

          productName:
            item.productName ||
            item.ProdName ||
            item.name ||
            item.product ||
            "",

          hsn:
            item.hsn ||
            item.hsnCode ||
            item.HSN ||
            item.HSNCode ||
            "",

          batchNo:
            item.batchNo ||
            item.batch ||
            item.Batch ||
            item.selectedBatch?.batchNo ||
            "",

          mrp: Number(
            item.mrp ??
            item.MRP ??
            0
          ),

          unit:
            item.units ||
            item.unit ||
            item.basicUnit ||
            item.Unit ||
            "PCS",

          qty,
          free,
          rate,
          grossAmount,
          taxableAmount,

          schemePercent,
          schemeAmount,

          cashDiscountPercent,
          cashDiscountAmount,

          cgstPercent,
          cgstAmount,

          sgstPercent,
          sgstAmount,

          igstPercent,
          igstAmount,

          netAmount,
        };
      });

      return res.json({
        success: true,

        bill: {
          ...bill,
          items: normalizedItems,
        },

        firm: {
          firmName:
            firm?.firmName ||
            bill.firmName ||
            "",

          address1: firm?.address1 || "",
          address2: firm?.address2 || "",
          city: firm?.city || "",
          pinCode: firm?.pinCode || "",
          state: firm?.state || "",
          stateCode:
            firm?.stateCode ||
            "",

          phoneNo: firm?.phoneNo || "",
          mobileNo: firm?.mobileNo || "",
          email:
            firm?.email ||
            firm?.emailId ||
            "",

          gstNo: firm?.gstNo || "",
          panNo:
            firm?.panNo ||
            "",
        },

        party: {
          partyCode:
            party?.accountCode ||
            bill.PartyCode ||
            "",

          partyName:
            party?.accountName ||
            bill.PartyName ||
            "",

          address:
            party?.address ||
            "",

          address2:
            party?.add2 ||
            party?.billToAdd1 ||
            "",

          town:
            party?.town ||
            "",

          pinCode:
            party?.pinCode ||
            "",

          state:
            party?.state ||
            "",

          stateCode:
            party?.stateCode ||
            "",

          phoneNo:
            party?.phoneNo ||
            "",

          mobileNo:
            party?.mobileNo ||
            "",

          email:
            party?.emailId ||
            "",

          gstNo:
            party?.gstNo ||
            "",

          panNo:
            party?.panNo ||
            "",
        },

        salesman: {
          salesmanCode:
            salesman?.salesmanCode ||
            bill.SalesmanCode ||
            "",

          salesmanName:
            salesman?.salesmanName ||
            bill.SalesmanName ||
            "",

          mobileNo:
            salesman?.mobileNo ||
            salesman?.phoneNo ||
            "",
        },

        area: {
          areaCode:
            area?.areaCode ||
            bill.AreaCode ||
            "",

          areaName:
            area?.areaName ||
            bill.AreaName ||
            "",
        },

        bank: {
          bankName:
            bank?.accountName ||
            "",

          accountName:
            firm?.firmName ||
            bill.firmName ||
            "",

          accountNo:
            bank?.bankAccountNo ||
            "",

          ifscCode:
            bank?.ifscCode ||
            "",

          branch:
            bank?.branchName ||
            bank?.branch ||
            "",

          accountType:
            bank?.accountType ||
            "",
        },
      });
    } catch (error) {
      console.error(
        "Sales print-details error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to load Sales Bill print data.",
      });
    }
  }
);
app.get(
  "/api/sales/find-bill",
  ensureConnection,
  async (req, res) => {
    try {
      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      const billSeries = String(
        req.query.billSeries || ""
      ).trim();

      const billNo = Number(
        req.query.billNo || 0
      );

      const companyCode = String(
        req.query.companyCode || ""
      ).trim();

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId and firmId are required",
        });
      }

      if (!billNo) {
        return res.status(400).json({
          success: false,
          message: "Bill number is required",
        });
      }

      const filter = {
        distributorId,
        firmId,
        BillNo: billNo,
        isActive: true,
      };

      /*
      * Bill Series is optional because old bills
      * can contain blank series.
      */
      if (billSeries) {
        filter.$and = [
          {
            $or: [
              { BillSeries: billSeries },
              { billSeries },
              { Series: billSeries },
            ],
          },
        ];
      } else {
        filter.$and = [
          {
            $or: [
              { BillSeries: "" },
              { BillSeries: null },
              {
                BillSeries: {
                  $exists: false,
                },
              },

              { billSeries: "" },
              { billSeries: null },
              {
                billSeries: {
                  $exists: false,
                },
              },

              { Series: "" },
              { Series: null },
              {
                Series: {
                  $exists: false,
                },
              },
            ],
          },
        ];
      }

      /*
      * Company is checked when selected.
      */
      if (companyCode) {
        filter.$and.push({
          $or: [
            { CompanyCode: companyCode },
            { companyCode },
            { Company: companyCode },
            { company: companyCode },
          ],
        });
      }

      const bill =
        await SalesHeader.findOne(filter)
          .lean();

      if (!bill) {
        return res.status(404).json({
          success: false,
          message:
            `Sales bill not found for ` +
            `${companyCode || "selected company"}, ` +
            `${billSeries || "blank series"}-${billNo}`,
        });
      }

      res.json({
        success: true,
        bill,
      });

    } catch (error) {
      console.error(
        "Sales bill lookup error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Sales bill load failed",
        error: error.message,
      });
    }
  }
);
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
