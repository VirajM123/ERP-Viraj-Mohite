import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../../src/utils/escapeHtml.js";
import { hashPassword, verifyPassword } from "../auth.js";

test("invoice values cannot introduce HTML or event handler attributes", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('x')">`),
    "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;");
  assert.equal(escapeHtml("A & B < C"), "A &amp; B &lt; C");
  assert.equal(escapeHtml(null), "");
});

test("bcrypt login rejects candidates beyond its 72-byte limit", async () => {
  const password = "a".repeat(72);
  const hash = await hashPassword(password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword(`${password}x`, hash), false);
});
