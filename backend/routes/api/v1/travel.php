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
    // OPERATIONS & TRAVEL — Customers, Passengers, Passport Cases
    // (dynamic permissions via operations / travel modules)
    // ──────────────────────────────────────
    // C-03: travel read/write are split by permission action so a view-only role can no
    // longer create/edit/delete. The hardcoded roles are retained in every group, so
    // role-based access is unchanged — only the dynamic-permission bypass is closed.

    // ── Travel READ (travel:view) ──
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,reservation_officer,office_staff,corporate_secretary,travel:view')->group(function () {
        Route::get('/customers',             [CustomerController::class, 'index'])->name('customers.index');
        Route::get('/customers/{customer}',  [CustomerController::class, 'show'])->name('customers.show');
        Route::get('/customers/{customer}/passports', [CustomerPassportController::class, 'index']);
        Route::get('/customers/{customer}/visas', [CustomerVisaController::class, 'index']);
        Route::get('/customers/{customer}/kycs', [CustomerKycController::class, 'index']);
        Route::get('/customers/{customer}/tasks', [AgentTaskController::class, 'index']);

        Route::get('/passengers',                  [PassengerController::class, 'index'])->name('passengers.index');
        Route::get('/passengers/{passenger}',      [PassengerController::class, 'show'])->name('passengers.show');

        Route::get('/passport-cases',                  [PassportCaseController::class, 'index'])->name('passport-cases.index');
        Route::get('/passport-cases/{passportCase}',   [PassportCaseController::class, 'show'])->name('passport-cases.show');
        Route::get('/passport-cases/{passportCase}/audit-logs',  [PassportCaseController::class, 'auditLogs'])->name('passport-cases.audit-logs');
        Route::get('/passport-cases/{passportCase}/documents',   [PassportCaseController::class, 'getDocuments'])->name('passport-cases.documents.index');

        // Read-only lookup of external visa requirements (POST for payload, but non-mutating).
        Route::post('/visa/requirements', [App\Http\Controllers\Travel\VisaRequirementController::class, 'getRequirements'])->name('visa.requirements');

        Route::get('/legal-documents',            [LegalDocumentController::class, 'index']);
    });

    // ── Travel CREATE (travel:create) ──
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,reservation_officer,office_staff,corporate_secretary,travel:create')->group(function () {
        Route::post('/customers',            [CustomerController::class, 'store'])->name('customers.store');
        Route::post('/customers/{customer}/passports', [CustomerPassportController::class, 'store']);
        Route::post('/customers/{customer}/visas', [CustomerVisaController::class, 'store']);
        Route::post('/customers/{customer}/kycs', [CustomerKycController::class, 'store']);
        Route::post('/customers/{customer}/tasks', [AgentTaskController::class, 'store']);
        Route::post('/customers/{customer}/send-email', [App\Http\Controllers\Travel\CustomerEmailController::class, 'send']);

        Route::post('/passengers',           [PassengerController::class, 'store'])->name('passengers.store');
        Route::post('/passport-cases',       [PassportCaseController::class, 'store'])->name('passport-cases.store');
        Route::post('/passport-cases/{passportCase}/documents',  [PassportCaseController::class, 'uploadDocument'])->name('passport-cases.documents.store');
        Route::post('/passport-cases/{passportCase}/request-documents', [PassportCaseController::class, 'sendDocumentRequest'])->name('passport-cases.request-documents');

        Route::post('/legal-documents',      [LegalDocumentController::class, 'store']);
    });

    // ── Travel EDIT (travel:edit) ──
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,reservation_officer,office_staff,corporate_secretary,travel:edit')->group(function () {
        Route::match(['put', 'patch'], '/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
        Route::put('/customers/{customer}/tasks/{task}', [AgentTaskController::class, 'update']);

        Route::match(['put', 'patch'], '/passengers/{passenger}', [PassengerController::class, 'update'])->name('passengers.update');
        Route::match(['put', 'patch'], '/passport-cases/{passportCase}', [PassportCaseController::class, 'update'])->name('passport-cases.update');
        Route::patch('/passport-cases/{passportCase}/status',    [PassportCaseController::class, 'updateStatus'])->name('passport-cases.status');
        Route::patch('/passport-cases/{passportCase}/checklist', [PassportCaseController::class, 'updateChecklist'])->name('passport-cases.checklist');
    });

    // ── Travel DELETE (travel:delete) ──
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,reservation_officer,office_staff,corporate_secretary,travel:delete')->group(function () {
        Route::delete('/customers/{customer}/passports/{passport}', [CustomerPassportController::class, 'destroy']);
        Route::delete('/customers/{customer}/visas/{visa}', [CustomerVisaController::class, 'destroy']);
        Route::delete('/customers/{customer}/kycs/{kyc}', [CustomerKycController::class, 'destroy']);
        Route::delete('/customers/{customer}/tasks/{task}', [AgentTaskController::class, 'destroy']);
        Route::delete('/passport-cases/{passportCase}/documents/{documentId}', [PassportCaseController::class, 'deleteDocument'])->name('passport-cases.documents.destroy');
        Route::delete('/legal-documents/{legalDocument}', [LegalDocumentController::class, 'destroy']);
    });

    // ──────────────────────────────────────

});
