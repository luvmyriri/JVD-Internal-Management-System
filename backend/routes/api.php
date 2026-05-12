<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\UserController;

/*
|--------------------------------------------------------------------------
| API Routes — JVD Internal Management System
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api automatically by Laravel.
| Middleware groups follow the RBAC matrix from Architecture § 3.
|
| Route naming convention: module.action (e.g., auth.login, users.store)
|
*/

// ──────────────────────────────────────────
// PUBLIC (unauthenticated) routes
// ──────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->name('auth.login');
    Route::post('/2fa/verify', [AuthController::class, 'verify2FA'])->name('auth.2fa.verify');
    Route::post('/2fa/setup', [AuthController::class, 'confirmSetup'])->name('auth.2fa.setup');
});

// ──────────────────────────────────────────
// AUTHENTICATED routes (Sanctum token required)
// ──────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth session management
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/logout', [AuthController::class, 'logout'])->name('auth.logout');
<<<<<<< HEAD
        Route::post('/2fa/setup', [AuthController::class, 'setup2FA'])->name('auth.2fa.setup');
=======
>>>>>>> c49ea97b7b3363c871c1ca1ff83463005e6a7bfe
    });

    // ──────────────────────────────────────
    // ADMINISTRATION (Super Admin + Admin)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin')->group(function () {

        // User Management
        Route::apiResource('users', UserController::class)->except(['destroy']);
        Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
        Route::post('/users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');

        // Audit Logs (read-only)
        // Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    });

    // ──────────────────────────────────────
    // PROCUREMENT (Super Admin, Admin, Accounting, Agent)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,accounting,agent')->group(function () {

        // Purchase Orders
        // Route::apiResource('purchase-orders', PurchaseOrderController::class);
        // Route::post('/purchase-orders/{po}/submit', [PurchaseOrderController::class, 'submit'])->name('po.submit');
        // Route::post('/purchase-orders/{po}/verify', [PurchaseOrderController::class, 'verify'])->name('po.verify');
        // Route::post('/purchase-orders/{po}/approve', [PurchaseOrderController::class, 'approve'])->name('po.approve');

        // Job Orders
        // Route::apiResource('job-orders', JobOrderController::class);

        // Work Orders
        // Route::apiResource('work-orders', WorkOrderController::class);

        // Suppliers
        // Route::apiResource('suppliers', SupplierController::class);
    });

    // ──────────────────────────────────────
    // INVENTORY (Super Admin, Admin, Agent)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,agent')->group(function () {
        // Fleet
        // Route::apiResource('buses', BusController::class);

        // PMS
        // Route::get('/pms/dashboard', [PMSController::class, 'dashboard'])->name('pms.dashboard');

        // Inventory
        // Route::apiResource('inventory', InventoryController::class);

        // Accreditations
        // Route::apiResource('accreditations', AccreditationController::class);
    });

    // ──────────────────────────────────────
    // TRAVEL (Super Admin, Admin, Agent)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,agent')->group(function () {
        // Passporting
        // Route::apiResource('passport-cases', PassportCaseController::class);

        // Customers & Passengers
        // Route::apiResource('customers', CustomerController::class);
        // Route::apiResource('passengers', PassengerController::class);
    });

    // ──────────────────────────────────────
    // ACCOUNTING (Super Admin, Accounting)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,accounting')->group(function () {
        // POS / Billing / Reports
        // Route::apiResource('billing', BillingController::class);
    });

    // ──────────────────────────────────────
    // HR (Super Admin, Admin, HR)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,human_resource')->group(function () {
        // Employees
        // Route::apiResource('employees', EmployeeController::class);
    });
});
