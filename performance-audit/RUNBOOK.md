# Reproducible measurement runbook

Do not run these commands against production. They require a disposable MongoDB
database, synthetic credentials, and a pre-approved staging load envelope.

## Prerequisites

- MongoDB 8.2 `mongod.exe` installed at the documented path or an equivalent
  isolated server.
- Ports 27991 and 5101 are unused.
- Sanitized fixture data and a least-privilege test account for each approved
  tenant/role scenario.
- Written capacity approval before testing more than one concurrent user.

## Start the isolated API

Run from the repository root in PowerShell. The URI below is loopback-only and
does not use the repository `.env` value.

```powershell
$mongo = Start-Process 'C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe' -ArgumentList @('--dbpath','C:\Users\Admin\Desktop\ERP\ERP-Viraj-Mohite\.local-security-mongo','--port','27991','--bind_ip','127.0.0.1','--logpath','C:\Users\Admin\Desktop\ERP\ERP-Viraj-Mohite\.local-security-mongo\mongod.log','--logappend') -WindowStyle Hidden -PassThru
$env:MONGODB_URI='mongodb://127.0.0.1:27991/erp_performance_disposable'
$env:JWT_SECRET='replace-with-a-synthetic-local-only-secret-of-at-least-32-characters'
$env:CORS_ORIGINS='http://127.0.0.1:5187'
$env:PORT='5101'
$api = Start-Process node.exe -ArgumentList 'server.js' -WorkingDirectory 'C:\Users\Admin\Desktop\ERP\ERP-Viraj-Mohite\backend' -WindowStyle Hidden -PassThru
```

Confirm only the disposable service is reachable:

```powershell
Invoke-WebRequest http://127.0.0.1:5101/health/live | Select-Object StatusCode,Content
```

## Baseline read measurement

The script sends GET requests only. It warms up with 10 requests and records
raw timing samples in `raw-timing-samples.jsonl`.

```powershell
$env:AUDIT_BASE_URL='http://127.0.0.1:5101'
$env:AUDIT_PATH='/health/live'
$env:AUDIT_REQUESTS='100'
$env:AUDIT_CONCURRENCY='1'
node performance-audit/scripts/safe-read-benchmark.mjs
```

For an approved protected read, use only a synthetic token and an explicit
authorized GET path. Run one command per tenant/dataset/cache-state scenario.

```powershell
$env:AUDIT_AUTHORIZATION='Bearer <synthetic-disposable-token>'
$env:AUDIT_PATH='/api/p0/dashboard/summary'
node performance-audit/scripts/safe-read-benchmark.mjs
```

Repeat each safe read three times for concurrency 1, then only after approval
set `AUDIT_CONCURRENCY` to 5, 10, 25, and 50. Stop for unexpected errors above
2%, integrity concerns, or resource saturation. Do not use this GET-only script
for create/update/delete routes.

## Query-plan capture

Set these values from a representative sanitized request. The script runs
`explain("executionStats")` only; it does not create indexes or modify data.

```powershell
$env:AUDIT_MONGODB_URI='mongodb://127.0.0.1:27991/erp_performance_disposable'
$env:AUDIT_COLLECTION='T_Sal_Header'
$env:AUDIT_QUERY_JSON='{"distributorId":"<synthetic-distributor>","firmId":"<synthetic-firm>","isActive":true}'
$env:AUDIT_SORT_JSON='{"BillDate":-1,"BillNo":-1}'
node performance-audit/scripts/capture-mongo-explain.mjs
```

## Cleanup

Stop only processes started by this run. Preserve fixtures until results have
been reviewed, then remove only the documented synthetic records through a
reviewed cleanup script.

```powershell
Stop-Process -Id $api.Id,$mongo.Id
Get-NetTCPConnection -State Listen -LocalPort 27991,5101 -ErrorAction SilentlyContinue
```
