import express from "express";
import mongoose from "mongoose";

const router = express.Router();

/* =========================================================
   GENERAL SETUP 1 SCHEMA
   One setup document per distributor + firm
   ========================================================= */

const generalSetupSchema = new mongoose.Schema(
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

    /* =========================
       SALES SETTINGS
       ========================= */

    billAllowBlacklistParty: {
      type: Boolean,
      default: false,
    },

    allowChangeBillType: {
      type: Boolean,
      default: false,
    },

defaultSalesman: {
  type: Boolean,
  default: true,
},

    allowChangeSaleRate: {
      type: Boolean,
      default: false,
    },

    allowMixBilling: {
      type: Boolean,
      default: false,
    },

    saveInvoiceAfterLoad: {
      type: Boolean,
      default: false,
    },

    allowEditBillAfterLoad: {
      type: Boolean,
      default: false,
    },

    /* =========================
       PRODUCT / BILL SETTINGS
       ========================= */

    editProductAfterLoad: {
      type: Boolean,
      default: false,
    },

    vatOn: {
      type: String,
      default: "GROSS_SCHEME_STAR",
      trim: true,
    },

    cashDiscountOn: {
      type: String,
      default: "BILL_GROSS_SCHEME",
      trim: true,
    },

    productSelectionOn: {
      type: String,
      default: "PRODUCT_CODE",
      trim: true,
    },

    defaultCompany: {
      type: String,
      default: "",
      trim: true,
    },

    defaultGodown: {
      type: String,
      default: "",
      trim: true,
    },

    defaultSelection: {
      type: String,
      default: "ROUTE",
      trim: true,
    },

    saveAndPrint: {
      type: Boolean,
      default: false,
    },

    allowSRateLessThanPRate: {
      type: Boolean,
      default: false,
    },

    updateLoadQtyAfterBillEdit: {
      type: Boolean,
      default: false,
    },

    allowNegativeStock: {
      type: Boolean,
      default: false,
    },

    /* =========================
       PRINT / SYSTEM SETTINGS
       ========================= */

    goodsReturn: {
      type: Boolean,
      default: true,
    },

    damageReturn: {
      type: Boolean,
      default: true,
    },

    schemeSummary: {
      type: Boolean,
      default: true,
    },

    serialNo: {
      type: Boolean,
      default: false,
    },

    autoVoucherNo: {
      type: Boolean,
      default: true,
    },

    dateLocking: {
      type: String,
      default: "",
      trim: true,
    },

    showEntryDays: {
      type: Number,
      default: 10,
      min: 0,
    },

    billingWithoutHsnCode: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "Mas_GeneralSetup1",
  }
);

generalSetupSchema.index(
  {
    distributorId: 1,
    firmId: 1,
  },
  {
    unique: true,
  }
);

const GeneralSetup =
  mongoose.models.Mas_GeneralSetup1 ||
  mongoose.model(
    "Mas_GeneralSetup1",
    generalSetupSchema
  );

/* =========================================================
   DEFAULT GENERAL SETUP VALUES
   ========================================================= */

const createDefaultGeneralSetup = ({
  distributorId,
  firmId,
  firmName = "",
}) => ({
  distributorId,
  firmId,
  firmName,

  billAllowBlacklistParty: false,
  allowChangeBillType: false,
 defaultSalesman: true,
  allowChangeSaleRate: false,
  allowMixBilling: false,
  saveInvoiceAfterLoad: false,
  allowEditBillAfterLoad: false,

  editProductAfterLoad: false,
  vatOn: "GROSS_SCHEME_STAR",
  cashDiscountOn: "BILL_GROSS_SCHEME",
  productSelectionOn: "PRODUCT_CODE",
  defaultCompany: "",
  defaultGodown: "",
  defaultSelection: "ROUTE",
  saveAndPrint: false,
  allowSRateLessThanPRate: false,
  updateLoadQtyAfterBillEdit: false,
  allowNegativeStock: false,

  goodsReturn: true,
  damageReturn: true,
  schemeSummary: true,
  serialNo: false,
  autoVoucherNo: true,
  dateLocking: "",
  showEntryDays: 10,
  billingWithoutHsnCode: false,

  isActive: true,
});

/* =========================================================
   HELPERS
   ========================================================= */

const readBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .toLowerCase();

    if (
      ["true", "1", "yes", "y", "on"].includes(
        normalized
      )
    ) {
      return true;
    }

    if (
      ["false", "0", "no", "n", "off"].includes(
        normalized
      )
    ) {
      return false;
    }
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return fallback;
};

const readString = (value, fallback = "") => {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return String(value).trim();
};

const readNonNegativeNumber = (
  value,
  fallback = 0
) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return fallback;
  }

  return number;
};

const buildSetupUpdate = (
  body,
  existingSetup = null
) => {
  const current =
    existingSetup ||
    createDefaultGeneralSetup({
      distributorId: "",
      firmId: "",
    });

  return {
    firmName: readString(
      body.firmName,
      current.firmName
    ),

    billAllowBlacklistParty:
      readBoolean(
        body.billAllowBlacklistParty,
        current.billAllowBlacklistParty
      ),

    allowChangeBillType:
      readBoolean(
        body.allowChangeBillType,
        current.allowChangeBillType
      ),

 defaultSalesman:
  readBoolean(
    body.defaultSalesman,
    current.defaultSalesman
  ),

    allowChangeSaleRate:
      readBoolean(
        body.allowChangeSaleRate,
        current.allowChangeSaleRate
      ),

    allowMixBilling:
      readBoolean(
        body.allowMixBilling,
        current.allowMixBilling
      ),

    saveInvoiceAfterLoad:
      readBoolean(
        body.saveInvoiceAfterLoad,
        current.saveInvoiceAfterLoad
      ),

    allowEditBillAfterLoad:
      readBoolean(
        body.allowEditBillAfterLoad,
        current.allowEditBillAfterLoad
      ),

    editProductAfterLoad:
      readBoolean(
        body.editProductAfterLoad,
        current.editProductAfterLoad
      ),

    vatOn:
      readString(
        body.vatOn,
        current.vatOn
      ),

    cashDiscountOn:
      readString(
        body.cashDiscountOn,
        current.cashDiscountOn
      ),

    productSelectionOn:
      readString(
        body.productSelectionOn,
        current.productSelectionOn
      ),

    defaultCompany:
      readString(
        body.defaultCompany,
        current.defaultCompany
      ),

    defaultGodown:
      readString(
        body.defaultGodown,
        current.defaultGodown
      ),

    defaultSelection:
      readString(
        body.defaultSelection,
        current.defaultSelection
      ),

    saveAndPrint:
      readBoolean(
        body.saveAndPrint,
        current.saveAndPrint
      ),

    allowSRateLessThanPRate:
      readBoolean(
        body.allowSRateLessThanPRate,
        current.allowSRateLessThanPRate
      ),

    updateLoadQtyAfterBillEdit:
      readBoolean(
        body.updateLoadQtyAfterBillEdit,
        current.updateLoadQtyAfterBillEdit
      ),

    allowNegativeStock:
      readBoolean(
        body.allowNegativeStock,
        current.allowNegativeStock
      ),

    goodsReturn:
      readBoolean(
        body.goodsReturn,
        current.goodsReturn
      ),

    damageReturn:
      readBoolean(
        body.damageReturn,
        current.damageReturn
      ),

    schemeSummary:
      readBoolean(
        body.schemeSummary,
        current.schemeSummary
      ),

    serialNo:
      readBoolean(
        body.serialNo,
        current.serialNo
      ),

    autoVoucherNo:
      readBoolean(
        body.autoVoucherNo,
        current.autoVoucherNo
      ),

    dateLocking:
      readString(
        body.dateLocking,
        current.dateLocking
      ),

    showEntryDays:
      readNonNegativeNumber(
        body.showEntryDays,
        current.showEntryDays
      ),

    billingWithoutHsnCode:
      readBoolean(
        body.billingWithoutHsnCode,
        current.billingWithoutHsnCode
      ),

    isActive: true,
  };
};

/* =========================================================
   GET GENERAL SETUP
   GET /api/general-setup
   ========================================================= */

router.get("/", async (req, res) => {
  try {
    const distributorId = readString(
      req.query.distributorId
    );

    const firmId = readString(
      req.query.firmId
    );

    const firmName = readString(
      req.query.firmName
    );

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message:
          "distributorId and firmId are required.",
      });
    }

    let setup = await GeneralSetup.findOne({
      distributorId,
      firmId,
      isActive: true,
    }).lean();

    if (!setup) {
      const defaultSetup =
        createDefaultGeneralSetup({
          distributorId,
          firmId,
          firmName,
        });

      const createdSetup =
        await GeneralSetup.create(
          defaultSetup
        );

      setup = createdSetup.toObject();
    }

    return res.json({
      success: true,
      setup,
    });
  } catch (error) {
    console.error(
      "General Setup load error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load General Setup.",
      error: error.message,
    });
  }
});

/* =========================================================
   SAVE / UPDATE GENERAL SETUP
   PUT /api/general-setup
   ========================================================= */

router.put("/", async (req, res) => {
  try {
    const distributorId = readString(
      req.body.distributorId
    );

    const firmId = readString(
      req.body.firmId
    );

    if (!distributorId || !firmId) {
      return res.status(400).json({
        success: false,
        message:
          "distributorId and firmId are required.",
      });
    }

    const existingSetup =
      await GeneralSetup.findOne({
        distributorId,
        firmId,
      }).lean();

    const updateData =
      buildSetupUpdate(
        req.body,
        existingSetup
      );

    const setup =
      await GeneralSetup.findOneAndUpdate(
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
          setDefaultsOnInsert: true,
        }
      ).lean();

    return res.json({
      success: true,
      message:
        "General Setup saved successfully.",
      setup,
    });
  } catch (error) {
    console.error(
      "General Setup save error:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "General Setup already exists for this firm.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to save General Setup.",
      error: error.message,
    });
  }
});

export default router;