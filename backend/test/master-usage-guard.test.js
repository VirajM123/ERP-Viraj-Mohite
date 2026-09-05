import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { assertMasterNotUsed, buildMasterUsageQuery } from "../masterUsageGuard.js";

test("master usage query is tenant-scoped and includes nested transaction fields", () => {
  const id = new mongoose.Types.ObjectId();
  const query = buildMasterUsageQuery({
    scope: { distributorId: "D1", firmId: "F1" },
    type: "product",
    record: { _id: id, code: "PR-1", name: "Test Product" },
  });
  const serialized = JSON.stringify(query);
  const references = query.$and[1].$or;

  assert.match(serialized, /distributorId/);
  assert.match(serialized, /firmId/);
  assert.ok(references.some((entry) => Object.hasOwn(entry, "items.productCode")));
  assert.ok(references.some((entry) => Object.hasOwn(entry, "Items.ProductCode")));
  assert.ok(references.some((entry) => Object.values(entry).some(
    (value) => value instanceof RegExp && value.test("PR-1")
  )));
});

test("master delete guard blocks a reference in a transaction collection", async () => {
  const visited = [];
  const connection = {
    db: {
      listCollections: () => ({ toArray: async () => [
        { name: "Mas_Product" },
        { name: "T_Sal_Header" },
      ] }),
      collection: (name) => ({
        findOne: async () => {
          visited.push(name);
          return { _id: "transaction-id" };
        },
      }),
    },
  };

  await assert.rejects(
    assertMasterNotUsed({
      connection,
      scope: { distributorId: "D1", firmId: "F1" },
      type: "product",
      record: { _id: new mongoose.Types.ObjectId(), code: "PR-1", name: "Test Product" },
    }),
    (error) => error.statusCode === 409 && /used in a transaction or voucher/i.test(error.message)
  );
  assert.deepEqual(visited, ["T_Sal_Header"]);
});

test("master delete guard allows an unused entry", async () => {
  const connection = {
    db: {
      listCollections: () => ({ toArray: async () => [{ name: "T_Payment" }] }),
      collection: () => ({ findOne: async () => null }),
    },
  };

  await assert.doesNotReject(() => assertMasterNotUsed({
    connection,
    scope: { distributorId: "D1", firmId: "F1" },
    type: "account",
    record: { _id: new mongoose.Types.ObjectId(), code: "A-1", name: "Account One" },
  }));
});
