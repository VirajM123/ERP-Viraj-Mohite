# Disposable local security integration checks (Windows)

Run these separately from `npm.cmd test`. They use synthetic records only. They require Node.js with built-in `WebSocket`, the installed Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`, and MongoDB at `C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe`. Ports 27991, 5101, 5102, 5187 and 9228 must be free. The migration CLI check refuses to run unless both credential collections are empty. Do not use a production or shared database.

From `D:\ERP-Viraj-Mohite` in PowerShell, create the data directory if necessary and start the dedicated server. If an instance already listens on 27991, do not start another: the tests check its binding, port, data directory, and database name before fixture writes.

```powershell
New-Item -ItemType Directory -Force .local-security-mongo | Out-Null
$mongo = Start-Process 'C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe' -ArgumentList @('--dbpath','D:\ERP-Viraj-Mohite\.local-security-mongo','--port','27991','--bind_ip','127.0.0.1','--logpath','D:\ERP-Viraj-Mohite\.local-security-mongo\mongod.log','--logappend') -WindowStyle Hidden -PassThru
$env:MONGODB_URI='mongodb://127.0.0.1:27991/erp_security_disposable'
$env:DISPOSABLE_MONGODB_URI=$env:MONGODB_URI
$env:JWT_SECRET='synthetic-local-only-secret-at-least-32-characters'
$env:CORS_ORIGINS='http://127.0.0.1:5187'
$env:PORT='5101'
$env:BCRYPT_ONLY='true'
$api = Start-Process node.exe -ArgumentList 'server.js' -WorkingDirectory 'D:\ERP-Viraj-Mohite\backend' -WindowStyle Hidden -PassThru
$env:PORT='5102'
$api2 = Start-Process node.exe -ArgumentList 'server.js' -WorkingDirectory 'D:\ERP-Viraj-Mohite\backend' -WindowStyle Hidden -PassThru
$env:VITE_API_ROOT='http://127.0.0.1:5101'
$vite = Start-Process node.exe -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort') -WorkingDirectory 'D:\ERP-Viraj-Mohite' -WindowStyle Hidden -PassThru
```

Wait for both applications to start, then run sequentially from `backend`. The browser test starts and stops its own headless Chrome profile. The two ports are distinct origins on the same site.

```powershell
cd D:\ERP-Viraj-Mohite\backend
node --test integration/browser.test.js
node --test integration/workflow-access.test.js
node --test integration/registration.test.js
node --test integration/timing.test.js
node --test integration/migration.test.js
node --test integration/migration-cli.test.js
npm.cmd test
cd D:\ERP-Viraj-Mohite
npm.cmd run build
```

Afterward stop only processes started in this session and inspect the ports. Keep the data directory.

```powershell
Stop-Process -Id $vite.Id,$api.Id,$api2.Id,$mongo.Id
Get-NetTCPConnection -State Listen -LocalPort 27991,5101,5102,5187,9228 -ErrorAction SilentlyContinue
```

The registration handler performs bcrypt hashing for both existing and new identities, but the database creation path still differs. No statistical timing experiment has been performed. Assess response-time distributions under representative load and account for rate limiting. The tests do not establish company/branch entitlement enforcement, production-origin correctness, or compatibility of external bearer clients.
