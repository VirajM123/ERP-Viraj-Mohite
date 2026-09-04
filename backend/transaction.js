import express from "express";
import mongoose from "mongoose";
import { nextDocumentNumber } from "./counters.js";
import { postBalancedJournal, reverseSourceJournal } from "./accounting.js";
import { writeAuditEvent } from "./audit.js";

export const paymentAmountFromBody = (body) => {
  const amount = Number(body.amount ?? body.drAmt ?? body.crAmt ?? body.summary?.totalDrAmt ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error("Payment amount must be greater than zero."), { statusCode: 400 });
  }
  const credit = Number(body.crAmt ?? amount);
  const debit = Number(body.drAmt ?? amount);
  if (!Number.isFinite(credit) || !Number.isFinite(debit) || Math.abs(credit - debit) > 0.01 || Math.abs(amount - debit) > 0.01) {
    throw Object.assign(new Error("Payment debit and credit amounts must be equal."), { statusCode: 400 });
  }
  return amount;
};

export const normalizePaymentAllocations = (body) => (Array.isArray(body.allocations) ? body.allocations : body.items || [])
  .map((item) => ({
    trn: String(item.trn || "PUR"),
    trnSeries: String(item.trnSeries || item.vouSer || "").trim(),
    voucherNo: String(item.voucherNo ?? item.vouNo ?? "").trim(),
    amount: Number(item.amount || 0),
    previouslyAdjusted: Number(item.previouslyAdjusted ?? item.adjustedAmt ?? 0),
    allocatedAmount: Number(item.allocatedAmount ?? item.newAdjusted ?? 0),
  }))
  .filter((item) => item.allocatedAmount > 0);

export default function createTransactionRouter(securityRouter) {

const router = express.Router();

const tenantFilter = (req, extra = {}) => ({
  ...extra,
  distributorId: req.auth.distributorId,
  firmId: req.auth.firmId,
});


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

loadNo: {
  type: String,
  default: ""
},

rloadNo: {
  type: String,
  default: ""
},

docketNo: {
  type: String,
  default: ""
},

addUser: {
  type: String,
  default: ""
},

editUser: {
  type: String,
  default: ""
},

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
        idempotencyKey: { type: String, default: "" },
        status: { type: String, enum: ["POSTED", "REVERSED"], default: "POSTED" },
        reversedAt: { type: Date, default: null },
        reversedBy: { type: String, default: "" },
        reversalReason: { type: String, default: "" },
    },
    {
        timestamps: true,
        collection: "T_Receipt",
    }
);
receiptSchema.index({ distributorId: 1, firmId: 1, idempotencyKey: 1 }, {
  unique: true,
  partialFilterExpression: { idempotencyKey: { $type: "string", $gt: "" } },
});
receiptSchema.index({ distributorId: 1, firmId: 1, billSeries: 1, rno: 1 }, { unique: true });

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

chequeBounceSchema.index({ distributorId: 1, firmId: 1, trnSeries: 1, trnNo: 1 }, { unique: true });
pdcDocketSchema.index({ distributorId: 1, firmId: 1, docSeries: 1, docVNo: 1 }, { unique: true });

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
   FIND CHEQUE DETAILS REPORT
========================== */

router.get(
  "/find-cheque-details",
  securityRouter.authorizeRequest("REPORTS", "PARTY_WISE_SALES", "view"),
  async (req, res) => {
    try {
      const chequeNo = String(req.query.chequeNo || "").trim();
      if (!chequeNo) {
        return res.status(400).json({ success: false, message: "Cheque number is required." });
      }

      const escapedChequeNo = chequeNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const exactCheque = new RegExp(`^${escapedChequeNo}$`, "i");
      const tenant = tenantFilter(req);

      const [receipts, bounces, dockets] = await Promise.all([
        Receipt.find({ ...tenant, chequeNo: exactCheque, status: { $ne: "REVERSED" } })
          .sort({ receiptDate: 1, createdAt: 1 })
          .lean(),
        ChequeBounce.find({ ...tenant, chequeNo: exactCheque, status: { $ne: "REVERSED" } })
          .sort({ chqBounceDate: 1, createdAt: 1 })
          .lean(),
        PDCDocket.find({ ...tenant, cheques: { $elemMatch: { chequeNo: exactCheque } }, status: { $ne: "REVERSED" } })
          .sort({ depositDate: 1, createdAt: 1 })
          .lean(),
      ]);

      const docketEntries = dockets.flatMap((docket) =>
        (Array.isArray(docket.cheques) ? docket.cheques : [])
          .filter((entry) => exactCheque.test(String(entry.chequeNo || "").trim()))
          .map((entry) => ({
            docketId: docket._id,
            docketNo: `${docket.docSeries || "PDC"}-${docket.docVNo || ""}`,
            depositDate: docket.depositDate || "",
            addedAt: docket.createdAt || null,
            bankName: docket.houseBankName || docket.bankName || docket.houseBank || "",
            clearingType: docket.clearingType || "",
            clearingDate: entry.clearingDate || docket.clearingDate || "",
            amount: Number(entry.amount || 0),
            receiptSeries: entry.receiptSeries || "",
            receiptNo: entry.receiptNo || "",
            partyCode: entry.partyCode || "",
            partyName: entry.partyName || "",
          }))
      );

      const receiptSummaries = receipts.map((receipt) => {
        const receiptNo = String(receipt.rno || "");
        const partyName = String(receipt.partyName || "").trim().toLowerCase();
        const receivingBank = String(receipt.bankCash || "").trim().toLowerCase();
        const samePartyReceipts = receipts.filter((item) =>
          String(item.partyName || "").trim().toLowerCase() === partyName
        );
        const relatedBounces = bounces.filter((bounce) => {
          const bounceReceiptNo = String(bounce.receiptNo || "").replace(/\D/g, "");
          const bounceBank = String(bounce.bankName || "").trim().toLowerCase();
          const sameParty = String(bounce.partyName || "").trim().toLowerCase() === partyName;
          return (bounceReceiptNo && bounceReceiptNo === receiptNo.replace(/\D/g, "")) ||
            (!bounceReceiptNo && sameParty && (
              (bounceBank && bounceBank === receivingBank) ||
              (!bounceBank && samePartyReceipts.length === 1)
            ));
        });
        const relatedDockets = docketEntries.filter((docket) => {
          const docketReceiptNo = String(docket.receiptNo || "").replace(/\D/g, "");
          const docketBank = String(docket.bankName || "").trim().toLowerCase();
          const sameParty = String(docket.partyName || "").trim().toLowerCase() === partyName;
          return (docketReceiptNo && docketReceiptNo === receiptNo.replace(/\D/g, "")) ||
            (!docketReceiptNo && sameParty && (
              (docketBank && docketBank === receivingBank) ||
              (!docketBank && samePartyReceipts.length === 1)
            ));
        });

        return {
          receiptId: receipt._id,
          receiptNo: receipt.rno || "",
          receiptDate: receipt.receiptDate || "",
          chequeDate: receipt.chequeDate || "",
          amount: Number(receipt.receiptAmount || 0),
          partyId: receipt.partyId || "",
          partyName: receipt.partyName || "",
          bankName: receipt.bankCash || "",
          drawerBankName: receipt.drawerBankName || "",
          micr: receipt.micr || "",
          narration: receipt.narration || "",
          bills: Array.isArray(receipt.receiptBills) ? receipt.receiptBills : [],
          bounces: relatedBounces,
          dockets: relatedDockets,
        };
      });

      res.json({
        success: true,
        data: {
          chequeNo,
          summaries: receiptSummaries,
          unmatchedBounces: bounces.filter((bounce) => !receiptSummaries.some((summary) => summary.bounces.some((item) => String(item._id) === String(bounce._id)))),
          unmatchedDockets: docketEntries.filter((docket) => !receiptSummaries.some((summary) => summary.dockets.some((item) => String(item.docketId) === String(docket.docketId) && String(item.receiptNo) === String(docket.receiptNo)))),
        },
      });
    } catch (error) {
      console.error("Find cheque details report error:", error);
      res.status(500).json({ success: false, message: "Unable to find cheque details." });
    }
  }
);

/* ==========================
   PAYMENT VOUCHER SCHEMA
   Additive model: the existing Receipt/PDC/Contra collections are untouched.
========================== */
const paymentAllocationSchema = new mongoose.Schema({
  trn: { type: String, default: "PUR" },
  trnSeries: { type: String, default: "" },
  voucherNo: { type: String, default: "" },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, default: null },
  amount: { type: Number, default: 0 },
  previouslyAdjusted: { type: Number, default: 0 },
  allocatedAmount: { type: Number, default: 0 },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  distributorId: { type: String, required: true, trim: true },
  firmId: { type: String, required: true, trim: true },
  vDate: { type: String, required: true },
  vNo: { type: Number, required: true },
  partyCode: { type: String, default: "" },
  partyName: { type: String, required: true },
  bankCash: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  narration: { type: String, default: "" },
  reference: { type: String, default: "" },
  chequeNo: { type: String, default: "" },
  chequeDate: { type: String, default: "" },
  clearingDate: { type: String, default: "" },
  partyBankName: { type: String, default: "" },
  bankAccountNo: { type: String, default: "" },
  allocations: { type: [paymentAllocationSchema], default: [] },
  idempotencyKey: { type: String, default: "" },
  status: { type: String, enum: ["POSTED", "REVERSED"], default: "POSTED" },
  reversedAt: { type: Date, default: null },
  reversedBy: { type: String, default: "" },
  reversalReason: { type: String, default: "" },
  editHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true, collection: "T_Payment" });

paymentSchema.index({ distributorId: 1, firmId: 1, vNo: 1 }, { unique: true });
paymentSchema.index({ distributorId: 1, firmId: 1, idempotencyKey: 1 }, {
  unique: true,
  partialFilterExpression: { idempotencyKey: { $type: "string", $gt: "" } },
});

const Payment = mongoose.models.T_Payment || mongoose.model("T_Payment", paymentSchema);

const getPurchaseModel = () => mongoose.models.T_Pur_Header;

const findPurchaseForAllocation = async (req, allocation, session) => {
  const Purchase = getPurchaseModel();
  if (!Purchase) throw new Error("Purchase model is unavailable.");
  const numericVoucher = Number(String(allocation.voucherNo).match(/(\d+)$/)?.[1] || allocation.voucherNo);
  if (!Number.isFinite(numericVoucher) || numericVoucher <= 0) {
    throw Object.assign(new Error(`Invalid purchase voucher ${allocation.voucherNo}.`), { statusCode: 400 });
  }
  const series = String(allocation.trnSeries || "").trim();
  const purchase = await Purchase.findOne(tenantFilter(req, {
    vouNo: numericVoucher,
    isActive: { $ne: false },
    ...(series ? { vouSer: series } : {}),
  })).session(session);
  if (!purchase) {
    throw Object.assign(new Error(`Purchase ${series}-${numericVoucher} was not found.`), { statusCode: 404 });
  }
  return purchase;
};

const reservePaymentAllocations = async (req, allocations, partyName, session) => {
  const reserved = [];
  for (const allocation of allocations) {
    const purchase = await findPurchaseForAllocation(req, allocation, session);
    if (partyName && String(purchase.supplierName || "").trim().toLowerCase() !== partyName.trim().toLowerCase()) {
      throw Object.assign(new Error("Every allocated purchase must belong to the selected supplier."), { statusCode: 400 });
    }
    const billAmount = Number(purchase.netAmt || 0);
    const alreadyAllocated = Number(purchase.paymentAllocated || 0);
    if (allocation.allocatedAmount > billAmount - alreadyAllocated + 0.01) {
      throw Object.assign(new Error(`Payment exceeds the pending amount for purchase ${purchase.vouSer}-${purchase.vouNo}.`), { statusCode: 409 });
    }
    const result = await purchase.constructor.updateOne(
      { _id: purchase._id, $expr: { $eq: [{ $ifNull: ["$paymentAllocated", 0] }, alreadyAllocated] } },
      { $inc: { paymentAllocated: allocation.allocatedAmount } },
      { session }
    );
    if (result.modifiedCount !== 1) {
      throw Object.assign(new Error("Purchase outstanding changed during payment. Please reload and retry."), { statusCode: 409 });
    }
    reserved.push({ ...allocation, purchaseId: purchase._id, amount: billAmount, previouslyAdjusted: alreadyAllocated });
  }
  return reserved;
};

const releasePaymentAllocations = async (allocations, session) => {
  const Purchase = getPurchaseModel();
  if (!Purchase) return;
  for (const allocation of allocations || []) {
    if (!allocation.purchaseId || Number(allocation.allocatedAmount || 0) <= 0) continue;

    const purchase = await Purchase.findOne(
      { _id: allocation.purchaseId },
      { paymentAllocated: 1 }
    ).session(session);

    if (!purchase) continue;

    const nextPaymentAllocated = Math.max(
      0,
      Number(purchase.paymentAllocated || 0) -
        Number(allocation.allocatedAmount || 0)
    );

    await Purchase.updateOne(
      { _id: allocation.purchaseId },
      { $set: { paymentAllocated: nextPaymentAllocated } },
      { session }
    );
  }
};


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
contraSchema.index({ distributorId: 1, firmId: 1, tranVNo: 1 }, { unique: true });

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
collectionVoucherSchema.index({ distributorId: 1, firmId: 1, colVNo: 1 }, { unique: true });



    

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
   PAYMENT VOUCHER API
========================== */
router.get(
  "/payment/next-no",
  securityRouter.authorizeRequest("TRANSACTIONS", "PAYMENT", "view"),
  async (req, res) => {
    const last = await Payment.findOne(tenantFilter(req)).sort({ vNo: -1 }).select({ vNo: 1 }).lean();
    return res.json({ success: true, nextNo: Number(last?.vNo || 0) + 1 });
  }
);

router.get(
  "/payment",
  securityRouter.authorizeRequest("TRANSACTIONS", "PAYMENT", "view"),
  async (req, res) => {
    const payments = await Payment.find(tenantFilter(req, { status: { $ne: "REVERSED" } })).sort({ vDate: -1, vNo: -1 }).lean();
    return res.json({ success: true, data: payments });
  }
);

router.post(
  "/payment",
  securityRouter.authorizeRequest("TRANSACTIONS", "PAYMENT", "add"),
  async (req, res) => {
    const session = await mongoose.startSession();
    const idempotencyKey = String(req.get("Idempotency-Key") || req.body.idempotencyKey || "").trim();
    try {
      const duplicate = idempotencyKey ? await Payment.findOne(tenantFilter(req, { idempotencyKey })).lean() : null;
      if (duplicate) return res.status(200).json({ success: true, data: duplicate, duplicate: true });
      let saved;
      await session.withTransaction(async () => {
        const amount = paymentAmountFromBody(req.body);
        const partyName = String(req.body.partyName || "").trim();
        const bankCash = String(req.body.bankCash || "").trim();
        if (!partyName || !bankCash || !String(req.body.vDate || "").trim()) {
          throw Object.assign(new Error("Voucher date, supplier/account and bank/cash account are required."), { statusCode: 400 });
        }
        const incomingAllocations = normalizePaymentAllocations(req.body);
        const allocationTotal = incomingAllocations.reduce((sum, item) => sum + item.allocatedAmount, 0);
        if (allocationTotal > amount + 0.01) {
          throw Object.assign(new Error("Bill allocations cannot exceed the payment amount."), { statusCode: 400 });
        }
        const allocations = await reservePaymentAllocations(req, incomingAllocations, partyName, session);
        const last = await Payment.findOne(tenantFilter(req)).sort({ vNo: -1 }).session(session).lean();
        const vNo = await nextDocumentNumber({
          distributorId: req.auth.distributorId, firmId: req.auth.firmId,
          documentType: "PAYMENT", documentDate: req.body.vDate,
          session, minimumValue: Number(last?.vNo || 0),
        });
        [saved] = await Payment.create([{
          distributorId: req.auth.distributorId, firmId: req.auth.firmId,
          vDate: String(req.body.vDate), vNo,
          partyCode: String(req.body.partyCode || req.body.partyId || ""), partyName,
          bankCash, amount, narration: String(req.body.narration || req.body.narr || ""),
          reference: String(req.body.reference || req.body.chqNo || ""),
          chequeNo: String(req.body.chequeNo || req.body.chqNo || ""), chequeDate: String(req.body.chequeDate || req.body.chqDate || ""),
          clearingDate: String(req.body.clearingDate || ""), partyBankName: String(req.body.partyBankName || ""),
          bankAccountNo: String(req.body.bankAccountNo || ""), allocations, idempotencyKey,
        }], { session });
        await postBalancedJournal({
          distributorId: req.auth.distributorId, firmId: req.auth.firmId,
          sourceType: "PAYMENT", sourceId: String(saved._id), documentNo: String(vNo),
          documentDate: String(req.body.vDate), createdBy: req.auth.userId,
          lines: [
            { accountCode: String(req.body.partyCode || req.body.partyId || partyName), debit: amount, credit: 0, narration: saved.narration || "Payment" },
            { accountCode: bankCash, debit: 0, credit: amount, narration: saved.narration || "Payment" },
          ],
        }, session);
        await writeAuditEvent(req, { entityType: "PAYMENT", entityId: String(saved._id), action: "CREATE", after: saved.toObject() }, session);
      });
      return res.status(201).json({ success: true, data: saved });
    } catch (error) {
      if (error?.code === 11000 && idempotencyKey) {
        const duplicate = await Payment.findOne(tenantFilter(req, { idempotencyKey })).lean();
        if (duplicate) return res.status(200).json({ success: true, data: duplicate, duplicate: true });
      }
      return res.status(error.statusCode || (error?.code === 11000 ? 409 : 500)).json({ success: false, message: error.statusCode || error?.code === 11000 ? error.message : "Payment could not be posted." });
    } finally {
      await session.endSession();
    }
  }
);

router.put(
  "/payment/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "PAYMENT", "edit"),
  async (req, res) => {
    const session = await mongoose.startSession();
    try {
      let updated;
      await session.withTransaction(async () => {
        const payment = await Payment.findOne(tenantFilter(req, { _id: req.params.id, status: "POSTED" })).session(session);
        if (!payment) throw Object.assign(new Error("Payment not found or already reversed."), { statusCode: 404 });
        const before = payment.toObject();
        await releasePaymentAllocations(payment.allocations, session);
        await reverseSourceJournal({
          distributorId: req.auth.distributorId, firmId: req.auth.firmId, sourceType: "PAYMENT", sourceId: String(payment._id),
          createdBy: req.auth.userId, documentDate: req.body.vDate || payment.vDate, reason: req.body.reason || "Payment edit reversal",
        }, session);
        const amount = paymentAmountFromBody(req.body);
        const partyName = String(req.body.partyName || "").trim();
        const bankCash = String(req.body.bankCash || "").trim();
        if (!partyName || !bankCash) throw Object.assign(new Error("Supplier/account and bank/cash account are required."), { statusCode: 400 });
        const allocations = await reservePaymentAllocations(req, normalizePaymentAllocations(req.body), partyName, session);
        Object.assign(payment, {
          vDate: String(req.body.vDate || payment.vDate), partyCode: String(req.body.partyCode || req.body.partyId || ""),
          partyName, bankCash, amount, narration: String(req.body.narration || req.body.narr || ""),
          reference: String(req.body.reference || req.body.chqNo || ""), chequeNo: String(req.body.chequeNo || req.body.chqNo || ""),
          chequeDate: String(req.body.chequeDate || req.body.chqDate || ""), clearingDate: String(req.body.clearingDate || ""),
          partyBankName: String(req.body.partyBankName || ""), bankAccountNo: String(req.body.bankAccountNo || ""), allocations,
        });
        payment.editHistory.push({ changedAt: new Date(), changedBy: req.auth.userId, reason: String(req.body.reason || "Payment corrected"), snapshot: before });
        updated = await payment.save({ session });
        await postBalancedJournal({
          distributorId: req.auth.distributorId, firmId: req.auth.firmId, sourceType: "PAYMENT", sourceId: String(payment._id),
          documentNo: String(payment.vNo), documentDate: payment.vDate, createdBy: req.auth.userId,
          lines: [
            { accountCode: String(payment.partyCode || payment.partyName), debit: amount, credit: 0, narration: payment.narration || "Payment repost" },
            { accountCode: bankCash, debit: 0, credit: amount, narration: payment.narration || "Payment repost" },
          ],
        }, session);
        await writeAuditEvent(req, { entityType: "PAYMENT", entityId: String(payment._id), action: "EDIT_REPOST", reason: req.body.reason || "Payment corrected", before, after: updated.toObject() }, session);
      });
      return res.json({ success: true, data: updated });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Payment edit/repost failed." });
    } finally {
      await session.endSession();
    }
  }
);

router.delete(
  "/payment/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "PAYMENT", "delete"),
  async (req, res) => {
    const session = await mongoose.startSession();
    try {
      let payment;
      await session.withTransaction(async () => {
        payment = await Payment.findOne(tenantFilter(req, { _id: req.params.id, status: "POSTED" })).session(session);
        if (!payment) throw Object.assign(new Error("Payment not found or already reversed."), { statusCode: 404 });
        const before = payment.toObject();
        await releasePaymentAllocations(payment.allocations, session);
        await reverseSourceJournal({
          distributorId: req.auth.distributorId, firmId: req.auth.firmId, sourceType: "PAYMENT", sourceId: String(payment._id),
          createdBy: req.auth.userId, documentDate: payment.vDate, reason: req.body?.reason || "Payment cancellation",
        }, session);
        payment.status = "REVERSED"; payment.reversedAt = new Date(); payment.reversedBy = req.auth.userId;
        payment.reversalReason = String(req.body?.reason || "Payment cancelled by user");
        await payment.save({ session });
        await writeAuditEvent(req, { entityType: "PAYMENT", entityId: String(payment._id), action: "REVERSE", reason: payment.reversalReason, before, after: payment.toObject() }, session);
      });
      return res.json({ success: true, message: "Payment cancelled and reversed successfully." });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Payment cancellation failed." });
    } finally {
      await session.endSession();
    }
  }
);

/* ==========================
   SAVE RECEIPT
========================== */

router.post(
  "/receipt",
  securityRouter.authorizeRequest("TRANSACTIONS", "RECEIPT", "add"),
  async (req, res) => {
    const session = await mongoose.startSession();
    try {
      const body = req.body || {};
      const idempotencyKey = String(req.headers["idempotency-key"] || body.idempotencyKey || "").trim();
      if (idempotencyKey.length < 16 || idempotencyKey.length > 200) {
        return res.status(400).json({ success: false, message: "A stable Idempotency-Key is required." });
      }

      const existing = await Receipt.findOne(tenantFilter(req, { idempotencyKey })).lean();
      if (existing) return res.status(200).json({ success: true, idempotent: true, data: existing });

      const incoming = Array.isArray(body.receiptBills) ? body.receiptBills : Array.isArray(body.items) ? body.items : [];
      const bills = incoming.map((item) => ({
        trnSeries: String(item.trnSeries ?? item.billSeries ?? item.BillSeries ?? "").trim(),
        trnNo: String(item.trnNo ?? item.billNo ?? item.BillNo ?? "").trim(),
        trnDate: String(item.trnDate ?? item.billDate ?? ""),
        nowAdjust: Number(item.nowAdjust || 0),
        discAmt: Number(item.discAmt ?? item.discAmount ?? 0),
        remark: String(item.remark || "").trim(),
      })).filter((item) => item.nowAdjust > 0 || item.discAmt > 0);

      if (!bills.length || bills.some((item) => !item.trnNo || item.nowAdjust < 0 || item.discAmt < 0)) {
        return res.status(400).json({ success: false, message: "Valid positive bill allocations are required." });
      }
      const receiptAmount = Number(body.receiptAmount || 0);
      const cashAllocated = bills.reduce((sum, item) => sum + item.nowAdjust, 0);
      const discountTotal = bills.reduce((sum, item) => sum + item.discAmt, 0);
      if (!Number.isFinite(receiptAmount) || receiptAmount <= 0 || Math.abs(receiptAmount - cashAllocated) > 0.01) {
        return res.status(400).json({ success: false, message: "Receipt amount must equal the current cash allocations." });
      }

      let savedReceipt;
      await session.withTransaction(async () => {
        const sales = mongoose.connection.collection("T_Sal_Header");
        for (const bill of bills) {
          const billFilter = tenantFilter(req, { BillNo: Number.isFinite(Number(bill.trnNo)) ? Number(bill.trnNo) : bill.trnNo });
          if (bill.trnSeries) billFilter.BillSeries = bill.trnSeries;
          const invoice = await sales.findOne(billFilter, { session, projection: { NetAmount: 1, BillAmount: 1, partyCode: 1, AccountCode: 1, receiptAllocated: 1 } });
          if (!invoice) throw Object.assign(new Error(`Sales bill ${bill.trnSeries}-${bill.trnNo} was not found in this firm.`), { statusCode: 404 });

          const previousReceipts = await Receipt.aggregate([
            { $match: tenantFilter(req, { status: { $ne: "REVERSED" }, receiptBills: { $elemMatch: { trnSeries: bill.trnSeries, trnNo: bill.trnNo } } }) },
            { $unwind: "$receiptBills" },
            { $match: { "receiptBills.trnSeries": bill.trnSeries, "receiptBills.trnNo": bill.trnNo } },
            { $group: { _id: null, total: { $sum: { $add: ["$receiptBills.nowAdjust", "$receiptBills.discAmt"] } } } },
          ]).session(session);
          const legacyAllocated = Number(previousReceipts[0]?.total || 0);
          const allocation = bill.nowAdjust + bill.discAmt;
          const amountField = Number(invoice.NetAmount ?? invoice.BillAmount ?? 0);
          const currentAllocated = Math.max(Number(invoice.receiptAllocated || 0), legacyAllocated);

          await sales.updateOne(
            { _id: invoice._id },
            { $max: { receiptAllocated: currentAllocated } },
            { session }
          );

          const reserved = await sales.updateOne(
  {
    _id: invoice._id,

    $expr: {
      $gte: [
        {
          $subtract: [
            amountField,
            {
              $ifNull: [
                "$receiptAllocated",
                currentAllocated
              ]
            }
          ]
        },
        allocation
      ]
    }
  },

  {
    $inc: {
      receiptAllocated: allocation
    }
  },

  {
    session
  }
);
          if (reserved.modifiedCount !== 1) throw Object.assign(new Error(`Receipt exceeds the pending amount for bill ${bill.trnSeries}-${bill.trnNo}.`), { statusCode: 409 });
        }

        const rno = await nextDocumentNumber({
          distributorId: req.auth.distributorId,
          firmId: req.auth.firmId,
          documentType: "RECEIPT",
          series: String(body.billSeries || bills[0].trnSeries || ""),
          documentDate: body.receiptDate,
          session,
        });
        const receiptData = {
          ...body,
          distributorId: req.auth.distributorId,
          firmId: req.auth.firmId,
          rno,
          receiptAmount,
          receiptBills: bills,
          idempotencyKey,
          status: "POSTED",
          addUser: req.auth.userId,
        };
        [savedReceipt] = await Receipt.create([receiptData], { session });

        const lines = [
          { accountCode: String(body.bankCash || "CASH"), debit: receiptAmount, credit: 0, narration: body.narration || "Receipt" },
          ...(discountTotal > 0 ? [{ accountCode: "DISCOUNT_ALLOWED", debit: discountTotal, credit: 0, narration: "Receipt discount" }] : []),
          { accountCode: String(body.partyId || body.partyName || "SUNDRY_DEBTORS"), debit: 0, credit: receiptAmount + discountTotal, narration: body.narration || "Receipt" },
        ];
        await postBalancedJournal({
          distributorId: req.auth.distributorId, firmId: req.auth.firmId,
          sourceType: "RECEIPT", sourceId: String(savedReceipt._id), documentNo: String(rno),
          documentDate: String(body.receiptDate || ""), createdBy: req.auth.userId, lines,
        }, session);
        await writeAuditEvent(req, { entityType: "RECEIPT", entityId: String(savedReceipt._id), action: "CREATE", after: savedReceipt.toObject() }, session);
      });
      return res.status(201).json({ success: true, data: savedReceipt });
    } catch (error) {
      if (error?.code === 11000) {
        const existing = await Receipt.findOne(tenantFilter(req, { idempotencyKey })).lean();
        if (existing) return res.status(200).json({ success: true, idempotent: true, data: existing });
      }
      return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Receipt could not be posted." });
    } finally {
      await session.endSession();
    }
  }
);

router.post(
  "/receipt",
  securityRouter.authorizeRequest("TRANSACTIONS", "RECEIPT", "add"),
  async (req, res) => {
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

loadNo: body.loadNo || "",
rloadNo: body.rloadNo || "",
docketNo: body.docketNo || "",

addUser: body.addUser || "",
editUser: body.editUser || "",

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

// AFTER
router.get(
  "/receipt",
  securityRouter.authorizeRequest("TRANSACTIONS", "RECEIPT", "view"),
  async (req, res) => {
    try {
        const receipts = await Receipt.find(tenantFilter(req, { status: { $ne: "REVERSED" } }))
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
  securityRouter.authorizeRequest("TRANSACTIONS", "RECEIPT", "view"),
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
/* ==========================
   UPDATE RECEIPT
========================== */
/* ==========================
   UPDATE RECEIPT
========================== */

router.put(
  "/receipt/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "RECEIPT", "edit"),
  async (req, res) => {
    try {
      const receiptId =
        String(
          req.params.id || ""
        ).trim();

      if (
        !mongoose.Types.ObjectId.isValid(
          receiptId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Receipt ID."
        });
      }

      const existingReceipt = await Receipt.findOne(tenantFilter(req, { _id: receiptId }));

      if (!existingReceipt) {
        return res.status(404).json({
          success: false,
          message:
            "Receipt not found."
        });
      }
      if (existingReceipt.status === "POSTED") {
        return res.status(409).json({ success: false, message: "Posted receipts are immutable. Reverse this receipt and create a corrected receipt." });
      }

      const body =
        req.body || {};

      const incomingBills =
        Array.isArray(
          body.receiptBills
        )
          ? body.receiptBills
          : Array.isArray(body.items)
            ? body.items
            : [];

      const adjustedBills =
        incomingBills
          .filter((item) => {
            const nowAdjust =
              Number(
                item.nowAdjust
              ) || 0;

            const discAmt =
              Number(
                item.discAmt ??
                item.discAmount
              ) || 0;

            return (
              nowAdjust > 0 ||
              discAmt > 0
            );
          })
          .map((item) => ({
            trnSeries:
              String(
                item.trnSeries ??
                item.billSeries ??
                ""
              ).trim(),

            trnNo:
              String(
                item.trnNo ??
                item.billNo ??
                ""
              ).trim(),

            trnDate:
              item.trnDate ||
              item.billDate ||
              "",

            amount:
              Number(
                item.amount
              ) || 0,

            adjustAmt:
              Number(
                item.adjustAmt
              ) || 0,

            balanceAmt:
              Number(
                item.balanceAmt
              ) || 0,

            nowAdjust:
              Number(
                item.nowAdjust
              ) || 0,

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
              String(
                item.remark || ""
              ).trim()
          }));

      if (
        adjustedBills.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one adjusted bill is required."
        });
      }

      const missingBillNumber =
        adjustedBills.find(
          (item) =>
            !item.trnNo
        );

      if (missingBillNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Bill number is missing in one adjusted bill."
        });
      }

      const distributorId = req.auth.distributorId;
      const firmId = req.auth.firmId;

      if (
        !distributorId ||
        !firmId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Distributor ID and Firm ID are required."
        });
      }

      const receiptNumber =
        Number(body.rno) || 0;

      if (receiptNumber <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Valid Receipt Number is required."
        });
      }

      const duplicateReceipt =
        await Receipt.findOne({
          _id: {
            $ne:
              existingReceipt._id
          },

          distributorId,
          firmId,

          rno:
            receiptNumber
        }).lean();

      if (duplicateReceipt) {
        return res.status(409).json({
          success: false,
          message:
            `Receipt No. ${receiptNumber} already exists.`
        });
      }

      const firstAdjustedBill =
        adjustedBills[0];

      const updateData = {
        receiptDate:
          body.receiptDate || "",

        rno:
          receiptNumber,

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

        partyId:
          body.partyId || "",

        partyName:
          body.partyName || "",

        salesmanId:
          body.salesmanId || "",

        salesmanName:
          body.salesmanName ||
          body.salesman ||
          "",

        bankCash:
  String(
    body.bankCash || ""
  ).trim(),

drawerBankId:
  String(
    body.drawerBankId || ""
  ).trim(),

drawerBankName:
  String(
    body.drawerBank ||
    body.drawerBankName ||
    ""
  ).trim(),

        receiptAmount:
          Number(
            body.receiptAmount
          ) || 0,

        chequeNo:
          body.chequeNo || "",

        chequeDate:
          body.chequeDate || "",

        drawerBankId:
          body.drawerBankId || "",

      drawerBankName:
  String(
    body.drawerBank ||
    body.drawerBankName ||
    ""
  ).trim(),

        micr:
          body.micr || "",

        narration:
          body.narration || "",

        loadNo:
          body.loadNo || "",

        rloadNo:
          body.rloadNo || "",

        docketNo:
          body.docketNo || "",

        addUser:
          body.addUser ||
          existingReceipt.addUser ||
          "",

        editUser:
          body.editUser || "",

        receiptBills:
          adjustedBills,

        companyId:
          body.companyId ||
          existingReceipt.companyId ||
          "",

        firmId,

        distributorId
      };

      const updatedReceipt =
        await Receipt.findOneAndUpdate(
          tenantFilter(req, { _id: receiptId }),

          {
            $set:
              updateData
          },

          {
            new: true,
            runValidators: true
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Receipt updated successfully.",

        data:
          updatedReceipt
      });
    } catch (error) {
      console.error(
        "UPDATE RECEIPT ERROR =",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Receipt update failed."
      });
    }
  }
);

router.get(
  "/receipt/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "RECEIPT", "view"),
  async (req, res) => {
    try {
        const receipt = await Receipt.findOne(tenantFilter(req, { _id: req.params.id }));

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

router.delete(
  "/receipt/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "RECEIPT", "delete"),
  async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
          const receipt = await Receipt.findOne(tenantFilter(req, { _id: req.params.id, status: { $ne: "REVERSED" } })).session(session);
          if (!receipt) throw Object.assign(new Error("Receipt not found or already reversed."), { statusCode: 404 });
          const sales = mongoose.connection.collection("T_Sal_Header");
          for (const bill of receipt.receiptBills || []) {
            const allocation = Number(bill.nowAdjust || 0) + Number(bill.discAmt || 0);
            const billNo = Number.isFinite(Number(bill.trnNo)) ? Number(bill.trnNo) : bill.trnNo;
            const billFilter = tenantFilter(req, {
              BillSeries: String(bill.trnSeries || ""),
              BillNo: billNo,
            });
            const salesBill = await sales.findOne(
              billFilter,
              {
                session,
                projection: { receiptAllocated: 1 },
              }
            );

            if (salesBill) {
              await sales.updateOne(
                { _id: salesBill._id },
                {
                  $set: {
                    receiptAllocated: Math.max(
                      0,
                      Number(salesBill.receiptAllocated || 0) - allocation
                    ),
                  },
                },
                { session }
              );
            }
          }
          await reverseSourceJournal({ distributorId: req.auth.distributorId, firmId: req.auth.firmId, sourceType: "RECEIPT", sourceId: String(receipt._id), createdBy: req.auth.userId, documentDate: receipt.receiptDate, reason: req.body?.reason || "Receipt reversal" }, session);
          receipt.status = "REVERSED"; receipt.reversedAt = new Date(); receipt.reversedBy = req.auth.userId; receipt.reversalReason = String(req.body?.reason || "User requested reversal");
          await receipt.save({ session });
          await writeAuditEvent(req, { entityType: "RECEIPT", entityId: String(receipt._id), action: "REVERSE", reason: receipt.reversalReason, before: receipt.toObject() }, session);
        });

        res.json({
            success: true,
            message: "Receipt reversed successfully",
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Receipt reversal failed.",
        });
    } finally {
        await session.endSession();
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
  securityRouter.authorizeRequest("TRANSACTIONS", "CHEQUE_BOUNCE", "add"),
  async (req, res) => {
    try {
      const trnSeries = String(
        req.body.trnSeries || ""
      )
        .toUpperCase()
        .trim();

      let trnNo =
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
      const lastChequeBounce = await ChequeBounce.findOne({ distributorId, firmId, trnSeries }).sort({ trnNo: -1 }).lean();
      trnNo = await nextDocumentNumber({ distributorId, firmId, documentType: "CHEQUE_BOUNCE", series: trnSeries, documentDate: req.body.chqBounceDate, minimumValue: Number(lastChequeBounce?.trnNo || 0) });

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

// INSERT — right after POST /cheque-bounce's closing `);` and before `router.get("/cheque-bounce", ...)`

/* ==========================
   UPDATE CHEQUE BOUNCE
========================== */

router.put(
  "/cheque-bounce/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "CHEQUE_BOUNCE", "edit"),
  async (req, res) => {
    try {
      const chequeBounceId = String(req.params.id || "").trim();

      if (!mongoose.Types.ObjectId.isValid(chequeBounceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Cheque Bounce ID.",
        });
      }

      const existingChequeBounce = await ChequeBounce.findOne(tenantFilter(req, { _id: chequeBounceId }));

      if (!existingChequeBounce) {
        return res.status(404).json({
          success: false,
          message: "Cheque Bounce record not found.",
        });
      }

      const body = req.body || {};

      const trnSeries = String(body.trnSeries || "").toUpperCase().trim();
      const trnNo = Number(body.trnNo) || 0;

      if (!trnSeries) {
        return res.status(400).json({
          success: false,
          message: "Transaction Series is required.",
        });
      }

      if (trnNo <= 0) {
        return res.status(400).json({
          success: false,
          message: "Transaction Number is required.",
        });
      }

      const distributorId = String(
        body.distributorId || existingChequeBounce.distributorId || ""
      ).trim();

      const firmId = String(
        body.firmId || existingChequeBounce.firmId || ""
      ).trim();

      // If series/number changed, block collision with a DIFFERENT record only
      const duplicate = await ChequeBounce.findOne({
        _id: { $ne: chequeBounceId },
        distributorId,
        firmId,
        trnSeries,
        trnNo,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `${trnSeries}-${trnNo} already exists.`,
        });
      }

      const updatePayload = {
        ...body,
        distributorId,
        firmId,
        trnSeries,
        trnNo,
        chqBounceNo: String(trnNo),
      };

      // Never let the client overwrite the Mongo _id
      delete updatePayload._id;
      delete updatePayload.id;

      const updated = await ChequeBounce.findOneAndUpdate(
        tenantFilter(req, { _id: chequeBounceId }),
        updatePayload,
        { new: true }
      );

      return res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Update Cheque Bounce error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);
router.get(
  "/cheque-bounce",
  securityRouter.authorizeRequest("TRANSACTIONS", "CHEQUE_BOUNCE", "view"),
  async (req, res) => {
    try {
        const records = await ChequeBounce.find(tenantFilter(req, { status: { $ne: "REVERSED" } }))
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
  securityRouter.authorizeRequest("TRANSACTIONS", "CHEQUE_BOUNCE", "view"),
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

router.get(
  "/cheque-bounce/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "CHEQUE_BOUNCE", "view"),
  async (req, res) => {
    try {
        const record = await ChequeBounce.findOne(tenantFilter(req, { _id: req.params.id }));

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



router.delete(
  "/cheque-bounce/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "CHEQUE_BOUNCE", "delete"),
  async (req, res) => {
    try {
        await ChequeBounce.findOneAndUpdate(tenantFilter(req, { _id: req.params.id }), { $set: { status: "REVERSED" } });

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

router.post(
  "/pdc-docket",
  securityRouter.authorizeRequest("TRANSACTIONS", "PDC_DOCKET", "add"),
  async (req, res) => {
    try {
        const distributorId = req.auth.distributorId, firmId = req.auth.firmId, docSeries = String(req.body.docSeries || "PDC").trim();
        const last = await PDCDocket.findOne({ distributorId, firmId, docSeries }).sort({ docVNo: -1 }).lean();
        const docVNo = await nextDocumentNumber({ distributorId, firmId, documentType: "PDC_DOCKET", series: docSeries, documentDate: req.body.pdcDate || req.body.docDate, minimumValue: Number(last?.docVNo || 0) });
        const data = await PDCDocket.create({ ...req.body, distributorId, firmId, docSeries, docVNo });

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
/* ==========================
   UPDATE PDC DOCKET
========================== */

router.put(
  "/pdc-docket/:id",
  securityRouter.authorizeRequest(
    "TRANSACTIONS",
    "PDC_DOCKET",
    "edit"
  ),
  async (req, res) => {
    try {
      const pdcId = String(req.params.id || "").trim();

      if (!mongoose.Types.ObjectId.isValid(pdcId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PDC Docket ID."
        });
      }

      const existing = await PDCDocket.findOne(tenantFilter(req, { _id: pdcId }));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "PDC Docket not found."
        });
      }

      const body = req.body || {};

      const distributorId =
        body.distributorId ||
        existing.distributorId;

      const firmId =
        body.firmId ||
        existing.firmId;

      const docSeries = String(
        body.docSeries || ""
      ).trim();

      const docVNo =
        Number(body.docVNo) || 0;

      const duplicate =
        await PDCDocket.findOne({
          _id: { $ne: pdcId },

          distributorId,
          firmId,

          docSeries,
          docVNo
        });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message:
            `${docSeries}-${docVNo} already exists.`
        });
      }

      const updateData = {
        ...body,

        distributorId,
        firmId,

        docSeries,
        docVNo,

        totalAmount:
          Number(body.totalAmount) || 0,

        totalCheques:
          Number(body.totalCheques) || 0,

        cheques:
          Array.isArray(body.cheques)
            ? body.cheques
            : []
      };

      delete updateData._id;
      delete updateData.id;

      const updated =
        await PDCDocket.findOneAndUpdate(
          tenantFilter(req, { _id: pdcId }),
          updateData,
          {
            new: true,
            runValidators: true
          }
        );

      res.json({
        success: true,
        message:
          "PDC Docket Updated Successfully",
        data: updated
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message: err.message
      });

    }
  }
);
router.get(
  "/pdc-docket",
  securityRouter.authorizeRequest("TRANSACTIONS", "PDC_DOCKET", "view"),
  async (req, res) => {
    try {

        const records = await PDCDocket
            .find(tenantFilter(req, { status: { $ne: "REVERSED" } }))
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
    securityRouter.authorizeRequest("TRANSACTIONS", "PDC_DOCKET", "view"),
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

router.delete(
  "/pdc-docket/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "PDC_DOCKET", "delete"),
  async (req, res) => {
    try {

        await PDCDocket.findOneAndUpdate(tenantFilter(req, { _id: req.params.id }), { $set: { status: "REVERSED" } });

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

router.post(
  "/contra",
  securityRouter.authorizeRequest("TRANSACTIONS", "CONTRA", "add"),
  async (req, res) => {
  try {
    const distributorId = req.auth.distributorId, firmId = req.auth.firmId;
    const last = await Contra.findOne({ distributorId, firmId }).sort({ tranVNo: -1 }).lean();
    const tranVNo = await nextDocumentNumber({ distributorId, firmId, documentType: "CONTRA", documentDate: req.body.transactionDate, minimumValue: Number(last?.tranVNo || 0) });
    const data = await Contra.create({ ...req.body, distributorId, firmId, tranVNo });

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

router.put(
  "/contra/:id",
  securityRouter.authorizeRequest(
    "TRANSACTIONS",
    "CONTRA",
    "edit"
  ),
  async (req, res) => {
    try {
      const contraId = String(req.params.id || "").trim();

      if (!mongoose.Types.ObjectId.isValid(contraId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Contra ID."
        });
      }

      const existing = await Contra.findOne(tenantFilter(req, { _id: contraId }));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Contra Voucher not found."
        });
      }

      const body = req.body || {};

      const distributorId =
        body.distributorId || existing.distributorId;

      const firmId =
        body.firmId || existing.firmId;

      const tranVNo =
        Number(body.tranVNo) || 0;

      const duplicate =
        await Contra.findOne({
          _id: { $ne: contraId },
          distributorId,
          firmId,
          tranVNo
        });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Contra Voucher No ${tranVNo} already exists.`
        });
      }

      const updateData = {
        ...body,
        distributorId,
        firmId,
        tranVNo
      };

      delete updateData._id;
      delete updateData.id;

      const updated =
        await Contra.findOneAndUpdate(
          tenantFilter(req, { _id: contraId }),
          updateData,
          {
            new: true,
            runValidators: true
          }
        );

      res.json({
        success: true,
        message: "Contra Updated Successfully",
        data: updated
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }
);

router.get(
  "/contra",
  securityRouter.authorizeRequest("TRANSACTIONS", "CONTRA", "view"),
  async (req, res) => {
  try {

    const records = await Contra
      .find(tenantFilter(req, { status: { $ne: "REVERSED" } }))
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
  securityRouter.authorizeRequest("TRANSACTIONS", "CONTRA", "view"),
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

router.delete(
  "/contra/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "CONTRA", "delete"),
  async (req, res) => {
  try {

    await Contra.findOneAndUpdate(tenantFilter(req, { _id: req.params.id }), { $set: { status: "REVERSED" } });

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
router.post(
  "/collection-voucher",
  securityRouter.authorizeRequest("TRANSACTIONS", "COLLECTION_VOUCHER", "add"),
  async (req, res) => {
    try {
        const distributorId = req.auth.distributorId, firmId = req.auth.firmId;
        const last = await CollectionVoucher.findOne({ distributorId, firmId }).sort({ colVNo: -1 }).lean();
        const colVNo = await nextDocumentNumber({ distributorId, firmId, documentType: "COLLECTION_VOUCHER", documentDate: req.body.collectionDate, minimumValue: Number(last?.colVNo || 0) });
        const data = await CollectionVoucher.create({ ...req.body, distributorId, firmId, colVNo });

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
router.put(
  "/collection-voucher/:id",
  securityRouter.authorizeRequest(
    "TRANSACTIONS",
    "COLLECTION_VOUCHER",
    "edit"
  ),
  async (req, res) => {
    try {
      const voucherId = String(req.params.id || "").trim();

      if (!mongoose.Types.ObjectId.isValid(voucherId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Collection Voucher ID."
        });
      }

      const existing =
        await CollectionVoucher.findOne(tenantFilter(req, { _id: voucherId }));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Collection Voucher not found."
        });
      }

      const body = req.body || {};

      const distributorId =
        body.distributorId ||
        existing.distributorId;

      const firmId =
        body.firmId ||
        existing.firmId;

      const colVNo =
        Number(body.colVNo) || 0;

      const duplicate =
        await CollectionVoucher.findOne({
          _id: { $ne: voucherId },

          distributorId,
          firmId,

          colVNo
        });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message:
            `Collection Voucher No ${colVNo} already exists.`
        });
      }

      const updateData = {
        ...body,

        distributorId,
        firmId,

        colVNo,

        bills:
          Array.isArray(body.bills)
            ? body.bills
            : []
      };

      delete updateData._id;
      delete updateData.id;

      const updated =
        await CollectionVoucher.findOneAndUpdate(
          tenantFilter(req, { _id: voucherId }),
          updateData,
          {
            new: true,
            runValidators: true
          }
        );

      res.json({
        success: true,
        message:
          "Collection Voucher Updated Successfully",
        data: updated
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }
);

router.get(
  "/collection-voucher",
  securityRouter.authorizeRequest("TRANSACTIONS", "COLLECTION_VOUCHER", "view"),
  async (req, res) => {

    try {

        const records = await CollectionVoucher
            .find(tenantFilter(req, { status: { $ne: "REVERSED" } }))
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
  securityRouter.authorizeRequest("TRANSACTIONS", "COLLECTION_VOUCHER", "view"),
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
router.delete(
  "/collection-voucher/:id",
  securityRouter.authorizeRequest("TRANSACTIONS", "COLLECTION_VOUCHER", "delete"),
  async (req, res) => {

    try {

        await CollectionVoucher.findOneAndUpdate(tenantFilter(req, { _id: req.params.id }), { $set: { status: "REVERSED" } });

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


return router;
}     
