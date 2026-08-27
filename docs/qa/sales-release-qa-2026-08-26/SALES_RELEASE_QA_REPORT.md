# Sales Release QA — 2026-08-26

## Verdict

**Not release-ready.** Bus Charter calculations are working, and Educational Tour participant-specific seat selection is now functional. However, Educational Tour creation, payment posting, and PDF manifest generation do not complete reliably. These failures block the most important desk-operated workflow from creation through collection.

## Priority findings

### 1. P0 — Educational Tour launch fails silently

- Built a complete package: `QA Refactor Educational Tour 082626` for `QA Refactor Academy`.
- Entered one named participant and assigned **Seat 1** specifically to that participant.
- Clicked **Save & Launch Educational Tour** and waited 12 seconds.
- The builder remained open with no success or error message.
- Returning to the Educational Tour dashboard confirmed the package was not created; the count remained at three tours.

Impact: staff can finish the entire builder but cannot launch the tour or know why it failed.

Evidence: `13-participant-seat-assigned.png`

### 2. P0 — Educational Tour payment posting remains stuck

- Opened existing tour `JVD-EDT-JVD-DESK-2026-002`.
- Selected booking `EDT-JVD-082526-001` for Delta Student.
- Existing balance: ₱2,000 from a ₱2,875 individual invoice.
- Submitted Remaining Balance / Cash at Counter / ₱2,000 with note `QA-OR-082626-EDT`.
- The **Record Payment** button stayed disabled for more than 20 seconds; no success or visible error appeared.
- Roster totals and payment status did not update.

Impact: the desk cannot complete individual student checkout or collection.

Evidence: `14-educational-payment-stuck.png`

### 3. P0 — Educational Tour PDF manifest generation fails silently

- Clicked **PDF Manifest** on the same existing tour.
- The control entered a disabled/loading state, later re-enabled, but no PDF, new tab, download, or visible error was produced.

Impact: dispatch documents cannot be generated reliably.

### 4. PASS — Educational Tour seat assignment is now participant-bound

- Added `QA Student One` as an initial desk participant.
- Opened the participant row's **Select Specific Seat on Coach** control.
- Modal correctly switched to `Individual Participant Seat Assignment (1 Pax)`.
- Selected Seat 1 and confirmed.
- Participant row updated to `Assigned: Seat 1` and offered `Clear Seat (Auto-Assign)`.

Note: seat tiles are exposed as generic `<div>` elements rather than semantic buttons, so keyboard accessibility remains weak.

Evidence: `12-educational-seat-selector.png`, `13-participant-seat-assigned.png`

### 5. PASS — Educational Tour per-head and fleet calculations

For 50 students, two guides, and a ₱3,450 student rate:

- Student base: 50 × ₱3,450 = **₱172,500**
- Travelers: **52**
- Required fleet: **2 × 49-seater buses**
- Fleet capacity: **98**
- Remaining seats: **46**
- VAT at 12%: **₱20,700**
- Net package total: **₱193,200**

The screen also correctly states that each student receives a unique booking reference and individual invoice, with no aggregate group invoice.

Evidence: `11-educational-tour-dashboard.png`, `13-participant-seat-assigned.png`

### 6. PASS with release blocker — Bus Charter calculations

The Bus Charter rate-plan builder recalculated correctly:

- Driver meals: ₱1,500
- Commission: ₱3,000
- Diesel after changing to 100 L × ₱60/L: ₱6,000
- Total expenses: **₱10,500**
- Minimum protected rate: **₱22,500**
- Quoted final rate: **₱35,000**
- Projected profit: **₱24,500**

Switching from Fixed Rate to Metered Surcharges also enabled the expected surcharge controls.

Release blocker: route/address search timed out, so a complete rate-plan save, quotation, vehicle assignment, checkout, invoice, and trip-ticket handoff could not be verified.

Evidence: `08-charter-auto-calculations.png`, `10-charter-pricing-totals.png`

## Other Sales findings

### P0 — Fixed/Joiner creation reports false failure after server-side success

Private package `QA Refactor Private Tour 082626` and joiner product `QA Refactor Joiner 082626` appeared stuck during save with no visible success. Audit Logs later proved both records were created server-side. After revisiting the libraries, both products appeared.

Impact: staff may click Save again and create duplicates because the UI falsely implies failure.

### P0 — Fixed Package return date is blank and read-only

On the new three-day private-tour booking, entering departure `2026-09-03` left the Return Date blank. The Return Date input is read-only, so the user cannot repair it manually. Itinerary dates stayed `Date pending`, fleet checks stayed disabled, and checkout could not proceed.

Evidence: `20-fixed-return-date-blocked.png`

### P0 — Joiner schedule state is not synchronized

The departure, return, and cutoff inputs displayed valid dates, but the preview still showed `Departure: Not set`; Vehicle and Driver remained disabled with `Set valid dates first`.

Evidence: `21-joiner-schedule-state-defect.png`

### PASS — Custom Transaction checkout control

Custom Arrangement completed successfully from scoped service entry through VAT calculation, payment, invoice generation, dashboard confirmation, and Audit Log creation.

- Subtotal: ₱1,000
- VAT: ₱120
- Total/payment: ₱1,120
- Invoice: `INV-MPKYREZJ`
- Status: paid/confirmed

Evidence: `15-custom-checkout-ready.png`, `16-custom-invoice-generated.png`, `17-dashboard-sales-handoff.png`

### P1 — Audit Log formats phone numbers as money

Customer contact `09170000826` is displayed in the audit delta as `₱9,170,000,826.00`.

Evidence: `19-audit-contact-format-defect.png`

### P1 — Accounting pages are visible but inaccessible

In the tested super-admin session, sidebar links for Transactions, Collections, and General Ledger redirected back to `/dashboard`. The dashboard and Audit Log confirmed the new invoice, but the actual Accounting workspaces could not be inspected.

## Recommended release gate

Do not release Educational Tours until all of these pass in one uninterrupted run:

1. Create and launch tour.
2. Add named participant and bind a seat.
3. Generate individual booking reference and invoice.
4. Record down payment, installment, and remaining balance.
5. Update roster totals and booking status immediately.
6. Generate billing statement, receipt, roster, and PDF manifest.
7. Confirm Accounting transaction/collection and Audit Log.
8. Confirm assigned bus and driver appear in Logistics/trip-ticket workflow.

For Bus Charters, release only after route lookup, rate-plan save, quotation, checkout, invoice, vehicle/driver allocation, and trip-ticket creation pass end to end.
