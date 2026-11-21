import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import mongoose from 'mongoose';
import { hashPassword } from '../auth.js';

test('migration CLI dry run, apply, retry and bcrypt-only API login', { timeout: 90000 }, async () => {
  const uri = 'mongodb://127.0.0.1:27991/erp_security_disposable';
  assert.equal(process.env.DISPOSABLE_MONGODB_URI, uri);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
  const db = mongoose.connection.db;
  const opts = await db.admin().command({ getCmdLineOpts: 1 });
  assert.equal(opts.parsed.net.port, 27991);
  assert.equal(opts.parsed.net.bindIp, '127.0.0.1');
  assert.equal(opts.parsed.storage.dbPath.toLowerCase().replaceAll('\\', '/'), 'd:/erp-viraj-mohite/.local-security-mongo');
  assert.equal(db.databaseName, 'erp_security_disposable');
  const register = db.collection('Mas_Register');
  const usernames = ['cli-legacy-synthetic', 'cli-bcrypt-synthetic', 'cli-malformed-synthetic'];
  try {
    // The CLI scans whole collections, so refuse to run in any nonempty target.
    assert.equal(await register.countDocuments({}), 0);
    assert.equal(await db.collection('Mas_User').countDocuments({}), 0);
    const common = { distributorId: 'CLI-DIST', firmCode: 'CLI', firmName: 'Synthetic CLI', role: 'DISTRIBUTOR_ADMIN', isActive: true, sessionVersion: 0 };
    await register.insertMany([
      { ...common, firmId: 'CLI-1', userName: usernames[0], password: 'SyntheticCliPass1!' },
      { ...common, firmId: 'CLI-2', userName: usernames[1], password: await hashPassword('SyntheticCliPass2!') },
      { ...common, firmId: 'CLI-3', userName: usernames[2], password: '$2malformed' },
    ]);
    const before = await register.find({}).sort({ userName: 1 }).toArray();
    const run = apply => {
      const result = spawnSync(process.execPath, ['scripts/migrateLegacyPasswords.js', ...(apply ? ['--apply'] : [])], { cwd: process.cwd(), env: { ...process.env, MONGODB_URI: uri }, encoding: 'utf8', timeout: 45000 });
      assert.equal(result.status, 0, 'migration CLI failed');
      assert.doesNotMatch(result.stdout + result.stderr, /SyntheticCliPass|\$2[aby]/);
      return result.stdout.split(/\r?\n/).filter(line => line.startsWith('{')).map(line => JSON.parse(line));
    };
    const dry = run(false); assert.deepEqual(await register.find({}).sort({ userName: 1 }).toArray(), before);
    assert.equal(dry.find(x => x.collection === 'Mas_Register').legacy, 1);
    const apply = run(true); assert.equal(apply.find(x => x.collection === 'Mas_Register').migrated, 1);
    const migrated = await register.findOne({ userName: usernames[0] });
    assert.equal(migrated.sessionVersion, 1);
    const retry = run(true); assert.equal(retry.find(x => x.collection === 'Mas_Register').migrated, 0);
    assert.deepEqual(await register.findOne({ userName: usernames[0] }), migrated);
    const login = async (userName, password, firmId) => fetch('http://127.0.0.1:5101/api/login', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ userName, password, firmId }) });
    assert.equal((await login(usernames[0], 'SyntheticCliPass1!', 'CLI-1')).status, 200);
    // Insert a new plaintext account after migration to exercise bcrypt-only mode.
    await register.insertOne({ ...common, firmId:'CLI-4', userName:'cli-plaintext-synthetic', password:'SyntheticCliPass3!' });
    assert.equal((await login('cli-plaintext-synthetic', 'SyntheticCliPass3!', 'CLI-4')).status, 401);
  } finally {
    await register.deleteMany({ userName: { $in: [...usernames, 'cli-plaintext-synthetic'] } });
    await mongoose.disconnect();
  }
});

