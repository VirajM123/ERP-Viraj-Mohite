import { ensureConnection } from "./server.js";
import express from "express";

// Keep the alias order used by getProductDetails and getItemValue below. An
// empty first alias is significant: the old calculation did not try later keys.
const firstItemValue = (...keys) => keys.reduceRight(
  (fallback, key) => ({ $ifNull: [`$items.${key}`, fallback] }), ""
);

const firstTruthyItemValue = (...keys) => keys.reduceRight(
  (fallback, key) => ({ $cond: [`$items.${key}`, `$items.${key}`, fallback] }), 0
);

const textValue = (expression) => ({
  $trim: { input: { $convert: { input: { $cond: [{ $in: [expression, [0, false]] }, "", expression] }, to: "string", onError: "", onNull: "" } } },
});

const numericValue = (keys, fallback = 0) => ({
  $let: {
    vars: { raw: firstItemValue(...keys) },
    in: {
      $cond: [
        { $eq: ["$$raw", ""] },
        fallback,
        { $cond: [
          { $eq: [{ $trim: { input: { $convert: { input: "$$raw", to: "string", onError: "?", onNull: "?" } } } }, ""] },
          0,
          { $convert: { input: "$$raw", to: "double", onError: fallback, onNull: fallback } },
        ] },
      ],
    },
  },
});

const productFields = {
  combined: textValue(firstItemValue("product", "Product", "productDisplay", "productDescription")),
  explicitCode: textValue(firstItemValue("productCode", "ProductCode", "prodCode", "ProdCode", "productId", "ProductId", "code")),
  explicitName: textValue(firstItemValue("productName", "ProductName", "prodName", "ProdName", "name")),
};

const productCodeExpression = {
  $cond: [
    { $ne: ["$explicitCode", ""] }, "$explicitCode",
    { $cond: [
      { $gte: ["$separator", 0] },
      { $trim: { input: { $substrBytes: ["$combined", 0, "$separator"] } } },
      "",
    ] },
  ],
};

const productNameExpression = {
  $cond: [
    { $ne: ["$explicitName", ""] }, "$explicitName",
    { $cond: [
      { $gte: ["$separator", 0] },
      { $trim: { input: { $substrBytes: ["$combined", { $add: ["$separator", 3] }, { $subtract: [{ $strLenBytes: "$combined" }, { $add: ["$separator", 3] }] }] } } },
      "$combined",
    ] },
  ],
};

const itemPipeline = (match, selectedProductCodes) => [
  { $match: match },
  { $project: { BillDate: 1, BillSeries: 1, BillNo: 1, PartyCode: 1, PartyName: 1, CompanyName: 1, CreditNoteAmount: 1, items: 1 } },
  { $match: { items: { $type: "array" } } },
  { $unwind: { path: "$items", includeArrayIndex: "itemIndex" } },
  { $set: productFields },
  { $set: { separator: { $indexOfBytes: ["$combined", " - "] } } },
  { $set: { productCode: productCodeExpression, savedProductName: productNameExpression } },
  { $match: { productCode: { $in: [...selectedProductCodes] } } },
];

const grossExpression = numericValue(
  ["grossAmount", "GrossAmount", "grossAmt", "GrossAmt"],
  { $multiply: [
    numericValue(["qty", "Qty", "quantity", "Quantity", "saleQty", "SaleQty"]),
    numericValue(["salesRate", "SalesRate", "saleRate", "SaleRate", "sRate", "SRate", "rate", "Rate"],
      { $convert: { input: firstTruthyItemValue("selectedBatch.salesRate", "selectedBatch.SalesRate", "selectedBatch.sRate", "selectedBatch.SRate"), to: "double", onError: 0, onNull: 0 } }),
  ] }
);

export const buildProductSalesSummaryPipeline = (match, selectedProductCodes, orderBy) => {
  const sortField = orderBy === "productCode" ? "productCode" : orderBy === "amt" ? "amt" : orderBy === "qty" ? "qty" : "productName";
  const sortDirection = orderBy === "amt" || orderBy === "qty" ? -1 : 1;
  return [
    ...itemPipeline(match, selectedProductCodes),
    { $sort: { BillDate: 1, BillSeries: 1, BillNo: 1, _id: 1, itemIndex: 1 } },
    { $group: {
      _id: "$productCode",
      productName: { $first: "$savedProductName" },
      firstBillDate: { $first: "$BillDate" },
      firstBillSeries: { $first: "$BillSeries" },
      firstBillNo: { $first: "$BillNo" },
      firstBillId: { $first: "$_id" },
      firstItemIndex: { $first: "$itemIndex" },
      qty: { $sum: numericValue(["qty", "Qty", "quantity", "Quantity", "saleQty", "SaleQty"]) },
      amt: { $sum: grossExpression },
      tprAmt: { $sum: numericValue(["tprAmount", "TPRAmount", "tprAmt", "TPRAmt"]) },
      cdAmt: { $sum: numericValue(["cashDiscountAmount", "CashDiscountAmount", "cashDiscountAmt", "cdAmount", "cdAmt", "CDAmount"]) },
    } },
    { $sort: { firstBillDate: 1, firstBillSeries: 1, firstBillNo: 1, firstBillId: 1, firstItemIndex: 1 } },
    { $setWindowFields: { sortBy: { firstBillDate: 1, firstBillSeries: 1, firstBillNo: 1, firstBillId: 1, firstItemIndex: 1 }, output: { srNo: { $documentNumber: {} } } } },
    { $set: { productCode: "$_id" } },
    { $lookup: { from: "Mas_Product", let: { code: "$productCode" }, pipeline: [
      { $match: { distributorId: match.distributorId, firmId: match.firmId } },
      { $match: { $expr: { $eq: ["$productCode", "$$code"] } } },
      { $project: { _id: 0, productName: 1 } },
    ], as: "master" } },
    { $set: { productName: { $let: { vars: { current: { $ifNull: [{ $arrayElemAt: ["$master.productName", -1] }, ""] } }, in: { $cond: [{ $ne: ["$$current", ""] }, "$$current", "$productName"] } } } } },
    { $set: { sortText: { $toLower: { $trim: { input: { $convert: { input: `$${sortField}`, to: "string", onError: "", onNull: "" } } } } } } },
    { $sort: { [sortDirection < 0 ? sortField : "sortText"]: sortDirection, firstBillDate: 1, firstBillSeries: 1, firstBillNo: 1, firstBillId: 1, firstItemIndex: 1 } },
    { $project: { _id: 0, rowId: "$productCode", srNo: 1, productCode: 1, productName: 1, qty: 1, amt: 1, tprAmt: 1, cdAmt: 1,
      weight: { $literal: 0 }, disc: { $literal: 0 }, cdPercent: { $literal: 0 },
      partyCode: { $literal: "" }, partyName: { $literal: "" }, branchName: { $literal: "" }, address: { $literal: "" } } },
  ];
};

const createProductSalesReportRouter = (securityRouter) => {
  const router = express.Router();

  // Models will be imported from server.js
  let Product, SalesHeader, Stock, Account, Area, Salesman;

  const initializeModels = async () => {
    const mongoose = (await import("mongoose")).default;
    
    // Get models from the active mongoose connection.
    Product = mongoose.models["Mas_Product"];
    SalesHeader = mongoose.models["T_Sal_Header"];
    Stock = mongoose.models["Mas_Stock"];
    Account = mongoose.models["Mas_Account"];
    Area = mongoose.models["Mas_Area"];
    Salesman = mongoose.models["Mas_Salesman"];
  };

  // Helper: safely convert to number
  const toNumber = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== "") {
        const number = Number(value);
        if (!Number.isNaN(number)) {
          return number;
        }
      }
    }
    return 0;
  };

  // Helper: get item value from multiple possible keys
  const getItemValue = (item, ...keys) => {
    for (const key of keys) {
      if (item?.[key] !== undefined && item?.[key] !== null) {
        return item[key];
      }
    }
    return "";
  };

  // Helper: get product details
  const getProductDetails = (item = {}) => {
    const combinedProduct = String(
      getItemValue(item, "product", "Product", "productDisplay", "productDescription") || ""
    ).trim();

    let productCode = String(
      getItemValue(item, "productCode", "ProductCode", "prodCode", "ProdCode", "productId", "ProductId", "code") || ""
    ).trim();

    let productName = String(
      getItemValue(item, "productName", "ProductName", "prodName", "ProdName", "name") || ""
    ).trim();

    if (combinedProduct) {
      const separatorIndex = combinedProduct.indexOf(" - ");
      if (separatorIndex >= 0) {
        const parsedCode = combinedProduct.slice(0, separatorIndex).trim();
        const parsedName = combinedProduct.slice(separatorIndex + 3).trim();
        if (!productCode) productCode = parsedCode;
        if (!productName) productName = parsedName;
      } else if (!productName) {
        productName = combinedProduct;
      }
    }

    return { productCode, productName };
  };

  // Helper: normalize batch
  const normalizeBatch = (value) => {
    const batch = String(value ?? "").trim();
    return batch || ".";
  };

  // GET /api/reports/product-sales/criteria
  // Loads: companies, products, areas, salesmen
  router.get(
    "/api/reports/product-sales/criteria",
    ensureConnection,
    async (req, res) => {
      try {
        await initializeModels();

        const distributorId = String(req.query.distributorId || "").trim();
        const firmId = String(req.query.firmId || "").trim();
        const companyCode = String(req.query.companyCode || "").trim();

        if (!distributorId || !firmId) {
          return res.status(400).json({
            success: false,
            message: "distributorId and firmId are required.",
          });
        }

        const baseFilter = {
          distributorId,
          firmId,
          isActive: true,
        };

        // Load companies
        const companies = await Product.find(baseFilter)
          .select({ companyId: 1, companyName: 1 })
          .distinct("companyName")
          .then(names => names.map((name, idx) => ({
            _id: `company-${idx}`,
            companyCode: name,
            companyName: name
          })))
          .catch(() => []);

        // Load products
        const products = companyCode 
          ? await Product.find({ ...baseFilter, companyName: companyCode })
              .select({ _id: 1, productCode: 1, productName: 1, group: 1, category: 1, brand: 1 })
              .sort({ productName: 1 })
              .lean()
          : [];

        // Load areas
        const areas = await Area.find(baseFilter)
          .select({ _id: 1, areaCode: 1, areaName: 1 })
          .sort({ areaName: 1 })
          .lean();

        // Load salesmen
        const salesmen = await Salesman.find(baseFilter)
          .select({ _id: 1, salesmanCode: 1, salesmanName: 1 })
          .sort({ salesmanName: 1 })
          .lean();

        return res.json({
          success: true,
          companies,
          products,
          areas,
          salesmen,
        });
      } catch (error) {
        console.error("Product sales criteria error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to load product sales criteria.",
          error: error.message,
        });
      }
    }
  );

  // GET /api/reports/product-sales
  // Generates product-wise sales report
  router.get(
    "/api/reports/product-sales",
    ensureConnection,
    async (req, res) => {
      try {
        await initializeModels();

        const distributorId = String(req.query.distributorId || "").trim();
        const firmId = String(req.query.firmId || "").trim();
        const companyCode = String(req.query.companyCode || "").trim();
        const selectedProductCodes = new Set(String(req.query.selectedProductCodes || "").split(",").filter(Boolean));
        const reportLevel = String(req.query.reportLevel || "summary").trim();
        const scope = String(req.query.scope || "all").trim();
        const selectedAreaCodes = String(req.query.selectedAreaCodes || "").split(",").filter(Boolean);
        const selectedSalesmanCodes = String(req.query.selectedSalesmanCodes || "").split(",").filter(Boolean);
        const billWiseSalesman = String(req.query.billWiseSalesman || "no").toLowerCase() === "yes";
        const fromDate = String(req.query.fromDate || "").trim();
        const toDate = String(req.query.toDate || "").trim();
        const withCreditNote = String(req.query.withCreditNote || "no").toLowerCase() === "yes";
        const orderBy = String(req.query.orderBy || "productName").trim();
        const paginated = req.query.limit !== undefined;
        const limit = paginated ? Number(req.query.limit) : 0;
        const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);

        if (paginated && (!Number.isSafeInteger(limit) || limit < 1 || limit > 500 || !Number.isSafeInteger(offset) || offset < 0)) {
          return res.status(400).json({ success: false, message: "limit must be 1–500 and offset must be a non-negative integer." });
        }

        if (!distributorId || !firmId) {
          return res.status(400).json({
            success: false,
            message: "distributorId and firmId are required.",
          });
        }

        if (!fromDate || !toDate) {
          return res.status(400).json({
            success: false,
            message: "From Date and To Date are required.",
          });
        }

        if (fromDate > toDate) {
          return res.status(400).json({
            success: false,
            message: "From Date cannot be greater than To Date.",
          });
        }

        if (selectedProductCodes.size === 0) {
          return res.status(400).json({
            success: false,
            message: "Please select at least one product.",
          });
        }

        // Build sales bill filter
        const match = {
          distributorId,
          firmId,
          isActive: true,
          IsBillCancelled: { $ne: true },
          BillStatus: { $ne: "CANCELLED" },
          BillDate: { $gte: fromDate, $lte: toDate },
        };

        if (companyCode) {
          match.CompanyCode = companyCode;
        }

        if (selectedAreaCodes.length > 0) {
          match.AreaCode = { $in: selectedAreaCodes };
        }

        if (selectedSalesmanCodes.length > 0) {
          match.SalesmanCode = { $in: selectedSalesmanCodes };
        }

        if (reportLevel === "summary") {
          const rows = await SalesHeader.aggregate(
            buildProductSalesSummaryPipeline(match, selectedProductCodes, orderBy)
          ).allowDiskUse(true);
          // Keep the endpoint's localeCompare ordering for the much smaller
          // grouped result. MongoDB still performs the expensive group and sort.
          const sortText = (value) => String(value || "").trim().toLowerCase();
          rows.sort((first, second) => {
            if (orderBy === "amt" || orderBy === "qty") return Number(second[orderBy] || 0) - Number(first[orderBy] || 0);
            const field = orderBy === "productCode" ? "productCode" : orderBy === "billDate" ? "billDate" : "productName";
            return sortText(first[field]).localeCompare(sortText(second[field]));
          });
          return res.json({ success: true, count: rows.length, reportLevel, scope, rows, columns: getProductColumns(reportLevel) });
        }

        // Project only the item aliases used by the existing detail calculation.
        const itemKeys = [
          "product", "Product", "productDisplay", "productDescription", "productCode", "ProductCode", "prodCode", "ProdCode", "productId", "ProductId", "code",
          "productName", "ProductName", "prodName", "ProdName", "name", "qty", "Qty", "quantity", "Quantity", "saleQty", "SaleQty",
          "freeQty", "FreeQty", "freeQuantity", "salesRate", "SalesRate", "saleRate", "SaleRate", "sRate", "SRate", "rate", "Rate",
          "mrp", "MRP", "productMrp", "ProductMRP", "grossAmount", "GrossAmount", "grossAmt", "GrossAmt",
          "tprAmount", "TPRAmount", "tprAmt", "TPRAmt", "schemeAmount", "SchemeAmount", "schemeAmt", "schAmount", "schAmt", "SchAmount",
          "cashDiscountPercent", "CashDiscountPercent", "cashDiscountPer", "cdPercent", "cdPer", "CDPct", "CDPercent",
          "cashDiscountAmount", "CashDiscountAmount", "cashDiscountAmt", "cdAmount", "cdAmt", "CDAmount",
          "netAmount", "NetAmount", "netAmt", "amount", "Amount",
          "selectedBatch.salesRate", "selectedBatch.SalesRate", "selectedBatch.sRate", "selectedBatch.SRate", "selectedBatch.mrp", "selectedBatch.MRP",
        ];
        const detailProjection = Object.fromEntries(itemKeys.map((key) => [`items.${key}`, 1]));
        const detailPipeline = itemPipeline(match, selectedProductCodes);
        if (paginated) {
          const originalOrder = { BillDate: 1, BillSeries: 1, BillNo: 1, _id: 1, itemIndex: 1 };
          detailPipeline.push(
            { $setWindowFields: { sortBy: originalOrder, output: { originalSrNo: { $documentNumber: {} } } } },
            { $lookup: { from: "Mas_Product", let: { code: "$productCode" }, pipeline: [
              { $match: { distributorId, firmId } },
              { $match: { $expr: { $eq: ["$productCode", "$$code"] } } },
              { $project: { _id: 0, productName: 1 } },
            ], as: "master" } },
            { $set: {
              sortName: { $toLower: { $trim: { input: { $let: { vars: { current: { $ifNull: [{ $arrayElemAt: ["$master.productName", -1] }, ""] } }, in: { $cond: [{ $ne: ["$$current", ""] }, "$$current", "$savedProductName"] } } } } } },
              sortCode: { $toLower: "$productCode" },
              sortQty: numericValue(["qty", "Qty", "quantity", "Quantity", "saleQty", "SaleQty"]),
              sortAmt: grossExpression,
            } }
          );
          const sortKey = orderBy === "productCode" ? "sortCode" : orderBy === "qty" ? "sortQty" : orderBy === "amt" ? "sortAmt" : orderBy === "billDate" ? "BillDate" : "sortName";
          detailPipeline.push(
            { $sort: { [sortKey]: orderBy === "qty" || orderBy === "amt" ? -1 : 1, ...originalOrder } },
            { $skip: offset }, { $limit: limit + 1 }
          );
        } else {
          detailPipeline.push({ $sort: { BillDate: 1, BillSeries: 1, BillNo: 1, _id: 1, itemIndex: 1 } });
        }
        detailPipeline.push({ $project: { _id: 1, BillDate: 1, BillSeries: 1, BillNo: 1, PartyCode: 1, PartyName: 1, CompanyName: 1, CreditNoteAmount: 1, itemIndex: 1, originalSrNo: 1, ...detailProjection } });
        const bills = await SalesHeader.aggregate(detailPipeline).allowDiskUse(true);
        const hasMore = paginated && bills.length > limit;
        if (hasMore) bills.pop();

        if (bills.length === 0) {
          return res.json({
            success: true,
            count: 0,
            reportLevel,
            scope,
            rows: [],
            columns: getProductColumns(reportLevel),
            ...(paginated ? { nextOffset: null } : {}),
          });
        }

        // Load product masters for selected products
        const productMasters = await Product.find({
          distributorId,
          firmId,
          productCode: { $in: [...selectedProductCodes] },
        })
          .select({ _id: 1, productCode: 1, productName: 1, companyName: 1 })
          .lean();

        const productMasterMap = new Map(
          productMasters.map(p => [String(p.productCode || "").trim(), p])
        );

        // Process bills and create rows
        const detailRows = [];
        const summaryMap = new Map();

        bills.forEach((bill) => {
          const items = bill.items ? [bill.items] : [];
          
          items.forEach((item, itemIndex) => {
            const { productCode, productName: savedProductName } = getProductDetails(item);
            
            // Skip if product not in selected list
            if (!selectedProductCodes.has(productCode)) {
              return;
            }

            const productMaster = productMasterMap.get(productCode);
            const productName = productMaster?.productName || savedProductName || "";

            const qty = toNumber(
              getItemValue(item, "qty", "Qty", "quantity", "Quantity", "saleQty", "SaleQty")
            );

            const freeQty = toNumber(
              getItemValue(item, "freeQty", "FreeQty", "freeQuantity")
            );

            const salesRate = toNumber(
              getItemValue(item, "salesRate", "SalesRate", "saleRate", "SaleRate", "sRate", "SRate", "rate", "Rate"),
              item?.selectedBatch?.salesRate || item?.selectedBatch?.SalesRate || item?.selectedBatch?.sRate || item?.selectedBatch?.SRate
            );

            const mrp = toNumber(
              getItemValue(item, "mrp", "MRP", "productMrp", "ProductMRP"),
              item?.selectedBatch?.mrp || item?.selectedBatch?.MRP
            );

            const grossAmount = toNumber(
              getItemValue(item, "grossAmount", "GrossAmount", "grossAmt", "GrossAmt"),
              qty * salesRate
            );

            const tprAmount = toNumber(
              getItemValue(item, "tprAmount", "TPRAmount", "tprAmt", "TPRAmt")
            );

            const schemeAmount = toNumber(
              getItemValue(item, "schemeAmount", "SchemeAmount", "schemeAmt", "schAmount", "schAmt", "SchAmount")
            );

            const cashDiscountPercent = toNumber(
              getItemValue(item, "cashDiscountPercent", "CashDiscountPercent", "cashDiscountPer", "cdPercent", "cdPer", "CDPct", "CDPercent")
            );

            const cashDiscountAmount = toNumber(
              getItemValue(item, "cashDiscountAmount", "CashDiscountAmount", "cashDiscountAmt", "cdAmount", "cdAmt", "CDAmount")
            );

            const creditNoteAmount = withCreditNote && bill.itemIndex === 0
              ? toNumber(bill.CreditNoteAmount)
              : 0;

            const netAmount = toNumber(
              getItemValue(item, "netAmount", "NetAmount", "netAmt", "amount", "Amount"),
              grossAmount - tprAmount - schemeAmount - cashDiscountAmount + creditNoteAmount
            );

            const row = {
              rowId: `${bill._id}-${bill.itemIndex}`,
              srNo: paginated ? bill.originalSrNo : detailRows.length + 1,
              trn: "SALES",
              billDate: bill.BillDate || "",
              billSeries: bill.BillSeries || "",
              billNo: bill.BillNo ?? "",
              partyCode: bill.PartyCode || "",
              partyName: bill.PartyName || "",
              rate: salesRate,
              mrp: mrp,
              qty: qty,
              freeQty: freeQty,
              amt: grossAmount,
              weight: 0, // Can be enhanced if weight data is available
              tprAmt: tprAmount,
              disc: cashDiscountPercent,
              cdAmt: cashDiscountAmount,
              cdPercent: cashDiscountPercent,
              branchName: bill.CompanyName || "",
              address: "",
              productCode,
              productName,
            };

            detailRows.push(row);

            // For summary, group by product
            if (reportLevel === "summary") {
              const summaryKey = productCode;
              if (!summaryMap.has(summaryKey)) {
                summaryMap.set(summaryKey, {
                  rowId: productCode,
                  srNo: 0,
                  productCode,
                  productName,
                  qty: 0,
                  amt: 0,
                  weight: 0,
                  tprAmt: 0,
                  disc: 0,
                  cdAmt: 0,
                  cdPercent: 0,
                  partyCode: "",
                  partyName: "",
                  branchName: "",
                  address: "",
                });
              }
              const summary = summaryMap.get(summaryKey);
              summary.qty += qty;
              summary.amt += grossAmount;
              summary.tprAmt += tprAmount;
              summary.cdAmt += cashDiscountAmount;
            }
          });
        });

        let rows = reportLevel === "summary" ? Array.from(summaryMap.values()) : detailRows;
        
        // Add srNo
        rows = rows.map((row, index) => ({ ...row, srNo: paginated ? row.srNo : index + 1 }));

        // Sort rows
        if (!paginated) rows.sort((first, second) => {
          const sortText = (value) => String(value || "").trim().toLowerCase();
          
          if (orderBy === "productCode") {
            return sortText(first.productCode).localeCompare(sortText(second.productCode));
          }
          if (orderBy === "productName") {
            return sortText(first.productName).localeCompare(sortText(second.productName));
          }
          if (orderBy === "amt") {
            return Number(second.amt || 0) - Number(first.amt || 0);
          }
          if (orderBy === "qty") {
            return Number(second.qty || 0) - Number(first.qty || 0);
          }
          if (orderBy === "billDate") {
            return sortText(first.billDate).localeCompare(sortText(second.billDate));
          }
          
          // Default: product name
          return sortText(first.productName).localeCompare(sortText(second.productName));
        });

        return res.json({
          success: true,
          count: rows.length,
          reportLevel,
          scope,
          rows,
          columns: getProductColumns(reportLevel),
          ...(paginated ? { nextOffset: hasMore ? offset + limit : null } : {}),
        });
      } catch (error) {
        console.error("Product sales report error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to generate product sales report.",
          error: error.message,
        });
      }
    }
  );

  // Helper: Get columns based on report level
  const getProductColumns = (reportLevel) => {
    const baseColumns = [
      { key: "srNo", label: "SrNo.", type: "string" },
      { key: "billDate", label: "Bill Date", type: "string" },
      { key: "billSeries", label: "Bill Series", type: "string" },
      { key: "billNo", label: "Bill No", type: "string" },
      { key: "partyCode", label: "Party Code", type: "string" },
      { key: "partyName", label: "Party Name", type: "string" },
      { key: "rate", label: "Rate", type: "number" },
      { key: "mrp", label: "MRP", type: "number" },
      { key: "qty", label: "Qty", type: "number" },
      { key: "freeQty", label: "Free Qty", type: "number" },
      { key: "amt", label: "AMT", type: "number" },
      { key: "weight", label: "Weight", type: "number" },
      { key: "tprAmt", label: "TPR AMT", type: "number" },
      { key: "disc", label: "Disc", type: "number" },
      { key: "cdAmt", label: "CD AMT", type: "number" },
      { key: "cdPercent", label: "CD %", type: "number" },
      { key: "branchName", label: "Branch Name", type: "string" },
      { key: "address", label: "Address", type: "string" },
    ];

    return baseColumns;
  };

  return router;
};

export default createProductSalesReportRouter;
