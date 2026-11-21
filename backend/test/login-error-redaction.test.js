import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = (await readFile(new URL("../server.js", import.meta.url), "utf8")).replace(/\r\n/g, "\n");

for (const path of ["/api/login/firms", "/api/login"]) {
  test(`${path} does not expose database error details`, async () => {
    let handler;
    const logs = [];
    const failure = () => { throw new Error("sensitive database detail"); };
    const context = vm.createContext({
      app: { post(...args) { handler = args.at(-1); } },
      ensureConnection() {},
      Register: { find: failure, findOne: failure },
      console: { error(...args) { logs.push(args); } },
    });
    const start = source.indexOf(`app.post(\n  "${path}",`);
    assert.ok(start >= 0);
    const end = source.indexOf("\n);", start) + 3;
    vm.runInContext(source.slice(start, end), context);
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ body: { userName: "example", password: "example", firmId: "F1" } }, res);
    assert.equal(res.statusCode, 500);
    assert.doesNotMatch(JSON.stringify({ body: res.body, logs }), /sensitive database detail/);
  });
}

test("public registration does not disclose internal failures", async () => {
  let handler;
  const logs = [];
  const context = vm.createContext({
    app: { post(...args) { handler = args.at(-1); } },
    ensureConnection() {}, validatePasswordStrength: () => true,
    hashPassword: async () => { throw new Error("sensitive database detail"); },
    console: { error(...args) { logs.push(args); } },
  });
  const start = source.indexOf('app.post("/api/register",');
  const end = source.indexOf('\n});', start) + 4;
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ body: { firmCode: "F", firmName: "Firm", userName: "user", password: "example" } }, res);
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(JSON.stringify({ body: res.body, logs }), /sensitive database detail/);
});
