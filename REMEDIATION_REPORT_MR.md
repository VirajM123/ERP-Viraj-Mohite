# FMCG ERP Remediation Report

दिनांक: 18 ऑगस्ट 2026

## निष्कर्ष

Repositoryमध्ये security foundation आणि काही critical business-integrity fixes प्रत्यक्ष implement केले. Existing UI/routes/collections rename केले नाहीत. तथापि सर्व 22 findings पूर्णपणे बंद झालेल्या नाहीत; मोठ्या accounting/calculation/legacy-IDOR कामाला सुरक्षित पुढील phase आवश्यक आहे.

### Before vs After

```text
Before: Critical 8, High 8, Medium 5, Low 1
After residual verified risk: Critical 4, High 6, Medium 2, Low 0
Fixed: 8
Partially Fixed: 12
Requires Infrastructure Action: 2
```

After counts हे remaining findingsचे counts आहेत; partial controlsमुळे severity कृत्रिमरीत्या कमी केलेली नाही.

## ERP-001 ते ERP-022 Closure

| Issue | Original | Status | Files | Verification / Remaining work |
|---|---|---|---|---|
| ERP-001 | Critical | **FIXED** | `backend/auth.js`, `server.js` | bcrypt create/update/login; successful legacy login one-time hash migration; tests pass |
| ERP-002 | Critical | **FIXED** | `backend/auth.js`, `securitySetup.js`, `Login.jsx`, API client | signed expiring JWT; active user/tenant/role DBमधून resolve; fake identity headers ignored |
| ERP-003 | Critical | **FIXED** | `backend/server.js`, `auth.js` | `/api` deny-by-default; explicit login/register/health allow-list |
| ERP-004 | Critical | **PARTIALLY FIXED** | `auth.js`, `server.js` | tenant mismatch global reject; user/firm/master deletes scoped/soft; `transaction.js`मधील remaining ID-only handlers migrate करणे बाकी |
| ERP-005 | Critical | **FIXED** | `backend/server.js`, `audit.js` | transactional stock restore; original totals/items preserved; double cancel blocked |
| ERP-006 | Critical | **PARTIALLY FIXED** | `financialValidation.js`, `server.js` | impossible GST/nonfinite/negative/tampered line total checks; पूर्ण General Setup-aware authoritative FMCG calculator बाकी |
| ERP-007 | Critical | **PARTIALLY FIXED** | `server.js`, `counters.js`, `audit.js` | legacy receipt authenticated, scoped, transaction, server bill amount, atomic number; `/api/transaction/receipt`चे complex multi-allocation flow पूर्ण migrate बाकी |
| ERP-008 | Critical | **PARTIALLY FIXED** | `accounting.js` | balanced immutable journal model/poster व unique source constraint तयार; account mapping नसल्यामुळे live Sales/Purchase posting जोडलेले नाही |
| ERP-009 | High | **PARTIALLY FIXED** | `counters.js`, `server.js` | FY/tenant/series atomic counter receiptला लागू; इतर document types अजून `last+1` वापरतात |
| ERP-010 | High | **PARTIALLY FIXED** | `server.js` | server master-derived sales historical snapshot save; purchase/print/report snapshot adoption बाकी |
| ERP-011 | High | **PARTIALLY FIXED** | `audit.js`, `server.js` | append-only audit foundation, sales cancel/receipt/import events, master soft deletes; सर्व financial delete routesचे reversal migration बाकी |
| ERP-012 | High | **PARTIALLY FIXED** | `server.js` | cancel loaded/receipt/settlement checks; credit-note/collection/PDC सर्व dependency variantsची पूर्ण mapping बाकी |
| ERP-013 | High | **FIXED** | `securitySetup.js` | unconditional view allow removed; verified principal used |
| ERP-014 | High | **REQUIRES INFRASTRUCTURE ACTION** | `.gitignore`, `.env.example`, `backend/.env.example` | real `.env` Git indexमधून removed; Mongo credential/history rotation manual |
| ERP-015 | High | **PARTIALLY FIXED** | `server.js`, `auth.js` | strict CORS, body caps, headers, auth/general rate limits; distributed rate-limit store/reverse-proxy TLS config manual |
| ERP-016 | High | **PARTIALLY FIXED** | global auth/tenant middleware | reports authenticated आणि tenant mismatch blocked; प्रत्येक report/exportचे granular permission/pagination review बाकी |
| ERP-017 | Medium | **FIXED** | `src/api/config.js`, `client.js`, frontend modules | single env API source आणि Bearer injection; production missing URL fails clearly |
| ERP-018 | Medium | **PARTIALLY FIXED** | shared API/date utilities | low-risk extraction complete; giant UI component split बाकी |
| ERP-019 | Medium | **PARTIALLY FIXED** | backend/frontend business date utils | IST date/FY/range utilities आणि known UTC usages fixed; सर्व legacy string-date queries migrate बाकी |
| ERP-020 | Medium | **FIXED** | `importRoutes.js`, `ImportData.jsx` | auth permission, row cap, formula guard, revalidation, transaction, idempotency batch, audit |
| ERP-021 | Medium | **REQUIRES INFRASTRUCTURE ACTION** | `docs/BACKUP_AND_RECOVERY.md` | RPO/RTO/PITR/restore runbook documented; Atlas enablement आणि drill manual |
| ERP-022 | Low | **FIXED** | package scripts/locks, security docs | frontend/backend production audits: 0 known vulnerabilities; no blind upgrade |

## File Change Manifest

- `backend/auth.js`: password hashing, JWT, principal resolution, tenant guard, rate limiter.
- `backend/server.js`: global security, secure login/user handling, cancellation, receipt, validation, snapshots, soft deletes.
- `backend/securitySetup.js`: trusted principal आणि explicit view permission.
- `backend/audit.js`: redacted append-only audit events.
- `backend/counters.js`: atomic tenant/FY/document/series counter.
- `backend/accounting.js`: balanced immutable journal foundation.
- `backend/financialValidation.js`: monetary/GST/tamper envelope validation.
- `backend/businessDate.js`, `src/utils/businessDate.js`: IST/FY utilities.
- `backend/importRoutes.js`, `src/ImportData.jsx`: atomic/idempotent/capped import.
- `src/api/config.js`, `src/api/client.js` आणि frontend callers: central API/Bearer auth.
- `.gitignore`, `.env.example`, `backend/.env.example`: secret containment/config templates.
- `docs/BACKUP_AND_RECOVERY.md`, `docs/SECURITY_OPERATIONS.md`: operational controls.
- `backend/test/remediation.test.js`: password/auth/date/financial tests.

## Verification

- Frontend production build: **PASS** (existing duplicate-key/CSS/chunk warnings remain).
- Backend `node --check` for changed modules: **PASS**.
- Backend tests: password hash/legacy verify, IST/FY, GST/tamper checks, missing/fake-admin/invalid/expired auth tests.
- Frontend `npm audit --omit=dev`: **0 known vulnerabilities**.
- Backend `npm audit --omit=dev`: **0 known vulnerabilities**.
- Backend live start against production DB: **NOT RUN**—unintended index/write side effects टाळण्यासाठी.
- Original 100 cases: **NOT ALL AUTOMATED**; पूर्ण pass claim केलेली नाही.

## Manual actions

1. Exposed MongoDB credential rotate करा आणि Git history secret scan/purge करा.
2. Production secret managerमध्ये random 32+ character `JWT_SECRET` ठेवा.
3. `CORS_ORIGINS` production domainsसाठी configure करा.
4. MongoDB Atlas PITR/backups enable करून isolated restore drill करा.
5. New unique indexes staging cloneवर build/verify करा.
6. Existing plaintext user migration progress monitor करा; सर्व migrated झाल्यावर forced reset policy लागू करा.
7. Accounting account mapping approve करून journal integration/reconciliation करा.

## Production readiness

**CONDITIONAL / सध्या NO.** ERP-004, ERP-006, ERP-007 आणि ERP-008चे remaining work व staging reconciliation पूर्ण होईपर्यंत production financial posting सुरू करू नये.
