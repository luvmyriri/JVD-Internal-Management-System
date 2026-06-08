================================================================================
  JVD INTERNAL MANAGEMENT SYSTEM — API CONNECTION AUDIT
  Generated: 2026-06-08
  Scope: Logistics (Overview, Trip Tickets, Fleet, PMS) |
         Procurement (W.O, J.O, P.O, Suppliers) | Inventory (Supplies)
================================================================================


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE: LOGISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAGE: Overview (frontend/src/pages/logistics/Overview.tsx)
──────────────────────────────────────────────────────────

STATUS: ✅ CONNECTED (with one refinement needed)

API CONNECTIONS:
  [1] GET /api/buses
      Frontend: fleetApi.list({ per_page: 999 })
      Backend:  BusController@index (GET buses)
      → Connected and working.

  [2] GET /api/trip-tickets (via tripTicketApi.getAll())
      Frontend: tripTicketApi.getAll() from api/operations.ts
      Backend:  TripTicketController@index
      → Connected and working. Driver scoping applies (driver role sees
        only their own tickets).

  [3] GET /api/buses/{id}/calendar
      Frontend: fleetApi.getCalendar(busId, { month, year })
      Backend:  BusController@calendar
      → Connected and working. Returns trip tickets + invoices for a bus
        within the selected month. Seat map data is included for invoices.

  [4] GET /api/users?role=driver
      Frontend: useUsers({ role: 'driver', per_page: 999 })
      Backend:  UserController@index with role filter
      → Connected and working.

REFINEMENTS NEEDED:
  [A] The calendar endpoint response is wrapped as response.data.data
      (array) but the frontend accesses calendarRes?.data?.data — this is
      correct. However, the `bus` key returned alongside the data is
      accessed from a separate `calendarRes?.data?.bus` which may
      inconsistently come back as undefined if the bus ID is invalid.
      ADD: Null-guard on calendarRes?.data?.bus before rendering the
      CalendarDayDetailModal header line "Bus: {bus?.plate_number}".

  [B] The "Drivers" tab on Overview filters users by role='driver'
      but the driver count KPI card says "Total Captains". This is fine
      cosmetically, but the fetch retrieves ALL drivers, not only those
      assigned to a bus. Consider adding a note to differentiate
      "active/assigned" vs "total" drivers.

  [C] No dedicated logistics-overview stats endpoint. KPIs are computed
      client-side from raw list fetches (buses + trip tickets). For
      performance, consider adding a /api/dashboards/logistics endpoint
      later (not a critical blocker).

────────────────────────────────────────────────────────────────────────────────

PAGE: Trip Tickets (frontend/src/pages/logistics/TripTickets.tsx)
──────────────────────────────────────────────────────────────────

STATUS: ✅ CONNECTED (with key process refinements needed)

API CONNECTIONS:
  [1] GET  /api/trip-tickets
      Frontend: tripTicketApi.getAll() → useQuery(['trip-tickets'])
      Backend:  TripTicketController@index
      → Connected. Loads all trips; driver sees only own.

  [2] POST /api/trip-tickets
      Frontend: tripTicketApi.create(data)
      Backend:  TripTicketController@store
      → Connected. On creation with a bus_id, the backend auto-generates
        a Pre-Trip Safety Work Order (WO) with status 'pending_approval'.

  [3] PUT  /api/trip-tickets/{id}
      Frontend: tripTicketApi.update(id, { ...data, status: 'approved' })
      Backend:  TripTicketController@update
      → Connected. The backend enforces a strict approval gate:
          • Bus must be assigned.
          • A WO linked to that bus + ticket must exist.
          • That WO status must be 'completed'.
          • A JO under that WO must exist AND be 'completed'.
        Super Admins bypass the guard. All other roles cannot approve
        unless the safety chain is fully resolved.
      → On approval, a CashBudgetRequest is automatically created/synced
        and Accounting is notified.

  [4] DELETE /api/trip-tickets/{id}
      Frontend: Not exposed in the UI (no delete button found).
      Backend:  TripTicketController@destroy (exists)
      → NOTE: The destroy route exists on the backend but no UI action
        exposes it. This is intentional — trip tickets are immutable
        historical documents. However if future deletion is needed, the
        endpoint is available.

  [5] GET /api/buses (via useBuses hook)
      Frontend: for the bus selector in TripTicketFormModal
      → Connected.

  [6] GET /api/users?role=driver (via useUsers hook)
      Frontend: for the driver selector in TripTicketFormModal
      → Connected.

  [7] GET /api/cash-budgets (nested via ticket.cash_budget_request)
      Frontend: Displayed within TripTicketDetailModal as budget_status
      → Loaded as a relation in TripTicketController@index (eager loaded).
      → Connected via relation, no separate API call needed.

REFINEMENTS NEEDED:
  [A] The queryKey for invalidation on create/update uses
      ['trip-tickets'] but the main list fetch uses ['trip-tickets-all']
      in TripTickets.tsx but ['trip-tickets-all'] in Overview.tsx too.
      REFINE: The mutation onSuccess in TripTicketFormModal invalidates
      ['trip-tickets'] — but the main useQuery key is ['trip-tickets']
      (line ~694 in TripTickets.tsx). This DOES match. However the
      Overview.tsx uses ['trip-tickets-all'] separately, so approving a
      ticket in Overview will NOT refresh TripTickets and vice versa.
      SUGGEST: Standardize the query key or use a prefix key like
      ['trip-tickets'] for all ticket queries to ensure cross-page
      invalidation.

  [B] The "Customize & Approve" button in TripTicketDetailModal calls
      tripTicketApi.update(ticket.id, { ...data, status: 'approved' })
      which is a PUT to /api/trip-tickets/{id}. The controller expects the
      payload to include all fields (validated with 'sometimes'). This is
      correct and will pass.

  [C] The frontend safety inspection check (safetyMessage logic) evaluates
      ticket.work_orders[0].job_orders — this data is loaded via the
      'workOrders.jobOrders' eager relation. If the trip has no WO yet,
      the banners display correctly (warning state). This is working.

────────────────────────────────────────────────────────────────────────────────

PAGE: Fleet (frontend/src/pages/inventory/Fleet.tsx)
──────────────────────────────────────────────────────

STATUS: ✅ CONNECTED (with refinements needed)

API CONNECTIONS:
  [1] GET  /api/buses
      Frontend: fleetApi.list({ search, status, page, per_page: 10 })
      Backend:  BusController@index
      → Connected with pagination and filtering.

  [2] POST /api/buses
      Frontend: fleetApi.create(data)
      Backend:  BusController@store
      → Connected. Validated via StoreBusRequest.

  [3] PUT  /api/buses/{id}
      Frontend: fleetApi.update(bus.id, form)
      Backend:  BusController@update
      → Connected. Handles model, category, capacity, status, mileage,
        driver assignment, plate number, and custom_seats.
      → IMPORTANT: Atomic driver assignment is enforced — a driver
        assigned to another bus is automatically unassigned from it.

  [4] GET  /api/users (for driver dropdown)
      Frontend: userApi.list() — retrieves ALL users, then filters by
                role === 'driver' or department === 'fleet' client-side.
      Backend:  UserController@index
      → Connected but INEFFICIENT. Should filter by role=driver server-side.
      REFINE: Change to userApi.list({ role: 'driver' }) or use the
      useUsers({ role: 'driver' }) hook (already available) for the
      driver dropdown in BusModal.

REFINEMENTS NEEDED:
  [A] The Bulk Upload (Excel import) is FULLY CLIENT-SIDE — it parses
      the Excel file in the browser and calls fleetApi.create() per row
      sequentially. There is no batch/bulk endpoint on the backend.
      → This works but is slow for large fleets. Consider a dedicated
        POST /api/buses/bulk endpoint for production.

  [B] MISSING BACKEND ROUTE: The frontend fleet.ts API file declares:
        fleetApi.getMaintenanceHistory(id) → GET /buses/{id}/maintenance-history
        fleetApi.getPmsStatus(id)          → GET /buses/{id}/pms-status
      BUT neither route exists in api.php or BusController.php!
      → These are DEAD LINKS. They will return 404 errors if called.
      → Currently these functions are only declared in fleet.ts but NOT
        called by Fleet.tsx or PMS.tsx — the pages use the regular
        fleetApi.list() and direct bus data instead.
      REFINE: Either implement these routes in BusController.php and
      register them in api.php, or remove the declarations from fleet.ts
      to avoid confusion.

  [C] The custom_seats JSON field is stored on the bus and returned by
      BusResource. The Seat Layout customization in Fleet.tsx modifies
      this locally then saves via PUT /api/buses/{id} with custom_seats.
      → Backend validates: 'custom_seats' => ['nullable', 'array'].
      → Connected correctly. The seating layout preview works with
        BusLayout component.

────────────────────────────────────────────────────────────────────────────────

PAGE: Predictive Maintenance System — PMS
(frontend/src/pages/inventory/PMS.tsx)
────────────────────────────────────────

STATUS: ⚠️  PARTIALLY CONNECTED (critical missing backend routes)

API CONNECTIONS:
  [1] GET /api/buses
      Frontend: fleetApi.list({ search, per_page: 200 })
      Backend:  BusController@index
      → Connected. Fetches all buses with service date / mileage data.
        PMS logic (overdue, upcoming, PMS level) is computed CLIENT-SIDE
        from bus.total_mileage, bus.next_service_due, bus.is_service_overdue.

  [2] PUT /api/buses/{id} (Log Maintenance)
      Frontend: fleetApi.update(bus.id, {
                  last_service_date, next_service_due, total_mileage, status
                })
      Backend:  BusController@update
      → Connected. Saves the maintenance log by updating bus fields.
        Note: There is no dedicated "maintenance log" table — service
        history is not stored historically; only the latest service date
        is tracked on the bus record.
      REFINE: If historical PMS logs are needed (boss requirement),
      a maintenance_logs table should be added to store each service event.

  [3] POST /api/work-orders (Request WO from PMS)
      Frontend: The "Request WO" button in PMS.tsx opens a modal with a
                "Submit WO Request" button that calls... setSubmitted(true)
                ONLY — it does NOT actually call any API!
      Backend:  POST /api/work-orders/request → WorkOrderController@store
      → ⛔ NOT CONNECTED. The WO submission in PMS is a UI STUB.
        Clicking "Submit WO Request" only sets a local submitted=true
        state to show a success message — NO API call is made.
      REFINE: Wire the "Submit WO Request" button to call
      workOrderApi.create({ bus_id, description, priority }) pointing to
      POST /api/work-orders/request.

  [4] GET /api/buses/{id}/maintenance-history
      GET /api/buses/{id}/pms-status
      Frontend: Declared in fleetApi but NOT USED by PMS.tsx.
      Backend:  Routes DO NOT EXIST in api.php or BusController.php.
      → Dead declarations. Not blocking but should be resolved.

  [5] "Bulk Import" button (Excel upload)
      Frontend: <input type="file"> is present but has NO onChange handler.
      Backend:  No bulk PMS import route exists.
      → ⛔ STUB ONLY. File selection does nothing.
      REFINE: Connect to a bulk update flow or remove the button.

  [6] "Export Data" button
      Frontend: Button renders but has no onClick handler.
      Backend:  No export endpoint exists.
      → ⛔ STUB ONLY. Clicking does nothing.
      REFINE: Implement ExcelJS export of current bus list with PMS data,
      or connect to a backend export route.

  [7] BusProfilePanel (slide-in detail panel)
      Frontend: Opens BusProfilePanel.tsx with the selected bus object.
                Uses the already-loaded bus data — no additional API call.
      → Works using cached bus data. No connection issue.

CRITICAL ISSUES SUMMARY FOR PMS:
  → The "Request WO" action is a visual stub — no work order is actually
    created. The safety workflow cannot start from the PMS page.
  → "Bulk Import" and "Export Data" are non-functional stubs.
  → No historical PMS log storage exists at the database level.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE: PROCUREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAGE: Work Orders — W.O (frontend/src/pages/procurement/WorkOrders.tsx)
────────────────────────────────────────────────────────────────────────

STATUS: ✅ CONNECTED

API CONNECTIONS:
  [1] GET  /api/work-orders
      Frontend: workOrderApi.list(params)
      Backend:  WorkOrderController@index
      → Connected with search and pagination.

  [2] POST /api/work-orders (manual creation)
      Frontend: workOrderApi.create(data)
      Backend:  WorkOrderController@store
      → Connected. Roles: super_admin, head_mechanic, dispatcher,
        service_adviser, driver.

  [3] PUT  /api/work-orders/{id}
      Frontend: workOrderApi.update(id, data) / workOrderApi.complete(id)
      Backend:  WorkOrderController@update
      → Connected. complete() sends status: 'completed'.

  [4] POST /api/work-orders/{id}/approve
      Frontend: workOrderApi.approve(id, { notes, assigned_to, priority })
      Backend:  WorkOrderController@approve
      → Connected. Roles: super_admin, EVP, logistics_in_charge,
        head_mechanic, service_adviser.

  [5] POST /api/work-orders/{id}/reject
      Frontend: workOrderApi.reject(id, notes)
      Backend:  WorkOrderController@reject
      → Connected.

  [6] POST /api/work-orders/{id}/generate-job-order
      Frontend: workOrderApi.generateJobOrder(id, { requires_po })
      Backend:  WorkOrderController@generateJobOrder
      → Connected. Creates a JO from an approved WO.

REFINEMENTS NEEDED:
  [A] The workOrderApi.create() sends to POST /api/work-orders but the
      route group uses the alias 'work-orders.request'. This is fine as
      apiResource covers the base POST route.
  [B] The WorkOrderController uses a separate 'verified' status step
      (head_mechanic verifies → service_adviser approves). Ensure the
      frontend WorkOrders.tsx renders both the 'verified' and
      'pending_approval' states with appropriate action buttons.

────────────────────────────────────────────────────────────────────────────────

PAGE: Job Orders — J.O (frontend/src/pages/procurement/JobOrders.tsx)
────────────────────────────────────────────────────────────────────────

STATUS: ✅ CONNECTED

API CONNECTIONS:
  [1] GET  /api/job-orders
      Frontend: jobOrderApi.list(params)
      Backend:  JobOrderController@index
      → Connected with search, filter, and pagination.

  [2] POST /api/job-orders
      Frontend: jobOrderApi.create(data)
      Backend:  JobOrderController@store
      → Connected.

  [3] PUT  /api/job-orders/{id}
      Frontend: jobOrderApi.update / jobOrderApi.confirm /
                jobOrderApi.start / jobOrderApi.complete
      Backend:  JobOrderController@update (handles status transitions)
      → Connected. All status changes go through PUT with a 'status' field.

  [4] POST /api/job-orders/{id}/generate-purchase-order
      Frontend: jobOrderApi.generatePurchaseOrder(id, { supplier_id, items })
      Backend:  JobOrderController@generatePurchaseOrder
      → Connected. Creates a PO from a JO when parts are required.

REFINEMENTS NEEDED:
  [A] The jobOrderApi.confirm / start / complete methods all call
      PUT /api/job-orders/{id} with a status field. The backend validator
      accepts status changes — this is correctly implemented.
  [B] The job_order_items table (migrated in 2026_05_23_115531) stores
      parts/materials for a JO. Confirm the JO form includes an
      "items" section so mechanics can log parts used.

────────────────────────────────────────────────────────────────────────────────

PAGE: Purchase Orders — P.O (frontend/src/pages/procurement/PurchaseOrders.tsx)
────────────────────────────────────────────────────────────────────────────────

STATUS: ✅ CONNECTED

API CONNECTIONS:
  [1] GET  /api/purchase-orders
      Frontend: purchaseOrderApi.list(params)
      Backend:  PurchaseOrderController@index
      → Connected with filtering and pagination.

  [2] POST /api/purchase-orders
      Frontend: purchaseOrderApi.create(data)
      Backend:  PurchaseOrderController@store
      → Connected.

  [3] POST /api/purchase-orders/{id}/submit
      Frontend: purchaseOrderApi.submit(id)
      Backend:  PurchaseOrderController@submit
      → Connected. Moves PO to 'submitted' status.

  [4] POST /api/purchase-orders/{id}/verify
      Frontend: purchaseOrderApi.verify(id, { approved, notes })
      Backend:  PurchaseOrderController@verify
      → Connected. Purchasing Manager verifies.

  [5] POST /api/purchase-orders/{id}/approve
      Frontend: purchaseOrderApi.approve(id, { approved, notes })
      Backend:  PurchaseOrderController@approve
      → Connected. EVP/Super Admin final approval.

REFINEMENTS NEEDED:
  [A] The backend excludes PUT (update) for POs:
        Route::apiResource('purchase-orders', ...)->except(['destroy', 'update'])
      This means POs cannot be edited after creation. The purchaseOrderApi.update()
      function exists in the frontend but will return 405 Method Not Allowed
      if called. REMOVE or DISABLE the update() function in purchaseOrders.ts
      to avoid confusion.

  [B] IMPORTANT — Supplier Accreditation Gate for POs:
      The business rule states "only ACCREDITED suppliers may receive a PO."
      CHECK: The PurchaseOrderController@store should validate that the
      selected supplier has accreditation_status = 'accredited'.
      → Review the PO creation validation — if this guard is missing,
        a PO can be issued to a pending or blacklisted supplier.
      REFINE: Add validation in PurchaseOrderController@store:
        'supplier_id' => ['required', 'exists:suppliers,id',
                          Rule::exists('suppliers','id')
                            ->where('accreditation_status','accredited')]

────────────────────────────────────────────────────────────────────────────────

PAGE: Suppliers (frontend/src/pages/procurement/Suppliers.tsx)
──────────────────────────────────────────────────────────────

STATUS: ✅ CONNECTED — but ACCREDITATION FILTER IS MISSING from frontend

NOTE: The user requested "Suppliers should be accredited."
This refers to the business rule that only accredited (verified) suppliers
should appear when selecting a supplier for a P.O or J.O.

API CONNECTIONS:
  [1] GET /api/suppliers
      Frontend: supplierApi.list(params)
      Backend:  SupplierController@index
      → Connected. The backend SUPPORTS an 'accreditation_status' filter
        parameter (line 30-32 of SupplierController.php).
      → However, the Suppliers.tsx PAGE does NOT pass this filter —
        it shows ALL suppliers regardless of status.

  [2] POST /api/suppliers
      Frontend: supplierApi.create(data)
      Backend:  SupplierController@store
      → Connected.

  [3] PUT /api/suppliers/{id}
      Frontend: supplierApi.update(id, data)
      Backend:  SupplierController@update
      → Connected.

  [4] POST /api/suppliers/{id}/verify
      Frontend: supplierApi.verify(id)
      Backend:  SupplierController@verify
      → Connected. Sets is_verified=true, accreditation_status='accredited',
        and creates an Accreditation record (1 year validity).

  [5] POST /api/suppliers/{id}/blacklist
      Frontend: supplierApi.blacklist(id, reason)
      Backend:  SupplierController@blacklist
      → Connected. Sets accreditation_status='blacklisted'.

  [6] DELETE /api/suppliers/{id}
      Frontend: supplierApi.delete(id)
      Backend:  SupplierController@destroy
      → Connected. Deletes accreditations too.

REFINEMENTS NEEDED:
  [A] ⛔ CRITICAL: The Suppliers page shows ALL suppliers including
      'pending', 'suspended', and 'blacklisted' ones.
      Per business rules, when selecting a supplier for a J.O or P.O,
      ONLY 'accredited' suppliers should be selectable.
      REFINE (Frontend — Suppliers.tsx):
        Add a status filter dropdown UI on the Suppliers list page.
        For the supplier dropdown in JO/PO creation forms, pre-filter
        the API call with: { accreditation_status: 'accredited' }.

  [B] REFINE (Backend — PurchaseOrderController@store):
      Add server-side validation that the supplier_id belongs to an
      accredited supplier before allowing a P.O to be created.
      This is a critical business rule enforcement at the API layer.

  [C] The Supplier page currently lacks a visible "Accreditation Status"
      badge/column in the main list table. Add this so that users can
      quickly identify which suppliers are accredited vs pending.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE: INVENTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAGE: Supplies (frontend/src/pages/inventory/Supplies.tsx)
──────────────────────────────────────────────────────────

STATUS: ✅ CONNECTED (with minor refinements needed)

API CONNECTIONS:
  [1] GET /api/inventory
      Frontend: inventoryApi.list(params) with search, category, page
      Backend:  InventoryController@index
      → Connected. Supports filtering by category, low_stock=true,
        search by item_name, and pagination. Returns low_stock_count
        in the meta for the alert badge.

  [2] POST /api/inventory
      Frontend: inventoryApi.create(data)
      Backend:  InventoryController@store
      → Connected. Required fields: item_name, category, quantity,
        reorder_level, unit, unit_cost.

  [3] PUT /api/inventory/{id}
      Frontend: inventoryApi.update(id, data)
      Backend:  InventoryController@update
      → Connected. All fields are optional (sometimes validation).

  [4] GET /api/inventory?low_stock=true
      Frontend: inventoryApi.getLowStock()
      Backend:  InventoryController@index with low_stock boolean check
      → Connected. Returns items where quantity <= reorder_level.

  [5] DELETE /api/inventory/{id}
      Frontend: inventoryApi.delete(id)
      Backend:  InventoryController route via apiResource
      → NOTE: The route apiResource excludes 'destroy' is NOT in the
        route definition — the route is:
          Route::apiResource('inventory', ...)->except(['destroy'])
        This means DELETE is BLOCKED at the route level.
      → The inventoryApi.delete(id) function EXISTS in the frontend
        but will return 404 if called.
      REFINE: Decide whether inventory items should be deletable.
        If YES: Remove 'destroy' from the except() list in api.php.
        If NO: Remove inventoryApi.delete() from inventory.ts.

REFINEMENTS NEEDED:
  [A] The InventoryController does NOT have a dedicated 'delete'
      (destroy) method — the route is excluded. The frontend has a
      delete function that will fail. Clarify the intended behavior.

  [B] No category enum is enforced at the backend. Categories are
      free-text strings. Consider adding a seeded categories list or
      dropdown to the frontend to prevent inconsistent naming
      (e.g. "Spare Parts" vs "spare_parts" vs "Spares").

  [C] The low_stock_count in the meta response is a count of ALL
      low-stock items (not filtered by current search/category). This
      is useful for a global alert badge. The frontend should use
      this value for a "⚠ X items low in stock" indicator in the
      page header or nav sidebar.

  [D] Access Control: Only super_admin, EVP, and purchasing_manager
      can access inventory (plus roles with inventory:view dynamic
      permission). Drivers and mechanics cannot view this page, which
      is correct per the RBAC matrix.


================================================================================
  SUMMARY OF CRITICAL ISSUES (ACTION REQUIRED)
================================================================================

  ⛔ CRITICAL ISSUES:
  ──────────────────
  1. PMS — "Request WO" button is a UI stub with NO API call.
     The entire pre-trip safety initiation from PMS is non-functional.
     → Wire RequestWoModal to workOrderApi.create()

  2. Suppliers — No accreditation filter enforced in P.O / J.O supplier
     selection dropdowns. Blacklisted/pending suppliers can be assigned.
     → Filter supplier dropdowns to accreditation_status='accredited'
     → Add server-side validation in PurchaseOrderController@store

  3. Fleet API — fleetApi.getMaintenanceHistory() and
     fleetApi.getPmsStatus() point to routes that DO NOT EXIST.
     → Either implement these backend routes or remove the dead functions.

  ⚠️  REFINEMENTS NEEDED:
  ──────────────────────
  4. PMS "Bulk Import" and "Export Data" buttons are non-functional stubs.
  5. Purchase Orders — purchaseOrderApi.update() will 405 (no PUT route).
     Remove or disable this frontend function.
  6. Inventory — inventoryApi.delete() will 404 (route excluded).
     Decide whether to allow deletion and update accordingly.
  7. Trip Tickets — Query key mismatch between TripTickets.tsx
     (['trip-tickets']) and Overview.tsx (['trip-tickets-all']) means
     cross-page invalidation doesn't work after mutations.
  8. Fleet — BusModal driver dropdown uses userApi.list() (all users)
     then filters client-side. Should pass role=driver server-side.
  9. Suppliers page — No 'Accreditation Status' column in the table.
     Users cannot quickly identify accredited suppliers.

  ✅  FULLY CONNECTED AND WORKING:
  ─────────────────────────────────
  - Logistics Overview (buses, trip tickets, users, calendar)
  - Trip Tickets (full CRUD with safety gate + budget auto-creation)
  - Fleet (bus CRUD, bulk upload, seat layout, driver assignment)
  - Work Orders (full CRUD + approve/reject/generate-jo)
  - Job Orders (full CRUD + status transitions + generate-po)
  - Purchase Orders (create + submit + verify + approve workflow)
  - Supplier verify/blacklist actions
  - Inventory Supplies (CRUD + low_stock filter)

================================================================================
  END OF AUDIT
================================================================================
