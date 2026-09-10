import test from "node:test";
import assert from "node:assert/strict";
import { buildAllowedOrigins, corsOriginAllowed } from "../corsOrigins.js";

test("an explicitly allowed www production origin also permits its apex alias", () => {
  const allowed = buildAllowedOrigins("https://www.totalsolutionmerp.com");
  assert.equal(corsOriginAllowed("https://www.totalsolutionmerp.com", allowed), true);
  assert.equal(corsOriginAllowed("https://totalsolutionmerp.com", allowed), true);
});

test("unrelated origins remain blocked", () => {
  const allowed = buildAllowedOrigins("https://www.totalsolutionmerp.com");
  assert.equal(corsOriginAllowed("https://example.com", allowed), false);
});

test("local development origin remains unchanged", () => {
  const allowed = buildAllowedOrigins("http://localhost:5173");
  assert.equal(corsOriginAllowed("http://localhost:5173", allowed), true);
  assert.equal(corsOriginAllowed("http://127.0.0.1:5173", allowed), false);
});
