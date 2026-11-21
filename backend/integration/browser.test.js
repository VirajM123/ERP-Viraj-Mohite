// Requires the separately started, verified disposable MongoDB and local apps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { hashPassword } from '../auth.js';

const uri = 'mongodb://127.0.0.1:27991/erp_security_disposable';
const api = 'http://127.0.0.1:5101';
const frontend = 'http://127.0.0.1:5187';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, label) {
  for (let i = 0; i < 100; i++) { try { const x = await fn(); if (x) return x; } catch {} await sleep(200); }
  throw Error(`Timed out waiting for ${label}`);
}
test('browser cookie sessions across same-site origins', { timeout: 90000 }, async () => {
  assert.equal(process.env.DISPOSABLE_MONGODB_URI, uri);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
  const db = mongoose.connection.db;
  const options = await db.admin().command({ getCmdLineOpts: 1 });
  assert.equal(options.parsed.net.port, 27991);
  assert.equal(options.parsed.net.bindIp, '127.0.0.1');
  assert.equal(options.parsed.storage.dbPath.toLowerCase().replaceAll('\\', '/'), 'd:/erp-viraj-mohite/.local-security-mongo');
  assert.equal(db.databaseName, 'erp_security_disposable');
  const users = db.collection('Mas_Register');
  const fixture = 'browser-integration-fixture';
  let chrome, profile, socket;
  try {
    await users.deleteMany({ userName: fixture });
    await users.insertOne({ userName: fixture, password: await hashPassword('SyntheticBrowser1!'), firmId: 'BROWSER-TEST-FIRM', distributorId: 'BROWSER-TEST-DIST', firmCode: 'BROWSER', firmName: 'Synthetic Browser Firm', role: 'DISTRIBUTOR_ADMIN', isActive: true });
    profile = await mkdtemp('D:/ERP-Viraj-Mohite/.local-security-mongo/chrome-');
    chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=9228', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
    const target = await waitFor(async () => (await (await fetch('http://127.0.0.1:9228/json', { signal: AbortSignal.timeout(1000) })).json()).find(t => t.type === 'page'), 'Chrome');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0; const pending = new Map();
    socket.onmessage = ({ data }) => { const m = JSON.parse(data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); } };
    const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); socket.send(JSON.stringify({ id: n, method, params })); });
    const evalJS = async expression => { const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result.value; };
    await call('Page.enable'); await call('Network.enable');
    await call('Page.navigate', { url: frontend });
    try { await waitFor(() => evalJS('!!document.querySelector("input[name=userName]")'), 'login form'); }
    catch (error) { error.message += `: ${await evalJS('location.href + " " + document.body.innerText.slice(0,300)')}`; throw error; }
    await evalJS(`localStorage.setItem('token','obsolete-synthetic-token'); location.reload()`);
    await waitFor(() => evalJS('!!document.querySelector("input[name=userName]")'), 'login reload');
    assert.equal(await evalJS('localStorage.getItem("token")'), null);
    await evalJS(`document.querySelector('input[name=userName]').focus()`);
    await call('Input.insertText', { text: fixture });
    await evalJS(`document.querySelector('input[name=password]').focus()`);
    await call('Input.insertText', { text: 'SyntheticBrowser1!' });
    await evalJS(`document.querySelector('input[name=password]').blur()`);
    await waitFor(() => evalJS('document.querySelectorAll("select[name=firmId] option").length > 1'), 'firm options');
    await evalJS(`(() => { const e=document.querySelector('select[name=firmId]'); e.value='BROWSER-TEST-FIRM'; e.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('form').requestSubmit(); })()`);
    await waitFor(() => evalJS('!document.querySelector("input[name=userName]")'), 'dashboard');
    const cookies = (await call('Network.getCookies', { urls: [`${api}/api/session`] })).cookies;
    const cookie = cookies.find(c => c.name === 'erp_session');
    assert.ok(cookie); assert.equal(cookie.httpOnly, true); assert.equal(cookie.sameSite, 'Lax');
    await call('Page.reload');
    await waitFor(async () => (await evalJS(`fetch('${api}/api/session',{credentials:'include'}).then(r=>r.status)`)) === 200, 'restored session');
    const preflight = await fetch(`${api}/api/logout`, { method: 'OPTIONS', headers: { Origin: frontend, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-csrf-token,content-type' } });
    assert.equal(preflight.headers.get('access-control-allow-origin'), frontend);
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
    const csrf = await evalJS(`fetch('${api}/api/session',{credentials:'include'}).then(r=>r.json()).then(j=>j.csrf)`);
    assert.equal(await evalJS(`fetch('${api}/api/logout',{method:'POST',credentials:'include'}).then(r=>r.status)`), 403);
    const deniedOrigin = await fetch(`${api}/api/firms`, { method:'POST', headers:{ Origin:'http://untrusted.invalid', Cookie:`${cookie.name}=${cookie.value}`, 'X-CSRF-Token':csrf, 'content-type':'application/json' }, body:JSON.stringify({firmCode:'BROWSER-LINK',firmName:'Synthetic Browser Link'}) });
    assert.equal(deniedOrigin.status, 403);
    assert.equal(await evalJS(`fetch('${api}/api/firms',{method:'POST',credentials:'include',headers:{'content-type':'application/json','X-CSRF-Token':'${csrf}'},body:JSON.stringify({firmCode:'BROWSER-LINK',firmName:'Synthetic Browser Link'})}).then(r=>r.status)`), 201);
    const second = await fetch(`${api}/api/login`, { method:'POST', headers:{ 'content-type':'application/json', Origin:frontend, 'X-ERP-Browser':'1' }, body:JSON.stringify({userName:fixture,password:'SyntheticBrowser1!',firmId:'BROWSER-TEST-FIRM'}) });
    assert.equal(second.status, 200); const secondCookie = second.headers.get('set-cookie').split(';')[0];
    const index = (await db.collection('Sys_BrowserSession').indexes()).find(i => i.key.expiresAt === 1);
    assert.equal(index.expireAfterSeconds, 0);
    assert.equal(await evalJS(`fetch('${api}/api/logout',{method:'POST',credentials:'include',headers:{'X-CSRF-Token':'${csrf}'}}).then(r=>r.status)`), 200);
    assert.equal(await evalJS(`fetch('${api}/api/session',{credentials:'include'}).then(r=>r.status)`), 401);
    assert.equal((await fetch(`${api}/api/session`, { headers:{ Cookie:`${cookie.name}=${cookie.value}` } })).status, 401);
    assert.equal((await fetch(`${api}/api/session`, { headers: { Cookie: secondCookie } })).status, 200);
    const idHash = (await import('node:crypto')).createHash('sha256').update(secondCookie.split('=')[1]).digest('hex');
    await db.collection('Sys_BrowserSession').updateOne({ _id:idHash }, { $set: { expiresAt:new Date(Date.now()-1000) } });
    assert.ok(await db.collection('Sys_BrowserSession').findOne({ _id:idHash }));
    assert.equal((await fetch(`${api}/api/session`, { headers: { Cookie: secondCookie } })).status, 401);
    await db.collection('Sys_BrowserSession').deleteOne({ _id:idHash });
  } finally {
    socket?.close(); chrome?.kill();
    await users.deleteMany({ userName: fixture });
    await mongoose.disconnect();
    if (profile) { await sleep(500); await rm(profile, { recursive:true, force:true, maxRetries:5, retryDelay:500 }).catch(() => {}); }
  }
});


