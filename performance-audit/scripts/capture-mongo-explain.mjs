/* Staging/disposable-only MongoDB explain capture. Does not create indexes or mutate data.
 * Required: AUDIT_MONGODB_URI, AUDIT_COLLECTION, AUDIT_QUERY_JSON. Optional AUDIT_SORT_JSON, AUDIT_PROJECTION_JSON.
 * Example: AUDIT_MONGODB_URI=... AUDIT_COLLECTION=T_Sal_Header AUDIT_QUERY_JSON='{"distributorId":"..."}' node performance-audit/scripts/capture-mongo-explain.mjs
 */
import mongoose from "../../backend/node_modules/mongoose/index.js";

const uri = process.env.AUDIT_MONGODB_URI;
const collectionName = process.env.AUDIT_COLLECTION;
if (!uri || !collectionName || !process.env.AUDIT_QUERY_JSON) throw new Error("AUDIT_MONGODB_URI, AUDIT_COLLECTION, and AUDIT_QUERY_JSON are required.");
const query = JSON.parse(process.env.AUDIT_QUERY_JSON);
const sort = process.env.AUDIT_SORT_JSON ? JSON.parse(process.env.AUDIT_SORT_JSON) : undefined;
const projection = process.env.AUDIT_PROJECTION_JSON ? JSON.parse(process.env.AUDIT_PROJECTION_JSON) : undefined;
await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
try {
  let cursor = mongoose.connection.collection(collectionName).find(query, projection ? { projection } : undefined);
  if (sort) cursor = cursor.sort(sort);
  const plan = await cursor.explain("executionStats");
  // Do not write URI, data, or query values to the artifact; record only plan statistics.
  const stats = plan.executionStats || {};
  console.log(JSON.stringify({ collection: collectionName, nReturned: stats.nReturned, executionTimeMillis: stats.executionTimeMillis, totalKeysExamined: stats.totalKeysExamined, totalDocsExamined: stats.totalDocsExamined, winningPlan: plan.queryPlanner?.winningPlan?.stage || plan.queryPlanner?.winningPlan?.queryPlan?.stage || "unknown" }, null, 2));
} finally {
  await mongoose.disconnect();
}
