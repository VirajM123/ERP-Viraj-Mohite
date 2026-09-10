import test from "node:test";
import assert from "node:assert/strict";
import { commitTransactionReliably } from "../transactionCommit.js";

test("an uncertain transaction commit acknowledgement is retried", async () => {
  let attempts = 0;
  const session = {
    async commitTransaction() {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error("commit acknowledgement interrupted");
        error.errorLabels = ["UnknownTransactionCommitResult"];
        throw error;
      }
    },
  };

  await commitTransactionReliably(session);
  assert.equal(attempts, 2);
});

test("a definite transaction failure is not retried", async () => {
  let attempts = 0;
  const session = { async commitTransaction() { attempts += 1; throw new Error("validation failed"); } };
  await assert.rejects(commitTransactionReliably(session), /validation failed/);
  assert.equal(attempts, 1);
});
