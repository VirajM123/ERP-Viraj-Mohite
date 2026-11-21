import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { hashPassword } from '../auth.js';

test('sales, receipt, balance and load reads enforce firm and feature permission', { timeout:90000 }, async () => {
  const uri = 'mongodb://127.0.0.1:27991/erp_security_disposable';
  assert.equal(process.env.DISPOSABLE_MONGODB_URI, uri);
  await mongoose.connect(uri, { serverSelectionTimeoutMS:3000 });
  const db=mongoose.connection.db; const opts=await db.admin().command({getCmdLineOpts:1});
  assert.equal(opts.parsed.net.port,27991); assert.equal(opts.parsed.net.bindIp,'127.0.0.1');
  assert.equal(opts.parsed.storage.dbPath.toLowerCase().replaceAll('\\','/'),'d:/erp-viraj-mohite/.local-security-mongo'); assert.equal(db.databaseName,'erp_security_disposable');
  const name='workflow-synthetic-admin', normal='workflow-synthetic-user', dist='WORKFLOW-DIST', firm='WORKFLOW-FIRM';
  const sales=db.collection('T_Sal_Header'), receipts=db.collection('T_Receipt'), loads=db.collection('T_Load_Header');
  const registers=db.collection('Mas_Register'), users=db.collection('Mas_User');
  const billId=new mongoose.Types.ObjectId(), otherId=new mongoose.Types.ObjectId();
  const password='SyntheticWorkflow1!';
  try {
    await registers.deleteMany({userName:name}); await users.deleteMany({userName:normal});
    await Promise.all([sales.deleteMany({distributorId:dist}), receipts.deleteMany({distributorId:dist}), loads.deleteMany({DistributorId:dist})]);
    const hash=await hashPassword(password);
    await registers.insertOne({userName:name,password:hash,distributorId:dist,firmId:firm,firmCode:'WF',firmName:'Synthetic Workflow',role:'DISTRIBUTOR_ADMIN',isActive:true});
    await users.insertOne({userName:normal,userId:normal,password:hash,distributorId:dist,firmId:firm,firmName:'Synthetic Workflow',role:'USER',isActive:true});
    await db.collection('Mas_SecuritySetup').insertOne({distributorId:dist,firmId:firm,userId:normal,isActive:true,permissions:{}});
    await sales.insertMany([{_id:billId,distributorId:dist,firmId:firm,BillSeries:'WF',BillNo:1,isActive:true,items:[]},{_id:otherId,distributorId:dist,firmId:'OTHER-FIRM',BillSeries:'WF',BillNo:2,isActive:true,items:[]}]);
    await receipts.insertMany([{distributorId:dist,firmId:firm,billSeries:'WF',billNo:'1',receiptAmount:20},{distributorId:dist,firmId:'OTHER-FIRM',billSeries:'WF',billNo:'1',receiptAmount:99}]);
    await loads.insertMany([{DistributorId:dist,FirmId:firm,LoadSeries:'WF',LoadNo:1,IsCancelled:false,Bills:[{BillNo:1,PartyName:'Synthetic Party',Amount:100,PrivateMarker:'must-not-appear'}]},{DistributorId:dist,FirmId:'OTHER-FIRM',LoadSeries:'WF',LoadNo:2,IsCancelled:false,Bills:[]}]);
    const login=async userName=>{const r=await fetch('http://127.0.0.1:5101/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userName,password,firmId:firm})}); assert.equal(r.status,200);return (await r.json()).token;};
    const admin=await login(name), denied=await login(normal);
    const get=async (path,token)=>{const r=await fetch(`http://127.0.0.1:5101/api${path}`,{headers:{authorization:`Bearer ${token}`}});return {status:r.status,body:await r.json()};};
    const own=await get(`/sales/bill?billId=${billId}`,admin); assert.equal(own.status,200); assert.equal(own.body.bill._id,String(billId));
    assert.equal((await get(`/sales/bill?billId=${otherId}`,admin)).status,404);
    const list=await get('/receipt',admin); assert.equal(list.status,200); assert.equal(list.body.receipts.length,1); assert.equal(list.body.receipts[0].receiptAmount,20);
    const balance=await get('/receipt/bill-balance?billSeries=WF&billNo=1&billAmount=100',admin); assert.deepEqual(balance.body,{success:true,paidAmount:20,pendingAmount:80});
    const load=await get('/settle-load?loadSeries=WF&loadNo=1',admin); assert.equal(load.status,200); assert.equal(load.body.load.items[0].PartyName,'Synthetic Party'); assert.equal('PrivateMarker' in load.body.load.items[0],false);
    assert.equal((await get('/settle-load?loadSeries=WF&loadNo=2',admin)).status,404);
    const print=await get('/print-load?loadSeries=WF&loadNo=1&reportLevel=party_wise',admin); assert.equal(print.status,200); assert.equal(print.body.rows[0].partyName,'Synthetic Party');
    for (const route of [`/sales/bill?billId=${billId}`,'/receipt','/receipt/bill-balance?billSeries=WF&billNo=1&billAmount=100','/settle-load?loadSeries=WF&loadNo=1','/print-load?loadSeries=WF&loadNo=1&reportLevel=party_wise']) assert.equal((await get(route,denied)).status,403,route);
    await db.collection('Mas_SecuritySetup').updateOne({distributorId:dist,userId:normal},{$set:{permissions:{sales:{SALES_BILLING:{view:true},SETTLE_LOAD:{view:true},CREATE_LOAD:{print:true}},transactions:{RECEIPT:{view:true}}}}});
    for (const route of [`/sales/bill?billId=${billId}`,'/receipt','/receipt/bill-balance?billSeries=WF&billNo=1&billAmount=100','/settle-load?loadSeries=WF&loadNo=1','/print-load?loadSeries=WF&loadNo=1&reportLevel=party_wise']) assert.equal((await get(route,denied)).status,200,route);
  } finally {
    await registers.deleteMany({userName:name}); await users.deleteMany({userName:normal});
    await db.collection('Mas_SecuritySetup').deleteMany({distributorId:dist,userId:normal});
    await Promise.all([sales.deleteMany({distributorId:dist}),receipts.deleteMany({distributorId:dist}),loads.deleteMany({DistributorId:dist})]); await mongoose.disconnect();
  }
});
