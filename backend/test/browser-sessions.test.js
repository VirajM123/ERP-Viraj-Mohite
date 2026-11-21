import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { authenticateApi, issueAccessToken } from "../auth.js";
import { allowedBrowserOrigin, createBrowserSession, readBrowserSession, revokeBrowserSession, validBrowserCsrf } from "../browserSessions.js";

test("browser sessions expire, enforce CSRF and revoke independently", async (t) => {
  const oldCollection = mongoose.connection.collection;
  const previousSecret = process.env.JWT_SECRET;
  const previousOrigins = process.env.CORS_ORIGINS;
  process.env.JWT_SECRET = "test-secret-with-at-least-thirty-two-characters";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  t.after(() => { mongoose.connection.collection = oldCollection; if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; if (previousOrigins === undefined) delete process.env.CORS_ORIGINS; else process.env.CORS_ORIGINS = previousOrigins; });
  const sessions = new Map();
  const account = { _id: new mongoose.Types.ObjectId(), isActive: true, distributorId: "D", firmId: "F", userName: "user", sessionVersion: 0 };
  mongoose.connection.collection = (name) => name === "Sys_BrowserSession" ? {
    async createIndex() {}, async insertOne(row) { sessions.set(row._id, row); },
    async findOne(query) { const row = sessions.get(query._id); return row && row.expiresAt > query.expiresAt.$gt ? row : null; },
    async deleteOne(query) { sessions.delete(query._id); },
  } : { async findOne() { return account.isActive ? account : null; } };
  const create = async () => {
    let cookie; let options;
    const csrf = await createBrowserSession({ cookie(name, value, config) { cookie = `${name}=${value}`; options = config; } }, issueAccessToken(account, "USER"));
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "lax");
    return { cookie, csrf };
  };
  const first = await create(); const second = await create();
  const req = { method: "POST", path: "/sales", headers: { cookie: first.cookie, origin: "http://localhost:5173", "x-csrf-token": first.csrf }, body: {}, query: {}, params: {} };
  assert.equal(allowedBrowserOrigin(req), true);
  const session = await readBrowserSession(req);
  assert.equal(validBrowserCsrf(req, session), true);
  assert.equal(validBrowserCsrf({ headers: { ...req.headers, origin: "http://evil.test" } }, session), false);
  assert.equal(validBrowserCsrf({ headers: { ...req.headers, "x-csrf-token": "bad" } }, session), false);
  let status; let passed = false;
  const res = { status(value) { status = value; return this; }, json() { return this; }, clearCookie() {} };
  await authenticateApi(req, res, () => { passed = true; });
  assert.equal(passed, true);
  const badCsrf = { ...req, headers: { ...req.headers, "x-csrf-token": "bad" } };
  await authenticateApi(badCsrf, res, () => assert.fail("bad CSRF passed"));
  assert.equal(status, 403);
  const badOrigin = { ...req, headers: { ...req.headers, origin: "http://evil.test" } };
  await authenticateApi(badOrigin, res, () => assert.fail("bad origin passed"));
  assert.equal(status, 403);
  await revokeBrowserSession(req, res);
  assert.equal(await readBrowserSession(req), null);
  assert.ok(await readBrowserSession({ headers: { cookie: second.cookie } }));
  const secondSession = await readBrowserSession({ headers: { cookie: second.cookie } });
  account.sessionVersion++;
  await authenticateApi({ ...req, method: "GET", headers: { cookie: second.cookie } }, res, () => assert.fail("revoked account version passed"));
  assert.equal(status, 401);
  account.sessionVersion--;
  sessions.get(secondSession.id).expiresAt = new Date(0);
  assert.equal(await readBrowserSession({ headers: { cookie: second.cookie } }), null);
  const denied = { ...req, headers: { ...req.headers, cookie: second.cookie } };
  await authenticateApi(denied, res, () => assert.fail("expired session passed"));
  assert.equal(status, 401);
});
