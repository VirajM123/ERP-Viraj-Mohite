# Validation — 6 November 2026

Application source/configuration/database/dependencies were not edited. No server, live company session or production build was started.

Existing test command:

```text
node --test backend/test/ledger-opening.test.js backend/test/opening-accounting.test.js backend/test/payment.test.js backend/test/debit-note-stock.test.js
```

Result: 17 tests, 17 pass, 0 fail. Tests use existing fixtures/mocks; passing does not resolve the documented defects.

In-memory calculator results from importing backend/financialValidation.js:

- qty 10, free 2, rate 100, GST 0: GrossAmount 1200.
- qty 1, rate 100, TPR 80, scheme 80, GST 18: NetAmount 18.
- qty 1, rate 100, GST 0, CreditNoteAmount 150: NetAmount 0.

Image QA: initial generations with unrelated screens or pharmaceutical examples were rejected and regenerated with stricter screen-specific FMCG prompts. Selected final images were visually inspected. Generated text/figures are illustrative; no image's numbers or tax examples are approved as accounting fixtures. Concepts are multi-panel boards, not a complete implementation specification. The source-based review cannot establish runtime clipping, actual keyboard usability, production performance or historic misstatement amounts.
