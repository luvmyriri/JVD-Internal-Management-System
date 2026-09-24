# Invoice, quotation, and DTT recovery — 24 September 2026

Branch: `Val-Fix-92426` (includes Gregory's multi-bus branch).

Validation baseline: full Laravel suite passed (372 tests, 2,176 assertions) with Sentry reporting disabled in the test process. Frontend production build and targeted ESLint for transaction, quotation, and DTT flows passed.

## Verified in code and automated tests

| Client report | Current result | Evidence |
|---|---|---|
| Two or more charter units break invoice issuance | Checkout calculates the server-authoritative unit price × the saved assignment count; two units create two fleet assignments and two DTTs. | `CharterBookingTest::test_shared_checkout_invoices_and_stores_explicit_extra_bus_units` checks quantity, price, assignments, tickets, and both units in the invoice HTML. |
| Only one bus/driver appears | Charter invoice PDF and Sales details list all saved fleet assignments. | Two-unit test checks both plate numbers and driver names in the rendered invoice. |
| Educational quotation PDF is empty or shows wrong fields | Endpoint now renders the actual quotation view with saved school and per-student rate. | `EducationalTourPackageTest::test_package_quotation_renders_the_saved_customer_and_rate`. |
| Quotation cannot be sent | Bus charter, fixed-package quotation modal, and educational package now queue server-generated PDF email through the `mail` queue. Bus charter PDF preview uses the saved quotation and VAT snapshot. | `SalesQuotationTest::test_saved_quotation_can_be_queued_and_delivered_as_pdf`; educational send route assertion. |
| Customer invoice email is invisible after queueing | Every invoice dispatch path records recipient and queued/sending/sent/failed state; transaction details poll while delivery is active and offer retry. | `CustomerDocumentDeliveryTest::test_invoice_delivery_is_queued_with_visible_recipient_and_can_be_retried`. |
| DTT edit forces approval / budget blocks unrelated edit | Save and Approve are separate actions; unchanged allowance values no longer block nonfinancial edits after budget submission. | `TripTicketConflictTest::test_nonfinancial_dtt_edits_are_allowed_after_cash_budget_submission`. |

## Still requiring environment and client acceptance

1. **Deploy the branch and run migrations.** The new invoice delivery fields require `php artisan migrate --force`. The repository's production deploy script already performs migrations and restarts both workers.
2. **Confirm the live mail worker and transport.** Production Compose defines a dedicated `mail-worker` with three tries and 180-second timeout. Verify it is running, `QUEUE_CONNECTION=redis`, and transactional SMTP credentials are valid. The local development database used during this audit had zero queued jobs, seven historical failed jobs, and no running worker; those failures do not establish current production health. Do not blindly retry old failed jobs without inspecting recipients and duplicate-send risk.
3. **Run a controlled customer acceptance pass.** Use a designated test mailbox and create one quotation and one invoice for each fixed package, bus charter (one and two units), educational tour, and partial-payment case. Compare UI totals, stored rows, PDF text, actual attached PDF bytes, recipient address, and `sent` status. Confirm failed SMTP attempts move to `failed` after retries and can be sent again.
4. **Check the original client records.** The reported invoice and booking identifiers were not supplied. Existing invoices can have bad snapshots that a code fix does not retroactively repair. Reconcile affected invoices against saved order items and fleet assignments before reissuing; do not overwrite accounting history.
5. **Resolve repository-wide frontend lint debt separately.** The changed transaction, quotation, and DTT flow files pass targeted ESLint. Full `npm run lint` still reports 82 pre-existing errors and 6 warnings in other modules, especially dashboards and shared UI. Production build passes. The remaining large-chunk build warning reflects ExcelJS and the shared app bundle; route-level lazy loading reduced the initial app chunk substantially, but dependency chunking still needs its own performance pass.

## Ongoing invoicing design

Use the saved sale as the single source for quantity, unit price, tax, customer identity, fleet assignments, and document generation. Finalization should commit the invoice and operational records first, enqueue one delivery request after commit, then show staff a durable state and recipient. A worker renders cached PDF documents and sends them with retries; failures remain visible and retryable without creating another financial transaction. Add a delivery-attempt log (message ID, event timestamps, template/PDF version, and actor), provider bounce feedback, and an idempotency key before promising guaranteed delivery. Reconcile historical affected invoices as a separate, audited correction workflow.
