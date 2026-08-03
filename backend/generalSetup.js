import express from "express";
import mongoose from "mongoose";

const router = express.Router();

/* =========================================================
   GENERAL SETUP ALLOWED VALUES AND DEFAULTS
========================================================= */

const DEFAULT_VAT_ON =
  "GROSS_AMOUNT";

const DEFAULT_CASH_DISCOUNT_ON =
  "BILL_NET_AMOUNT";

const DEFAULT_PRODUCT_SELECTION_ON =
  "PRODUCT_NAME";

const VAT_ON_VALUES = [
  "GROSS_AMOUNT",
  "NET_AMOUNT",
  "GROSS_SCHEME",
  "GROSS_SCHEME_STAR",
  "GROSS_SCHEME_CASH",
  "GROSS_CASH",
];

const CASH_DISCOUNT_ON_VALUES = [
  "BILL_NET_AMOUNT",
  "ITEM_WISE_GROSS",
  "ITEM_WISE_GROSS_SCHEME",
  "BILL_GROSS_AMOUNT",
  "BILL_GROSS_SCHEME_VAT",
];


const PRODUCT_SELECTION_ON_VALUES = [
  "PRODUCT_CODE",
  "COMPANY_PRODUCT_CODE",
  "SHORT_CODE",
  "LOCAL_PRODUCT_NAME",
  "EAN_NO",
  "PRODUCT_NAME",
];
const DEFAULT_SELECTION =
  "AREA";

const DEFAULT_SELECTION_VALUES = [
  "AREA",
  "ROUTE",
];
/* =========================================================
   PRODUCT SELECTION MODES
========================================================= */



const normalizeProductSelectionMode = (
  value,
  fallback = "PRODUCT_NAME"
) => {
  const normalized = String(
    value || fallback
  )
    .trim()
    .toUpperCase();

  return PRODUCT_SELECTION_MODES.includes(
    normalized
  )
    ? normalized
    : fallback;
};

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
  enum: VAT_ON_VALUES,
  default: DEFAULT_VAT_ON,
  trim: true,
  uppercase: true,
},

cashDiscountOn: {
  type: String,
  enum: CASH_DISCOUNT_ON_VALUES,
  default: DEFAULT_CASH_DISCOUNT_ON,
  trim: true,
  uppercase: true,
},

productSelectionOn: {
  type: String,
  enum: PRODUCT_SELECTION_ON_VALUES,
  default: DEFAULT_PRODUCT_SELECTION_ON,
  trim: true,
  uppercase: true,
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
  enum: DEFAULT_SELECTION_VALUES,
  default: DEFAULT_SELECTION,
  trim: true,
  uppercase: true,
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

vatSummary: {
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
    /* =========================
   GENERAL SETUP 2
========================= */

allowCessInPurchase: {
  type: Boolean,
  default: true,
},

allowCessInSale: {
  type: Boolean,
  default: false,
},

reverseScheme: {
  type: Boolean,
  default: false,
},

editGrossPurchase: {
  type: Boolean,
  default: false,
},

importNegative: {
  type: Boolean,
  default: true,
},

allowChangeStarAmount: {
  type: Boolean,
  default: false,
},

settleLoadNegative: {
  type: Boolean,
  default: true,
},

qrCodeFolderName: {
  type: String,
  default: "",
  trim: true,
},

saleSeriesByGst: {
  type: Boolean,
  default: false,
},

importWithZero: {
  type: Boolean,
  default: false,
},

autoBillLockDays: {
  type: Number,
  default: 0,
  min: 0,
},

allowGstRate: {
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

vatOn:
  DEFAULT_VAT_ON,

cashDiscountOn:
  DEFAULT_CASH_DISCOUNT_ON,

productSelectionOn:
  DEFAULT_PRODUCT_SELECTION_ON,
  defaultCompany: "",
  defaultGodown: "",
 defaultSelection:
  DEFAULT_SELECTION,
  saveAndPrint: false,
  allowSRateLessThanPRate: false,
  updateLoadQtyAfterBillEdit: false,
  allowNegativeStock: false,

goodsReturn: true,
damageReturn: true,
schemeSummary: true,
vatSummary: true,
serialNo: false,
  autoVoucherNo: true,
  dateLocking: "",
  showEntryDays: 10,
  billingWithoutHsnCode: false,
  allowCessInPurchase: true,
allowCessInSale: false,
reverseScheme: false,
editGrossPurchase: false,
importNegative: true,
allowChangeStarAmount: false,
settleLoadNegative: true,
qrCodeFolderName: "",
saleSeriesByGst: false,
importWithZero: false,
autoBillLockDays: 0,
allowGstRate: false,

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
const readAllowedString = (
  value,
  allowedValues,
  fallback
) => {
  const normalized = String(
    value ?? fallback
  )
    .trim()
    .toUpperCase();

  return allowedValues.includes(
    normalized
  )
    ? normalized
    : fallback;
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
  readAllowedString(
    body.vatOn,
    VAT_ON_VALUES,
    readAllowedString(
      current.vatOn,
      VAT_ON_VALUES,
      DEFAULT_VAT_ON
    )
  ),

cashDiscountOn:
  readAllowedString(
    body.cashDiscountOn,
    CASH_DISCOUNT_ON_VALUES,
    readAllowedString(
      current.cashDiscountOn,
      CASH_DISCOUNT_ON_VALUES,
      DEFAULT_CASH_DISCOUNT_ON
    )
  ),

productSelectionOn:
  readAllowedString(
    body.productSelectionOn,
    PRODUCT_SELECTION_ON_VALUES,
    readAllowedString(
      current.productSelectionOn,
      PRODUCT_SELECTION_ON_VALUES,
      DEFAULT_PRODUCT_SELECTION_ON
    )
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
  readAllowedString(
    body.defaultSelection,
    DEFAULT_SELECTION_VALUES,
    readAllowedString(
      current.defaultSelection,
      DEFAULT_SELECTION_VALUES,
      DEFAULT_SELECTION
    )
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

vatSummary:
  readBoolean(
    body.vatSummary,
    current.vatSummary
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
      allowCessInPurchase:
  readBoolean(
    body.allowCessInPurchase,
    current.allowCessInPurchase
  ),

allowCessInSale:
  readBoolean(
    body.allowCessInSale,
    current.allowCessInSale
  ),

reverseScheme:
  readBoolean(
    body.reverseScheme,
    current.reverseScheme
  ),

editGrossPurchase:
  readBoolean(
    body.editGrossPurchase,
    current.editGrossPurchase
  ),

importNegative:
  readBoolean(
    body.importNegative,
    current.importNegative
  ),

allowChangeStarAmount:
  readBoolean(
    body.allowChangeStarAmount,
    current.allowChangeStarAmount
  ),

settleLoadNegative:
  readBoolean(
    body.settleLoadNegative,
    current.settleLoadNegative
  ),

qrCodeFolderName:
  readString(
    body.qrCodeFolderName,
    current.qrCodeFolderName
  ),

saleSeriesByGst:
  readBoolean(
    body.saleSeriesByGst,
    current.saleSeriesByGst
  ),

importWithZero:
  readBoolean(
    body.importWithZero,
    current.importWithZero
  ),

autoBillLockDays:
  readNonNegativeNumber(
    body.autoBillLockDays,
    current.autoBillLockDays
  ),

allowGstRate:
  readBoolean(
    body.allowGstRate,
    current.allowGstRate
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