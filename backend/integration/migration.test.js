// Run separately from the network-blocked unit suite against the dedicated local server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { migrateCredentialCollection } from '../legacyPasswordMigration.js';
import { hashPassword, verifyPassword } from '../auth.js';

test('synthetic credential migration is dry-run safe and idempotent', async () => {
  const uri = process.env.DISPOSABLE_MONGODB_URI;
  assert.equal(uri, 'mongodb://127.0.0.1:27991/erp_security_disposable');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
  try {
    const options = await mongoose.connection.db.admin().command({ getCmdLineOpts: 1 });
    assert.equal(options.parsed.net.port, 27991);
    assert.equal(options.parsed.net.bindIp, '127.0.0.1');
    assert.equal(options.parsed.storage.dbPath.toLowerCase().replaceAll('\\', '/'), 'd:/erp-viraj-mohite/.local-security-mongo');
    assert.equal(mongoose.connection.name, 'erp_security_disposable');
    const col = mongoose.connection.collection('integration_migration_synthetic');
    await col.deleteMany({ fixture: 'security-migration-v1' });
    const fixture = 'security-migration-v1';
    await col.insertMany([
      { _id: 'legacy', fixture, isActive: true, password: 'SyntheticPassword1!', oldPassword: 'obsolete', sessionVersion: 2 },
      { _id: 'bcrypt', fixture, isActive: true, password: await hashPassword('SyntheticPassword2!'), sessionVersion: 4 },
      { _id: 'malformed', fixture, isActive: true, password: '$2bad', sessionVersion: 1 },
    ]);
    const before = await col.find({}).sort({ _id: 1 }).toArray();
    const dry = await migrateCredentialCollection(col);
    assert.deepEqual(await col.find({}).sort({ _id: 1 }).toArray(), before);
    assert.deepEqual([dry.legacy, dry.bcrypt, dry.requiresReset, dry.migrated], [1, 1, 1, 0]);
    const applied = await migrateCredentialCollection(col, { apply: true });
    assert.equal(applied.migrated, 1);
    const migrated = await col.findOne({ _id: 'legacy' });
    assert.equal(migrated.sessionVersion, 3);
    assert.equal(migrated.oldPassword, '');
    process.env.BCRYPT_ONLY = 'true';
    assert.equal(await verifyPassword('SyntheticPassword1!', migrated.password), true);
    assert.equal(await verifyPassword('SyntheticPassword1!', 'SyntheticPassword1!'), false);
    const retry = await migrateCredentialCollection(col, { apply: true });
    assert.equal(retry.migrated, 0);
    assert.deepEqual(await col.findOne({ _id: 'legacy' }), migrated);
    assert.doesNotMatch(JSON.stringify([dry, applied, retry]), /SyntheticPassword|\$2/);
    await col.deleteMany({ fixture });
  } finally {
    await mongoose.disconnect();
  }
});
