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

/*
|--------------------------------------------------------------------------
| API Routes — JVD Internal Management System
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api automatically by Laravel.
| Middleware groups follow the RBAC matrix from Architecture § 3.
| Dynamic permissions are managed via role_permissions table.
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

    // Chat Users Directory (accessible to all authenticated roles)
    Route::get('/chat/users', [UserController::class, 'chatUsers'])->name('users.chat');

    // Chat Routing
    Route::prefix('chat')->group(function () {
        Route::get('/messages', [App\Http\Controllers\ChatController::class, 'index'])->name('chat.messages');
        Route::post('/messages', [App\Http\Controllers\ChatController::class, 'sendMessage'])->name('chat.messages.send');
        Route::post('/groups', [App\Http\Controllers\ChatController::class, 'createGroup'])->name('chat.groups.create');
        Route::post('/read', [App\Http\Controllers\ChatController::class, 'markAsRead'])->name('chat.read');
        Route::delete('/conversation', [App\Http\Controllers\ChatController::class, 'deleteConversation'])->name('chat.conversation.delete');
    });


    // ──────────────────────────────────────
    // ADMINISTRATION — Audit Logs (dynamic permissions)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,admin:view')->group(function () {
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    });

    // ──────────────────────────────────────
    // PROCUREMENT — Suppliers & Documents
    // (dynamic permissions via procurement module)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,purchasing_manager,dispatcher,service_adviser,procurement:view')->group(function () {
        Route::apiResource('suppliers', SupplierController::class);
        // Supplier cross-check / counter-check verification (boss-mandated)
        Route::post('/suppliers/{supplier}/verify', [SupplierController::class, 'verify'])->name('suppliers.verify');
        Route::post('/suppliers/{supplier}/blacklist', [SupplierController::class, 'blacklist'])->name('suppliers.blacklist');
        Route::apiResource('procurement-documents', ProcurementDocumentController::class);
    });

    // ──────────────────────────────────────
    // PROCUREMENT — Purchase Orders
    // (dynamic permissions via procurement module)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,purchasing_manager,dispatcher,service_adviser,accounting_executive,procurement:view')->group(function () {
        Route::get('/procurement/overview', [\App\Http\Controllers\Procurement\OverviewController::class, 'getStats'])->name('procurement.overview');
        Route::apiResource('purchase-orders', PurchaseOrderController::class)->except(['destroy', 'update']);
        Route::post('/purchase-orders/{purchaseOrder}/submit',  [PurchaseOrderController::class, 'submit'])->name('purchase-orders.submit');
        Route::post('/purchase-orders/{purchaseOrder}/verify',  [PurchaseOrderController::class, 'verify'])->name('purchase-orders.verify');
        Route::post('/purchase-orders/{purchaseOrder}/approve', [PurchaseOrderController::class, 'approve'])->name('purchase-orders.approve');
    });

    // ──────────────────────────────────────
    // OPERATIONS — Job Orders, Work Orders, Trip Tickets, Cash Budgets, Commissions
    // (dynamic permissions via operations / logistics / accounting modules)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,dispatcher,service_adviser,logistics_in_charge,purchasing_manager,accounting_executive,driver')->group(function () {
        Route::apiResource('job-orders',  JobOrderController::class)->except(['destroy']);
        Route::post('/job-orders/{jobOrder}/generate-purchase-order', [JobOrderController::class, 'generatePurchaseOrder'])->name('job-orders.generate-po');
        Route::apiResource('work-orders', WorkOrderController::class)->except(['destroy']);
        Route::apiResource('commissions', CommissionController::class);
        Route::apiResource('trip-tickets', TripTicketController::class);
        Route::apiResource('cash-budgets', CashBudgetRequestController::class);
    });

    // ──────────────────────────────────────
    // COLLECTIONS / FINANCE
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,accounting_executive,accounting:view')->group(function () {
        Route::post('/collections/{collection}/confirm', [CollectionController::class, 'confirm'])->name('collections.confirm');
        Route::post('/collections/{collection}/add-payment', [CollectionController::class, 'addPayment'])->name('collections.add-payment');
        Route::patch('/collections/{collection}/remarks', [CollectionController::class, 'updateRemarks'])->name('collections.update-remarks');
        Route::post('/collections/{collection}/send-soa', [CollectionController::class, 'sendSoaNotification'])->name('collections.send-soa');
        Route::get('/collections/{collection}/view-soa', [CollectionController::class, 'viewSoa'])->name('collections.view-soa');
        Route::get('/collections/{collection}/download-soa', [CollectionController::class, 'downloadSoa'])->name('collections.download-soa');
        Route::apiResource('collections', CollectionController::class);
    });

    // ──────────────────────────────────────
    // PMS WORK ORDER APPROVAL
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,logistics_in_charge,head_mechanic,service_adviser')->group(function () {
        Route::post('/work-orders/{workOrder}/approve', [WorkOrderController::class, 'approve'])->name('work-orders.approve');
        Route::post('/work-orders/{workOrder}/reject',  [WorkOrderController::class, 'reject'])->name('work-orders.reject');
        Route::post('/work-orders/{workOrder}/generate-job-order', [WorkOrderController::class, 'generateJobOrder'])->name('work-orders.generate-jo');
    });

    // Drivers, Mechanics, Dispatchers can REQUEST a Work Order (but not approve)
    Route::middleware('role:super_admin,executive_vice_president,head_mechanic,dispatcher,service_adviser,driver')->group(function () {
        Route::post('/work-orders/request', [WorkOrderController::class, 'store'])->name('work-orders.request');
    });

    // ──────────────────────────────────────
    // OPERATIONS & TRAVEL — Customers, Passengers, Passport Cases
    // (dynamic permissions via operations / travel modules)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,reservation_officer,office_staff,corporate_secretary,travel:view')->group(function () {
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
        Route::get('/passport-cases/{passportCase}/audit-logs',  [PassportCaseController::class, 'auditLogs'])->name('passport-cases.audit-logs');
        // Legal Documents
        Route::get('/legal-documents',            [LegalDocumentController::class, 'index']);
        Route::post('/legal-documents',           [LegalDocumentController::class, 'store']);
        Route::delete('/legal-documents/{legalDocument}', [LegalDocumentController::class, 'destroy']);
    });

    // ──────────────────────────────────────
    // FLEET (now under Logistics)
    // ──────────────────────────────────────
    // Drivers can read buses (for My Fleet page)
    Route::middleware('role:super_admin,executive_vice_president,logistics_in_charge,dispatcher,purchasing_manager,head_mechanic,service_adviser,driver,logistics:view')->group(function () {
        Route::get('buses',       [BusController::class, 'index'])->name('buses.index');
        Route::get('buses/{bus}', [BusController::class, 'show'])->name('buses.show');
    });
    Route::middleware('role:super_admin,executive_vice_president,logistics_in_charge')->group(function () {
        Route::post('buses',           [BusController::class, 'store'])->name('buses.store');
        Route::put('buses/{bus}',      [BusController::class, 'update'])->name('buses.update');
    });

    // Allow Corporate Secretary to assign drivers via patch
    Route::middleware('role:super_admin,executive_vice_president,corporate_secretary')->group(function () {
        Route::patch('buses/{bus}',    [BusController::class, 'update']);
    });

    // ──────────────────────────────────────
    // ACCREDITATIONS (now under Operations)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,reservation_officer,office_staff,corporate_secretary,operations:view')->group(function () {
        Route::post('/accreditations/{accreditation}/generate-kyc', [AccreditationController::class, 'generateKycLink'])->name('accreditations.generate-kyc');
        Route::post('/accreditations/{accreditation}/documents/{type}', [AccreditationController::class, 'uploadDocument'])->name('accreditations.upload-document');
        Route::apiResource('accreditations', AccreditationController::class);
    });

    // ──────────────────────────────────────
    // INVENTORY (dynamic permissions)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,purchasing_manager,inventory:view')->group(function () {
        Route::apiResource('inventory', InventoryController::class)->except(['destroy']);
    });

    // ──────────────────────────────────────
    // ACCOUNTING (dynamic permissions)
    // ──────────────────────────────────────
    
    // Webhook for PayMongo (no auth required)
    Route::post('/billing/webhook', [App\Http\Controllers\Accounting\BillingController::class, 'handleWebhook'])->name('billing.webhook')->withoutMiddleware('auth:sanctum');

    Route::middleware('role:super_admin,executive_vice_president,accounting_executive,reservation_officer,office_staff,accounting:view')->group(function () {
        // Billing / Reports / Sales
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
    // HR (dynamic permissions)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,corporate_secretary,hr:view')->group(function () {
        // User/Employee Management
        Route::apiResource('users', UserController::class)->except(['destroy']);
        Route::post('/users/{user}/deactivate',    [UserController::class, 'deactivate'])->name('users.deactivate');
        Route::post('/users/{user}/activate',       [UserController::class, 'activate'])->name('users.activate');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
        
        // HR Entities
        Route::apiResource('job-applications', \App\Http\Controllers\JobApplicationController::class);
        Route::apiResource('internships', \App\Http\Controllers\InternshipController::class);
    });

    // ──────────────────────────────────────
    // SUPER ADMIN EXCLUSIVE
    // ──────────────────────────────────────
    Route::get('/ping', fn () => response()->json(['pong' => true, 'time' => microtime(true)]));

    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/admin/settings/landing-page', [SystemSettingController::class, 'updateLandingPageSettings'])->name('settings.landing-page.update');
        // Super Admin can directly set a specific password for any user
        Route::patch('/users/{user}/set-password', [UserController::class, 'setPassword'])->name('users.set-password');

        // Role Permissions Management (Super Admin only)
        Route::get('/role-permissions',              [RolePermissionController::class, 'index'])->name('role-permissions.index');
        Route::get('/role-permissions/{role}',        [RolePermissionController::class, 'show'])->name('role-permissions.show');
        Route::put('/role-permissions/{role}',        [RolePermissionController::class, 'update'])->name('role-permissions.update');
        Route::post('/role-permissions/{role}/reset', [RolePermissionController::class, 'reset'])->name('role-permissions.reset');
    });

    // ──────────────────────────────────────
    // DASHBOARD AGGREGATIONS (role-specific)
    // ──────────────────────────────────────
    Route::prefix('dashboards')->group(function () {
        Route::get('/admin',      [DashboardController::class, 'admin'])
            ->middleware('role:super_admin,executive_vice_president,operations_manager')->name('dashboards.admin');
        Route::get('/accounting', [DashboardController::class, 'accounting'])
            ->middleware('role:super_admin,executive_vice_president,accounting_executive')->name('dashboards.accounting');
        Route::get('/agent',      [DashboardController::class, 'agent'])
            ->middleware('role:super_admin,executive_vice_president,reservation_officer,office_staff')->name('dashboards.agent');
        Route::get('/driver',     [DashboardController::class, 'driver'])
            ->middleware('role:super_admin,executive_vice_president,driver')->name('dashboards.driver');
        Route::get('/hr',         [DashboardController::class, 'hr'])
            ->middleware('role:super_admin,executive_vice_president,operations_manager,corporate_secretary')->name('dashboards.hr');
    });
});

