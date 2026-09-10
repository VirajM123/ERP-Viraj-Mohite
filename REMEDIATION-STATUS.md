# ERP remediation status — 2026-09-10

Overall status: **PARTIALLY FIXED**. The complete A–X audit is not closed. This pass applies targeted security fixes on top of the substantial work already present, preserving the financial calculations and posting workflows. No production database was connected to or modified. No database, migration, restore, commit, or push was run.

## Changes made in this pass

| ID | Finding | Status | Evidence |
| --- | --- | --- | --- |
| ERP-FIX-001 | Truthy permission values and unknown operations accepted | FIXED AND VERIFIED | Explicit boolean grants and known operation/action validation; middleware and policy regression tests. Administrator bypass requires tenant and user identity. Added existing Service and Sales Service operations to the backend catalog. |
| ERP-FIX-002 | Security setup returns/logs password fields | FIXED AND VERIFIED | User query excludes password and oldPassword; removed full-user debug output. Query projection regression test. |
| ERP-FIX-003 | Permission writes lack target validation and atomic audit | FIXED, REQUIRES DEPLOYMENT VERIFICATION | Validates payload, checks active same-tenant user, writes permissions and audit using one Mongo session transaction. Mocked test verifies shared session and tenant filters; actual database rollback remains untested. |
| ERP-FIX-004 | Client-controlled session version on user updates | FIXED, REQUIRES DEPLOYMENT VERIFICATION | User PUT now uses database `$inc: { sessionVersion: 1 }` on every update, including role/status/salesman changes. Client sessionVersion is ignored. Revoked-token regression test passes; real update/login integration remains pending. |
| ERP-FIX-005 | Normal-user password create/update omit strength validation | FIXED, REQUIRES DEPLOYMENT VERIFICATION | Both paths enforce existing password policy before hashing. Existing password-policy test passes; full user-route integration remains pending. |
| ERP-FIX-006 | Tenant headers are not checked | FIXED AND VERIFIED | Authentication now checks headers, including x-firm-id and x-distributor-id. Negative header tests pass. This does not establish complete record-level tenant isolation. |
| ERP-FIX-007 | Impossible business dates silently roll over | FIXED AND VERIFIED | Shared business-date parser rejects invalid calendar dates and ambiguous formats. Financial-year and date-range helpers use it; leap-day and invalid-date tests pass. |
| ERP-FIX-008 | Unhandled errors use Express default response | FIXED AND VERIFIED | Central final error middleware returns safe JSON for parser/size/duplicate/unknown failures. Tests verify public messages exclude internal details. Existing route-specific caught errors are a separate remaining review. |
| ERP-FIX-009 | Duplicate broken product-mapping handlers | FIXED AND VERIFIED | Removed obsolete server handlers and unused schema; mounted canonical router remains. Search confirms no obsolete ProductMapping/db references in server.js; syntax passes. |
| ERP-FIX-010 | Mapping create permission permits overwrites | FIXED AND VERIFIED | Existing mappings additionally require edit permission. New records use create, so a concurrent insert cannot silently become an update. Negative overwrite test passes; database duplicate-race testing remains pending. |

Files changed by this pass: `backend/auth.js`, `backend/businessDate.js`, `backend/securitySetup.js`, `backend/server.js`, `backend/productMapping.js`; added `backend/apiError.js`, `backend/test/security-policy.test.js`, and this report. The first, third, and fourth files already had user edits; productMapping.js was already untracked. Those changes were integrated, not replaced.

No new dependency, schema field, index, or storage-format migration was introduced by this pass. Permission saves now require transaction-capable MongoDB, as the existing financial workflows already do. Existing indexes, including the product-mapping unique index, must be verified in staging.

## Complete audit checklist

Statuses below apply to the entire original finding, not just this pass's narrower fixes.

| Original scope | Status | Evidence / remaining work |
| --- | --- | --- |
| A Authorization | PARTIALLY FIXED | Named stock/setup/batch checks already present; permission engine hardened here. Need complete route inventory and HTTP negative tests for every read/mutation, including reports and helper endpoints. |
| B Tenant isolation / salesman restrictions | PARTIALLY FIXED | Verified auth derives tenant from database-backed session; nested identifiers and headers checked. Salesman assignment exists, but all reports/references/queries have not been proven to enforce assigned-record scope. |
| C Stock-adjustment atomicity | PARTIALLY FIXED | Existing server handlers use sessions, stock movements, cancellation, and request IDs. Need disposable replica-set failure-injection, retries, insufficient-stock and concurrency tests. |
| D Server pricing | PARTIALLY FIXED | Existing server code uses allowChangeSaleRate, master tax/rate helpers, and server financial calculations. All purchase/discount override policies and transaction-time locks need integration verification. |
| E Credit/debit recalculation | PARTIALLY FIXED | Credit-note path already calls validateFinancialEnvelope and master-tax validation. Manual and reserved-bill credit notes remain supported; full cumulative-return, forged-reference, original-document and cancellation tests remain. |
| F Canonical cancellation | PARTIALLY FIXED | Both sales cancellation paths call cancelSalesBill. Purchase/note consistency, period locks, repeated cancellation and rollback need integration verification. |
| G Accounting integration | PARTIALLY FIXED | Payment/journal helpers have unit tests. Contra POST in transaction.js still calls Contra.create directly, without atomic journal posting. PDC, Collection and Cheque Bounce need lifecycle and reconciliation implementation/tests. |
| H Registration/session controls | PARTIALLY FIXED | Register is no longer public; password/session gaps addressed here. Account-level progressive throttling and all identity-change paths remain to be verified. |
| I Plaintext passwords | PARTIALLY FIXED | New passwords are hashed, but auth.js verifyPassword still accepts legacy plaintext and migrates on login. Do not claim this finding closed. Provide a controlled explicit-target migration or reset rollout before removing compatibility to avoid locking out existing users. |
| J Frontend token handling | PARTIALLY FIXED | Existing client restricts automatic bearer attachment to configured API origin/path. LocalStorage token/XSS exposure remains; complete caller, redirect and logout tests pending. |
| K Configuration/disclosure | PARTIALLY FIXED | Existing environment API config and public health hardening plus safe error middleware here. Validate all production origin formats/defaults and detailed diagnostic access. |
| L Product mapping | PARTIALLY FIXED | Canonical router retained, obsolete undefined handlers removed, edit bypass fixed. Full route tests, audit rollback, duplicate-index/race checks and legacy data compatibility remain. |
| M Backup import | PARTIALLY FIXED | Existing code includes upload byte/file limits, signature check, dedicated permission and SQL command timeout. Disposable SQL isolation, quotas, restart/cleanup/cancellation and malformed/parallel upload integration are not verified. |
| N Formula injection | PARTIALLY FIXED | Shared spreadsheetSafety helper and tests exist; desktop conversion uses it. Need complete frontend/backend export inventory and adoption. |
| O Dependencies | PARTIALLY FIXED | Both executed production audits reported zero advisories. xlsx 0.18.5 remains declared, as does frontend xlsx-js-style; audit output does not resolve the prompt's provenance/parser-replacement requirement. No upgrades made in this pass. |
| P Decimal money | PARTIALLY FIXED | Central financialValidation exists but still uses Number/Math.round; decimal migration and boundary/reconciliation coverage remain. Financial calculations were not changed here. |
| Q Master references | PARTIALLY FIXED | Existing stock/product/master checks present. Every financial flow and active/tenant/reference rule needs negative integration coverage. |
| R Business dates | PARTIALLY FIXED | Strict shared date parser fixed and tested. Remaining ad hoc UTC date slicing must be replaced after caller characterization. |
| S Audit coverage | PARTIALLY FIXED | Permission writes now include transactional audit. All user/session/import/export/override and immutable-history requirements remain to be covered. |
| T Logging | PARTIALLY FIXED | Removed security-setup full-user logging. Many console calls remain; no repository-wide structured logger/redaction migration performed. |
| U Decomposition | PARTIALLY FIXED | Existing feature modules and new error middleware; removed dead mapping handlers. Giant financial/UI modules remain; characterize before moving logic. |
| V API contracts | PARTIALLY FIXED | Safe central errors and strict permission payload validation added. General schema validation and caught-error review remain. |
| W Indexes/idempotency | PARTIALLY FIXED | Existing scoped counters/stock keys and mapping index; user session increment fixed. Full index deployment, idempotency, concurrency and duplicate recovery tests pending. |
| X Backup operations | BLOCKED | Actual encrypted backup configuration, monitoring and restore-drill evidence are outside this workspace. Supply staging infrastructure/runbooks and recovery objectives; perform an isolated restore drill. No backup success is claimed. |

## Verification and commands

- Baseline: `node --test --experimental-test-isolation=none test/*.test.js` in backend: **38 passed**.
- Final same command: **49 passed, 0 failed**, including 11 new tests. These are unit/mocked tests, not database integration tests.
- `npm test` initially failed with sandbox `spawn EPERM`; in-process test mode ran the full suite successfully.
- `npm run build`: **passed**, 2,887 modules; existing large-chunk warning. First sandbox attempt failed with esbuild `spawn EPERM`; approved execution completed successfully.
- `npm run lint`: **passed**. Existing ESLint configuration has no substantial rule set and excludes backend from its configured source patterns; this is not comprehensive static analysis.
- `node --check` across backend JS: **passed**. Repeated on final server/security/product-mapping/error changes: **passed**.
- `git diff --check`: **passed**, with line-ending notices only.
- `npm audit --omit=dev --json` at root and backend: **zero reported vulnerabilities** for each. No dependency files changed by this pass.
- Read-only `rg` searches inspected routes, permission declarations, password paths, note calculations, stock sessions, imports and duplicate mappings. Literal authorizeRequest declarations were compared against the permission catalog with no unknown entries found. This is not complete authorization-route coverage.
- No dedicated disposable MongoDB replica set or SQL Server target was verified, so database integration/restore/migration tests were not run. The application server was not started. .env values were not printed. No comprehensive automated secret scan was run; source changes contain no credentials apart from explicitly test-only JWT text.

## Deployment, continuation and rollback

Before production rollout, run user-update/token-revocation and permission/audit rollback tests on a dedicated disposable MongoDB replica set. Confirm the mapping unique index exists and test concurrent creates. Normal users must have explicit boolean permission grants; unknown operations and non-boolean grants now fail closed. Mapping updates require both the existing add grant and edit grant because POST continues to support create/update compatibility.

User edits now revoke existing tokens, so affected users must log in again. New or changed user passwords must satisfy the existing strength policy. Business-date helper inputs must be YYYY-MM-DD. Permission payloads must contain an array of existing active tenant users and valid boolean permission matrices. Frontend code and business calculations were not edited in this pass.

Continue in severity order: (1) complete endpoint/assigned-salesman isolation tests and missing guards, (2) transaction rollback/idempotency tests, (3) accounting posting/state transitions and note limits with characterized examples, (4) plaintext migration and parser replacement, (5) decimal conversion, export/logging coverage and operational restore verification. Decisions about manual notes, posting states and legacy credentials must preserve existing supported workflows rather than silently disabling them.

Rollback must reverse only this pass's reviewed hunks, preserving all pre-existing work. Do not reset the workspace. Database sessionVersion increments should never be decremented to undo deployment; doing so could revive old tokens. No data migration rollback is needed for this pass.

Final Git state retains all initial modifications/untracked paths (including the pre-existing deleted assets/TotalSolution.ico). Newly tracked-file modification: backend/businessDate.js. Newly untracked files from this pass: backend/apiError.js, backend/test/security-policy.test.js, REMEDIATION-STATUS.md. Existing auth/security/server/productMapping edits include this pass's additions. Nothing committed or pushed.
