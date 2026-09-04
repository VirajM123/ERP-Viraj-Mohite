# FMCG ERP संपूर्ण Static Audit Report

दिनांक: 18 ऑगस्ट 2026  
Audit प्रकार: Source-code static analysis; destructive testing, live database verification आणि code modification केलेले नाही.

## Executive Summary

- Analyse केलेल्या project files: 43 (यात source/config/assets व repository artifacts; `node_modules`/`dist` वगळले)
- Backend route handlers: 194 (regex-based inventory; dynamic middleware compositionमुळे ही संख्या approximate आहे)
- प्रत्यक्ष evidence असलेले unique findings: 22
- Critical: 8
- High: 8
- Medium: 5
- Low: 1
- Overall Risk: **CRITICAL**
- Production readiness: **NO**

मुख्य कारण authentication token/session नसणे, plaintext passwords, client-controlled identity headers, unauthenticated financial/master/report endpoints, client-supplied financial totals, cancel flowमध्ये stock restore नसणे आणि hard-delete/audit-trail धोके हे आहेत.

## Architecture Summary

```text
Frontend: React 18 + Vite; मोठे monolithic Dashboard/Transaction/Report components
Backend: Express 5; मुख्यतः backend/server.js, transaction.js व feature routers
Database: MongoDB + Mongoose; embedded transaction item arrays
Authentication: username/password lookup; JWT/session/refresh token नाही
Authorization: Mas_SecuritySetup permissions, परंतु identity x-* headersमधून client देतो
Main Modules: Masters, Sales, Purchase, Stock, Quotation, Load/Settlement,
              Receipt/Cheque/PDC/Contra/Collection, Credit/Debit Notes, Reports, Import
Important Models: Mas_Register, Mas_User, Mas_Product, Mas_Account, Mas_Stock,
                  T_Sal_Header, T_Pur_Header, T_Receipt, T_CreditNote_Header,
                  DebitNote, T_Load_Header, T_SettleLoad
Critical flows: Purchase→Stock; Sales→Stock; Sales edit/delete→Stock/Load;
                Load→Settlement→Receipt; Credit/Debit Note→Stock/amount; Reports
```

## Top 10 सर्वाधिक धोकादायक समस्या

| Rank | Issue | Severity | Business Impact | Fix Priority |
|---:|---|---|---|---|
| 1 | Client headers बदलून admin role impersonation | Critical | Unauthorized access/tenant breach | Immediate |
| 2 | अनेक APIs authentication शिवाय | Critical | Financial/master data read/write/delete | Immediate |
| 3 | Password plaintext storage/comparison | Critical | Account compromise | Immediate |
| 4 | Cancelled sales bill stock restore करत नाही | Critical | Stock corruption | Immediate |
| 5 | Sales/Purchase/GST totals clientवर विश्वास | Critical | Wrong GST, invoice, outstanding | Immediate |
| 6 | Firm/User/master endpointsमध्ये IDOR/hard delete | Critical | Cross-tenant deletion/data loss | Immediate |
| 7 | Receipt flow unauthenticated आणि non-atomic | Critical | Duplicate/wrong collection | Immediate |
| 8 | Ledger/double-entry subsystem अपूर्ण/अनुपस्थित | Critical | Outstanding/accounting mismatch | Before Production |
| 9 | `latest + 1` numbering endpoints race-prone | High | Retry/conflict/workflow failure | Before Production |
| 10 | Historical invoice snapshots अपूर्ण | High | जुने tax/name/address बदलण्याचा धोका | Before Production |

## Detailed Findings

### ISSUE ID: ERP-001

- Severity: **CRITICAL**
- Category: Authentication / Password Security
- File/API: `backend/server.js:72-84, 319-367, 485-572`; POST `/api/login/firms`, POST `/api/login`
- समस्या: `password` व `oldPassword` String म्हणून store होतात आणि database query/direct equalityने plaintext compare होतात. `bcryptjs` dependency असून वापर नाही.
- Trigger: database leak, logs/backup leak, insider access किंवा password reuse.
- Business impact: सर्व user/admin accounts compromise; दुसऱ्या systemsवर credential stuffing.
- Financial cost: exact cost codeवरून निश्चित नाही; संभाव्य नुकसान **Potentially Severe**.
- Data risk: Critical; Security risk: Critical; Fix complexity: Medium; Priority: Immediate.
- Recommended fix: Argon2id/bcrypt hash migration, constant-time verify, forced reset, password policy आणि leaked-password protection.
- Code बदल आवश्यक: YES (आत्ता केलेला नाही).

### ISSUE ID: ERP-002

- Severity: **CRITICAL**
- Category: Authentication / Authorization
- File/API: `backend/securitySetup.js:612-659`; सर्व `authorizeRequest` वापरणारे routes
- संबंधित code: identity `x-distributor-id`, `x-firm-id`, `x-user-id`, `x-user-role` headersमधून वाचली जाते; cryptographic verification नाही. `DISTRIBUTOR_ADMIN` roleला `authorize()` थेट true (`:576-584`).
- नेमकी चूक: browser/localStorage नियंत्रित करणारा caller role header `DISTRIBUTOR_ADMIN` करू शकतो.
- उदाहरण: Normal User → header बदल → Admin API.
- Business impact: permissions पूर्ण bypass, tenant data read/write/delete.
- Cost: exact नाही; संभाव्य नुकसान Potentially Severe.
- Data/Security risk: Critical/Critical; Complexity: Hard; Priority: Immediate.
- Fix: server-issued signed short-lived access token/session; DBमधून user/role/tenant resolve; request body/query tenant IDs ignore; authorization verified principalवर करा.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-003

- Severity: **CRITICAL**
- Category: API Security / Missing Authentication
- Evidence: route inventoryमध्ये `backend/server.js`चे 154 handlersपैकी 66 handlersना `authorizeRequest` नाही. उदाहरणे: `/api/users` (`:631,777,866,899`), `/api/firms` (`:6390,6558,25554,25603`), `/api/stock/batches` (`:13123`), `/api/receipt` (`:20539-20693`), reports (`:29406,30008,30098,30472,30928`). `ensureConnection` (`:62-70`) फक्त DB connectivity तपासते.
- Trigger: unauthenticated HTTP caller IDs अंदाजून/मिळवून request करतो.
- Impact: user/firm/stock/report/receipt data exposure किंवा mutation.
- Data/Security risk: Critical/Critical; Complexity: Hard; Priority: Immediate.
- Fix: global deny-by-default authentication middleware; explicit public allow-list फक्त login/register/health; प्रत्येक routeला action permission.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-004

- Severity: **CRITICAL**
- Category: Tenant Isolation / IDOR / Data Loss
- Evidence: `User.findByIdAndDelete(req.params.id)` (`server.js:901`), `Register.findByIdAndUpdate/Delete` (`:25554-25605`), अनेक master `findByIdAndDelete` (`:25681,25756,25827...`) tenant filterशिवाय. काही protected routesसुद्धा URL IDवर tenant ownership verify करत नाहीत.
- Scenario: Company A user Company B चा Mongo `_id` देतो.
- Impact: cross-tenant edit/delete; referential orphans; irreversible master loss.
- Cost: Potentially Severe; Data/Security: Critical/Critical; Complexity: Medium; Priority: Immediate.
- Fix: `{_id, distributorId: principal.distributorId, firmId: principal.firmId}` compound filter; referenced transaction असल्यास delete block; soft-delete + audit log.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-005

- Severity: **CRITICAL**
- Category: Inventory / Cancellation
- File/API: `backend/server.js:20750-20797`; PUT `/api/sales/cancel-bill`
- समस्या: bill totals/items शून्य करून cancelled mark होतो; जुना item stock परत add करण्यासाठी transaction किंवा `applySalesStockMovement(+1)` नाही.
- Scenario: 10 units saleनंतर stock 90; bill cancel केल्यावर stock 90च राहतो, अपेक्षित 100.
- Impact: permanent stock shortage, wrong reorder/report/profit.
- Cost: High/Potentially Severe; Data risk Critical; Security Low; Complexity Medium; Priority Immediate.
- Fix: transactionमध्ये bill load, loaded/settled/receipt constraints, stock restore, cancellation audit event; original bill snapshot preserve.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-006

- Severity: **CRITICAL**
- Category: GST / Financial Integrity / Mass Assignment
- Evidence: sales save `server.js:11517-11639`, edit `:7739-7811`; purchase save `:9595-9602`, edit `:10113-10120` request totals/GST थेट persist करतात.
- नेमकी चूक: backend item rates/discount sequence/tax stateवरून authoritative totals recompute करून submitted totalsशी compare करत नाही.
- Scenario: caller `NetAmount=1`, `CGSTAmount=0`, valid high-value items पाठवतो.
- Impact: invoice/report/GST/outstanding mismatch आणि tax compliance risk.
- Cost: Potentially Severe; Data risk Critical; Security High; Complexity Hard; Priority Immediate.
- Fix: decimal-safe server calculator; product/customer/place-of-supply validation; taxable→CGST/SGST किंवा IGST rules; allowed rounding tolerance; immutable calculation snapshot.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-007

- Severity: **CRITICAL**
- Category: Receipt / Accounting / Atomicity
- Evidence: `/api/receipt` unauthenticated (`server.js:20539`); duplicate check (`:20553`) नंतर independent create; receipt no `last+1` (`:20567`); Mongo transaction/unique index evidence नाही; bill balance caller-supplied `billAmount` वापरतो (`:20693-20703`).
- Scenario: double click/concurrent requests दोन्ही duplicate check pass करतात.
- Impact: duplicate collection, wrong pending balance, customer dispute.
- Cost: Potentially Severe; Data/Security Critical/Critical; Complexity Hard; Priority Immediate.
- Fix: authenticated atomic receipt transaction, idempotency key, unique tenant/series/no index, server-loaded bill amount, allocation total validation, ledger posting.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-008

- Severity: **CRITICAL**
- Category: Accounting Architecture
- Evidence: sales/purchase schemas व save flowsमध्ये stock/header updates आहेत, पण balanced journal/ledger lines (`Customer Dr/Sales Cr/GST Cr`, `Purchase/Input GST/Vendor`) create करण्याचा सामान्य ledger engine/model सापडला नाही. Receipt/Contra collections स्वतंत्र आहेत.
- Verification: live accounting data उपलब्ध नसल्याने balances mismatchचा actual occurrence **Unable to Verify**; architecture gap verified.
- Impact: trial balance, party outstanding, GST reconciliation आणि financial statements authoritative नाहीत.
- Cost: Potentially Severe; Data risk Critical; Security Low; Complexity Hard; Priority Before Production.
- Fix: immutable double-entry journal, debit=credit constraint, source transaction unique key, reversal entries, reconciliation.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-009

- Severity: **HIGH**
- Category: Bill Number / Concurrency
- Evidence: purchase `server.js:9499-9518`, sales `:10768-10787`, quotation `:13434-13453`, receipt/load/note equivalents `:20671,20711,21725,23711` `last + 1` करतात.
- Positive control: sales/purchase compound unique indexes आहेत (`:1830-1833,1982-1985`), त्यामुळे duplicate commit block होतो; पण two usersना same next number मिळून एक save 409 होऊ शकतो. काही collectionsमध्ये unique index verify झाला नाही.
- Impact: duplicate/retry, abandoned forms, series continuity issue.
- Data/Security: High/Low; Complexity Medium; Priority Before Production.
- Fix: atomic counter per tenant+FY+series, unique index, duplicate-key retry आणि idempotency.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-010

- Severity: **HIGH**
- Category: Historical Data / Compliance
- Evidence: sales snapshotमध्ये item Array व party/company names आहेत, परंतु customer GSTIN/address/place-of-supply/company statutory identityची पूर्ण immutable snapshot schemaमध्ये स्पष्ट नाही (`server.js:1838-1970`). अनेक reports current Product master वापरतात (`:30646+`).
- Scenario: product/customer/company master बदलल्यानंतर जुने print/report current values उचलतो.
- Impact: old invoice reproduction, GST audit आणि legal document mismatch.
- Data risk High; Security Low; Complexity Hard; Priority Before Production.
- Fix: invoice-time immutable party, company, HSN, tax rate, place-of-supply, address आणि rate snapshots; reports transaction snapshotवरून.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-011

- Severity: **HIGH**
- Category: Audit Trail / Deletion Recovery
- Evidence: financial/master hard deletes `findByIdAndDelete` (`server.js:26831-26925,27641-27715` इ.); created/modified/deleted by, old/new values, reason, IP यांचा append-only audit model नाही.
- Impact: fraud investigation/reconciliation अशक्य, accidental deletion recovery कठीण.
- Data risk Critical; Security Medium; Complexity Hard; Priority Before Production.
- Fix: hard delete बंद; reversal/void; append-only audit event; admin reason आणि approval; backup retention.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-012

- Severity: **HIGH**
- Category: Sales Outstanding / Cancellation
- Evidence: cancel route bill amount zero करते (`server.js:20773-20796`) पण receipts असल्याची check, load/settlement constraint, receipt reversal किंवा ledger reversal नाही.
- Impact: paid invoice cancel केल्यावर orphan receipt/negative or misleading outstanding.
- Data risk Critical; Complexity Hard; Priority Immediate.
- Fix: state machine (`DRAFT→POSTED→LOADED→SETTLED`; cancel via reversal), linked receipt/load checks.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-013

- Severity: **HIGH**
- Category: Security Setup
- Evidence: `checkPermission`मध्ये action `view` नेहमी true (`securitySetup.js:552-559`) once operation exists; security setup GET endpoints query parametersवर विश्वास ठेवतात (`:682+`, `:752+`).
- Impact: intended view restriction लागू होत नाही; permission metadata disclosure.
- Data/Security: High/High; Complexity Easy; Priority Immediate.
- Fix: explicit view flag enforce; authenticated principal tenant binding; security setup administration admin-only.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-014

- Severity: **HIGH**
- Category: Secrets / Environment
- Evidence: `backend/.env` Git tracked आहे (`git ls-files` output); actual value reportमध्ये मुद्दाम mask/omit केली आहे. `.gitignore` entry encoding malformed दिसते.
- Impact: repository/history access असलेल्या व्यक्तीस database credential exposure; rotationनंतरही history risk.
- Data/Security: Critical/Critical; Complexity Medium; Priority Immediate.
- Fix: credential त्वरित rotate; file untrack; correct UTF-8 `.gitignore`; secret manager; Git history secret scan/purge strategy.
- Code बदल आवश्यक: YES (config/history remediation).

### ISSUE ID: ERP-015

- Severity: **HIGH**
- Category: Production Security
- Evidence: global `cors()` unrestricted (`server.js:14`), body size explicit नाही (`:15-16`), Helmet/rate limiter/request timeout नाही; login rate limit/CAPTCHA/lockout नाही.
- Impact: brute force, cross-origin API abuse, large-body DoS, missing security headers.
- Security risk High; Complexity Easy/Medium; Priority Before Production.
- Fix: strict origin allow-list, JSON limit, Helmet, login/API rate limits, reverse-proxy timeouts, structured safe errors.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-016

- Severity: **HIGH**
- Category: Reporting Authorization / Data Leakage
- Evidence: report endpoints `server.js:29406,30008,30098,30382,30472,30928,31106` authorization middleware शिवाय; tenant query caller देतो.
- Impact: sales/purchase/customer/product performance व financial data cross-tenant disclosure.
- Data/Security High/Critical; Complexity Medium; Priority Immediate.
- Fix: report permission + principal tenant scope; export audit; pagination/limits.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-017

- Severity: **MEDIUM**
- Category: Frontend/Backend Configuration
- Evidence: `Dashboard.jsx:28` localhost API, `ImportData.jsx:5` localhost; इतर screens Render production URL (`Transaction.jsx:30`, `Login.jsx:4`); Report env fallback वेगळा (`Report.jsx:126-127`).
- Impact: productionमध्ये modules वेगवेगळ्या backendsना connect किंवा fail होऊ शकतात.
- Complexity Easy; Priority Before Production.
- Fix: single validated `VITE_API_URL`, environment-specific build, startup diagnostics.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-018

- Severity: **MEDIUM**
- Category: Frontend Maintainability / Reliability
- Evidence: `Dashboard.jsx` ~82,028 lines/2.5MB, `Transaction.jsx` ~18,753 lines, `Report.jsx` ~9,230 lines; code-smell scan 690 matches (console/localhost/TODO इ. सहित).
- Impact: stale state/useEffect regressions, review/test कठिन, bundle/build performance.
- Exact runtime failure: Unable to Verify.
- Complexity Hard; Priority Next Release.
- Fix: feature modules/hooks/servicesमध्ये incremental extraction; characterization tests प्रथम.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-019

- Severity: **MEDIUM**
- Category: Date/Timezone/Financial Year
- Evidence: अनेक dates String; frontend `new Date().toISOString().split("T")[0]` (`Transaction.jsx:6723`) UTC day वापरतो; centralized IST/FY service नाही.
- Scenario: IST midnight जवळ transaction previous UTC date घेऊ शकतो.
- Impact: daily/GST/FY filters mismatch.
- Complexity Medium; Priority Before Production.
- Fix: business date explicit `Asia/Kolkata`, half-open UTC ranges, validated FY context per transaction.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-020

- Severity: **MEDIUM**
- Category: Import Security/Integrity
- Evidence: import validates then save separately (`importRoutes.js:104-118`); raw spreadsheet parsing frontendमध्ये; request-wide row/byte hard limits दिसले नाहीत. Positive: server config allow-list, firm/company validation व bulk transaction logic आहे.
- Impact: validation-save TOCTOU, large payload DoS, formula injection on later export, duplicate/import reconciliation burden.
- Complexity Medium; Priority Before Production.
- Fix: revalidate in same save transaction, size/row caps, neutralize formulas on export, import batch id/audit/idempotency.
- Code बदल आवश्यक: YES.

### ISSUE ID: ERP-021

- Severity: **MEDIUM**
- Category: Backup / Disaster Recovery
- Evidence: repositoryमध्ये automated backup, tested restore runbook, PITR configuration किंवा restore drill artifact नाही.
- Actual infrastructure: **Unable to Verify**.
- Impact: ransomware/operator error/hard deleteनंतर recovery uncertainty.
- Complexity Medium; Priority Before Production.
- Fix: Atlas PITR/snapshots, encrypted off-account backup, RPO/RTO, quarterly restore test आणि documented ownership.
- Code बदल आवश्यक: NO (मुख्यतः operations; audit hooksसाठी YES).

### ISSUE ID: ERP-022

- Severity: **LOW**
- Category: Dependency Security
- Evidence: backend `npm audit --omit=dev` on 18-Aug-2026: 0 known production vulnerabilities (125 prod dependencies). Frontend audit result या runमध्ये पूर्ण verify झाला नाही.
- Note: package audit हा absence-of-known-CVE signal आहे; application securityची हमी नाही.
- Risk Low; Priority Planned.
- Fix: CI audit/SBOM/lockfile review; frontend audit स्वतंत्रपणे gate करा.
- Code बदल आवश्यक: NO/Config.

## Positive Controls

- Sales आणि purchase create/editमध्ये MongoDB sessions/transactions आहेत (`server.js:9533-9820`, `10033-10138`, `11334-11767`).
- Stock key, sales bill व purchase voucher compound unique indexes आहेत (`:1777-1780`, `1830-1833`, `1982-1985`).
- Sales stock quantityमध्ये paid + free quantity वापरली जाते आणि non-positive total reject होतो (`:10974-11038`).
- Sales edit old stock restore करून new stock apply करण्याचा transactional flow ठेवतो (`:7632-7659`).
- Importमध्ये allow-listed columns व tenant/company checks आहेत.

हे controls ERP-001 ते ERP-016मधील authentication, authoritative calculation आणि state-transition risks भरून काढत नाहीत.

## Transaction Consistency Matrix

| Transaction | Stock | Ledger | Outstanding | GST | Reports | Risk |
|---|---|---|---|---|---|---|
| Sales | Transactional | Not verified/engine absent | Derived/fragmented | Client-trusted | Header-driven | Critical |
| Purchase | Transactional | Not verified | Vendor ledger absent | Client-trusted | Multiple model paths | Critical |
| Sales Return/Credit Note | Stock logic present | Not verified | Partial | Client-trusted | Optional inclusion | High |
| Purchase Return/Debit Note | Stock logic present | Not verified | Not verified | Partial | Partial | High |
| Receipt | No stock | No unified journal | Separate receipt sums | N/A | Separate | Critical |
| Payment | N/A | Unable to Verify | Unable to Verify | N/A | Unable to Verify | High |
| Credit Note | Stock/amount paths | No unified journal | Sales amount adjusted | Client fields | Flag-dependent | High |
| Debit Note | Stock paths | No unified journal | Not verified | Partial | Partial | High |

## Module-wise Audit Score

| Module | Score /100 | Risk | Basis |
|---|---:|---|---|
| Authentication | 10 | Critical | plaintext; no token/session/rate limit |
| Authorization | 15 | Critical | spoofable headers; missing middleware |
| Sales | 48 | Critical | atomic stock positive; totals/cancel unsafe |
| Purchase | 52 | High | atomic stock positive; totals/ledger gaps |
| Inventory | 58 | High | unique stock + transactions; cancel/state gaps |
| Accounting | 20 | Critical | unified double-entry evidence absent |
| GST | 30 | Critical | authoritative server calculation absent |
| Reports | 35 | High | unauthenticated; heterogeneous calculations |
| Database | 60 | High | useful indexes/transactions; hard deletes/snapshots |
| API Security | 15 | Critical | no real auth, open CORS/routes |
| Performance | 45 | Medium | huge UI modules/unbounded endpoints |
| Backup | 20 | High | repository evidence absent |

Scores हे code evidenceवर आधारित comparative readiness indicators आहेत; certification नाही.

## Static Attack Simulation

| Attack path | Result | Evidence |
|---|---|---|
| Normal User → Admin API | Vulnerable | spoofable `x-user-role` |
| Unauthenticated User → Invoice/receipt API | Vulnerable | multiple routes only `ensureConnection` |
| User A → Company B Data | Vulnerable | caller-controlled tenant IDs/open routes |
| Modified Invoice ID → Other Invoice | Potentially Vulnerable | mixed tenant filters; some ID-only reads |
| Modified Customer/Firm ID → Other tenant | Vulnerable | ID-only edit/delete routes |
| Repeated Save → Duplicate | Partially Protected | sales/purchase unique; receipt weaker |
| Malicious NoSQL operators | Partially Protected | many strings normalized; IDs/body mass assignment remain |

## 100 महत्त्वाचे Edge/Regression Test Cases

1. Zero quantity sale reject.  
2. Negative quantity sale reject.  
3. Free quantity negative reject.  
4. Sale quantity stockपेक्षा अधिक असताना setting OFF.  
5. Negative stock setting ON असताना audit evidence.  
6. दोन users same last stock concurrently sell.  
7. Same sales bill number concurrent save.  
8. Same idempotency key repeated sales save.  
9. Save response हरवल्यावर client retry.  
10. Sales item missing product code.  
11. Invalid/other-tenant product code.  
12. Other-tenant godown code.  
13. Locked batch sale.  
14. Expired batch sale.  
15. MRP negative/NaN/string.  
16. Rate negative/greater than MRP policy.  
17. Paid + free stock deduction.  
18. Multiple lines same batch aggregate validation.  
19. Sales edit quantity increase.  
20. Sales edit quantity decrease.  
21. Sales edit batch/godown change.  
22. Sales edit after load.  
23. Sales edit after settlement.  
24. Sales edit after receipt.  
25. Sales delete restores stock exactly once.  
26. Sales cancel restores stock exactly once.  
27. Cancel already-cancelled bill idempotent.  
28. Delete loaded invoice blocked.  
29. Delete paid invoice blocked/reversed.  
30. Bill type change stock/ledger neutral.  
31. Intrastate CGST+SGST calculation.  
32. Interstate IGST calculation.  
33. Both IGST and CGST submitted reject.  
34. GST on post-discount taxable base.  
35. Multiple sequential discounts order.  
36. Scheme/free quantity tax treatment.  
37. CESS calculation.  
38. GST rounding at line vs invoice.  
39. Invalid GSTIN/state/place of supply.  
40. Product GST changes after old invoice.  
41. Customer address/GSTIN changes after invoice.  
42. Company GST details change after invoice.  
43. Client tampers NetAmount.  
44. Client tampers GST amounts.  
45. Client tampers TotalQty/free qty.  
46. Purchase zero/negative quantity.  
47. Purchase duplicate supplier invoice number.  
48. Same purchase voucher concurrent save.  
49. Purchase paid + free stock addition.  
50. Purchase edit reverses old stock once.  
51. Purchase delete reverses stock once.  
52. Purchase delete after payment.  
53. Purchase return stock reduction.  
54. Debit note GST and vendor balance.  
55. Wrong landed-cost components.  
56. Credit note with quantity return.  
57. Credit note amount-only without stock.  
58. Credit note cannot exceed original bill/line.  
59. Credit note after invoice cancel.  
60. Debit note concurrent numbering.  
61. Receipt amount zero/negative.  
62. Receipt greater than pending bill.  
63. Two concurrent receipts for remaining balance.  
64. Double-click receipt save.  
65. Receipt for other-tenant bill.  
66. Receipt delete/reversal updates outstanding.  
67. Cheque bounce reverses receipt/customer balance.  
68. PDC pending→cleared→bounced transitions.  
69. Contra debit equals credit.  
70. Journal voucher total debit equals credit.  
71. Payment vendor allocation.  
72. Opening balance debit/credit sign.  
73. Loaded invoice appears once.  
74. Same bill added to two active loads.  
75. Load transfer concurrent update.  
76. Settle load with partial collection.  
77. Settle load twice idempotent.  
78. Delete settled load blocked/reversal.  
79. Damage stock reduces saleable stock.  
80. Expiry stock separation.  
81. Godown transfer atomic out/in.  
82. Transfer failure rolls both sides back.  
83. Stock report equals stock ledger closing.  
84. Sales report equals posted invoice totals.  
85. Purchase report uses actual purchase collection/model.  
86. GST report reconciles invoice snapshots.  
87. Profit report uses historical cost.  
88. Cancelled/deleted docs report behavior.  
89. Report date inclusive start/end in IST.  
90. 31-Mar 23:59 IST financial year.  
91. 1-Apr 00:01 IST numbering reset/carry-forward.  
92. Unauthorized request with no headers.  
93. User changes `x-user-role` to admin.  
94. User changes `x-firm-id` to other firm.  
95. User edits/deletes other-tenant Mongo ID.  
96. Brute-force login throttling.  
97. Oversized JSON/import rows rejected.  
98. Spreadsheet formula injection neutralized on export.  
99. Backup restore to isolated environment and reconcile totals.  
100. Audit log proves who changed/cancelled/reversed a financial transaction.

## Fix Priority Roadmap

### Immediate — आजच

ERP-001, 002, 003, 004, 005, 006, 007, 012, 013, 014, 016. Production/API public access थांबवून credentials rotate करा.

### Before Production

ERP-008, 009, 010, 011, 015, 017, 019, 020, 021; end-to-end reconciliation tests आणि restore drill पूर्ण करा.

### Next Release

ERP-018 modularization व performance budgets; remaining report/pagination consistency.

### Technical Debt

Central API client, validation schemas, money/date domain types, state machines, structured logs, CI security gates.

## Final Assessment

```text
एकूण Issues: 22
Critical: 8
High: 8
Medium: 5
Low: 1

सर्वात धोकादायक Module: Authentication/Authorization आणि Accounting integrity
सर्वात सुरक्षित तुलनात्मक Module: Core Sales/Purchase stock transaction mechanism

Financial Risk: Potentially Severe
Security Risk: Critical
Data Integrity Risk: Critical
GST Risk: Critical
Inventory Risk: High/Critical
Production Readiness: Not Ready

ERP Production साठी तयार आहे का? NO
```

Production blockers: real authenticated identity नसणे, open APIs, plaintext passwords, authoritative server-side financial/GST calculation नसणे, cancel/receipt/accounting consistency gaps, audit/backup controlsचा अभाव.

सर्वप्रथम fix करावयाचे 10 मुद्दे: ERP-002, ERP-003, ERP-001, ERP-014, ERP-004, ERP-005, ERP-006, ERP-007, ERP-008, ERP-011.

## Audit Limitations

- Live MongoDB data, indexesची deployed state, Atlas configuration, backups, network perimeter आणि production logs तपासलेले नाहीत.
- GST/legal conclusions हे code-risk review आहेत; CA/GST practitioner sign-offची जागा घेत नाहीत.
- Static analysisमध्ये actual runtime data corruptionचा दावा केलेला नाही; verify न झालेल्या बाबींना तसे नमूद केले आहे.
- कोणताही existing source code, business logic, file name किंवा dependency बदललेली नाही; फक्त हा report artifact जोडला आहे.
