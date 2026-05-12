<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Procurement\PurchaseOrderController;
use App\Http\Controllers\Procurement\SupplierController;
use App\Http\Controllers\Procurement\JobOrderController;
use App\Http\Controllers\Procurement\WorkOrderController;

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
    Route::post('/login',      [AuthController::class, 'login'])->name('auth.login');
    Route::post('/2fa/verify', [AuthController::class, 'verify2FA'])->name('auth.2fa.verify');
    Route::post('/2fa/setup',  [AuthController::class, 'confirmSetup'])->name('auth.2fa.setup');
});

// ──────────────────────────────────────────
// AUTHENTICATED routes (Sanctum token required)
// ──────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth session management
    Route::prefix('auth')->group(function () {
        Route::get('/me',       [AuthController::class, 'me'])->name('auth.me');
        Route::post('/logout',  [AuthController::class, 'logout'])->name('auth.logout');
    });

    // ──────────────────────────────────────
    // ADMINISTRATION (Super Admin + Admin)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin')->group(function () {

        // User Management
        Route::apiResource('users', UserController::class)->except(['destroy']);
        Route::post('/users/{user}/deactivate',     [UserController::class, 'deactivate'])->name('users.deactivate');
        Route::post('/users/{user}/activate',        [UserController::class, 'activate'])->name('users.activate');
        Route::post('/users/{user}/reset-password',  [UserController::class, 'resetPassword'])->name('users.reset-password');

        // Audit Logs (read-only)
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    });

    // ──────────────────────────────────────
    // PROCUREMENT — Suppliers
    // (Super Admin, Admin, Accounting)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,accounting')->group(function () {
        Route::apiResource('suppliers', SupplierController::class)->except(['destroy']);
    });

    // ──────────────────────────────────────
    // PROCUREMENT — Purchase Orders
    // (Super Admin, Admin, Accounting, Agent)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,accounting,agent')->group(function () {
        Route::apiResource('purchase-orders', PurchaseOrderController::class)->except(['destroy', 'update']);
        Route::post('/purchase-orders/{purchaseOrder}/submit',  [PurchaseOrderController::class, 'submit'])->name('purchase-orders.submit');
        Route::post('/purchase-orders/{purchaseOrder}/verify',  [PurchaseOrderController::class, 'verify'])->name('purchase-orders.verify');
        Route::post('/purchase-orders/{purchaseOrder}/approve', [PurchaseOrderController::class, 'approve'])->name('purchase-orders.approve');
    });

    // ──────────────────────────────────────
    // OPERATIONS — Job Orders & Work Orders
    // (Super Admin, Admin, Agent)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,agent')->group(function () {
        Route::apiResource('job-orders',  JobOrderController::class)->except(['destroy']);
        Route::apiResource('work-orders', WorkOrderController::class)->except(['destroy']);
    });

    // ──────────────────────────────────────
    // TRAVEL (Super Admin, Admin, Agent)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,agent')->group(function () {
        // Customers & Passengers
        Route::apiResource('customers', App\Http\Controllers\Travel\CustomerController::class);
    });

    // ──────────────────────────────────────
    // ACCOUNTING (Super Admin, Accounting)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,accounting')->group(function () {
        // POS / Billing / Reports
        Route::get('/billing/services', [App\Http\Controllers\Accounting\BillingController::class, 'getServices'])->name('billing.services');
        Route::post('/billing/services', [App\Http\Controllers\Accounting\BillingController::class, 'storeService'])->name('billing.services.store');
        Route::apiResource('billing', App\Http\Controllers\Accounting\BillingController::class);
    });

    // ──────────────────────────────────────
    // HR (Super Admin, Admin, HR)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,human_resource')->group(function () {
        // Employees — to be implemented
    });
});


