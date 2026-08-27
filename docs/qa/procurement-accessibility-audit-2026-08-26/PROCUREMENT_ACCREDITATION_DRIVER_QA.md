# Procurement, Accreditation, Driver Access, and Accounting QA

**Test date:** August 26, 2026  
**Environment:** Local test site (`localhost:3000`)  
**Primary account:** VJ/Val Lamsen, Super Admin  
**Verdict:** **NOT RELEASE-READY**

This browser QA covered Driver access isolation, customer and accreditation onboarding, Work Orders, Job Orders, Purchase Orders, PMS automation, Suppliers, Inventory, Cash Budgets, General Ledger, Accounting Transactions, and Audit Logs.

## Test records created or advanced

- Client accreditation: Princess Cana — `Client KYC QA`
- Supplier: `QA Supplier` / `qa.supplier.082626@example.test`
- Job Orders: `JO-2026-0001` and `JO-2026-0002`
- Work Orders: `WO-2026-0001` and auto-generated `WO-2026-0003`
- Purchase Order: `PO-2026-0106`, ₱9,000.00, approved
- Cash Budget: `#1`, linked to `PO-2026-0106`, ₱9,000.00, disbursed

## Flow health

| # | Flow | Result | Evidence |
|---|---|---|---|
| 1 | Driver route isolation from administrators | ❌ Failed | Super Admin could see the Driver navigation and open Overview, Scheduled Trips, My Fleet, and My Commissions. |
| 2 | Customer registration | ✅ Passed | Four sensible required fields; Address and Notes are optional. |
| 3 | Client accreditation creation | ⚠️ Partial | Works only when the form matches an existing Customer; errors are generic and the lookup requirement is hidden. |
| 4 | Client KYC upload portal | ⚠️ Partial | Portal works, but the three required documents are unexplained and no NDA/Terms templates are provided. |
| 5 | Manual Work Order creation | ❌ Failed | One request showed an impossible hidden-time-window error; another appeared stuck but later committed. |
| 6 | Manual PMS Job Order creation | ❌ Failed | The form hides Customer for Maintenance, but the backend still rejects the submission because Customer is required. |
| 7 | PMS-to-JO-to-WO automation | ⚠️ Partial | Automation succeeds, but terminology and pipeline state are contradictory and slow to refresh. |
| 8 | Standard Job Order creation and totals | ⚠️ Partial | Creation and ₱12,500 total worked; status feedback and the pipeline are misleading. |
| 9 | JO-to-PO item calculation | ✅ Passed | `2 × ₱4,500.00 = ₱9,000.00` calculated correctly. |
| 10 | PO approval workflow | ⚠️ Partial | Submit, Verify, and Approve worked, but appeared unresponsive and required long waits/manual reloads. |
| 11 | Approved PO to Cash Budget | ✅ Passed | Approval automatically created Cash Budget `#1` for ₱9,000.00. |
| 12 | Cash Budget approval and disbursement | ⚠️ Partial | State transitions and disbursement worked, but feedback and amounts were inconsistent. |
| 13 | General Ledger posting | ❌ Failed | No journal posting appeared after the ₱9,000.00 disbursement. |
| 14 | Accounting Transactions / generated invoice | ❌ Failed | Transactions repeatedly failed to load and forced the authenticated user back to Login. |
| 15 | Audit trail | ✅ Passed | JO, PO, verification, approval, and cash-budget mutations were recorded. |

## Release-blocking defects

### P0 — Driver module is accessible to Super Admin

The Driver navigation and all tested Driver routes are available to the Super Admin account. This directly violates the requirement that the Driver module be accessible only to driver accounts, including exclusion of administrators.

Evidence: [Super Admin profile](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/25-super-admin-profile.png), [Driver access under Super Admin](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/26-super-admin-driver-access.png)

**Required release gate:** Driver routes and navigation must use an explicit driver-only rule. The normal Super Admin bypass must not apply to this module if the business requirement remains absolute.

### P1 — Accounting Transactions fails and can destroy the active session

`/accounting/transactions` first rendered “Transactions could not be loaded.” Retry remained loading. Reopening the route later redirected the authenticated Super Admin to Login. This happened twice and required signing in again each time.

Evidence: [Transaction load failure](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/52-accounting-transactions-load-failure.png), [Forced logout](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/53-cash-budget-forced-logout.png), [Repeated authentication loss](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/57-accounting-transactions-app-loading-lock.png)

This prevents verification of the invoice promised by “Disburse & Create Invoice.” Audit Logs showed cash-budget updates but no visible invoice-creation event.

### P1 — Work Order submit appears failed or frozen even when data commits

The HIN 5011 manual Work Order submission remained on a disabled loading action with no success result. Later, `WO-2026-0001` existed with the exact QA description. Staff could retry and create duplicates because the UI gives no authoritative completion state.

Evidence: [Work Order submit appears hung](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/38-work-order-submit-hangs.png), [Committed Work Order visible later](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/50-generated-and-delayed-work-orders.png)

The APA 4526 attempt also returned “Vehicle is already allocated for this time window,” although the form contains no date/time fields or visible conflicting allocation.

Evidence: [Hidden time-window error](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/37-work-order-hidden-time-window-error.png)

### P1 — Manual PMS Job Order form conflicts with backend validation

Choosing `Maintenance (PMS)` hides Customer and says the Job Order will link to a Work Order. The frontend allows submission, but the backend rejects it with “The selected customer does not exist.” There is also no Work Order selector.

Evidence: [PMS Job Order customer error](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/40-pms-job-order-hidden-customer-error.png)

The PMS page’s own `Request JO` route does work and created `JO-2026-0002`, which generated `WO-2026-0003` after confirmation. These two entry points therefore implement different contracts.

Evidence: [PMS Job Order handoff](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/49-pms-job-order-handoff.png)

### P1 — PO state mutations are committed but the page looks unresponsive

For `PO-2026-0106`, Submit for Review, Verify PO, and Approve PO provided little or no immediate feedback. The row retained its old status until a long wait and manual reload. Audit Logs proved the backend actions completed (`SUBMIT_PO`, `VERIFY_PO`, `APPROVE_PO`).

Evidence: [Review action appears unresponsive](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/45-purchase-order-submit-review-unresponsive.png), [Approved only after reload](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/54-purchase-order-approved-after-reload.png)

### P1 — Supplier accreditation has conflicting sources of truth

`Victory Liner Parts` is labeled **Accredited** and **Verified** in Suppliers, and the JO-to-PO supplier selector offers it as an accredited supplier. PO creation then rejects it because it “lacks an active accreditation record.” The Accreditation module contains no matching active Victory Liner Parts accreditation.

Evidence: [Supplier shown Accredited](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/47-victory-liner-shown-accredited.png), [PO supplier rejection](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/43-po-listed-supplier-not-accredited.png)

### P1 — One accreditation submission created two records

A single QA Supplier creation produced two accreditation cards for the same supplier/email with different titles. The Supplier directory created one supplier, but Compliance now has duplicate records.

Evidence: [Duplicate accreditation records](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/32-single-submit-duplicate-accreditations.png)

### P1 — Disbursement does not produce a visible General Ledger posting

Cash Budget `#1` was approved and disbursed for ₱9,000.00. The General Ledger subsequently displayed no journal postings. A cash release must not complete without a balanced and traceable accounting entry.

### P1 — Cash Budget success message reports the wrong stage

After Accounting selected “Approve & Forward to Super Admin,” the toast said **“Budget approved! Ready for disbursement.”** The actual persisted status was `pending_super_admin`, and a separate Final Approval was still required.

Evidence: [Success toast with stale/incorrect status](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/55-cash-budget-accounting-approval-hangs.png)

## High-impact UX and consistency defects

### P2 — Accreditation is strict without explaining the dependency

- A Client accreditation must resolve to an existing Customer by exact email/name, but the form does not say so or offer a Customer selector.
- The UI replaces the useful API validation reason with a generic “Failed to create accreditation” message.
- Contact Email is required even when the existing Customer record lacks email.

Evidence: [Generic accreditation error](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/31-accreditation-generic-validation-error.png)

Recommended simplification: select an existing Customer or Supplier first, autofill the contact data, show only business-relevant requirements, and display the exact validation issue inline.

### P2 — Client portal document requirements are demanding and vague

The portal requires `KYC Doc`, `NDA Doc`, and `Terms Doc`, but does not define KYC, explain why each document is needed, or provide downloadable NDA/Terms templates. Clients are effectively asked to source and upload documents they may expect JVD to provide for review/signature.

Evidence: [Client KYC upload portal](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/34-client-kyc-upload-portal.png), [Fresh legacy token denied](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/35-legacy-kyc-fresh-token-denied.png)

Recommended simplification:

1. Explain each required document in plain language.
2. Let JVD provide NDA and Terms for download/e-sign instead of requiring customer uploads.
3. Ask only for KYC appropriate to the entity type.
4. Show progress, saved state, and who to contact for exceptions.

### P2 — Maintenance terminology and pipelines are internally contradictory

- PMS button says `Request JO`; the modal says `Work Order Details` and `Submit WO Request`; success says `Job Order Submitted`.
- The auto-generated `WO-2026-0003` originated from `JO-2026-0002` but its pipeline still includes a future `JO Created` stage.
- The same generated WO still offers `Generate J.O.`, risking a circular/duplicate workflow.
- Job Order details showed transaction/reservation stages that did not match the actual Created state.

Evidence: [Generated WO circular pipeline](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/51-generated-work-order-circular-pipeline.png), [Misleading Job Order pipeline](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/41-job-order-details-pipeline.png)

### P2 — Cash disbursement amount helper is wrong

The input correctly contained `9,000`, while the helper said “Defaults to the requested total of ₱0.00.” This is dangerous beside a finance action.

Evidence: [Disbursement amount mismatch](C:/Users/Val/Desktop/JVD-Internal-Management-System/docs/qa/sales-release-audit-2026-08-25/screenshots/56b-cash-budget-disbursement-total-mismatch.png)

### P2 — Slow data loads create false empty states

JO, PO, Inventory, PMS, Cash Budget, and Audit pages frequently rendered `0` records or loading rows for roughly 5–20 seconds. Several actions also needed 10–25 seconds before the new status became visible. This is the main reason working backend actions feel like unresponsive modals.

## What worked

- Customer creation form is reasonably light and intuitive.
- Client registration link generation and the unified upload portal work.
- Standard Job Order creation works and preserves the ₱12,500 estimate.
- JO-to-PO line total calculation is correct.
- PMS `Request JO` successfully creates a maintenance JO, and confirmation auto-generates a WO.
- PO approval eventually completes through Accounting and CEO stages.
- Approved PO automatically creates a correctly linked ₱9,000 Cash Budget.
- Cash Budget eventually completes Draft → Pending Accounting → Pending Super Admin → Approved → Disbursed.
- Audit Logs record procurement and cash-budget state changes.

## Required release gates

1. Enforce Driver-only authorization on both frontend routes/navigation and backend endpoints, including an explicit exception to Super Admin bypass.
2. Fix Accounting Transactions so it loads without 401/logout and exposes the generated disbursement invoice.
3. Guarantee ledger posting (or a visible, retryable posting failure) when a cash budget is disbursed.
4. Make all WO/JO/PO/Cash Budget mutations idempotent and immediately reconcile local state after success.
5. Prevent double-click/retry duplicates while a mutation is pending; return a durable reference number in the success state.
6. Consolidate Supplier and Accreditation status into one authoritative eligibility check used by the directory, selector, and backend.
7. Remove the duplicate accreditation creation path and add a uniqueness/idempotency guard.
8. Align Maintenance entry points and terminology around one documented flow: PMS request → JO approval → execution WO → optional PO/Cash Budget → completion.
9. Simplify Client accreditation requirements and provide document explanations/templates.
10. Fix stale success toasts, false ₱0.00 helpers, and loading/empty-state behavior before release.

