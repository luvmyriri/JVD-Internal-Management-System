# Phase 0 → 2.9 Consolidation & Verification

**Date:** 2026-07-05 · Verified by code scan + full backend test run (not self-reported)
**Headline:** Substantial real progress — **backend suite 126/126 green (was 125/126), frontend type-checks clean.** But **all of Phase 2 (~165 files) is uncommitted and untracked on `main`**, ~4 items are incomplete, and 3 are not started. Details below.

---

## 🔧 Execution update — 2026-07-05 (backlog work, Claude)

Closed this session, all tested (suite now **128/128**, +2 new tests):
- **2.2 idempotency — DONE.** The `idempotency_key` column existed but was inert (not in `CollectionPayment::$fillable`, unused). Now added to fillable + `CollectionController::addPayment` short-circuits a repeated key (double-click / retry) instead of posting a second payment + ledger entry. Covered by `tests/Feature/CollectionPaymentIdempotencyTest.php` (2 tests).
- **2.8b CHECK constraints — DONE.** New driver-guarded migration `2026_07_05_000002_add_amount_check_constraints.php` adds `>= 0` CHECK constraints on `invoices.{total,subtotal,tax}` + `collection_payments.amount` on **PostgreSQL only** (no-ops on the SQLite test DB, which can't `ALTER TABLE ADD CONSTRAINT`).
- **Correction to the audit below:** 2.5 "Collections → ledger" was reported as NOT done — that was **wrong**. `CollectionPayment::booted()` posts a Cash/Revenue journal entry on *every* payment via a model `created` observer (catches all 5 call sites). Collections→ledger is **done**; the remaining 2.5 gap is only finalization **snapshots**.

Still open (large subsystems — need proper tested slices, not a rushed blob): 2.3 abilities, 2.6 notification prefs + event-driven, 2.8 API Resources + pagination, 2.9 thin ProcurementDocument/Dashboard controllers, 2.1 queue-worker verification. Plus the cross-cutting commit + 0.5 branch migration below.

---

## ⚠️ Two cross-cutting issues that outrank any single item

1. **Phase 2 is entirely uncommitted.** Only Phase 0 (2 commits) and Phase 1 (1 commit) are in git history. Every Phase 2 artifact — workflow engine, bookings, documents, travels, the thinned controllers, `/api/v1` split — exists **only as uncommitted/untracked working-tree changes** (165 files, 71 untracked in `backend/` alone). This means: it's not on a branch, not in a PR, not reviewed, and one `git checkout .` from being lost. It also contradicts the `TEAM_WORKFLOW.md` branch model. **Action: commit this to feature branches immediately** (see bottom).
2. **No tests were added for the new subsystems.** Test count is still exactly 126 — the workflow engine, ledger posting, bookings split, and document repository have **zero coverage**. The green suite proves *existing* behavior didn't regress, not that the new code works. That's roadmap item 2.10 (not yet claimed), but the new money-touching code should not be considered "done" until covered.

Also: `0.5` (branch migration) was never run — the personal branches `Emman`, `Val`, `Greg`, `greg_Backend` still exist on the remote and work is happening directly on `main`.

---

## Item-by-item verdict

Legend: ✅ done · 🟡 partial · ❌ not started · ❓ can't verify from code (needs your confirmation)

### Phase 0
| Item | Task | Status | Evidence |
|---|---|---|---|
| 0.1 | Payroll tax fix | ✅ | Suite 126/126 (the failing test now passes) |
| 0.2 | VisaProcessing TS error | ✅ | `tsc -b` exits 0 |
| 0.3 | Transactions on money paths | ✅ | `DB::transaction` now in 19 files (was 10); committed `9d448ae` |
| 0.4 | Repo cleanup + `.gitignore` | ✅ | `test*.php`, `php83.zip`, `rr.exe` gone; committed |
| 0.5 | **Branch migration + protect `main`** | ❌ | Personal branches still on remote; committing straight to `main` |
| 0.6 | Docs consolidation | ✅ | `docs/` set present |

### Phase 1
| Item | Task | Status | Evidence |
|---|---|---|---|
| 1.1 | CI (GitHub Actions) | ✅ | `backend.yml`, `frontend.yml`, `ci.yml` (note: `ci.yml` is itself untracked) |
| 1.2 | Docker | ✅ | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile(.dev)` |
| 1.3 | Staging + prod servers, deploy pipeline | ❓ | Config committed in `62bf09f`; actual provisioned servers can't be verified from the repo — **confirm** |
| 1.4 | Sentry | ✅ | Present in `composer.json` + `package.json` |
| 1.5 | Backups + restore drill | ❓ | Backup scripting may exist; the *restore drill* is an ops action — **confirm it was performed** |
| 1.6 | Prod env hardening | ✅ | Committed in `62bf09f` (verify `APP_DEBUG=false`, seeder guards on the actual prod `.env`) |
| 1.7 | Sales domain workshops | ❓ | Real-world meetings, not code — **confirm they happened + share the field worksheets** |

### Phase 2
| Item | Task | Status | Evidence / gap |
|---|---|---|---|
| 2.1 | Queues live | 🟡 | `app/Jobs/` exists, `ShouldQueue` on 11 mail/notify/job classes (was 3). Only one real job (`SendEmailDigestJob`); confirm a `queue:work` worker runs in the deploy |
| 2.2 | Derived payment status · locks · idempotency | 🟡 | **Locks ✅** (`lockForUpdate` across 11 services/controllers). Idempotency: migration adds the column but no code uses it yet. Derived-status: verify it's computed, not hand-set |
| 2.2b | DB integrity wave | ✅ | `add_db_integrity_constraints` migration: restrict/softDeletes/checks present |
| 2.2c | Merge travel tables + unique indexes | ✅ | `create_travels_table` + `Travel` model |
| 2.3 | **Abilities & roles-as-data** | ❌ | No migration, no `roles` table, no ability code. Still the old CRUD-only `role_permissions`. **Blocks the flexible-roles client requirement and the workflow engine's ability-based approver targeting** |
| 2.4 | Workflow engine + approvals inbox | ✅ | `create_workflow_tables` + 4 models + `WorkflowService` + `Controllers/Workflow/`. (Approvers currently target roles, not abilities — see 2.3) |
| 2.5 | Ledger postings + finalization snapshots | 🟡 | **Invoice AR+Revenue posts to `LedgerService`** (`InvoiceFinalizationService:348`) ✅. But **Collections payments don't post to the ledger** (0 refs), and **no finalization snapshot** (0 refs) — payment history and immutability incomplete |
| 2.5b | Split `bookings` out of `invoices` | ✅ | `create_bookings_table` + `Booking` model, wired in `Invoice`, `BillingService`, `TripTicketService` |
| 2.6 | Notifications + email digests | 🟡 | `SendEmailDigestJob` exists. But **no `notification_preferences` table**, and **not event-driven** (0 `event()` calls in controllers; 2 files in `app/Events`). Still role-list fan-out |
| 2.7 | Document repository (DMS) | ✅ | `documents` + `document_versions` tables, `Document`/`DocumentVersion` models, legacy-migrate migration. (Confirm auto-filing listeners + expiry scheduler are wired) |
| 2.8 | FormRequests · Resources · pagination · `/api/v1` | 🟡 | **Routes split into `routes/api/v1/*` + prefixed in `bootstrap/app.php`, frontend `baseURL` aligned to `/api/v1` ✅. FormRequests 12→38 ✅.** But **API Resources still 14 (unchanged)** and **pagination not expanded (17 controllers)** |
| 2.8b | Status vocabulary CHECK constraints | ❌ | No CHECK constraints found |
| 2.9 | Thin god controllers + merge service namespaces | 🟡 | **Namespaces merged** (`app/Http/Services/` empty → all 20 in `app/Services/`) ✅. **TripTicket 838→53, Billing 616→79 ✅.** But **`ProcurementDocumentController` (789) and `DashboardController` (713) untouched** |

---

## Scorecard

- **Done ✅:** 0.1, 0.2, 0.3, 0.4, 0.6, 1.1, 1.2, 1.4, 1.6, 2.2b, 2.2c, 2.4, 2.5b, 2.7 — **14 items**
- **Partial 🟡:** 2.1, 2.2, 2.5, 2.6, 2.8, 2.9 — **6 items** (locks, ledger-AR, v1 split, controller-thinning, queues all real; gaps listed above)
- **Not started ❌:** 0.5, 2.3, 2.8b — **3 items**
- **Confirm with you ❓:** 1.3, 1.5, 1.7 — **3 items** (infra/ops/meetings, not visible in code)

## What to close before calling Phase 2 done

1. **Commit everything now** onto feature branches per `TEAM_WORKFLOW.md` (e.g. `feat/2.4-workflow-engine`, `feat/2.7-dms`, `feat/2.5-ledger`), open PRs, review, squash-merge. Un-reviewed uncommitted work is the single biggest risk on the board.
2. **2.3 abilities/roles-as-data** — start it; the workflow engine (2.4) is targeting roles instead of abilities until this lands, and it's a core client ask.
3. **2.5 finish** — Collections → ledger postings, and finalization snapshots (immutability).
4. **2.6 finish** — `notification_preferences` table + make it event-driven (the "email flooding" fix depends on this).
5. **2.9 finish** — thin `ProcurementDocumentController` (789) and `DashboardController` (713).
6. **2.8 finish** — API Resources for write/response endpoints; pagination on remaining list endpoints; add CHECK constraints (2.8b).
7. **Tests (2.10, pull forward):** cover workflow engine, ledger posting, bookings, DMS before trusting them in production.
8. **0.5** — run the branch migration and protect `main`; you're currently not getting the review safety net the plan specified.

**Bottom line:** the hard architectural pieces (workflow engine, bookings split, DMS, travel merge, transactions, locks, service consolidation, v1 API) are genuinely built and the system is green — strong work. But "Phase 2 complete" isn't accurate yet: 3 items unstarted, 6 partial, and none of it committed or tested. Closing the eight points above gets you to a real, reviewed, tested Phase 2.
