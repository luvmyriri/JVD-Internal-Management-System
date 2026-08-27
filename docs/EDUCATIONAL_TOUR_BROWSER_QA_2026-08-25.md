# Educational Tour Browser QA Report

**Run date:** 2026-08-25  
**Environment:** Local frontend `http://localhost:3000`, Laravel API, PostgreSQL  
**Scope:** Desk-operated educational tour creation, fleet/seat assignment, individual participant booking, down payment, final payment, and manifest smoke test.

## Result

The core package and individual billing workflow can complete from creation through a fully paid participant. The workflow is **not release-ready** because the shared participant seat selector fails with a server error and can silently save an incorrect default seat.

## QA Records Created

| Record | Value |
|---|---|
| Tour | Browser QA Educational Tour 082526-01 |
| Tour code | JVD-EDT-BROWSER--2026-003 |
| School | Browser QA Academy |
| Booking reference | EDT-BROWSER-082526-001 |
| Participant | Alpha BrowserQA |
| Student ID | BQA-082526-001 |
| Rate per head | PHP 2,400.00 |
| Assigned bus | APA 4526 |
| Assigned driver | Eduardo E. Deblios |
| Seat selected in fleet allocator | Seat 4 |
| Seat ultimately stored | Seat 1 |
| Payment 1 | PHP 800.00, cash at counter, down payment |
| Payment 2 | PHP 1,600.00, cash at counter, remaining balance |
| Final booking state | Confirmed / paid |
| Final collected / balance | PHP 2,400.00 / PHP 0.00 |

## Passed Checks

- Package financial calculations updated correctly for two students at PHP 2,400 per head: PHP 4,800 base, PHP 576 VAT, PHP 5,376 displayed total.
- Automatic fleet sizing correctly calculated one 49-seat bus for two travelers.
- The fleet allocation modal allowed selection of a real bus, driver, participant, and Seat 4.
- A scheduling conflict was rejected with `Vehicle is already assigned to another tour during this interval.`
- Tour creation generated a package, one unique participant booking reference, and one individual invoice.
- The initial PHP 800 down payment updated the booking from pending payment to partially paid and the balance to PHP 1,600.
- Recording the PHP 1,600 remaining balance updated the booking to confirmed/paid, collected amount to PHP 2,400, and balance to zero.
- Package capacity, collected amount, invoice count, and fleet occupancy counters refreshed after each payment.
- PDF Manifest request completed without a new browser-console or API error; the button returned to its enabled state. The downloaded PDF contents were not visually inspected in this run.

## Defects

### ET-QA-001 — Critical — Participant seat selector cannot load availability

**Affected flows:** Initial participant seat selection and post-checkout `Move Seat`.

**Steps:**

1. Assign a bus to the educational tour.
2. Open the participant-specific seat selector, or click `Move Seat` for an existing participant.
3. Wait for availability to load.

**Expected:** The assigned bus seat map loads with occupied and available seats, and confirmation remains disabled until the operator explicitly chooses a seat.

**Actual:** The modal remains on `Checking real-time seat availability...`, no seat map appears, it reports `1 seat(s) selected` before any operator selection, and `Confirm & Proceed` remains enabled.

**Browser/API evidence:**

- `GET /api/v1/sales/bus-availability` returned HTTP 500.
- Error references: `ERR-WJEFPB6XLO`, `ERR-WCAD0FWDBU`, `ERR-DC6VQY9RAS`, and `ERR-6OOJD6VPCT`.

**Backend evidence:**

```text
SQLSTATE[42703]: Undefined column: column "bus_id" does not exist
select * from "invoices"
where "bus_id" = 6
and "status" not in (void, cancelled)
and ("travel_date" between 2026-08-25 and 2026-08-25
     or "departure_date" between 2026-08-25 and 2026-08-25)
```

The failing query originates from `CatalogController::busAvailability` and queries a non-existent `invoices.bus_id` column.

### ET-QA-002 — Critical — Seat selection silently changes to Seat 1

**Steps:**

1. In `Multi-Bus Allocation & Interactive Seat Selector`, select Alpha BrowserQA.
2. Select Seat 4 on bus APA 4526.
3. Confirm and save the allocation.
4. Launch the tour and inspect the participant roster.

**Expected:** The initial participant is registered on APA 4526, Seat 4.

**Actual:** The fleet modal correctly showed Alpha BrowserQA on Seat 4 and `1 seat(s) reserved`, but the participant entry outside the modal still displayed `Assigned: Seat 1`. After launch, the roster stored `Bus #1 · Seat 1`.

This creates a material manifest and boarding risk: the operator sees a successful Seat 4 assignment while the final booking records Seat 1.

**Likely contributing implementation details:**

- The participant-specific selector falls back to `Seat 1` when no selected seat is returned.
- Initial desk registration sends `seat_number` but does not send the selected bus assignment identifier.
- Saving fleet allocations does not synchronize the participant row's seat with the fleet modal's `seat_assignments` result.

### ET-QA-003 — High — Date/time edits did not persist into launch

**Steps:**

1. Change departure and return from 2026-08-25 to 2026-09-02.
2. Observe the new dates in the date inputs.
3. Launch the tour.

**Expected:** The package, itinerary, availability check, and checkout summary use the new date.

**Actual:** The date inputs briefly displayed 2026-09-02, but the launch reverted to 2026-08-25. The checkout summary and itinerary also continued to show 2026-08-25. This first caused a vehicle scheduling conflict. The tour was only created after switching to a different bus, and the created package retained 2026-08-25.

This was observed through browser automation and should be reproduced once with manual keyboard input to rule out a browser-control event compatibility issue.

### ET-QA-004 — Medium — Builder exposes a contradictory aggregate checkout

The builder says:

> No aggregate group invoice is created.

At the same time, it renders `Current Order` and `Complete Transaction` for a group subtotal of PHP 4,800 plus PHP 576 VAT. The actual package dashboard correctly uses individual participant invoices and payments.

The aggregate checkout is misleading and creates a second apparent completion path that contradicts the desk-operated per-head model.

### ET-QA-005 — Low — Generated tour code contains a double hyphen

The created code was `JVD-EDT-BROWSER--2026-003`. The double hyphen suggests an empty code segment during code generation. It did not block booking or payment, but identifiers should be normalized.

## Non-Module Noise Observed

- Vite hot-module reloads occurred while the QA run was active.
- Header chat/user lookup temporarily logged network errors, and chat WebSocket retries continued in the background.
- These did not block the final educational tour creation or payment workflow and are not counted as educational-tour failures in this report.

## Release Recommendation

Block release of seat-selection features until ET-QA-001 and ET-QA-002 are fixed. After remediation, rerun at minimum:

1. Initial participant explicit seat selection.
2. Participant `Move Seat` after partial and full payment.
3. Two participants competing for the same seat.
4. Seat assignment across two buses.
5. Manifest verification against the stored bus and seat.
6. Date edit followed by vehicle conflict checking and package launch.

