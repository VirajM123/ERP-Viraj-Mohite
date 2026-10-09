import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is required to inspect the receipt index.");
  process.exitCode = 2;
} else {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const receipts = mongoose.connection.db.collection("T_Receipt");
    console.log(`Receipt documents (estimated): ${await receipts.estimatedDocumentCount()}`);
    const indexes = await receipts.indexes();
    const index = indexes.find(({ key }) => key.distributorId === 1 && key.firmId === 1 &&
      key["receiptBills.trnSeries"] === 1 && key["receiptBills.trnNo"] === 1);
    console.log(`Receipt bill index: ${index?.name || "MISSING"}`);
    if (!index && process.argv.includes("--create")) {
      const name = await receipts.createIndex({ distributorId: 1, firmId: 1,
        "receiptBills.trnSeries": 1, "receiptBills.trnNo": 1, status: 1 });
      console.log(`Created nonunique receipt bill index: ${name}`);
    }

    const tenantSample = await receipts.findOne({ distributorId: { $type: "string", $ne: "" },
      firmId: { $type: "string", $ne: "" }, "receiptBills.0": { $exists: true } }, {
      projection: { distributorId: 1, firmId: 1, "receiptBills.trnSeries": 1, "receiptBills.trnNo": 1 },
    });
    const sample = await receipts.findOne({ "receiptBills.0": { $exists: true } }, {
      projection: { distributorId: 1, firmId: 1, "receiptBills.trnSeries": 1, "receiptBills.trnNo": 1 },
    });
    const selectedSample = tenantSample || sample;
    const bill = selectedSample?.receiptBills?.[0];
    if (bill) {
      const plan = await receipts.find({
        distributorId: selectedSample.distributorId,
        firmId: selectedSample.firmId,
        receiptBills: { $elemMatch: { trnSeries: bill.trnSeries, trnNo: bill.trnNo } },
      }).project({ _id: 1 }).explain("executionStats");
      console.log(`Receipt lookup: examined=${plan.executionStats.totalDocsExamined} returned=${plan.executionStats.nReturned}`);
      console.log(JSON.stringify(plan.queryPlanner.winningPlan));
      const groupedPlan = await receipts.aggregate([
        { $match: { distributorId: selectedSample.distributorId, firmId: selectedSample.firmId,
          status: { $ne: "REVERSED" }, receiptBills: { $elemMatch: {
            $or: [{ trnSeries: bill.trnSeries, trnNo: bill.trnNo }],
          } } } },
        { $unwind: "$receiptBills" },
        { $match: { "receiptBills.trnSeries": bill.trnSeries,
          "receiptBills.trnNo": bill.trnNo,
          "receiptBills.openingTransactionId": { $in: [null, ""] } } },
        { $group: { _id: { series: "$receiptBills.trnSeries", no: "$receiptBills.trnNo" },
          total: { $sum: { $add: ["$receiptBills.nowAdjust", "$receiptBills.discAmt"] } } } },
      ]).explain("executionStats");
      const cursor = groupedPlan.stages?.find((stage) => stage.$cursor)?.$cursor;
      console.log(`Receipt aggregation: examined=${cursor?.executionStats?.totalDocsExamined ?? "unknown"} index=${cursor?.queryPlanner?.winningPlan?.inputStage?.indexName || "inspect-plan"}`);
      console.log(JSON.stringify(cursor?.queryPlanner?.winningPlan || groupedPlan.queryPlanner?.winningPlan || {}));
    } else {
      console.log("No receipt bill was available for explain().");
    }
  } catch (error) {
    console.error(`Receipt index verification failed: ${error.name || "Error"}`);
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}
