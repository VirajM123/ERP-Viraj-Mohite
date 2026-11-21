# Security release candidate: HOLD

## Evidence update — 2026-11-21

Local candidate: **HOLD**. Production rollout: **HOLD**. Evidence below applies to the existing uncommitted working tree based on `0a2cedcf70910f8b34e2bf50372cf85b5e0095ec`; this document update does not change application code. The remaining gates below have not been completed, so passing tests do not authorize release. Overall ERP security score remains pending the broader audit.

The documented local setup started MongoDB 8.2 on loopback port 27991 and API processes on 5101 and 5102, plus Vite on 5187. MongoDB logged startup complete and both API logs reported connection to `erp_security_disposable` and successful startup. `netstat -ano` confirmed the listeners and process ownership. `Get-NetTCPConnection` produced no listener output in this environment; `Get-CimInstance Win32_Process` returned `Access denied`. The registration test verified the MongoDB command-line binding, port, data directory and database name before fixture writes. Only processes started for this run were stopped; the five documented ports were clear afterward.

Commands run from `backend` with `DISPOSABLE_MONGODB_URI=mongodb://127.0.0.1:27991/erp_security_disposable`:

- `node --test integration/registration.test.js`: pass (1 test), using both API instances. This covers ordinary registration, duplicate responses, selected races and firm linking; it does not establish legacy index initialization, interrupted-write recovery or all identifier/partial-record invariants.
- `node --test integration/browser.test.js integration/workflow-access.test.js integration/timing.test.js integration/migration.test.js integration/migration-cli.test.js`: browser, selected workflow reads, timing and migration tests passed; migration CLI failed because these files were inadvertently run concurrently and its snapshot included the browser fixture. This combined run is invalid evidence for the CLI and violated the documented sequential order. The timing sample was five per group and is not a distribution test.
- `node --test integration/migration-cli.test.js`: pass (1 test), rerun alone after the other fixtures were removed. Synthetic dry-run, apply, retry and bcrypt-only login only; no production migration.
- `npm.cmd test`: pass, 223 tests, isolated backend suite.
- From the repository root, `npm.cmd run build`: pass; Vite reported mixed static/dynamic imports and chunks larger than 500 kB.

The browser test still does not cover two isolated UI contexts using the actual logout control or a real desktop upload. The workflow integration test covers selected reads, permission denials and firm scope; it does not establish ordinary-user sales and settlement writes, all detail/print/PDF/export routes, rollback after failed posting, duplicate submission, or concurrent financial writes. The documented MongoDB instance is standalone; transaction-dependent posting must be tested on a disposable replica set or equivalent transaction-capable topology. No application fix or coordinated cutover validation was completed in this run.

Owner decision required: whether access is firm-wide or restricted by company and/or branch; if restricted, specify role exemptions, who assigns entitlements, how company and branch rules combine, and treatment of legacy records. Current-policy route and write verification remains incomplete regardless of that decision. No authorized production configuration or migration evidence beyond the repository checklist was established in this run. Obtain the deployment topology, writer inventory, duplicate and counter audit, index privileges, production host/proxy/CORS/cookie evidence, external client inventory, backup and migration reconciliation evidence listed below before considering rollout. Production deployment, live configuration, credential migration and session revocation remain pending explicit approval.

This is a working-tree candidate, not an approved production release. The existing integration tests use the disposable standalone MongoDB described in README.md; they do not establish all release gates.

## Open gates

- Registration now requires sparse unique indexes for new public-registration usernames and firm pairs before writing. These constraints prevent two updated public-registration writers from committing the same keys even if the lease expires. They do not fence every stale write, cover pre-existing records or old writers, or make firm linking and public registration atomic together. Validate the indexes and interruption recovery against representative old records; audit legacy duplicates and counter maxima first. Stop every old writer during cutover: old and new allocators must never run simultaneously. The application database principal must be able to create or confirm the required indexes, or registration fails closed.
- Existing browser coverage uses one UI context and a separate HTTP login. It does not exercise the actual logout control in two isolated contexts, or a real desktop upload. The XHR cookie/CSRF and internal session-token forwarding changes require that end-to-end test, including bearer client compatibility and revocation/expiry behavior.
- The MongoDB workflow test covers selected reads, not the complete route inventory or ordinary-user sales and settlement writes. Confirm every detail, print, PDF and export route, permission, firm and record scope. An owner must decide whether firm-wide access is intended or company/branch isolation is required. If isolation is required, obtain role exemptions, assignment authority, combined company/branch rules and legacy-record rules before implementing it.
- The five-sample timing check is descriptive only; it cannot establish indistinguishable distributions under representative load or rate limiting.

## Deployment inputs and migration checklist

Obtain exact HTTPS frontend and API hostnames, TLS termination and proxy settings, the explicit credentialed CORS origin allowlist, cookie same-site compatibility, and an inventory of external bearer clients, owners, token lifetimes and migration dates. REJECT_BROWSER_BEARER is a browser compatibility control, not token revocation. Inventory old tokens, set a retirement deadline, migrate clients, verify expiry or revoke using the supported session-version mechanism, and verify rejection before removing compatibility. Do not change live configuration or revoke live sessions without approval.

Before any production migration, approve a maintenance window; take and verify a restorable backup; record credential counts by collection and credential state without exposing secrets; identify malformed/overlength credentials and arrange resets; run the migration dry-run and reconcile counts; apply once approved; rerun to establish idempotence; verify bcrypt hashes and login for representative accounts, reset exceptions, and reconcile remaining plaintext counts. Activate BCRYPT_ONLY only after those checks and approval. Preserve migration logs without credentials.

## Ordered rollout and recovery

1. Resolve open gates, review the complete diff, and repeat all isolated, MongoDB and browser checks on the final candidate.
2. Stage with production-equivalent HTTPS, explicit CORS and synthetic data. Smoke-test UI sign-in, two-session logout, upload and import, bearer clients, authorized and denied sales/settlement, and registration/linking races.
3. After explicit production approval, back up and verify recovery, inventory and stop incompatible writers, migrate and verify credentials, then deploy compatible code and required indexes/counters in a coordinated maintenance window. Activate bcrypt-only after reconciliation. Resume traffic only after smoke checks.
4. On failure, stop writes and restore service using a known-good build that retains the security controls and bcrypt-only authentication; restore verified data only under an approved recovery plan and reconcile writes since backup. Do not restore plaintext authentication or restart an incompatible allocator. Investigate, retest and obtain approval before resuming.

Overall ERP security score remains pending the broader audit.
