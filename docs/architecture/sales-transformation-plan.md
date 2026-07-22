# Sales Transformation Plan

## Decision

JVD Sales will become one workspace backed by purpose-built service modules. Customer,
traveler, order, payment, document, approval, and audit capabilities are shared. Product
creation, validation, pricing, availability, fulfillment, and operational handoff are owned
by the relevant service module.

The authoritative service codes are:

| Code | Module |
|---|---|
| `bus_rental` | Bus and van rental |
| `private_tour` | Private tour packages |
| `joiner_tour` | Fixed-departure joiner tours |
| `educational_tour` | School and educational tours |
| `visa_assistance` | Visa case management |
| `passport_assistance` | Passport case management |
| `flight_booking` | Flight reservations and ticketing |
| `accommodation_booking` | Hotel and accommodation reservations |
| `ticket_booking` | Ferry and bus tickets |
| `activity_booking` | Activities and attractions |
| `transfer_service` | Airport and point-to-point transfers |
| `custom_arrangement` | Composite, nonstandard travel arrangements |

Display categories are not business identifiers. New code must use the stable code.

## Delivery sequence

### Phase 0: Safety and compatibility

- Preserve the existing Fixed Packages and Billing paths while new modules are introduced.
- Add characterization tests around existing invoice finalization.
- Correct misleading invoice payment language.
- Do not add further type-specific fields to `services`.

### Phase 1: Joiner vertical slice

- Joiner package remains a catalog product during migration.
- A departure owns immutable start/end times, booking cutoff, capacity, bus, and driver.
- Physical seats are materialized per departure and locked during reservation.
- Temporary holds expire automatically and release inventory.
- Named passengers are assigned to seats.
- Confirmation produces compact invoice data and a full booking manifest.

### Phase 2: Sales workspace

- Replace `/sales` redirect with a workspace home.
- Provide Catalog Studio, Departures, New Sale, Orders, and operational queues.
- Use full-page, service-specific editors rather than a generated modal form.

### Phase 3: Bus/van rental and educational tours

- Add interval-based resource assignments and availability.
- Support multi-vehicle educational tours, chaperone rules, contracts, and manifests.

### Phase 4: Private tours and supplier reservations

- Versioned itineraries, component costing, rate plans, supplier quotes, and vouchers.

### Phase 5: Travel assistance and third-party bookings

- Visa/passport cases and checklists.
- Flights, hotels, tickets, activities, transfers, quote expiry, PNRs, and vouchers.

### Phase 6: Legacy retirement

- Migrate reads and historical data after reconciliation.
- Remove operational fields from `services` and JSON `bookings.seat_map` only after all
  consumers use the new domain.

## Non-negotiable invariants

- Availability is enforced in a database transaction, never by UI checks alone.
- A reusable product never owns a specific bus or driver; a dated operation does.
- Departure dates cannot be changed by the customer.
- Confirmed and held seats cannot be sold twice.
- Passenger count and seat count agree for seat-controlled departures.
- Payments and confirmations are idempotent.
- Invoices are financial documents; detailed names and seats belong on confirmations and
  manifests, with only a compact summary on the invoice.

