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
    // OPERATIONS — Job Orders, Work Orders, Trip Tickets, Cash Budgets, Commissions
    // (dynamic permissions via operations / logistics / accounting modules)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,dispatcher,service_adviser,logistics_in_charge,purchasing_manager,accounting_executive,driver')->group(function () {
        Route::get('/job-orders/available-supplies', [JobOrderController::class, 'availableSupplies'])->name('job-orders.available-supplies');
        Route::apiResource('job-orders',  JobOrderController::class)->except(['destroy']);
        Route::post('/job-orders/{jobOrder}/generate-purchase-order', [JobOrderController::class, 'generatePurchaseOrder'])->name('job-orders.generate-po');
        Route::get('/job-orders/{jobOrder}/check-supplies', [JobOrderController::class, 'checkSupplies'])->name('job-orders.check-supplies');
        Route::apiResource('work-orders', WorkOrderController::class)->except(['destroy']);
        Route::apiResource('commissions', CommissionController::class);
        Route::apiResource('trip-tickets', TripTicketController::class)->except(['index', 'show']);
        Route::apiResource('cash-budgets', CashBudgetRequestController::class);
    });

    // Read trip tickets & check conflict (accessible to all authenticated roles for dashboards and calendars)
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,dispatcher,service_adviser,logistics_in_charge,purchasing_manager,accounting_executive,driver,reservation_officer,office_staff,corporate_secretary')->group(function () {
        Route::get('/trip-tickets/check-conflict', [TripTicketController::class, 'checkConflict'])->name('trip-tickets.check-conflict');
        Route::get('/trip-tickets', [TripTicketController::class, 'index'])->name('trip-tickets.index');
        Route::get('/trip-tickets/{trip_ticket}', [TripTicketController::class, 'show'])->name('trip-tickets.show');
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
    // ACCREDITATIONS (now under Operations)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,reservation_officer,office_staff,corporate_secretary,operations:view')->group(function () {
        Route::post('/accreditations/{accreditation}/generate-kyc', [AccreditationController::class, 'generateKycLink'])->name('accreditations.generate-kyc');
        Route::post('/accreditations/{accreditation}/documents/{type}', [AccreditationController::class, 'uploadDocument'])->name('accreditations.upload-document');
        Route::apiResource('accreditations', AccreditationController::class);
    });

    // ──────────────────────────────────────

});
