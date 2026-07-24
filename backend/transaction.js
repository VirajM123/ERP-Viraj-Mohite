import express from "express";
import mongoose from "mongoose";

const router = express.Router();


/* ==========================
   RECEIPT SCHEMA
========================== */


const receiptSchema = new mongoose.Schema(
    {
        receiptDate: String,
        rno: Number,

        billSeries: String,
        billNo: String,

        partyId: String,
        partyName: String,

        salesmanId: String,
        salesmanName: String,

        bankCash: String,
        receiptAmount: Number,

        chequeNo: String,
        chequeDate: String,

        drawerBankId: String,
        drawerBankName: String,

        micr: String,
        narration: String,

       receiptBills: [
  {
    trnSeries: {
      type: String,
      default: ""
    },

    trnNo: {
      type: String,
      required: true
    },

    trnDate: {
      type: String,
      default: ""
    },

    amount: {
      type: Number,
      default: 0
    },

    adjustAmt: {
      type: Number,
      default: 0
    },

    balanceAmt: {
      type: Number,
      default: 0
    },

    nowAdjust: {
      type: Number,
      default: 0
    },

    discountPercent: {
      type: Number,
      default: 0
    },

    discAmt: {
      type: Number,
      default: 0
    },

    remark: {
      type: String,
      default: ""
    }
  }
],
        companyId: String,
        firmId: String,
        distributorId: String,
    },
    {
        timestamps: true,
        collection: "T_Receipt",
    }
);

/* ==========================
   CHEQUE BOUNCE SCHEMA
========================== */

const chequeBounceSchema = new mongoose.Schema(
    
    {
        distributorId: {
  type: String,
  default: "",
  trim: true,
},

firmId: {
  type: String,
  default: "",
  trim: true,
},
        chqBounceDate: String,
        trnSeries: {
            type: String,
            default: ""
        },

        trnNo: {
            type: Number,
            default: 0
        },

        chqBounceNo: String,

        partyId: String,
        partyName: String,

        chequeNo: String,
        chequeDate: String,
        chequeAmt: Number,

        chqBounceCharges: Number,
        totalAmt: Number,

        clearingDate: String,

        receiptNo: String,

        bankId: String,
        bankName: String,

        narration: String,

        companyId: String,
        companyName: String,

        status: {
            type: String,
            default: "ACTIVE"
        }
    },
    {
        timestamps: true,
        collection: "T_ChequeBounce"
    }
);

/* ==========================
   PDC DOQUET
========================== */

const pdcDocketSchema = new mongoose.Schema({
    distributorId: {
        type: String,
        default: "",
        trim: true
    },

    firmId: {
        type: String,
        default: "",
        trim: true
    },
    depositDate: String,
    docSeries: String,
    docVNo: Number,

    houseBank: String,
    bankName: String,

    houseBankId: String,
    houseBankName: String,

    fromDate: String,
    toDate: String,

    clearingType: String,
    clearingDate: String,

    narration: String,

    totalAmount: Number,
    totalCheques: Number,

    cheques: [
        {
            srNo: Number,
            chequeNo: String,
            chequeDate: String,
            amount: Number,
            clearingDate: String,

            receiptSeries: String,
            receiptNo: Number,

            receiptTrnBank: String,
            branch: String,

            partyCode: String,
            partyName: String
        }
    ]
},



    {
        timestamps: true,
        collection: "T_PDCDocket"
    }



);
const PDCDocket =
    mongoose.models.T_PDCDocket ||
    mongoose.model(
        "T_PDCDocket",
        pdcDocketSchema
    );

const ChequeBounce =
    mongoose.models.T_ChequeBounce ||
    mongoose.model(
        "T_ChequeBounce",
        chequeBounceSchema
    );

const Receipt =
    mongoose.models.T_Receipt ||
    mongoose.model("T_Receipt", receiptSchema);


/* ==========================
CONTRA SCHEMA
========================== */

/* ==========================
   CONTRA SCHEMA
========================== */

const contraSchema =
  new mongoose.Schema(
    {
      distributorId: {
        type: String,
        default: "",
        trim: true,
      },

      firmId: {
        type: String,
        default: "",
        trim: true,
      },

      transactionDate: {
        type: String,
        default: "",
      },

      tranVNo: {
        type: Number,
        default: 0,
      },

      transactionType: {
        type: String,
        default: "",
        trim: true,
      },

      amount: {
        type: Number,
        default: 0,
      },

      narration: {
        type: String,
        default: "",
        trim: true,
      },

      companyId: {
        type: String,
        default: "",
      },

      companyName: {
        type: String,
        default: "",
      },

      status: {
        type: String,
        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
      collection: "T_Contra",
    }
  );

const Contra =
  mongoose.models.T_Contra ||
  mongoose.model(
    "T_Contra",
    contraSchema
  );

    /* ==========================
   COLLECTION VOUCHER SCHEMA
========================== */

/* ==========================
   COLLECTION VOUCHER SCHEMA
========================== */

const collectionVoucherSchema =
  new mongoose.Schema(
    {
      distributorId: {
        type: String,
        default: "",
        trim: true,
      },

      firmId: {
        type: String,
        default: "",
        trim: true,
      },

      collectionDate: {
        type: String,
        default: "",
      },

      colVNo: {
        type: Number,
        default: 0,
      },

      collectionType: {
        type: String,
        default: "",
        trim: true,
      },

      narration: {
        type: String,
        default: "",
        trim: true,
      },

      totalCollectionAmount: {
        type: Number,
        default: 0,
      },

      totalCashCollection: {
        type: Number,
        default: 0,
      },

      totalChequeCollection: {
        type: Number,
        default: 0,
      },

      totalBills: {
        type: Number,
        default: 0,
      },

      bills: [
        {
          billSeries: {
            type: String,
            default: "",
          },

          billNo: {
            type: String,
            default: "",
          },

          billDate: {
            type: String,
            default: "",
          },

          partyCode: {
            type: String,
            default: "",
          },

          partyName: {
            type: String,
            default: "",
          },

          billAmt: {
            type: Number,
            default: 0,
          },

          oldCollection: {
            type: Number,
            default: 0,
          },

          balance: {
            type: Number,
            default: 0,
          },

          collectionAmt: {
            type: Number,
            default: 0,
          },

          discount: {
            type: Number,
            default: 0,
          },

          recSeries: {
            type: String,
            default: "",
          },

          recVNo: {
            type: String,
            default: "",
          },
        },
      ],

      companyId: {
        type: String,
        default: "",
      },

      companyName: {
        type: String,
        default: "",
      },

      status: {
        type: String,
        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
      collection: "T_CollectionVoucher",
    }
  );

const CollectionVoucher =
  mongoose.models.T_CollectionVoucher ||
  mongoose.model(
    "T_CollectionVoucher",
    collectionVoucherSchema
  );



    

//         const SalesInvoice =
//   mongoose.models.T_Sal_Header ||
//   mongoose.model(
//     "T_Sal_Header",
//     new mongoose.Schema({}, {
//       strict: false,
//       collection: "T_Sal_Header"
//     })
//   );

/* ==========================
   SAVE RECEIPT
========================== */

router.post("/receipt", async (req, res) => {
  try {
    const body = req.body || {};

    /*
      Accept receiptBills or items, but always save
      the final data inside receiptBills.
    */
    const incomingBills = Array.isArray(body.receiptBills)
      ? body.receiptBills
      : Array.isArray(body.items)
        ? body.items
        : [];

    /*
      Save only bills where actual adjustment or discount exists.
    */
    const adjustedBills = incomingBills
      .filter((item) => {
        const nowAdjust =
          Number(item.nowAdjust) || 0;

        const discAmt =
          Number(item.discAmt) ||
          Number(item.discAmount) ||
          0;

        return nowAdjust > 0 || discAmt > 0;
      })
      .map((item) => {
        const trnSeries = String(
          item.trnSeries ??
          item.billSeries ??
          item.BillSeries ??
          ""
        ).trim();

        const trnNo = String(
          item.trnNo ??
          item.billNo ??
          item.BillNo ??
          ""
        ).trim();

        return {
          trnSeries,
          trnNo,

          trnDate:
            item.trnDate ||
            item.billDate ||
            "",

          amount:
            Number(item.amount) || 0,

          adjustAmt:
            Number(item.adjustAmt) || 0,

          balanceAmt:
            Number(item.balanceAmt) || 0,

          nowAdjust:
            Number(item.nowAdjust) || 0,

          discountPercent:
            Number(
              item.discountPercent ??
              item.discount
            ) || 0,

          discAmt:
            Number(
              item.discAmt ??
              item.discAmount
            ) || 0,

          remark:
            String(item.remark || "").trim()
        };
      });

    if (adjustedBills.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No adjusted bill found. Enter an adjustment amount before saving."
      });
    }

    /*
      Validate that every adjusted bill has a bill number.
    */
    const billWithoutNumber = adjustedBills.find(
      (item) => !item.trnNo
    );

    if (billWithoutNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Bill number is missing in one of the adjusted bills."
      });
    }

    const firstAdjustedBill = adjustedBills[0];

    const receiptData = {
      receiptDate: body.receiptDate || "",
      rno: Number(body.rno) || 0,

      /*
        Header gets first adjusted bill.
        Complete bill allocation stays in receiptBills.
      */
      billSeries:
        String(
          body.billSeries ||
          firstAdjustedBill.trnSeries ||
          ""
        ).trim(),

      billNo:
        String(
          body.billNo ||
          firstAdjustedBill.trnNo ||
          ""
        ).trim(),

      partyId: body.partyId || "",
      partyName: body.partyName || "",

      salesmanId: body.salesmanId || "",

      salesmanName:
        body.salesmanName ||
        body.salesman ||
        "",

      bankCash: body.bankCash || "",

      receiptAmount:
        Number(body.receiptAmount) || 0,

      chequeNo: body.chequeNo || "",
      chequeDate: body.chequeDate || "",

      drawerBankId:
        body.drawerBankId || "",

      drawerBankName:
        body.drawerBankName ||
        body.drawerBank ||
        "",

      micr: body.micr || "",
      narration: body.narration || "",

      // Only adjusted bills
      receiptBills: adjustedBills,

      companyId: body.companyId || "",
      firmId: body.firmId || "",
      distributorId: body.distributorId || ""
    };

    console.log(
      "FINAL RECEIPT DATA =",
      JSON.stringify(receiptData, null, 2)
    );

    const receipt =
      await Receipt.create(receiptData);

    res.status(201).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error(
      "SAVE RECEIPT ERROR =",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
/* ==========================
   GET ALL RECEIPTS
========================== */

router.get("/receipt", async (req, res) => {
    try {
        const receipts = await Receipt.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: receipts,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/* =========================================================
   RECEIPT LIST - BACKEND PAGINATION

   Existing:
   GET /api/transaction/receipt
   remains unchanged for the current Receipt flow.

   New:
   GET /api/transaction/receipt/list
   is used only by the Receipt List grid.
   ========================================================= */

router.get(
  "/receipt/list",
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

      const receiptType = String(
        req.query.receiptType || ""
      )
        .trim()
        .toLowerCase();

      const party = String(
        req.query.party || ""
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
            "distributorId and firmId are required",
        });
      }

      const escapeRegex = (
        value
      ) =>
        String(value || "").replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const filter = {
        distributorId,
        firmId,
      };

      const andConditions = [];

      /* =====================================================
         DATE FILTER
         Receipt dates are currently stored as YYYY-MM-DD strings.
         ===================================================== */

      if (
        fromDate ||
        toDate
      ) {
        const receiptDateCondition =
          {};

        if (fromDate) {
          receiptDateCondition.$gte =
            fromDate;
        }

        if (toDate) {
          receiptDateCondition.$lte =
            toDate;
        }

        andConditions.push({
          receiptDate:
            receiptDateCondition,
        });
      }

      /* =====================================================
         PARTY FILTER
         ===================================================== */

      if (party) {
        const partyRegex =
          new RegExp(
            escapeRegex(party),
            "i"
          );

        andConditions.push({
          $or: [
            {
              partyName:
                partyRegex,
            },
            {
              partyId:
                partyRegex,
            },
          ],
        });
      }

      /* =====================================================
         RECEIPT TYPE FILTER
         Supports the existing Cash/Cheque filter.
         ===================================================== */

      if (
        receiptType === "cash"
      ) {
        andConditions.push({
          $or: [
            {
              bankCash: {
                $regex:
                  /^cash$/i,
              },
            },
            {
              bankCash: {
                $regex:
                  /cash/i,
              },
            },
          ],
        });
      }

      if (
        receiptType ===
          "cheque" ||
        receiptType ===
          "bank"
      ) {
        andConditions.push({
          $or: [
            {
              bankCash: {
                $regex:
                  /bank|cheque/i,
              },
            },
            {
              chequeNo: {
                $exists:
                  true,
                $nin: [
                  "",
                  null,
                  "-",
                  "0",
                ],
              },
            },
          ],
        });
      }

      /* =====================================================
         MAIN SEARCH
         ===================================================== */

      if (search) {
        const searchRegex =
          new RegExp(
            escapeRegex(search),
            "i"
          );

        const numericSearch =
          Number(search);

        const searchConditions = [
          {
            receiptDate:
              searchRegex,
          },

          {
            billSeries:
              searchRegex,
          },

          {
            billNo:
              searchRegex,
          },

          {
            partyId:
              searchRegex,
          },

          {
            partyName:
              searchRegex,
          },

          {
            salesmanId:
              searchRegex,
          },

          {
            salesmanName:
              searchRegex,
          },

          {
            bankCash:
              searchRegex,
          },

          {
            chequeNo:
              searchRegex,
          },

          {
            chequeDate:
              searchRegex,
          },

          {
            drawerBankId:
              searchRegex,
          },

          {
            drawerBankName:
              searchRegex,
          },

          {
            micr:
              searchRegex,
          },

          {
            narration:
              searchRegex,
          },

          {
            "receiptBills.trnSeries":
              searchRegex,
          },

          {
            "receiptBills.trnNo":
              searchRegex,
          },

          {
            "receiptBills.remark":
              searchRegex,
          },
        ];

        /*
         * Add numeric fields only when the
         * search value is a valid number.
         */
        if (
          search !== "" &&
          Number.isFinite(
            numericSearch
          )
        ) {
          searchConditions.push(
            {
              rno:
                numericSearch,
            },
            {
              receiptAmount:
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
         COUNT RECORDS
         ===================================================== */

      const totalRecords =
        await Receipt.countDocuments(
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
       * If deletion reduces the available pages,
       * return the final valid page.
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
         LOAD CURRENT PAGE ONLY
         ===================================================== */

      const receipts =
        await Receipt.find(
          filter
        )
          .sort({
            receiptDate: -1,
            rno: -1,
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        /*
         * Both names are returned for safe frontend use.
         */
        receipts,

        data:
          receipts,

        count:
          receipts.length,

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
                    receipts.length,
                  totalRecords
                ),
        },

        appliedFilters: {
          search,
          fromDate,
          toDate,
          receiptType,
          party,
        },
      });
    } catch (error) {
      console.error(
        "Receipt list pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Receipt list",
        error:
          error.message,
      });
    }
  }
);
/* ==========================
   GET SINGLE RECEIPT
========================== */

router.get("/receipt/:id", async (req, res) => {
    try {
        const receipt = await Receipt.findById(
            req.params.id
        );

        res.json({
            success: true,
            data: receipt,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/* ==========================
   DELETE RECEIPT
========================== */

router.delete("/receipt/:id", async (req, res) => {
    try {
        await Receipt.findByIdAndDelete(
            req.params.id
        );

        res.json({
            success: true,
            message: "Deleted Successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

router.get(
  "/cheque-bounce-next-no/:series",
  async (req, res) => {
    try {
      const series = String(
        req.params.series || ""
      )
        .toUpperCase()
        .trim();

      const distributorId = String(
        req.query.distributorId || ""
      ).trim();

      const firmId = String(
        req.query.firmId || ""
      ).trim();

      if (!series) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction series is required.",
        });
      }

      const filter = {
        trnSeries: series,
      };

      if (distributorId) {
        filter.distributorId =
          distributorId;
      }

      if (firmId) {
        filter.firmId =
          firmId;
      }

      const lastRecord =
        await ChequeBounce.findOne(
          filter
        )
          .sort({
            trnNo: -1,
            createdAt: -1,
          })
          .lean();

      const nextNo = lastRecord
        ? Number(lastRecord.trnNo || 0) +
          1
        : 1;

      return res.json({
        success: true,
        series,
        isNewSeries: !lastRecord,
        lastNo: lastRecord
          ? Number(lastRecord.trnNo) || 0
          : 0,
        nextNo,
      });
    } catch (error) {
      console.error(
        "Cheque Bounce next number error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate next Cheque Bounce number.",
        error: error.message,
      });
    }
  }
);

router.post(
  "/cheque-bounce",
  async (req, res) => {
    try {
      const trnSeries = String(
        req.body.trnSeries || ""
      )
        .toUpperCase()
        .trim();

      const trnNo =
        Number(req.body.trnNo) || 0;

      if (!trnSeries) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction Series is required.",
        });
      }

      if (trnNo <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction Number is required.",
        });
      }

      const distributorId = String(
        req.body.distributorId || ""
      ).trim();

      const firmId = String(
        req.body.firmId || ""
      ).trim();

      const exists =
        await ChequeBounce.findOne({
          distributorId,
          firmId,
          trnSeries,
          trnNo,
        });

      if (exists) {
        return res.status(400).json({
          success: false,
          message:
            `${trnSeries}-${trnNo} already exists.`,
        });
      }

      const payload = {
        ...req.body,
        distributorId,
        firmId,
        trnSeries,
        trnNo,
        chqBounceNo:
          String(trnNo),
      };

      const data =
        await ChequeBounce.create(
          payload
        );

      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        "Save Cheque Bounce error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.get("/cheque-bounce", async (req, res) => {
    try {
        const records = await ChequeBounce.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: records
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
/* =========================================================
   CHEQUE BOUNCE LIST - BACKEND PAGINATION

   Existing:
   GET /api/transaction/cheque-bounce
   remains unchanged.

   New:
   GET /api/transaction/cheque-bounce/list
   is used only by the list grid.
   ========================================================= */

router.get(
  "/cheque-bounce/list",
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

      const party = String(
        req.query.party || ""
      ).trim();

      const bank = String(
        req.query.bank || ""
      ).trim();

      const chequeNo = String(
        req.query.chequeNo || ""
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

      /*
       * New records are filtered by distributor and firm.
       *
       * The empty-field conditions temporarily keep old
       * Cheque Bounce records visible because older records
       * were saved before these fields were added.
       */
      const filter = {
        $and: [
          {
            $or: [
              {
                distributorId,
              },
              {
                distributorId: "",
              },
              {
                distributorId: {
                  $exists: false,
                },
              },
            ],
          },

          {
            $or: [
              {
                firmId,
              },
              {
                firmId: "",
              },
              {
                firmId: {
                  $exists: false,
                },
              },
            ],
          },
        ],
      };

      const andConditions = [];

      /* =========================
         DATE FILTER
         ========================= */

      if (fromDate || toDate) {
        const dateCondition = {};

        if (fromDate) {
          dateCondition.$gte =
            fromDate;
        }

        if (toDate) {
          dateCondition.$lte =
            toDate;
        }

        andConditions.push({
          chqBounceDate:
            dateCondition,
        });
      }

      /* =========================
         PARTY FILTER
         ========================= */

      if (party) {
        const partyRegex =
          new RegExp(
            escapeRegex(party),
            "i"
          );

        andConditions.push({
          $or: [
            {
              partyName:
                partyRegex,
            },
            {
              partyId:
                partyRegex,
            },
          ],
        });
      }

      /* =========================
         BANK FILTER
         ========================= */

      if (bank) {
        const bankRegex =
          new RegExp(
            escapeRegex(bank),
            "i"
          );

        andConditions.push({
          $or: [
            {
              bankName:
                bankRegex,
            },
            {
              bankId:
                bankRegex,
            },
          ],
        });
      }

      /* =========================
         CHEQUE NUMBER FILTER
         ========================= */

      if (chequeNo) {
        andConditions.push({
          chequeNo: {
            $regex:
              escapeRegex(chequeNo),
            $options: "i",
          },
        });
      }

      /* =========================
         MAIN SEARCH
         ========================= */

      if (search) {
        const searchRegex =
          new RegExp(
            escapeRegex(search),
            "i"
          );

        const numericSearch =
          Number(search);

        const searchConditions = [
          {
            chqBounceDate:
              searchRegex,
          },

          {
            trnSeries:
              searchRegex,
          },

          {
            chqBounceNo:
              searchRegex,
          },

          {
            partyId:
              searchRegex,
          },

          {
            partyName:
              searchRegex,
          },

          {
            chequeNo:
              searchRegex,
          },

          {
            chequeDate:
              searchRegex,
          },

          {
            clearingDate:
              searchRegex,
          },

          {
            receiptNo:
              searchRegex,
          },

          {
            bankId:
              searchRegex,
          },

          {
            bankName:
              searchRegex,
          },

          {
            narration:
              searchRegex,
          },

          {
            companyId:
              searchRegex,
          },

          {
            companyName:
              searchRegex,
          },

          {
            status:
              searchRegex,
          },
        ];

        if (
          search !== "" &&
          Number.isFinite(
            numericSearch
          )
        ) {
          searchConditions.push(
            {
              trnNo:
                numericSearch,
            },

            {
              chequeAmt:
                numericSearch,
            },

            {
              chqBounceCharges:
                numericSearch,
            },

            {
              totalAmt:
                numericSearch,
            }
          );
        }

        andConditions.push({
          $or:
            searchConditions,
        });
      }

      if (andConditions.length > 0) {
        filter.$and.push(
          ...andConditions
        );
      }

      const totalRecords =
        await ChequeBounce.countDocuments(
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

      const records =
        await ChequeBounce.find(
          filter
        )
          .sort({
            chqBounceDate: -1,
            trnNo: -1,
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        records,

        data:
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
          party,
          bank,
          chequeNo,
        },
      });
    } catch (error) {
      console.error(
        "Cheque Bounce pagination error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load Cheque Bounce list",
        error:
          error.message,
      });
    }
  }
);

router.get("/cheque-bounce/:id", async (req, res) => {
    try {
        const record =
            await ChequeBounce.findById(
                req.params.id
            );

        res.json({
            success: true,
            data: record
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});



router.delete("/cheque-bounce/:id", async (req, res) => {
    try {
        await ChequeBounce.findByIdAndDelete(
            req.params.id
        );

        res.json({
            success: true,
            message: "Deleted Successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post("/pdc-docket", async (req, res) => {
    try {

        const data = await PDCDocket.create(req.body);

        res.status(201).json({
            success: true,
            data
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
});

router.get("/pdc-docket", async (req, res) => {
    try {

        const records = await PDCDocket
            .find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: records
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
});

/* =========================================================
   PDC DOCKET LIST - BACKEND PAGINATION

   Existing:
   GET /api/transaction/pdc-docket
   remains unchanged.

   New:
   GET /api/transaction/pdc-docket/list
   is used only by the PDC Docket list grid.
   ========================================================= */

router.get(
    "/pdc-docket/list",
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

            const fromDepositDate = String(
                req.query.fromDepositDate || ""
            ).trim();

            const toDepositDate = String(
                req.query.toDepositDate || ""
            ).trim();

            const houseBank = String(
                req.query.houseBank || ""
            ).trim();

            const pdcType = String(
                req.query.pdcType || ""
            ).trim();

            const docketNo = String(
                req.query.docketNo || ""
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

            if (!distributorId || !firmId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "distributorId and firmId are required"
                });
            }

            const escapeRegex = (value) =>
                String(value || "").replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );

            /*
             * New records use distributorId and firmId.
             *
             * Blank or missing values are temporarily allowed
             * so older PDC records remain visible.
             */
            const filter = {
                $and: [
                    {
                        $or: [
                            {
                                distributorId
                            },
                            {
                                distributorId: ""
                            },
                            {
                                distributorId: {
                                    $exists: false
                                }
                            }
                        ]
                    },

                    {
                        $or: [
                            {
                                firmId
                            },
                            {
                                firmId: ""
                            },
                            {
                                firmId: {
                                    $exists: false
                                }
                            }
                        ]
                    }
                ]
            };

            const andConditions = [];

            /* =========================
               DEPOSIT DATE FILTER
               ========================= */

            if (
                fromDepositDate ||
                toDepositDate
            ) {
                const dateCondition = {};

                if (fromDepositDate) {
                    dateCondition.$gte =
                        fromDepositDate;
                }

                if (toDepositDate) {
                    dateCondition.$lte =
                        toDepositDate;
                }

                andConditions.push({
                    depositDate:
                        dateCondition
                });
            }

            /* =========================
               HOUSE BANK FILTER
               ========================= */

            if (houseBank) {
                const bankRegex =
                    new RegExp(
                        escapeRegex(
                            houseBank
                        ),
                        "i"
                    );

                andConditions.push({
                    $or: [
                        {
                            houseBank:
                                bankRegex
                        },
                        {
                            bankName:
                                bankRegex
                        },
                        {
                            houseBankId:
                                bankRegex
                        },
                        {
                            houseBankName:
                                bankRegex
                        }
                    ]
                });
            }

            /* =========================
               PDC / CLEARING TYPE FILTER
               ========================= */

            if (pdcType) {
                andConditions.push({
                    clearingType: {
                        $regex:
                            escapeRegex(
                                pdcType
                            ),
                        $options: "i"
                    }
                });
            }

            /* =========================
               DOCKET NUMBER FILTER
               ========================= */

            if (docketNo) {
                const numericDocketNo =
                    Number(docketNo);

                const docketConditions = [
                    {
                        docSeries: {
                            $regex:
                                escapeRegex(
                                    docketNo
                                ),
                            $options: "i"
                        }
                    }
                ];

                if (
                    Number.isFinite(
                        numericDocketNo
                    )
                ) {
                    docketConditions.push({
                        docVNo:
                            numericDocketNo
                    });
                }

                andConditions.push({
                    $or:
                        docketConditions
                });
            }

            /* =========================
               MAIN SEARCH
               ========================= */

            if (search) {
                const searchRegex =
                    new RegExp(
                        escapeRegex(search),
                        "i"
                    );

                const numericSearch =
                    Number(search);

                const searchConditions = [
                    {
                        depositDate:
                            searchRegex
                    },

                    {
                        docSeries:
                            searchRegex
                    },

                    {
                        houseBank:
                            searchRegex
                    },

                    {
                        bankName:
                            searchRegex
                    },

                    {
                        houseBankId:
                            searchRegex
                    },

                    {
                        houseBankName:
                            searchRegex
                    },

                    {
                        fromDate:
                            searchRegex
                    },

                    {
                        toDate:
                            searchRegex
                    },

                    {
                        clearingType:
                            searchRegex
                    },

                    {
                        clearingDate:
                            searchRegex
                    },

                    {
                        narration:
                            searchRegex
                    },

                    {
                        "cheques.chequeNo":
                            searchRegex
                    },

                    {
                        "cheques.chequeDate":
                            searchRegex
                    },

                    {
                        "cheques.clearingDate":
                            searchRegex
                    },

                    {
                        "cheques.receiptSeries":
                            searchRegex
                    },

                    {
                        "cheques.receiptTrnBank":
                            searchRegex
                    },

                    {
                        "cheques.branch":
                            searchRegex
                    },

                    {
                        "cheques.partyCode":
                            searchRegex
                    },

                    {
                        "cheques.partyName":
                            searchRegex
                    }
                ];

                if (
                    search !== "" &&
                    Number.isFinite(
                        numericSearch
                    )
                ) {
                    searchConditions.push(
                        {
                            docVNo:
                                numericSearch
                        },

                        {
                            totalAmount:
                                numericSearch
                        },

                        {
                            totalCheques:
                                numericSearch
                        },

                        {
                            "cheques.receiptNo":
                                numericSearch
                        },

                        {
                            "cheques.amount":
                                numericSearch
                        }
                    );
                }

                andConditions.push({
                    $or:
                        searchConditions
                });
            }

            if (
                andConditions.length > 0
            ) {
                filter.$and.push(
                    ...andConditions
                );
            }

            /* =========================
               COUNT FILTERED RECORDS
               ========================= */

            const totalRecords =
                await PDCDocket.countDocuments(
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
             * Prevent an invalid page after deleting
             * the last record from the current page.
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

            /* =========================
               LOAD CURRENT PAGE
               ========================= */

            const records =
                await PDCDocket.find(
                    filter
                )
                    .sort({
                        depositDate: -1,
                        docVNo: -1,
                        createdAt: -1,
                        _id: -1
                    })
                    .skip(skip)
                    .limit(limit)
                    .lean();

            return res.json({
                success: true,

                records,

                data:
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
                            )
                },

                appliedFilters: {
                    search,
                    fromDepositDate,
                    toDepositDate,
                    houseBank,
                    pdcType,
                    docketNo
                }
            });
        } catch (error) {
            console.error(
                "PDC Docket pagination error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load PDC Docket list",
                error:
                    error.message
            });
        }
    }
);

router.delete("/pdc-docket/:id", async (req, res) => {
    try {

        await PDCDocket.findByIdAndDelete(
            req.params.id
        );

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
});

router.post("/contra", async (req, res) => {
  try {

    const data = await Contra.create(req.body);

    res.status(201).json({
      success: true,
      data
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});

router.get("/contra", async (req, res) => {
  try {

    const records = await Contra
      .find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: records
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});

 /* =========================================================
   CONTRA LIST - BACKEND PAGINATION

   Existing:
   GET /api/transaction/contra

   New:
   GET /api/transaction/contra/list
   ========================================================= */

router.get(
  "/contra/list",
  async (req, res) => {
    try {
      const distributorId =
        String(
          req.query.distributorId ||
          ""
        ).trim();

      const firmId =
        String(
          req.query.firmId ||
          ""
        ).trim();

      const search =
        String(
          req.query.search ||
          ""
        ).trim();

      const fromDate =
        String(
          req.query.fromDate ||
          ""
        ).trim();

      const toDate =
        String(
          req.query.toDate ||
          ""
        ).trim();

      const transactionType =
        String(
          req.query.transactionType ||
          ""
        ).trim();

      const voucherNo =
        String(
          req.query.voucherNo ||
          ""
        ).trim();

      const narration =
        String(
          req.query.narration ||
          ""
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

      const escapeRegex = (
        value
      ) =>
        String(
          value || ""
        ).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      /*
       * Blank tenant values are temporarily
       * allowed so old Contra records remain
       * visible after adding these new fields.
       */
      const filter = {
        $and: [
          {
            $or: [
              {
                distributorId,
              },
              {
                distributorId: "",
              },
              {
                distributorId: {
                  $exists: false,
                },
              },
            ],
          },

          {
            $or: [
              {
                firmId,
              },
              {
                firmId: "",
              },
              {
                firmId: {
                  $exists: false,
                },
              },
            ],
          },
        ],
      };

      const andConditions = [];

      /* =========================
         TRANSACTION DATE FILTER
         ========================= */

      if (
        fromDate ||
        toDate
      ) {
        const dateCondition = {};

        if (fromDate) {
          dateCondition.$gte =
            fromDate;
        }

        if (toDate) {
          dateCondition.$lte =
            toDate;
        }

        andConditions.push({
          transactionDate:
            dateCondition,
        });
      }

      /* =========================
         TRANSACTION TYPE FILTER
         ========================= */

      if (transactionType) {
        andConditions.push({
          transactionType: {
            $regex:
              escapeRegex(
                transactionType
              ),
            $options: "i",
          },
        });
      }

      /* =========================
         VOUCHER NUMBER FILTER
         ========================= */

      if (voucherNo) {
        const numericVoucherNo =
          Number(voucherNo);

        if (
          Number.isFinite(
            numericVoucherNo
          )
        ) {
          andConditions.push({
            tranVNo:
              numericVoucherNo,
          });
        } else {
          /*
           * tranVNo is numeric, so a
           * non-numeric voucher filter
           * cannot match any record.
           */
          andConditions.push({
            _id: null,
          });
        }
      }

      /* =========================
         NARRATION FILTER
         ========================= */

      if (narration) {
        andConditions.push({
          narration: {
            $regex:
              escapeRegex(
                narration
              ),
            $options: "i",
          },
        });
      }

      /* =========================
         MAIN SEARCH
         ========================= */

      if (search) {
        const searchRegex =
          new RegExp(
            escapeRegex(search),
            "i"
          );

        const numericSearch =
          Number(search);

        const searchConditions = [
          {
            transactionDate:
              searchRegex,
          },

          {
            transactionType:
              searchRegex,
          },

          {
            narration:
              searchRegex,
          },

          {
            companyId:
              searchRegex,
          },

          {
            companyName:
              searchRegex,
          },

          {
            status:
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
              tranVNo:
                numericSearch,
            },
            {
              amount:
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
        filter.$and.push(
          ...andConditions
        );
      }

      /* =========================
         COUNT RECORDS
         ========================= */

      const totalRecords =
        await Contra.countDocuments(
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

      /* =========================
         LOAD CURRENT PAGE
         ========================= */

      const records =
        await Contra.find(
          filter
        )
          .sort({
            transactionDate: -1,
            tranVNo: -1,
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        records,

        data: records,

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
          transactionType,
          voucherNo,
          narration,
        },
      });
    } catch (error) {
      console.error(
        "Contra pagination error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load Contra list",
          error:
            error.message,
        });
    }
  }
);

router.delete("/contra/:id", async (req, res) => {
  try {

    await Contra.findByIdAndDelete(
      req.params.id
    );

    res.json({
      success: true
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});
router.get(
  "/contra-next-no",
  async (req, res) => {
    try {
      const distributorId =
        String(
          req.query.distributorId ||
          ""
        ).trim();

      const firmId =
        String(
          req.query.firmId ||
          ""
        ).trim();

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

      const lastRecord =
        await Contra.findOne({
          distributorId,
          firmId,
        }).sort({
          tranVNo: -1,
          createdAt: -1,
        });

      const nextNo =
        lastRecord
          ? Number(
              lastRecord.tranVNo
            ) + 1
          : 1;

      return res.json({
        success: true,
        nextNo,
      });
    } catch (error) {
      console.error(
        "Contra next number error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  }
);
router.post("/collection-voucher", async (req, res) => {
    try {

        const data = await CollectionVoucher.create(req.body);

        res.status(201).json({
            success: true,
            data
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
});

router.get("/collection-voucher", async (req, res) => {

    try {

        const records = await CollectionVoucher
            .find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: records
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

/* =========================================================
   COLLECTION VOUCHER LIST - BACKEND PAGINATION
   ========================================================= */

router.get(
  "/collection-voucher/list",
  async (req, res) => {
    try {
      const distributorId =
        String(
          req.query.distributorId ||
          ""
        ).trim();

      const firmId =
        String(
          req.query.firmId ||
          ""
        ).trim();

      const search =
        String(
          req.query.search ||
          ""
        ).trim();

      const fromDate =
        String(
          req.query.fromDate ||
          ""
        ).trim();

      const toDate =
        String(
          req.query.toDate ||
          ""
        ).trim();

      const collectionType =
        String(
          req.query.collectionType ||
          ""
        ).trim();

      const voucherNo =
        String(
          req.query.voucherNo ||
          ""
        ).trim();

      const minimumAmount =
        String(
          req.query.minimumAmount ||
          ""
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

      const escapeRegex = (
        value
      ) =>
        String(
          value || ""
        ).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      /*
       * Old records with blank tenant fields
       * remain visible during migration.
       */
      const filter = {
        $and: [
          {
            $or: [
              {
                distributorId,
              },
              {
                distributorId: "",
              },
              {
                distributorId: {
                  $exists: false,
                },
              },
            ],
          },

          {
            $or: [
              {
                firmId,
              },
              {
                firmId: "",
              },
              {
                firmId: {
                  $exists: false,
                },
              },
            ],
          },
        ],
      };

      const andConditions = [];

      /* =========================
         COLLECTION DATE FILTER
         ========================= */

      if (
        fromDate ||
        toDate
      ) {
        const dateCondition = {};

        if (fromDate) {
          dateCondition.$gte =
            fromDate;
        }

        if (toDate) {
          dateCondition.$lte =
            toDate;
        }

        andConditions.push({
          collectionDate:
            dateCondition,
        });
      }

      /* =========================
         COLLECTION TYPE FILTER
         ========================= */

      if (collectionType) {
        andConditions.push({
          collectionType: {
            $regex:
              escapeRegex(
                collectionType
              ),
            $options: "i",
          },
        });
      }

      /* =========================
         VOUCHER NUMBER FILTER
         ========================= */

      if (voucherNo) {
        const numericVoucherNo =
          Number(voucherNo);

        if (
          Number.isFinite(
            numericVoucherNo
          )
        ) {
          andConditions.push({
            colVNo:
              numericVoucherNo,
          });
        } else {
          andConditions.push({
            _id: null,
          });
        }
      }

      /* =========================
         MINIMUM AMOUNT FILTER
         ========================= */

      if (minimumAmount) {
        const numericMinimumAmount =
          Number(minimumAmount);

        if (
          Number.isFinite(
            numericMinimumAmount
          )
        ) {
          andConditions.push({
            totalCollectionAmount: {
              $gte:
                numericMinimumAmount,
            },
          });
        }
      }

      /* =========================
         MAIN SEARCH
         ========================= */

      if (search) {
        const searchRegex =
          new RegExp(
            escapeRegex(search),
            "i"
          );

        const numericSearch =
          Number(search);

        const searchConditions = [
          {
            collectionDate:
              searchRegex,
          },

          {
            collectionType:
              searchRegex,
          },

          {
            narration:
              searchRegex,
          },

          {
            companyId:
              searchRegex,
          },

          {
            companyName:
              searchRegex,
          },

          {
            status:
              searchRegex,
          },

          {
            "bills.billSeries":
              searchRegex,
          },

          {
            "bills.billNo":
              searchRegex,
          },

          {
            "bills.partyCode":
              searchRegex,
          },

          {
            "bills.partyName":
              searchRegex,
          },

          {
            "bills.recSeries":
              searchRegex,
          },

          {
            "bills.recVNo":
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
              colVNo:
                numericSearch,
            },

            {
              totalCollectionAmount:
                numericSearch,
            },

            {
              totalCashCollection:
                numericSearch,
            },

            {
              totalChequeCollection:
                numericSearch,
            },

            {
              totalBills:
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
        filter.$and.push(
          ...andConditions
        );
      }

      const totalRecords =
        await CollectionVoucher
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

      const records =
        await CollectionVoucher
          .find(filter)
          .sort({
            collectionDate: -1,
            colVNo: -1,
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      return res.json({
        success: true,

        records,

        data:
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
          collectionType,
          voucherNo,
          minimumAmount,
        },
      });
    } catch (error) {
      console.error(
        "Collection Voucher pagination error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load Collection Voucher list",
          error:
            error.message,
        });
    }
  }
);
router.delete("/collection-voucher/:id", async (req, res) => {

    try {

        await CollectionVoucher.findByIdAndDelete(
            req.params.id
        );

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

router.get(
  "/collection-voucher-next-no",
  async (req, res) => {
    try {
      const distributorId =
        String(
          req.query.distributorId ||
          ""
        ).trim();

      const firmId =
        String(
          req.query.firmId ||
          ""
        ).trim();

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

      const lastRecord =
        await CollectionVoucher
          .findOne({
            distributorId,
            firmId,
          })
          .sort({
            colVNo: -1,
            createdAt: -1,
          });

      const nextNo =
        lastRecord
          ? Number(
              lastRecord.colVNo
            ) + 1
          : 1;

      return res.json({
        success: true,
        nextNo,
      });
    } catch (error) {
      console.error(
        "Collection Voucher next number error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  }
);


export default router;      
