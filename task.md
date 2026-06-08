# Backend Development Tracker

## 1. Driver Module & Dashboard
- [x] **Driver-Bus Assignment:** Establish database relationships and API logic to securely link users (with the `driver` role) to specific `buses`.
- [x] **Role-Scoped Data:** Update API endpoints for schedules and trips to ensure drivers can only fetch data explicitly assigned to them.
- [x] **Route Middleware:** Create or update route middleware so the `driver` role has read-only access to necessary bus and schedule data.

## 2. Point of Sale (POS) & Billing Module
- [x] **Services List Access:** Allow `agent` and `accounting` roles to access `GET /billing/services` (Completed).
- [x] **Service Management:** Verify and implement `agent` role access for creating, editing, and deleting services in the `BillingController`.
- [x] **Invoice Creation:** Audit the invoice creation endpoints to ensure `agent` and `accounting` can generate and manage POS transactions properly.
- [x] Resolve merge conflicts in `frontend/src/components/ui/BusLayout.tsx`
- [x] Resolve merge conflicts in `frontend/src/pages/inventory/Fleet.tsx`
- [x] Commit the merged files
- [x] Run `npm run build` in `frontend` to verify no compilation errors

## 3. Expanded Agent Capabilities (Sidebar Modules)
- [x] **Procurement Access:** Review `PurchaseOrderController` and `SupplierController` to ensure the `agent` role is included in middleware checks.
- [x] **Inventory Access:** Review `InventoryController` (Supplies) to ensure the `agent` role is included in middleware checks.
- [x] **Travel Documents Access:** Review document-related controllers to ensure the `agent` role is included in middleware checks.
