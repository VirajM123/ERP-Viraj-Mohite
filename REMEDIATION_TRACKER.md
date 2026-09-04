# FMCG ERP Remediation Tracker

| Issue | Severity | Primary files | Dependencies | Planned fix | Status |
|---|---|---|---|---|---|
| ERP-001 | Critical | backend/server.js, backend/auth.js | Login/User/Register | bcrypt hash + legacy one-time migration | Pending |
| ERP-002 | Critical | backend/auth.js, securitySetup.js, Login.jsx | ERP-001, JWT secret | signed token + DB-resolved principal | Pending |
| ERP-003 | Critical | backend/server.js, transaction routers | ERP-002 | deny-by-default `/api` authentication | Pending |
| ERP-004 | Critical | backend/server.js, transaction.js | ERP-002 | principal-scoped tenant filters | Pending |
| ERP-005 | Critical | backend/server.js | Sales/Stock/Load/Receipt | transactional idempotent cancellation | Pending |
| ERP-006 | Critical | backend/server.js, financialCalculator.js | product/GST/setup | server recomputation and mismatch rejection | Pending |
| ERP-007 | Critical | backend/server.js, transaction.js | Receipt/Sales/Counter/Journal | atomic/idempotent receipt | Pending |
| ERP-008 | Critical | backend/accounting.js | accounts and transactions | balanced immutable journal foundation | Pending |
| ERP-009 | High | backend/counters.js, server.js, transaction.js | document series/FY | atomic scoped counters + unique indexes | Pending |
| ERP-010 | High | backend/server.js, reports/print | master data | immutable transaction snapshots | Pending |
| ERP-011 | High | backend/audit.js, delete routes | authenticated principal | append-only audit + financial reversals | Pending |
| ERP-012 | High | backend/server.js | ERP-005, linked transactions | cancellation dependency/state validation | Pending |
| ERP-013 | High | backend/securitySetup.js | ERP-002 | explicit view permission, trusted principal | Pending |
| ERP-014 | High | .gitignore, backend/.env.example | deployment secrets | untrack secret + documented rotation | Pending |
| ERP-015 | High | backend/server.js | environment | origin policy, limits, headers, throttling | Pending |
| ERP-016 | High | report routes | ERP-002/013 | authenticated tenant-scoped reports | Pending |
| ERP-017 | Medium | src/api/*, frontend modules | Vite env | one API configuration/client | Pending |
| ERP-018 | Medium | Dashboard/Transaction/Report | ERP-017/019 | low-risk shared utilities extraction | Pending |
| ERP-019 | Medium | shared date utilities | IST/FY rules | centralized business date/FY helpers | Pending |
| ERP-020 | Medium | importRoutes.js | auth/audit/idempotency | caps, atomic validation/save, batch key | Pending |
| ERP-021 | Medium | docs/BACKUP_AND_RECOVERY.md | Atlas/infrastructure | restore/PITR runbook | Pending |
| ERP-022 | Low | package locks, CI docs | npm audit | minimal dependency review and CI gate | Pending |

Statuses will be changed only after implementation and verification. Infrastructure-only work will be marked explicitly.
