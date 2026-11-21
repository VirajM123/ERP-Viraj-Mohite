import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { performance } from 'node:perf_hooks';
test('sample registration response times', async () => {
  const uri='mongodb://127.0.0.1:27991/erp_security_disposable'; assert.equal(process.env.DISPOSABLE_MONGODB_URI,uri);
  await mongoose.connect(uri); const db=mongoose.connection.db, o=await db.admin().command({getCmdLineOpts:1});
  assert.equal(o.parsed.net.port,27991); assert.equal(o.parsed.net.bindIp,'127.0.0.1'); assert.equal(o.parsed.storage.dbPath.toLowerCase().replaceAll('\\','/'),'d:/erp-viraj-mohite/.local-security-mongo'); assert.equal(db.databaseName,'erp_security_disposable');
  const c=db.collection('Mas_Register'), prefix='timing-synthetic-'; let n=0;
  const send=async body=>{const t=performance.now(); const r=await fetch(`http://127.0.0.1:${n++%2?5102:5101}/api/register`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}); await r.json(); assert.equal(r.status,202); return Math.round(performance.now()-t);};
  try {const fresh=[],existing=[]; for(let i=0;i<5;i++){const body={firmCode:prefix+i,firmName:'Synthetic Timing '+i,userName:prefix+i,password:'SyntheticTiming1!'}; fresh.push(await send(body)); existing.push(await send(body));} console.log('Timing ms (5 samples each):',JSON.stringify({fresh,existing}));}
  finally {await c.deleteMany({userName:{$regex:`^${prefix}`}}); await mongoose.disconnect();}
});
