import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { hashPassword } from '../auth.js';

test('registration responses, concurrent duplicate and firm linking', { timeout: 90000 }, async () => {
  const uri = 'mongodb://127.0.0.1:27991/erp_security_disposable';
  assert.equal(process.env.DISPOSABLE_MONGODB_URI, uri);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
  const db = mongoose.connection.db;
  const opts = await db.admin().command({ getCmdLineOpts: 1 });
  assert.equal(opts.parsed.net.port, 27991);
  assert.equal(opts.parsed.net.bindIp, '127.0.0.1');
  assert.equal(opts.parsed.storage.dbPath.toLowerCase().replaceAll('\\', '/'), 'd:/erp-viraj-mohite/.local-security-mongo');
  assert.equal(db.databaseName, 'erp_security_disposable');
  const register = db.collection('Mas_Register'); const users = db.collection('Mas_User');
  const prefix = 'registration-synthetic-';
  let nextPort = 5101;
  const post = async (path, body, token) => {
    const port = nextPort; nextPort = nextPort === 5101 ? 5102 : 5101;
    const res = await fetch(`http://127.0.0.1:${port}/api${path}`, { method:'POST', headers:{ 'content-type':'application/json', ...(token ? { authorization:`Bearer ${token}` } : {}) }, body:JSON.stringify(body) });
    return { status:res.status, body:await res.json() };
  };
  const password = 'SyntheticRegister1!';
  try {
    await register.deleteMany({ userName: { $regex: `^${prefix}` } });
    await users.deleteMany({ userName: { $regex: `^${prefix}` } });
    const request = { firmCode: `${prefix}one`, firmName: 'Synthetic Registration One', userName:`${prefix}one`, password };
    const first = await post('/register', request); assert.equal(first.status, 202);
    const duplicate = await post('/register', request); assert.deepEqual(duplicate, first);
    const concurrent = { firmCode:`${prefix}race`, firmName:'Synthetic Registration Race', userName:`${prefix}race`, password };
    const results = await Promise.all(Array.from({length:4}, () => post('/register', concurrent)));
    for (const result of results) assert.deepEqual(result, first);
    assert.equal(await register.countDocuments({ userName: concurrent.userName }), 1);
    const mixed = await Promise.all(Array.from({length:4}, (_, i) => post('/register', { firmCode:`${prefix}mixed-${i}`, firmName:`Synthetic Mixed ${i}`, userName:`${prefix}mixed`, password })));
    for (const result of mixed) assert.deepEqual(result, first);
    assert.equal(await register.countDocuments({ userName:`${prefix}mixed` }), 1);
    const distinct = await Promise.all(Array.from({length:4}, (_, i) => post('/register', { firmCode:`${prefix}distinct-${i}`, firmName:`Synthetic Distinct ${i}`, userName:`${prefix}distinct-${i}`, password })));
    for (const result of distinct) assert.deepEqual(result, first);
    assert.equal(await register.countDocuments({ userName: { $regex:`^${prefix}distinct-` } }), 4);
    const admin = await register.findOne({ userName:request.userName }); assert.ok(admin);
    // Simulate a stale public writer reaching the database after another
    // registration has committed, independently of the application lease.
    const stale = { ...admin, _id: new mongoose.Types.ObjectId(), firmId: 'STALE-SYNTHETIC-FIRM' };
    await assert.rejects(register.insertOne(stale), error => error.code === 11000);
    await assert.rejects(register.insertOne({ ...stale, publicRegistrationUserKey: `${prefix}different` }), error => error.code === 11000);
    await assert.rejects(register.insertOne({ ...stale, publicRegistrationFirmKey: JSON.stringify([`${prefix}different`, 'Different']) }), error => error.code === 11000);
    const auth = await post('/login', { userName:request.userName, password, firmId:admin.firmId }); assert.equal(auth.status, 200);
    const linked = await post('/firms', { firmCode:`${prefix}linked`, firmName:'Synthetic Linked Firm' }, auth.body.token);
    assert.equal(linked.status, 201);
    assert.equal(await register.countDocuments({ userName:request.userName, distributorId:admin.distributorId }), 2);
    const links = await Promise.all(Array.from({length:3}, (_, i) => post('/firms', {firmCode:`${prefix}link-${i}`,firmName:`Synthetic Link ${i}`}, auth.body.token)));
    assert.deepEqual(links.map(x => x.status), [201,201,201]);
    const linkedRecords = await register.find({userName:request.userName}).toArray();
    assert.equal(linkedRecords.length, 5);
    assert.equal(new Set(linkedRecords.map(x => x.firmId)).size, 5);
    await users.insertOne({ userName:`${prefix}user`, userId:`${prefix}user`, password:await hashPassword(password), firmId:admin.firmId, distributorId:admin.distributorId, firmName:admin.firmName, role:'USER', isActive:true });
    const normal = await post('/login', { userName:`${prefix}user`, password, firmId:admin.firmId }); assert.equal(normal.status, 200);
    const denied = await post('/firms', { firmCode:`${prefix}denied`, firmName:'Synthetic Denied Firm' }, normal.body.token);
    assert.equal(denied.status, 403);
    assert.equal(await register.countDocuments({ firmCode:`${prefix}denied` }), 0);
  } finally {
    await register.deleteMany({ userName: { $regex: `^${prefix}` } });
    await users.deleteMany({ userName: { $regex: `^${prefix}` } });
    await mongoose.disconnect();
  }
});
