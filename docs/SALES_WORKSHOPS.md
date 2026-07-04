# Sales Domain Workshops

**Date:** 2026-07-04
**Target Audience:** Sales Team, Operations Team, Dev Team (Val & Jerald)

This document outlines the workshop agenda for modeling the Sales Domain (Phase 1.7 of the Implementation Roadmap). The goal is to define the exact data shapes and rules for our service catalog *before* we build the checkout wizard in Phase 3.

## 1. Objectives

- **Define Service Categories:** Map out every service we offer (e.g., Visa Processing, Ticketing, Tour Packages, Transport Rentals).
- **Identify Data Requirements:** For each category, determine exactly what fields are required from the customer during checkout (e.g., Passport Number for Visa, Itinerary for Transport).
- **Establish Status Lifecycles:** Define the exact statuses a booking can have from creation to completion, and what triggers each transition.
- **Clarify Financial Rules:** Document how pricing is calculated, when deposits are required, and when final payment is due.

## 2. Workshop Agenda

*Schedule one 60-minute workshop per major service category.*

### Workshop 1: Travel & Ticketing (Flights, Ferries, Buses)
- **Participants:** Sales Lead, Val, Jerald
- **Focus:** Passenger details, PNR tracking, vendor integrations, pricing markups.

### Workshop 2: Visa Processing & Documentation
- **Participants:** Visa Officer, Val, Jerald
- **Focus:** Required documents per country, passport validity rules, embassy appointment tracking, courier logistics.

### Workshop 3: Packages & Custom Tours
- **Participants:** Tour Coordinator, Val, Jerald
- **Focus:** Itinerary building, group sizing, hotel/transport bundling, cost breakdowns.

## 3. Field Worksheets (To be filled during workshops)

*Use this template for each service category.*

### Category: [Service Name]

**1. Customer Input Fields (Checkout)**
*What do we need to ask the customer?*
- Field 1: [Name] | [Type: Text/Date/Select] | [Required: Y/N] | [Validation Rules]
- Field 2: ...

**2. Internal Operational Fields**
*What fields do our staff need to manage this booking?*
- Field 1: [Name] | [Type] | [Visible to Customer: Y/N]

**3. Status Workflow**
*E.g., Pending -> Document Review -> Processing -> Completed*
- Status 1: [Name] | [Trigger: Automated/Manual] | [Next Steps]

**4. Financial & Pricing Rules**
- Base Price Formula:
- Minimum Deposit:
- Commission Structure:

---

*Once these worksheets are completed, Jerald will use them to construct the JSON schemas for the dynamic checkout wizard (`service_categories` table) in Phase 3.6.*
