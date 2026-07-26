<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\SystemSettingController;
use App\Http\Controllers\Procurement\PurchaseOrderController;
use App\Http\Controllers\Procurement\SupplierController;
use App\Http\Controllers\Procurement\JobOrderController;
use App\Http\Controllers\Procurement\WorkOrderController;
use App\Http\Controllers\Travel\CustomerController;
use App\Http\Controllers\Travel\CustomerPassportController;
use App\Http\Controllers\Travel\CustomerVisaController;
use App\Http\Controllers\Travel\CustomerKycController;
use App\Http\Controllers\Travel\AgentTaskController;
use App\Http\Controllers\Travel\PassengerController;
use App\Http\Controllers\Travel\PassportCaseController;
use App\Http\Controllers\Travel\LegalDocumentController;
use App\Http\Controllers\Fleet\BusController;
use App\Http\Controllers\Procurement\AccreditationController;
use App\Http\Controllers\Admin\RolePermissionController;
use App\Http\Controllers\Inventory\InventoryController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Procurement\ProcurementDocumentController;
use App\Http\Controllers\CommissionController;
use App\Http\Controllers\TripTicketController;
use App\Http\Controllers\CashBudgetRequestController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PayrollController;

Route::middleware(['auth:sanctum', 'enforce.password.change', 'verify.2fa'])->group(function () {
    // ADMINISTRATION — Audit Logs (dynamic permissions)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,admin:view')->group(function () {
        Route::get('/audit-logs/stats',  [AuditLogController::class, 'stats'])->name('audit-logs.stats');
        Route::get('/audit-logs/export', [AuditLogController::class, 'export'])->name('audit-logs.export');
        Route::get('/audit-logs',        [AuditLogController::class, 'index'])->name('audit-logs.index');
    });

    // ──────────────────────────────────────
    // SUPER ADMIN EXCLUSIVE
    // ──────────────────────────────────────
    Route::get('/ping', fn () => response()->json(['pong' => true, 'time' => microtime(true)]));

    Route::middleware(['auth:sanctum', 'role:super_admin'])->group(function () {
        Route::post('/admin/settings/landing-page', [SystemSettingController::class, 'updateLandingPageSettings'])->name('settings.landing-page.update');
        // Super Admin can directly set a specific password for any user
        Route::patch('/users/{user}/set-password', [UserController::class, 'setPassword'])->name('users.set-password');

        // Role Permissions Management (Super Admin only)
        Route::get('/role-permissions',              [RolePermissionController::class, 'index'])->name('role-permissions.index');
        Route::get('/role-permissions/{role}',        [RolePermissionController::class, 'show'])->name('role-permissions.show');
        Route::put('/role-permissions/{role}',        [RolePermissionController::class, 'update'])->name('role-permissions.update');
        Route::post('/role-permissions/{role}/reset', [RolePermissionController::class, 'reset'])->name('role-permissions.reset');

        // Named Abilities Management (roadmap 2.3 — Super Admin only)
        Route::get('/role-abilities',        [RolePermissionController::class, 'abilities'])->name('role-abilities.index');
        Route::put('/role-abilities/{role}', [RolePermissionController::class, 'updateAbilities'])->name('role-abilities.update');
    });

    // ──────────────────────────────────────
    // DASHBOARD AGGREGATIONS (role-specific)
    // ──────────────────────────────────────
    Route::prefix('dashboards')->group(function () {
        Route::get('/admin', [DashboardController::class, 'admin'])->name('dashboards.admin');
        Route::get('/accounting', [DashboardController::class, 'accounting'])->name('dashboards.accounting');
        Route::get('/agent', [DashboardController::class, 'agent'])->name('dashboards.agent');
        Route::get('/driver', [DashboardController::class, 'driver'])->name('dashboards.driver');
        Route::get('/hr', [DashboardController::class, 'hr'])->name('dashboards.hr');
        
        Route::get('/approvals', [DashboardController::class, 'approvals'])->name('dashboards.approvals');

        // ── Widget endpoints (header widget panel) ──
        Route::prefix('widgets')->group(function () {
            Route::get('/approvals', [DashboardController::class, 'widgetApprovals'])->name('dashboards.widgets.approvals');
            Route::get('/tasks',     [DashboardController::class, 'widgetTasks'])->name('dashboards.widgets.tasks');
            Route::get('/revenue',   [DashboardController::class, 'widgetRevenue'])->name('dashboards.widgets.revenue');
            Route::get('/fleet',     [DashboardController::class, 'widgetFleet'])->name('dashboards.widgets.fleet');
        });
    });
});

