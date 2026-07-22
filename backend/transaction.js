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

const contraSchema = new mongoose.Schema(
    {
        transactionDate: String,
        tranVNo: Number,
        transactionType: String,
        amount: Number,
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
        collection: "T_Contra"
    }
);

const Contra =
    mongoose.models.T_Contra ||
    mongoose.model("T_Contra", contraSchema);

    /* ==========================
   COLLECTION VOUCHER SCHEMA
========================== */

const collectionVoucherSchema = new mongoose.Schema(
{
    collectionDate: String,
    colVNo: Number,

    collectionType: String,
    narration: String,

    totalCollectionAmount: Number,
    totalCashCollection: Number,
    totalChequeCollection: Number,
    totalBills: Number,

    bills: [
        {
            billSeries: String,
            billNo: String,
            billDate: String,

            partyCode: String,
            partyName: String,

            billAmt: Number,
            oldCollection: Number,
            balance: Number,

            collectionAmt: Number,
            discount: Number,

            recSeries: String,
            recVNo: String
        }
    ],

    companyId: String,
    companyName: String,

    status: {
        type: String,
        default: "ACTIVE"
    }
},
{
    timestamps: true,
    collection: "T_CollectionVoucher"
});


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

router.get("/cheque-bounce-next-no/:series", async (req, res) => {
    try {

        const series = req.params.series;

        const lastRecord = await ChequeBounce
            .findOne({ trnSeries: series })
            .sort({ trnNo: -1 });

        if (!lastRecord) {
            return res.json({
                success: true,
                isNewSeries: true,
                nextNo: 1
            });
        }

        res.json({
            success: true,
            isNewSeries: false,
            nextNo: Number(lastRecord.trnNo) + 1
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

router.post("/cheque-bounce", async (req, res) => {
    try {

        const exists = await ChequeBounce.findOne({
            chqBounceNo: req.body.chqBounceNo
        });

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Cheque Bounce No already exists"
            });
        }

        const data = await ChequeBounce.create(req.body);

        res.json({
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

router.get("/contra-next-no", async (req, res) => {
  try {

    const lastRecord = await Contra
      .findOne()
      .sort({ tranVNo: -1 });

    const nextNo = lastRecord
      ? Number(lastRecord.tranVNo) + 1
      : 1;

    res.json({
      success: true,
      nextNo
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});

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

router.get("/collection-voucher-next-no", async (req, res) => {

    try {

        const lastRecord =
            await CollectionVoucher
                .findOne()
                .sort({ colVNo: -1 });

        const nextNo =
            lastRecord
                ? Number(lastRecord.colVNo) + 1
                : 1;

        res.json({
            success: true,
            nextNo
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});


export default router;      
