# System QA Audit & Improvement Recommendations

This report outlines key security, reliability, and code-quality improvements identified across the JVD Internal Management System, categorized by priority and including actionable fixes.

---

## 1. 🔒 Security & Access Control

### 🔴 Rate Limiting on 2FA Verification
* **Location**: `AuthController::verify2FA`
* **Vulnerability**: Brute-force attacks against 2FA codes are unrestricted.
* **Impact**: Attackers who obtain a user's password can brute-force the 6-digit TOTP code (1,000,000 possibilities) in parallel within minutes.
* **Fix**: Apply Laravel's `RateLimiter` to the `/auth/2fa/verify` endpoint:
  ```php
  $key = '2fa:' . $request->ip() . ':' . $request->user_id;
  if (RateLimiter::tooManyAttempts($key, 5)) {
      return response()->json(['message' => 'Too many attempts. Try again in 60s.'], 429);
  }
  ```

---

### 🟠 Plaintext Password Exposure in Audit Logs
* **Location**: `AuditLogger.php` middleware
* **Vulnerability**: Logs raw request inputs, excluding only `'password'` and `'_token'`.
* **Impact**: Password reset or profile change requests expose fields like `current_password`, `new_password`, and `new_password_confirmation` in plaintext inside the database log table.
* **Fix**: Mask all password variants in `new_values` serialization:
  ```php
  'new_values' => json_encode($request->except([
      'password', 'password_confirmation', 'new_password', 
      'new_password_confirmation', 'current_password', '_token'
  ])),
  ```

---

### 🟡 Inactive / Broken 2FA Route Guarding
* **Location**: `VerifyTwoFactor.php` middleware & `routes/api.php`
* **Vulnerability**: The middleware references a non-existent `two_factor_verified_at` database column, and the alias `verify.2fa` is never applied to routes.
* **Impact**: Authenticated sessions have no active enforcement of post-login 2FA verification.
* **Fix**:
  1. Add a `two_factor_verified_at` column to the `users` table via migration.
  2. Update the timestamp to `now()` upon successful TOTP verification.
  3. Bind the `verify.2fa` middleware to critical authenticated route groups:
     ```php
     Route::middleware(['auth:sanctum', 'verify.2fa'])->group(...);
     ```

---

### 🟡 Memory Exhaustion via Avatar Uploads (DoS)
* **Location**: `ProfileController::updateAvatar`
* **Vulnerability**: Decodes arbitrary base64 image strings directly in memory without size checks.
* **Impact**: Malicious users could send massive base64 payloads to saturate server memory or fill disk storage.
* **Fix**: Calculate size before decoding and enforce a 5MB limit:
  ```php
  $approxSize = (strlen($request->avatar) * 3) / 4;
  if ($approxSize > 5 * 1024 * 1024) {
      return response()->json(['message' => 'File size exceeds 5MB limit.'], 422);
  }
  ```

---

## 2. 📁 Data Integrity & Architecture

### 🔴 Client-Side Random Employee ID Generation
* **Location**: `Users.tsx` (Add User & Bulk Registration preview)
* **Vulnerability**: Employee IDs are generated using `Math.floor(1000 + Math.random() * 9000)`.
* **Impact**: High probability of ID collision at scale, breaking unique DB constraints and halting registrations.
* **Fix**: Auto-increment or derive IDs sequentially on the backend:
  ```php
  $latest = User::orderBy('id', 'desc')->first();
  $nextId = $latest ? ($latest->id + 1001) : 1001;
  $userData['employee_id'] = 'JVD-EMP-' . $nextId;
  ```

---

### 🟠 Unsafe JSON Parsing in Custom Permissions
* **Location**: `Users.tsx`
* **Vulnerability**: Direct call of `JSON.parse` on backend permissions string.
* **Impact**: If a user has malformed/empty custom permissions in the database, the dashboard crashes and refuses to render.
* **Fix**: Wrap parsing in a safe try-catch wrapper:
  ```javascript
  let permissions = {};
  try {
      permissions = JSON.parse(user.custom_permissions || '{}');
  } catch (e) {
      console.error('Invalid permissions format', e);
  }
  ```

---

### 🟢 Dead Code Cleanup
* **Location**: `ProfileController.php`
* **Vulnerability**: The `updatePassword` method is defined but never routed.
* **Impact**: Increases code noise and maintenance overhead.
* **Fix**: Remove the unused function since password updates are routed directly to `AuthController::changePassword`.

---

## 3. 🖥️ User Experience (UX)

### 🟡 Missing Search Debouncing
* **Location**: `Users.tsx`
* **UX Bug**: Search input fires API requests on every keystroke.
* **Impact**: Causes UI lag due to excessive re-rendering and overloads the backend database with redundant search queries.
* **Fix**: Implement a standard debounce delay (e.g. 300ms):
  ```javascript
  useEffect(() => {
      const delayInputTimeoutId = setTimeout(() => {
          setSearch(searchInput);
      }, 300);
      return () => clearTimeout(delayInputTimeoutId);
  }, [searchInput]);
  ```

---

### 🟡 Active Inputs in Read-Only Modals
* **Location**: `Users.tsx`
* **UX Bug**: The "View User" (User Identity) modal renders active select dropdowns for custom permission levels.
* **Impact**: Users get the false impression they can change permission levels in the view modal, but the modifications are discarded when they close it.
* **Fix**: Render static text badges or disable select elements inside the read-only view.

---

### 🟢 First-Occurrence Replacement Bugs
* **Location**: `Users.tsx` & `AuditLogs.tsx`
* **UX Bug**: Uses `.replace('_', ' ')` or `.replace('-', ' ')` to display roles and modules.
* **Impact**: Only replaces the first occurrence (e.g., `executive_vice_president` becomes `"executive vice_president"`).
* **Fix**: Use regex `/g` or `.replaceAll()`:
  ```javascript
  roleName.replace(/_/g, ' ');
  ```
