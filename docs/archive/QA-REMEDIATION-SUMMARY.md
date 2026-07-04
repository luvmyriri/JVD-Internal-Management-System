# QA Remediation Summary

This document lists all changes implemented based on the two QA audit reports:
- `ADMINISTRATION-QA.md`
- `HUMAN-RESOURCE-QA.md`

---

## 📁 ADMINISTRATION-QA.md

### ✅ 🔴 CRITICAL #1 — Super Admin Route Authorization Bypass
- **Finding**: The middleware group for Super Admin exclusive routes (set-password, landing-settings, role-permissions) only used `auth:sanctum` — any logged-in user could call them.
- **Fix**: Wrapped those routes under `['auth:sanctum', 'role:super_admin']` middleware.
- **Files Changed**:
  - `backend/routes/api.php`

---

### ✅ 🟠 HIGH #2 — Privilege Escalation in User Store/Update
- **Finding**: Any standard admin could assign the `super_admin` role to themselves or any other user.
- **Fix**: Added a role-check guard — only a currently authenticated `super_admin` can assign the `super_admin` role.
- **Files Changed**:
  - `backend/app/Http/Controllers/Admin/UserController.php`

---

> ⚠️ **Note**: The remaining findings from `ADMINISTRATION-QA.md` (2FA rate limiting, audit log password leakage, dead 2FA middleware, avatar upload DoS, bulk import invite bug, JSON parse crash, employee ID collision, read-only modal inputs, search debouncing, string replace bugs) were **not in scope** — only the first two recommendations were requested.

---

## 📁 HUMAN-RESOURCE-QA.md

All 8 findings were fully implemented.

---

### ✅ 🔴 C-03 — Remote Code Execution via Unrestricted Document Upload
- **Finding**: `JobApplicationController::uploadDocument` had no MIME or extension validation. Attackers could upload a `.php` web shell and execute arbitrary code on the server. The frontend file input also had no `accept` filter.
- **Fix**:
  - Backend: Added strict MIME whitelist (`pdf, doc, docx, jpg, jpeg, png`). Used `$file->extension()` (server-resolved) instead of the client-supplied filename extension. Files stored in `private/` storage (not web-accessible).
  - Frontend: Added `accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"` to file inputs.
- **Files Changed**:
  - `backend/app/Http/Controllers/JobApplicationController.php`
  - `frontend/src/pages/hr/Applications.tsx`

---

### ✅ 🔴 C-04 — Complete Write Privilege Bypass on HR Route Middleware
- **Finding**: The HR route group used a single middleware including `hr:view`. Because read and write routes were not separated, any user with only the read-only `hr:view` permission could POST, PUT, and DELETE — creating users, updating salaries, running payroll, etc.
- **Fix**: Split the single HR middleware group into three separate verb-specific groups:
  - `GET` routes → protected by `hr:view`
  - `POST / PUT / PATCH` routes → protected by `hr:create` / `hr:edit`
  - `DELETE` routes → protected by `hr:delete`
- **Files Changed**:
  - `backend/routes/api.php`

---

### ✅ 🟡 H-01 — Duplicate Email Database Crash on Employee Conversion
- **Finding**: When converting an applicant to an employee, `email` uniqueness was never checked. If the email already existed in the `users` table, `User::create()` would throw a raw 500 SQL constraint error.
- **Fix**: Added an explicit `User::where('email', ...)->exists()` check before creating the user record. Returns a clean `422` with a clear error message.
- **Files Changed**:
  - `backend/app/Http/Controllers/JobApplicationController.php`

---

### ✅ 🟡 H-02 — Non-Atomic Employee Conversion
- **Finding**: The conversion flow (create User → send email notification → update JobApplication status) was not wrapped in a database transaction. If any step failed mid-way, the system was left in an inconsistent state — a user account created but the application still marked as unconverted, making retries impossible.
- **Fix**: Wrapped the entire `convertToEmployee` logic in `DB::transaction()` so all database writes succeed together or roll back completely.
- **Files Changed**:
  - `backend/app/Http/Controllers/JobApplicationController.php`

---

### ✅ 🟡 H-03 — Broken Overlapping Payroll Period Logic (Double Pay Bug)
- **Finding**: The overlap check used `whereBetween` which only detected partial overlaps. It missed cases where an existing cycle fully *contained* the new requested period (e.g., existing: June 1–30, new: June 10–20). This allowed duplicate payroll runs and double employee payments.
- **Fix**: Replaced the incomplete query with the standard interval intersection check:
  ```
  existing.start_date <= new.end_date  AND  existing.end_date >= new.start_date
  ```
- **Files Changed**:
  - `backend/app/Http/Controllers/PayrollController.php`

---

### ✅ 🟡 H-04 — Disconnected General Ledger on Payroll Release
- **Finding**: Releasing a payroll cycle only updated statuses to `released`. It never created journal entries or a cash budget request, meaning the company's largest regular expense was completely absent from the General Ledger and cash reconciliation sheets.
- **Fix**:
  - On `releasePayroll`, calls `LedgerService` to record a balanced double-entry journal:
    | Account | Side |
    |---|---|
    | Salary Expense (6000) | Debit — gross amount |
    | Tax/Deductions Payable (2300) | Credit — tax withheld |
    | Accrued Payroll (2200) | Credit — net pay owed |
  - Creates a `CashBudgetRequest` record (`status: approved`) for Finance to track the outflow.
  - Seeded 3 new default accounts in `LedgerService`: `2200 Accrued Payroll`, `2300 Tax/Deductions Payable`, `6000 Salary Expense`.
  - Added `payroll_cycle_id` nullable FK column to `cash_budget_requests` table.
  - Added `payrollCycle()` `BelongsTo` relationship to `CashBudgetRequest` model.
- **Files Changed**:
  - `backend/app/Http/Controllers/PayrollController.php`
  - `backend/app/Services/LedgerService.php`
  - `backend/app/Models/CashBudgetRequest.php`
  - `backend/database/migrations/2026_06_19_000001_add_payroll_cycle_id_to_cash_budget_requests_table.php` *(new)*

---

### ✅ 🟠 M-01 — Rigid Semi-Monthly Division Logic (÷2)
- **Finding**: Salary calculations hardcoded a division by 2 (`$cycleBase = $monthlyBase / 2`), assuming every payroll cycle is exactly 15 days. Running a cycle for 7 days, 14 days, or a full month would still pay half the monthly salary — causing underpayments or overpayments.
- **Fix**: Replaced the fixed division with a daily pro-rate formula based on the actual date range:
  ```
  cyclePay = monthlyPay × (cycleDays ÷ daysInMonth)
  ```
- **Files Changed**:
  - `backend/app/Http/Controllers/PayrollController.php`

---

### ✅ 🟠 M-02 — Hardcoded Flat 10% Tax + Negative Net Pay Bug
- **Finding**: Tax was calculated as a flat 10% of base salary (`$cycleTax = $cycleBase * 0.10`). This violates the BIR TRAIN Law progressive tax table. Also, high deductions could produce a negative net salary which violates labor law. The frontend also had the same flat 10% hardcoded in live previews.
- **Fix**:
  - Backend: Added `computeBirTax(float $monthlyBase)` private method implementing the 2024 BIR TRAIN Law brackets (annualised income → bracket → divided by 24 semi-monthly periods).
  - Backend: Applied `max(0.00, ...)` floor to net salary — no employee can receive negative pay.
  - Frontend: Added matching `computeBirTax(monthlyBase: number)` JavaScript helper mirroring the backend brackets, used in the employee salary table and the edit modal live preview.
  - Updated UI text: removed all "10%" references; renamed payslip column header from `Tax (10%)` to `Withholding Tax`; updated Run Payroll confirmation description.
- **Files Changed**:
  - `backend/app/Http/Controllers/PayrollController.php`
  - `frontend/src/pages/hr/Payroll.tsx`

---

## 📊 Summary Table

| Finding | Severity | Module | Status |
|---------|----------|--------|--------|
| ADMIN #1 — Super Admin route bypass | 🔴 Critical | Administration | ✅ Done |
| ADMIN #2 — Privilege escalation via role assignment | 🟠 High | Administration | ✅ Done |
| C-03 — RCE via document upload | 🔴 Critical | HR / Applications | ✅ Done |
| C-04 — HR write bypass via `hr:view` | 🔴 Critical | HR / Routes | ✅ Done |
| H-01 — Duplicate email crash on conversion | 🟡 High | HR / Applications | ✅ Done |
| H-02 — Non-atomic employee conversion | 🟡 High | HR / Applications | ✅ Done |
| H-03 — Double pay bug (overlap logic) | 🟡 High | HR / Payroll | ✅ Done |
| H-04 — Disconnected General Ledger | 🟡 High | HR / Payroll | ✅ Done |
| M-01 — Rigid ÷2 salary calculation | 🟠 Medium | HR / Payroll | ✅ Done |
| M-02 — Flat 10% tax + negative pay bug | 🟠 Medium | HR / Payroll | ✅ Done |

**Total: 10 findings fixed across 9 files + 1 new migration.**
