import express from "express";
import mongoose from "mongoose";

export default function createSecuritySetupRouter(User) {

  const router = express.Router();

  /* =========================================================
     PERMISSION COLUMNS
  ========================================================= */

  const PERMISSION_COLUMNS = [
    {
      key: "view",
      label: "View",
    },
    {
      key: "add",
      label: "Add",
    },
    {
      key: "edit",
      label: "Edit",
    },
    {
      key: "delete",
      label: "Delete",
    },
    {
      key: "print",
      label: "Print",
    },
    {
      key: "export",
      label: "Export",
    },
  ];

  /* =========================================================
     DEFAULT OPERATION GROUPS
  ========================================================= */

  /*
  COPY YOUR COMPLETE DEFAULT_OPERATION_GROUPS
  FROM SecuritySetup.jsx HERE.
  
  DO NOT CHANGE ANYTHING.
  */

  const DEFAULT_OPERATION_GROUPS = [
    {
      id: "master",
      name: "Master",
      icon: "📁",
      operations: [
        {
          id: "master-company",
          name: "Company",
          module: "MASTER",
          operation: "COMPANY",
        },
        {
          id: "master-account",
          name: "Account",
          module: "MASTER",
          operation: "ACCOUNT",
        },
        {
          id: "master-product",
          name: "Product",
          module: "MASTER",
          operation: "PRODUCT",
        },

        {
          id: "master-other-account",
          name: "Other Account",
          module: "MASTER",
          operation: "OTHER_ACCOUNT",
        },
        {
          id: "master-group",
          name: "Group",
          module: "MASTER",
          operation: "GROUP",
        },
        {
          id: "master-category",
          name: "Category",
          module: "MASTER",
          operation: "CATEGORY",
        },
        {
          id: "master-gst",
          name: "GST",
          module: "MASTER",
          operation: "GST",
        },
        {
          id: "master-salesman",
          name: "Salesman",
          module: "MASTER",
          operation: "SALESMAN",
        },
        {
          id: "master-area",
          name: "Area",
          module: "MASTER",
          operation: "AREA",
        },
        {
          id: "master-godown",
          name: "Godown",
          module: "MASTER",
          operation: "GODOWN",
        },
      ],
    },
    {
      id: "mapping",
      name: "Mapping",
      icon: "📁",
      operations: [
        {
          id: "mapping-salesman-area",
          name: "Salesman To Area",
          module: "MAPPING",
          operation: "SALESMAN_TO_AREA",
        },
        {
          id: "mapping-area-party",
          name: "Area To Party",
          module: "MAPPING",
          operation: "AREA_TO_PARTY",
        },
      ],
    },
    {
      id: "sales",
      name: "Sales",
      icon: "📊",
      operations: [
        {
          id: "sales-billing",
          name: "Sales Billing",
          module: "SALES",
          operation: "SALES_BILLING",
        },
        {
          id: "sales-quotation",
          name: "Quotation",
          module: "SALES",
          operation: "QUOTATION",
        },
        {
          id: "sales-load",
          name: "Create Load",
          module: "SALES",
          operation: "CREATE_LOAD",
        },
        {
          id: "sales-settle-load",
          name: "Settle Load",
          module: "SALES",
          operation: "SETTLE_LOAD",
        },
      ],
    },
    {
      id: "vouchers",
      name: "Vouchers",
      icon: "📁",
      operations: [
        {
          id: "voucher-purchase",
          name: "Purchase",
          module: "VOUCHERS",
          operation: "PURCHASE",
        },
        {
          id: "voucher-credit-note",
          name: "Credit Note",
          module: "VOUCHERS",
          operation: "CREDIT_NOTE",
        },
        {
          id: "voucher-debit-note",
          name: "Debit Note",
          module: "VOUCHERS",
          operation: "DEBIT_NOTE",
        },

      ],
    },
    {
      id: "transactions",
      name: "Transactions",
      icon: "📁",
      operations: [
        {
          id: "transactions-receipt",
          name: "Receipt",
          module: "TRANSACTIONS",
          operation: "RECEIPT",
        },
        {
          id: "transaction-cheque-bounce",
          name: "Cheque Bounce",
          module: "TRANSACTIONS",
          operation: "CHEQUE_BOUNCE",
        },
        {
          id: "transaction-pdc",
          name: "PDC Docket",
          module: "TRANSACTIONS",
          operation: "PDC_DOCKET",
        },
        {
          id: "transaction-journal",
          name: "Journal Voucher",
          module: "TRANSACTIONS",
          operation: "JOURNAL_VOUCHER",
        },
        {
          id: "transaction-contra",
          name: "Contra",
          module: "TRANSACTIONS",
          operation: "CONTRA",
        },
        {
          id: "transactions-payment",
          name: "Payment",
          module: "TRANSACTIONS",
          operation: "PAYMENT",
        },


        {
          id: "transaction-collection",
          name: "Collection Voucher",
          module: "TRANSACTIONS",
          operation: "COLLECTION_VOUCHER",
        },


      ],
    },
    {
      id: "reports",
      name: "Reports",
      icon: "📈",
      operations: [
        {
          id: "report-party-sales",
          name: "Party Wise Sales",
          module: "REPORTS",
          operation: "PARTY_WISE_SALES",
        },
        {
          id: "report-product-sales",
          name: "Product Wise Sales",
          module: "REPORTS",
          operation: "PRODUCT_WISE_SALES",
        },
        {
          id: "report-stock",
          name: "Stock Report",
          module: "REPORTS",
          operation: "STOCK_REPORT",
        },
        {
          id: "report-outstanding",
          name: "Outstanding Report",
          module: "REPORTS",
          operation: "OUTSTANDING_REPORT",
        },
        {
          id: "report-gst",
          name: "GST Reports",
          module: "REPORTS",
          operation: "GST_REPORTS",
        },
      ],
    },
    {
      id: "tools",
      name: "Tools",
      icon: "🛠",
      operations: [
        {
          id: "tools-general-setup-1",
          name: "General Setup 1",
          module: "TOOLS",
          operation: "GENERAL_SETUP_1",
        },
        {
          id: "tools-general-setup-2",
          name: "General Setup 2",
          module: "TOOLS",
          operation: "GENERAL_SETUP_2",
        },
        {
          id: "tools-security-setup",
          name: "Security Setup",
          module: "TOOLS",
          operation: "SECURITY_SETUP",
        },
        {
          id: "tools-data-export",
          name: "Data Export",
          module: "TOOLS",
          operation: "DATA_EXPORT",
        },
      ],
    },
    {
      id: "system",
      name: "System",
      icon: "⚙️",
      operations: [
        {
          id: "system-users",
          name: "Users",
          module: "SYSTEM",
          operation: "USERS",
        },
        {
          id: "system-firms",
          name: "Firms",
          module: "SYSTEM",
          operation: "FIRMS",
        },
        {
          id: "system-database",
          name: "Database",
          module: "SYSTEM",
          operation: "DATABASE",
        },
      ],
    },
  ];

  /* =========================================================
     HELPER FUNCTIONS
  ========================================================= */

  const createBlankPermission = () => ({
    view: false,
    add: false,
    edit: false,
    delete: false,
    print: false,
    export: false,
  });

  const createFullPermission = () => ({
    view: true,
    add: true,
    edit: true,
    delete: true,
    print: true,
    export: true,
  });

  const readString = (value, fallback = "") => {
    if (value === undefined || value === null) {
      return fallback;
    }

    return String(value).trim();
  };

  const normalizeRole = (role = "USER") =>
    String(role)
      .trim()
      .toUpperCase();

  /* =========================================================
     DEFAULT USER PERMISSIONS
  ========================================================= */

  const createDefaultPermissions = (
    role = "USER"
  ) => {
    const isAdmin =
      normalizeRole(role) ===
      "DISTRIBUTOR_ADMIN";

    const permissions = {};

    DEFAULT_OPERATION_GROUPS.forEach(
      (group) => {
        permissions[group.id] = {};

        group.operations.forEach(
          (operation) => {
            permissions[group.id][
              operation.operation
            ] = {
              view: true,
              add: isAdmin,
              edit: isAdmin,
              delete: isAdmin,
              print: isAdmin,
              export: isAdmin,
            };
          }
        );
      }
    );

    return permissions;
  };
  /* =========================================================
     SECURITY SETUP SCHEMA
  ========================================================= */

  const securitySetupSchema = new mongoose.Schema(
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

      firmName: {
        type: String,
        default: "",
        trim: true,
      },

      userId: {
        type: String,
        required: true,
        trim: true,
      },

      userName: {
        type: String,
        required: true,
        trim: true,
      },

      role: {
        type: String,
        default: "USER",
        trim: true,
        uppercase: true,
      },

      permissions: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      updatedBy: {
        type: String,
        default: "",
        trim: true,
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      collection: "Mas_SecuritySetup",
    }
  );

  /* =========================================================
     INDEX
  ========================================================= */

  securitySetupSchema.index(
    {
      distributorId: 1,
      firmId: 1,
      userId: 1,
    },
    {
      unique: true,
    }
  );

  /* =========================================================
     MODEL
  ========================================================= */

  const SecuritySetup =
    mongoose.models.Mas_SecuritySetup ||
    mongoose.model(
      "Mas_SecuritySetup",
      securitySetupSchema
    );



  /* =========================================================
     ROUTES WILL COME HERE
  ========================================================= */


  const checkPermission = (
    permissions,
    moduleCode,
    operationCode,
    action
  ) => {

    const role = normalizeRole(
      permissions?.role
    );

    /*
     * Distributor Admin
     */
    if (role === "DISTRIBUTOR_ADMIN") {
      return true;
    }

    if (!permissions) {
      return false;
    }

    const modulePermissions =
      permissions[
      String(moduleCode).toLowerCase()
      ];

    if (!modulePermissions) {
      return false;
    }

    const operationPermissions =
      modulePermissions[
      String(operationCode).toUpperCase()
      ];

    if (!operationPermissions) {
      return false;
    }

    /*
     * View is always allowed.
     */
    if (
      String(action).toLowerCase() === "view"
    ) {
      return true;
    }

    return Boolean(
      operationPermissions[action]
    );
  };

  const authorize = async (
    distributorId,
    firmId,
    userId,
    role,
    moduleCode,
    operationCode,
    action
  ) => {

    /*
     * Distributor Admin
     */
    if (
      normalizeRole(role) ===
      "DISTRIBUTOR_ADMIN"
    ) {
      return true;
    }

    const security =
      await SecuritySetup.findOne({
        distributorId,
        firmId,
        userId,
        isActive: true,
      }).lean();

    if (!security) {
      return false;
    }

    return checkPermission(
      {
        ...security.permissions,
        role,
      },
      moduleCode,
      operationCode,
      action
    );
  };
  /* =========================================================
     AUTHORIZATION MIDDLEWARE
  ========================================================= */

  const authorizeRequest =
    (moduleCode, operationCode, action) =>
      async (req, res, next) => {
        try {

          const distributorId = readString(
            req.headers["x-distributor-id"]
          );

          const firmId = readString(
            req.headers["x-firm-id"]
          );

          const userId = readString(
            req.headers["x-user-id"]
          );

          const role = normalizeRole(
            req.headers["x-user-role"]
          );

          req.security = {
            distributorId,
            firmId,
            userId,
            role,
          };

          if (
            !distributorId ||
            !firmId ||
            !userId
          ) {
            return res.status(401).json({
              success: false,
              message: "User session not found.",
            });
          }

          const allowed = await authorize(
            distributorId,
            firmId,
            userId,
            role,
            moduleCode,
            operationCode,
            action
          );

          if (!allowed) {
            return res.status(403).json({
              success: false,
              message: "You do not have permission.",
            });
          }

          next();
        } catch (error) {
          console.error("Authorization Error:", error);

          return res.status(500).json({
            success: false,
            message: "Authorization failed.",
          });
        }
      };
  /* =========================================================
     LOAD SECURITY SETUP
  ========================================================= */

  router.get("/", async (req, res) => {
    try {
      const distributorId = readString(req.query.distributorId);
      const firmId = readString(req.query.firmId);

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message: "Distributor and Firm are required.",
        });
      }

      const users = await User.find({
        distributorId,
        firmId,
        isActive: true,
      })
        .sort({ userName: 1 })
        .lean();

      const resultUsers = [];

      for (const user of users) {
        let security = await SecuritySetup.findOne({
          distributorId,
          firmId,
          userId: user.userId,
        });

        if (!security) {
          console.log("USER FROM DB =>", user);
          security = await SecuritySetup.create({
            distributorId,
            firmId,
            firmName: user.firmName,
            userId: user.userId,
            userName: user.userName,
            role: normalizeRole(user.role),
            permissions: createDefaultPermissions(
              normalizeRole(user.role)
            ),
          });
        }

        resultUsers.push({
          ...user,
          permissions: security.permissions,
        });
      }

      return res.json({
        success: true,

        operationGroups: DEFAULT_OPERATION_GROUPS,

        users: resultUsers,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  });

  router.get("/my-permissions", async (req, res) => {
    try {
      const distributorId = readString(req.query.distributorId);
      const firmId = readString(req.query.firmId);
      const userId = readString(req.query.userId);
      const role = normalizeRole(req.query.role);

      if (!distributorId || !firmId || !userId) {
        return res.status(400).json({
          success: false,
          message:
            "distributorId, firmId and userId are required.",
        });
      }

      /*
       * Distributor Admin
       * No need to read Security Setup.
       */
      if (role === "DISTRIBUTOR_ADMIN") {
        return res.json({
          success: true,
          isAdministrator: true,
          permissions: createDefaultPermissions("DISTRIBUTOR_ADMIN"),
        });
      }

      /*
       * Normal User
       */
      const security =
        await SecuritySetup.findOne({
          distributorId,
          firmId,
          userId,
          isActive: true,
        }).lean();

      if (!security) {
        return res.json({
          success: true,
          isAdministrator: false,
          permissions: createDefaultPermissions("USER"),
        });
      }

      return res.json({
        success: true,
        isAdministrator: false,
        permissions: security.permissions || {},
      });
    } catch (error) {
      console.error(
        "My Permission Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load user permissions.",
        error: error.message,
      });
    }
  });
  /* =========================================================
     SAVE SECURITY SETUP
  ========================================================= */

  router.put("/", async (req, res) => {
    try {
      const distributorId = readString(req.body.distributorId);
      const firmId = readString(req.body.firmId);
      const updatedBy = readString(req.body.updatedBy);

      const users = Array.isArray(req.body.users)
        ? req.body.users
        : [];

      if (!distributorId || !firmId) {
        return res.status(400).json({
          success: false,
          message: "Distributor and Firm are required.",
        });
      }

      for (const user of users) {
        await SecuritySetup.findOneAndUpdate(
          {
            distributorId,
            firmId,
            userId: user.userId,
          },
          {
            $set: {
              permissions: user.permissions,
              updatedBy,
              isActive: true,
            },
          },
          {
            new: true,
            upsert: true,
          }
        );
      }

      return res.json({
        success: true,
        message: "Security permissions saved successfully.",
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  });
  router.authorizeRequest =
    authorizeRequest;

  router.authorize =
    authorize;

  router.checkPermission =
    checkPermission;
  return router;
}