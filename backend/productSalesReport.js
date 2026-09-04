import { ensureConnection } from "./server.js";
import express from "express";

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
        const selectedProductCodes = String(req.query.selectedProductCodes || "").split(",").filter(Boolean);
        const reportLevel = String(req.query.reportLevel || "summary").trim();
        const scope = String(req.query.scope || "all").trim();
        const selectedAreaCodes = String(req.query.selectedAreaCodes || "").split(",").filter(Boolean);
        const selectedSalesmanCodes = String(req.query.selectedSalesmanCodes || "").split(",").filter(Boolean);
        const billWiseSalesman = String(req.query.billWiseSalesman || "no").toLowerCase() === "yes";
        const fromDate = String(req.query.fromDate || "").trim();
        const toDate = String(req.query.toDate || "").trim();
        const withCreditNote = String(req.query.withCreditNote || "no").toLowerCase() === "yes";
        const orderBy = String(req.query.orderBy || "productName").trim();

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

        if (selectedProductCodes.length === 0) {
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

        // Load sales bills
        const bills = await SalesHeader.find(match)
          .sort({ BillDate: 1, BillSeries: 1, BillNo: 1 })
          .lean();

        if (bills.length === 0) {
          return res.json({
            success: true,
            count: 0,
            reportLevel,
            scope,
            rows: [],
            columns: getProductColumns(reportLevel),
          });
        }

        // Load product masters for selected products
        const productMasters = await Product.find({
          distributorId,
          firmId,
          productCode: { $in: selectedProductCodes },
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
          const items = Array.isArray(bill.items) ? bill.items : [];
          
          items.forEach((item, itemIndex) => {
            const { productCode, productName: savedProductName } = getProductDetails(item);
            
            // Skip if product not in selected list
            if (!selectedProductCodes.includes(productCode)) {
              return;
            }

            const productMaster = productMasterMap.get(productCode);
            const productName = savedProductName || productMaster?.productName || "";

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

            const creditNoteAmount = withCreditNote && itemIndex === 0
              ? toNumber(bill.CreditNoteAmount)
              : 0;

            const netAmount = toNumber(
              getItemValue(item, "netAmount", "NetAmount", "netAmt", "amount", "Amount"),
              grossAmount - tprAmount - schemeAmount - cashDiscountAmount + creditNoteAmount
            );

            const row = {
              rowId: `${bill._id}-${itemIndex}`,
              srNo: detailRows.length + 1,
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
        rows = rows.map((row, index) => ({ ...row, srNo: index + 1 }));

        // Sort rows
        rows.sort((first, second) => {
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
