# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

JVD Internal Management System — an internal paperless operations platform for JVD Events and Travels Management Co. Monorepo with a Laravel 13 (PHP 8.4) API backend and a React 19 + TypeScript + Vite frontend, covering Procurement, Travel, Accounting, Sales, Inventory, Fleet/Logistics, HR, and Admin modules.

| Layer | Stack |
|-------|-------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Laravel 13 (PHP 8.4) |
| Database | PostgreSQL (SQLite works for local dev — see below) |
| Auth | Laravel Sanctum + Google Authenticator TOTP (2FA) |

## Commands

### Backend (`backend/`)
```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate            # or migrate:fresh --seed for a clean local DB
php artisan serve              # http://localhost:8000
composer dev                   # serve + queue:listen + pail (logs) + vite, concurrently
php artisan test                       # full suite (Unit + Feature)
php artisan test --filter=TestName     # single test
php artisan test tests/Feature/Path/SomeTest.php
vendor/bin/pint                # code style (Laravel Pint)
```
A root-level `artisan` script forwards to `backend/artisan`, so `php artisan ...` also works from the repo root.

For local dev without PostgreSQL installed, set `DB_CONNECTION=sqlite` in `.env` and remove the other `DB_*` vars — then `php artisan migrate:fresh --seed`.

There is also a bundled portable toolchain under `tools/` and `php83/` (PHP 8.3, Composer, Node) for machines without these installed globally — invoke via `tools/php.bat`, `tools/composer.bat`, `tools/node.bat` if `php`/`composer`/`node` aren't on PATH.

### Frontend (`frontend/`)
```bash
npm install
npm run dev       # Vite dev server, http://localhost:3000, proxies /api, /sanctum, /storage, /uploads to backend
npm run build     # tsc -b && vite build
npm run lint
npm run preview
```
`VITE_PROXY_TARGET` controls which backend the dev proxy targets (defaults to `http://localhost:8000`).

### Non-PHPUnit test scripts
`backend/tests/backend_tests.py`, `backend/tests/integration_tests.py`, and `backend/tests/test_pos_features.py` are standalone Python scripts that hit a **live running API** over HTTP (default `http://127.0.0.1:8001/api`) using hardcoded credentials — they are not part of the `php artisan test` suite and require the backend actually running on that port first.

## Architecture

### Repo layout
```
backend/app/
  Http/Controllers/   # thin controllers, grouped by module (Accounting, Procurement, Travel, Fleet, Inventory, Admin, Sales, Auth, plus a few top-level)
  Http/Services/       # business logic layer (most module services live here)
  Services/            # a second, older services namespace (LedgerService, BillingCollectionService, LiquidationService, PayMongoService) — check both when looking for business logic
  Http/Middleware/      # CheckRole, VerifyTwoFactor, EnforcePasswordChange, AuditLogger, TrackUserOnlineStatus
  Http/Requests/, Http/Resources/
  Models/               # all Eloquent entities (RolePermission, Contract, Invoice, JobOrder, WorkOrder, PurchaseOrder, etc.)
  Policies/, Mail/, Notifications/, Providers/

frontend/src/
  api/          # one file per domain, all built on top of api/client.ts (Axios)
  pages/        # route-level pages, one folder per module (accounting/, procurement/, travel/, sales/, hr/, inventory/, logistics/, operations/, admin/, driver/, portal/, dashboards/)
  components/   # ui/, layout/, forms/, travel/, auth/
  context/      # AuthContext, ThemeContext, EntityPreviewContext
  guards/       # AuthGuard (authenticated), RoleGuard (role allowlist, redirects to /dashboard otherwise)
  types/, constants/, hooks/, utils/

api-contracts/   # OpenAPI/YAML specs — source of truth for FE/BE contract on several modules (auth, users, purchase-orders, job-orders, work-orders, fleet, inventory, passengers, accreditations, audit-logs, customers, passporting)
```

### RBAC
Authorization is enforced in `backend/routes/api.php` via the `role:` route middleware (`CheckRole` in `app/Http/Middleware/CheckRole.php`), with two supported forms:
- Legacy, hardcoded: `role:super_admin,executive_vice_president,...` — checks `$user->role` against the list.
- Hybrid dynamic: `role:roleA,roleB|module:action` (action is `view|create|edit|delete`) — passes if the user's hardcoded role matches OR `$user->getAllPermissions()[module]['can_'.action]` is true via the `role_permissions` table (`RolePermission` model). This lets admins grant per-module permissions without touching code.
- `super_admin` always bypasses every check.

Route groups are commonly split by action (`module:view` vs `module:create` vs `module:edit` vs `module:delete`) rather than gating a whole resource controller with one check — follow that pattern when adding new routes.

On the frontend, `RoleGuard` mirrors this for UI gating (`roles={['admin','super_admin']}`), and `AuthGuard` handles the authenticated/unauthenticated split. Auth state lives in `AuthContext`; the Axios client (`api/client.ts`) attaches the bearer token from `localStorage('auth_token')` and force-redirects to `/login` on a 401.

### Public/unauthenticated surface
A few routes are intentionally public and unauthenticated in `routes/api.php`: login/2FA/set-password, accreditation KYC submission, public system settings, and the customer-facing document-upload/e-signature portal (`/public/portal/{token}` → `CustomerPortalController`, plus a legacy `/public/visa-requests/{token}` path that is kept live for already-issued links). Treat anything reachable without `auth:sanctum` as adversarial input — these have been the source of real IDOR/upload-validation findings in this codebase (file-extension/MIME spoofing, token-scoped data leakage).

### Sales Contract System / Customer Portal
`Contract`/`ContractAmendment`/`PaymentSchedule`/`Itinerary`/`InvoicePassenger`/`CustomTransactionDetail`/`CustomerPortalToken` models back a contract-gated checkout flow: `SalesCheckout.tsx` evaluates whether an order needs a signed contract (custom line item + deposit-or-total over a configurable threshold in `SystemSetting`) and if so routes through `ContractController` (`draft` → send/sign-at-counter → `finalize`) instead of going straight to `BillingController`/`billingApi.createInvoice`. `InvoiceFinalizationService` was extracted from `BillingController::store` and preserves the original transaction-boundary ordering via separate `finalizeWithinTransaction` / `afterCommit` methods — don't reorder side effects across that boundary without checking why they were split. `PortalLinkResolver` is the single shared place for ngrok/referer/origin base-URL detection used by portal links; don't re-implement that logic elsewhere.

## Known gotchas

- **Laravel `$request->validate()` silently drops unlisted nested array sub-keys.** When validating a nested array/object (itinerary rows, passenger rows, `custom_transaction_detail.*`, any `*.subfield` pattern), only sub-keys with their own explicit rule line survive into `$validated` — anything else vanishes with no error, even if the frontend sent it correctly. If "data is sent correctly but ends up null in the DB," check the validation rule list for missing sub-fields before suspecting frontend/timing bugs.
- Business logic can live in either `app/Http/Services/` or `app/Services/` — check both before concluding a service doesn't exist.
- `/api/ping` and similar return a generic 500 (not 401) for unauthenticated requests — this is a pre-existing quirk of Sanctum's default `Authenticate` middleware trying to redirect to a `login` route that doesn't exist in this API-only app, not a regression to "fix" reflexively.
