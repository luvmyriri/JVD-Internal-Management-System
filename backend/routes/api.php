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
use App\Http\Controllers\Travel\CustomerPassportController;
use App\Http\Controllers\Travel\CustomerVisaController;
use App\Http\Controllers\Travel\CustomerKycController;
use App\Http\Controllers\Travel\AgentTaskController;
use App\Http\Controllers\Fleet\BusController;
use App\Http\Controllers\Procurement\AccreditationController;
use App\Http\Controllers\Inventory\InventoryController;
use App\Http\Controllers\Auth\ProfileController;

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
    Route::post('/set-password', [AuthController::class, 'setPassword'])->name('auth.set-password');
});

// Public KYC route
Route::get('/accreditations/{accreditation}/verify-token', [App\Http\Controllers\Procurement\AccreditationController::class, 'verifyToken'])->name('accreditations.verify-token');
Route::post('/accreditations/{accreditation}/submit-kyc', [App\Http\Controllers\Procurement\AccreditationController::class, 'submitKyc'])->name('accreditations.submit-kyc');
Route::post('/accreditations/{accreditation}/submit-kyc/upload/{type}', [App\Http\Controllers\Procurement\AccreditationController::class, 'uploadDocumentPublic'])->name('accreditations.submit-kyc.upload');

// Public settings route
Route::get('/public/settings', [SystemSettingController::class, 'getPublicSettings'])->name('settings.public');

// ──────────────────────────────────────────
// AUTHENTICATED routes (Sanctum + password-change enforcement)
// ──────────────────────────────────────────
Route::middleware(['auth:sanctum', 'enforce.password.change'])->group(function () {

    // Auth session management
    // NOTE: change-password and logout bypass EnforcePasswordChange middleware by route name
    Route::prefix('auth')->group(function () {
        Route::get('/me',              [AuthController::class, 'me'])->name('auth.me');
        Route::post('/logout',         [AuthController::class, 'logout'])->name('auth.logout');
        Route::post('/change-password',[AuthController::class, 'changePassword'])->name('auth.change-password');
        
        // Profile Management
        Route::put('/profile',         [ProfileController::class, 'update'])->name('auth.profile.update');
        Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('auth.profile.avatar');
    });

    // Notifications Management
    Route::prefix('notifications')->group(function () {
        Route::get('/',                 [\App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
        Route::post('/mark-all-read',   [\App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
        Route::put('/{id}/read',        [\App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.read');
        Route::delete('/{id}',          [\App\Http\Controllers\NotificationController::class, 'destroy'])->name('notifications.destroy');
        Route::delete('/',              [\App\Http\Controllers\NotificationController::class, 'clearAll'])->name('notifications.clear-all');
        Route::post('/simulate',        [\App\Http\Controllers\NotificationController::class, 'simulate'])->name('notifications.simulate');
    });


    // ──────────────────────────────────────
    // ADMINISTRATION (Super Admin + Admin + HR)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,human_resource')->group(function () {

        // Audit Logs (read-only)
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    });

    // ──────────────────────────────────────
    // PROCUREMENT — Suppliers
    // (Super Admin, Admin, Accounting)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,accounting')->group(function () {
        Route::apiResource('suppliers', SupplierController::class)->except(['destroy']);
        // Supplier cross-check / counter-check verification (boss-mandated)
        Route::post('/suppliers/{supplier}/verify', [SupplierController::class, 'verify'])->name('suppliers.verify');
        Route::post('/suppliers/{supplier}/blacklist', [SupplierController::class, 'blacklist'])->name('suppliers.blacklist');
    });

    // ──────────────────────────────────────
    // PROCUREMENT — Purchase Orders
    // (Super Admin, Admin, Accounting, Agent)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,accounting,agent')->group(function () {
        Route::get('/procurement/overview', [\App\Http\Controllers\Procurement\OverviewController::class, 'getStats'])->name('procurement.overview');
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
    // PMS WORK ORDER APPROVAL
    // Designated employee approves/rejects auto-generated WOs
    // before any maintenance work proceeds (boss-mandated)
    // (Super Admin, Admin — designated approvers)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::post('/work-orders/{workOrder}/approve', [WorkOrderController::class, 'approve'])->name('work-orders.approve');
        Route::post('/work-orders/{workOrder}/reject',  [WorkOrderController::class, 'reject'])->name('work-orders.reject');
    });

    // Mechanics can REQUEST a Work Order (but not approve)
    Route::middleware('role:mechanic,super_admin,admin,agent')->group(function () {
        Route::post('/work-orders/request', [WorkOrderController::class, 'store'])->name('work-orders.request');
    });

    // ──────────────────────────────────────
    // TRAVEL — Customers, Passengers, Passport Cases
    // (Super Admin, Admin, Agent)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,agent')->group(function () {
        Route::apiResource('customers',      CustomerController::class)->except(['destroy']);
        Route::get('/customers/{customer}/passports', [CustomerPassportController::class, 'index']);
        Route::post('/customers/{customer}/passports', [CustomerPassportController::class, 'store']);
        Route::delete('/customers/{customer}/passports/{passport}', [CustomerPassportController::class, 'destroy']);
        
        Route::get('/customers/{customer}/visas', [CustomerVisaController::class, 'index']);
        Route::post('/customers/{customer}/visas', [CustomerVisaController::class, 'store']);
        Route::delete('/customers/{customer}/visas/{visa}', [CustomerVisaController::class, 'destroy']);
        
        Route::get('/customers/{customer}/kycs', [CustomerKycController::class, 'index']);
        Route::post('/customers/{customer}/kycs', [CustomerKycController::class, 'store']);
        Route::delete('/customers/{customer}/kycs/{kyc}', [CustomerKycController::class, 'destroy']);
        
        Route::get('/customers/{customer}/tasks', [AgentTaskController::class, 'index']);
        Route::post('/customers/{customer}/tasks', [AgentTaskController::class, 'store']);
        Route::put('/customers/{customer}/tasks/{task}', [AgentTaskController::class, 'update']);
        Route::delete('/customers/{customer}/tasks/{task}', [AgentTaskController::class, 'destroy']);

        Route::post('/customers/{customer}/send-email', [App\Http\Controllers\Travel\CustomerEmailController::class, 'send']);

        Route::apiResource('passengers',     PassengerController::class)->except(['destroy']);
        Route::apiResource('passport-cases', PassportCaseController::class)->except(['destroy']);
        Route::patch('/passport-cases/{passportCase}/status',    [PassportCaseController::class, 'updateStatus'])->name('passport-cases.status');
        Route::patch('/passport-cases/{passportCase}/checklist', [PassportCaseController::class, 'updateChecklist'])->name('passport-cases.checklist');
        // Legal Documents
        Route::get('/legal-documents',            [LegalDocumentController::class, 'index']);
        Route::post('/legal-documents',           [LegalDocumentController::class, 'store']);
        Route::delete('/legal-documents/{legalDocument}', [LegalDocumentController::class, 'destroy']);
    });

    // ──────────────────────────────────────
    // FLEET & ACCREDITATIONS
    // (Super Admin, Admin)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::apiResource('buses',          BusController::class)->except(['destroy']);
        
        Route::post('/accreditations/{accreditation}/generate-kyc', [AccreditationController::class, 'generateKycLink'])->name('accreditations.generate-kyc');
        Route::post('/accreditations/{accreditation}/documents/{type}', [AccreditationController::class, 'uploadDocument'])->name('accreditations.upload-document');
        Route::apiResource('accreditations', AccreditationController::class)->except(['destroy']);
    });

    // ──────────────────────────────────────
    // INVENTORY
    // (Super Admin, Admin, Agent)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,agent')->group(function () {
        Route::apiResource('inventory', InventoryController::class)->except(['destroy']);
    });

    // ──────────────────────────────────────
    // ACCOUNTING (Super Admin, Accounting)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,accounting')->group(function () {
        // POS / Billing / Reports
        Route::get('/billing/services', [App\Http\Controllers\Accounting\BillingController::class, 'getServices'])->name('billing.services');
        Route::post('/billing/services', [App\Http\Controllers\Accounting\BillingController::class, 'storeService'])->name('billing.services.store');
        Route::put('/billing/services/{id}', [App\Http\Controllers\Accounting\BillingController::class, 'updateService'])->name('billing.services.update');
        Route::delete('/billing/services/{id}', [App\Http\Controllers\Accounting\BillingController::class, 'deleteService'])->name('billing.services.delete');
        Route::patch('/billing/{billing}/status', [App\Http\Controllers\Accounting\BillingController::class, 'updateStatus'])->name('billing.status.update');
        Route::get('/billing/reports/summary', [App\Http\Controllers\Accounting\ReportController::class, 'getSummary'])->name('billing.reports.summary');
        Route::get('/billing/reports/detailed', [App\Http\Controllers\Accounting\ReportController::class, 'getDetailed'])->name('billing.reports.detailed');
        Route::apiResource('billing', App\Http\Controllers\Accounting\BillingController::class);
    });

    // ──────────────────────────────────────
    // HR (Super Admin, Admin, HR)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,admin,human_resource')->group(function () {
        // User/Employee Management
        Route::apiResource('users', UserController::class)->except(['destroy']);
        Route::post('/users/{user}/deactivate',    [UserController::class, 'deactivate'])->name('users.deactivate');
        Route::post('/users/{user}/activate',       [UserController::class, 'activate'])->name('users.activate');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    });

    // Super Admin exclusive configurations
    Route::middleware('role:super_admin')->group(function () {
        Route::post('/admin/settings/landing-page', [SystemSettingController::class, 'updateLandingPageSettings'])->name('settings.landing-page.update');
    });
});
