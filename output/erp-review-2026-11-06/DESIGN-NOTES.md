# How to interpret these designs

These images are visual layout proposals produced by the built-in image generator. Use SCREEN-CATALOGUE.md and REVIEW.md for intended behavior. Generated field examples, tax rates, figures, dates, shortcuts and accounting previews are not implementation specifications. New draft/post, approvals, clearing, valuation, recovery and import controls shown must be checked against current backend capabilities and designed explicitly before implementation.

Specific review corrections that override illustrative image content:

- Account opening: referencing an existing invoice must not create a second GL opening. A preview that includes reference rows in a fresh opening journal must not be implemented. Use approved opening-accounting policy and reconcile remaining balances.
- Credit note: the normal sales-return preview debits the appropriate sales-return/output-tax adjustment ledgers and credits the customer's receivable, with exact balancing and confirmed tax applicability. Any image with reversed sides or unequal figures is a visual-generation error. A damaged-item reason must agree with its stock disposition.
- Free quantity: it changes physical quantity independently of commercially charged quantity unless an explicit blended-rate policy says otherwise.
- Stock In/Out: distinguish a stock adjustment from purchase/sale document fulfillment to avoid moving stock twice. Reasons and source-document references matter.
- Inventory valuation options are proposed controls, not evidence that FIFO, weighted average or period-end accounting is currently implemented. Select and validate the entity's policy first.
- Financial statements: independently generated report panels do not form one reconciled set of books. Totals, running balances and equations in images may differ. Real statements require the corrected journal model, account classification, cutoff logic and inventory accounting described in REVIEW.md.
- Any green balanced/reconciled indicator is a proposed result state; compute it from actual validation rather than displaying it by default.
- GST rates, GSTINs, HSN/SACs, classification labels and thresholds in sample imagery are illustrative. They must not be treated as current legal guidance or approved master data.
- Role examples and profile layouts must not let a user grant their own permissions. Only authorized administrators may manage effective access.
- The catalogue counts named workspaces plus important embedded dialogs, not 86 independent application routes. Boards present one design concept per named screen; all list/create/edit variants, tab contents, errors and responsive states have not been individually drawn.

The current application was not modified. These notes identify how to review the concepts safely and accurately; they do not resolve the source defects.
