# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Reservation officers and office staff create customers, quotations, bookings, invoices, and package-specific travel records.
- Accounting staff reconcile invoices, collections, partial payments, refunds, journals, cash budgets, and liquidations.
- Operations and logistics staff manage booking readiness, passengers, fleet and driver allocations, manifests, schedules, and trip tickets.
- Executive approvers and super administrators govern exceptions, approvals, access, and system configuration.

## Product Purpose

JVD Event & Travel Management System is the internal operating platform for JVD Events and Travels Management Co. It connects the complete travel-agency workflow from product selection and booking through customer documents, payment collection, operational fulfillment, accounting, and management oversight. Success means staff can open one commercial record and confidently follow every linked customer, passenger, document, financial, approval, fleet, and driver process without a dead end.

## Positioning

The product preserves specialized engines for joiner departures, fixed packages, bus charters, educational tours, and custom travel services while connecting them through shared booking references, financial evidence, documents, and role-safe navigation. It is not a universal booking form; each service keeps its domain rules while the business sees one coherent journey.

## Operating Context

- Staff operate the system throughout the sales, accounting, operations, logistics, HR, inventory, procurement, and management workday.
- Core sales journeys begin with a product, rate plan, or program selection and proceed into a full booking workflow.
- Operational records include passengers, seat allocation, fleet and driver assignments, manifests, trip tickets, schedules, and readiness checks.
- Commercial and financial records include quotations, contracts, invoices, partial and balance payments, collections, refunds, credit notes, journals, cash budgets, commissions, and liquidations.
- Customer and internal documents must remain linked to the exact booking and transaction that produced them.

## Capabilities and Constraints

- Laravel is the server-side source of truth for authorization, pricing, tax, payment state, approval transitions, and external-provider idempotency.
- React provides role-aware operational interfaces; the application must remain usable on desktop and narrow/mobile screens.
- Joiner, fixed-package, charter, educational-tour, and custom-service calculations must not be flattened into one generic engine.
- Financial status must be derived from immutable evidence rather than editable labels.
- PayMongo callbacks and manual collection actions must be safe under retries and concurrency.
- Existing records and links must remain backward compatible while the platform is modernized incrementally.
- Catalog and entered prices are VAT-exclusive; quotation and invoice totals apply the same configured VAT treatment.
- Open business decisions: refund approval policy, delegated-approval matrix, and lifecycle terminology.

## Brand Commitments

- Product name: JVD Event & Travel Management System / JVD ETMC Management Platform.
- The interface should feel professional, operational, clear, and trustworthy for an established travel-management company.
- Avoid consumer-marketing claims or fabricated metrics. Operational state, money, dates, ownership, and next actions must be explicit.

## Evidence on Hand

- The existing Laravel and React codebase is the source of implemented behavior and role constraints.
- Client-provided screenshots and findings establish the desired e-commerce-style package selection, full-page booking workflows, and connected booking details.
- `output/pdf/JVD_Detailed_Handover_Findings_Plans_and_Progress_Aug_13_14_2026.pdf` records the latest findings, completed stabilization, and approved phased roadmap.
- No external customer testimonials, formal brand guide, or formal accessibility conformance statement has been supplied; future work must not invent them.

## Product Principles

1. One booking should never end in an unlinked screen or generic list.
2. Specialized travel engines stay specialized; shared evidence and navigation make them coherent.
3. The server owns commercial and financial truth.
4. Every approval, document, payment, refund, and operational handoff must be auditable and open the exact record.
5. Work ships in atomic, regression-tested checkpoints that can be deployed and rolled back safely.

## Accessibility & Inclusion

Internal staff must be able to complete critical sales and financial tasks with keyboard-accessible controls, visible focus, understandable labels, and responsive layouts. A formal accessibility conformance target remains a management decision; new work should meet WCAG 2.2 AA interaction and contrast expectations where practical.
