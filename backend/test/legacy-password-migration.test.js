import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../auth.js";
import { migrateCredentialCollection } from "../legacyPasswordMigration.js";

test("credential migration is redacted, retryable and gates bcrypt-only authentication", async (t) => {
  const prior = process.env.BCRYPT_ONLY;
  t.after(() => { if (prior === undefined) delete process.env.BCRYPT_ONLY; else process.env.BCRYPT_ONLY = prior; });
  const hash = await hashPassword("Valid-Password-123");
  const rows = [{ _id: 1, isActive: true, password: hash }, { _id: 2, isActive: true, password: "legacy-password" },
    { _id: 3, isActive: true, password: "$2b$12$broken" }, { _id: 4, isActive: true, password: null }];
  const collection = {
    find() { return rows.filter((row) => row.isActive); },
    async updateOne(filter, update) {
      const row = rows.find((item) => item._id === filter._id && item.password === filter.password && item.isActive);
      if (!row) return { modifiedCount: 0 };
      Object.assign(row, update.$set); row.sessionVersion = (row.sessionVersion || 0) + update.$inc.sessionVersion; return { modifiedCount: 1 };
    },
  };
  const dry = await migrateCredentialCollection(collection);
  assert.deepEqual(dry, { active: 4, bcrypt: 1, legacy: 1, migrated: 0, requiresReset: 2, changedConcurrently: 0 });
  assert.equal(rows[1].password, "legacy-password");
  const applied = await migrateCredentialCollection(collection, { apply: true });
  assert.equal(applied.migrated, 1);
  assert.equal(rows[1].sessionVersion, 1);
  assert.equal(await verifyPassword("legacy-password", rows[1].password), true);
  assert.equal(rows[0].password, hash);
  const repeated = await migrateCredentialCollection(collection, { apply: true });
  assert.equal(repeated.migrated, 0);
  assert.equal(repeated.requiresReset, 2);
  process.env.BCRYPT_ONLY = "true";
  assert.equal(await verifyPassword("legacy-password", "legacy-password"), false);
  assert.equal(await verifyPassword("legacy-password", rows[1].password), true);
  assert.equal(await verifyPassword("$2b$12$broken", "$2b$12$broken"), false);
});
