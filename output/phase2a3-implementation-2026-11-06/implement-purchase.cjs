const fs=require('fs');const p=__dirname+'/checkout/backend/server.js';let s=fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');s=s.replace('import createFinancialPeriodsRouter from "./financialPeriods.js";','import createFinancialPeriodsRouter, { validateFinancialOperation } from "./financialPeriods.js";').replace('import { postBalancedJournal, reverseSourceJournal }','import { Journal, postBalancedJournal, reverseSourceJournal }');
const helper=`// Match reverseSourceJournal's latest-event selection in the caller transaction.
const validatePurchasePeriods = async (req, purchase, dates, session) => {
  const { distributorId, firmId } = req.body;
  if (purchase) {
    const latest = await Journal.findOne({ distributorId, firmId, sourceType: "PURCHASE", sourceId: String(purchase._id) })
      .sort({ postingVersion: -1 }).session(session).lean();
    if (latest && !latest.reversalOf && latest.status === "POSTED") dates = [...dates, latest.documentDate];
  }
  await validateFinancialOperation(req, { distributorId, firmId, dates }, session);
};

`;
s=s.replace('app.post(\n  "/api/purchase",',helper+'app.post(\n  "/api/purchase",');
function change(method,route,fn){const start=s.indexOf(`app.${method}(\n  "${route}",`);if(start<0)throw Error(route);const end=route.includes('reconcile')||method==='put'?s.indexOf('\napp.',start+10):s.indexOf('\n});',start)+4;const before=s.slice(start,end),after=fn(before);s=s.slice(0,start)+after+s.slice(end)}
for(const [method,route] of [['post','/api/purchase'],['post','/api/purchase/reconcile-desktop-import'],['put','/api/purchase/:id'],['delete','/api/purchase/:id']])change(method,route,b=>{
 b=b.replace('const session = await mongoose.startSession();','let session;').replace(/try \{\s*session.startTransaction\(\);/,'try {\n    session = await mongoose.startSession();\n    session.startTransaction();');
 b=b.replaceAll('if (session.inTransaction())','if (session?.inTransaction())').replace('await session.abortTransaction();\n    console.error("Delete','if (session?.inTransaction()) await session.abortTransaction();\n    console.error("Delete').replaceAll('session.endSession();','if (session) await session.endSession();');
 b=b.replaceAll('error.statusCode === 400 ? 400 : 500','error.status || error.statusCode || 500').replaceAll('error.statusCode || 500','error.status || error.statusCode || 500').replace('res.status(500).json({','res.status(error.status || error.statusCode || 500).json({');
 if(route==='/api/purchase')b=b.replace('    const lastPurchaseForCounter', '    await validatePurchasePeriods(req, null, [invoiceDate], session);\n    const lastPurchaseForCounter');
 if(method==='put')b=b.replace('      // Reverse old items first','      await validatePurchasePeriods(req, oldPurchase, [oldPurchase.invoiceDate, invoiceDate], session);\n\n      // Reverse old items first');
 if(route.includes('reconcile'))b=b.replace('      const incomingBySignature', '      await validatePurchasePeriods(req, null, [purchase.invoiceDate, ...(reactivatePurchase ? [String(purchase.invoiceDate || req.body.invoiceDate || "")] : [])], session);\n\n      const incomingBySignature');
 if(method==='delete'){
 b=b.replace('    // Restore stock for each item (remove the added stock)','    const cancellationDate = businessDateIST();\n    await validatePurchasePeriods(req, purchase, [purchase.invoiceDate, cancellationDate], session);\n\n    // Restore stock for each item (remove the added stock)');
 b=b.replace('documentDate: businessDateIST()','documentDate: cancellationDate').replace('movementDate: businessDateIST()','movementDate: cancellationDate');
 // Early no-write exits still explicitly abort the active transaction.
 b=b.replace('      return res.status(400)', '      await session.abortTransaction();\n      return res.status(400)').replace('      return res.status(404)', '      await session.abortTransaction();\n      return res.status(404)');
 }
 return b;
});
s=s.replaceAll('error.status || error.status || error.statusCode','error.status || error.statusCode');fs.writeFileSync(p,s.replaceAll('\n','\r\n'));

