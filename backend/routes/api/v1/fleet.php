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
    // FLEET (now under Logistics)
    // ──────────────────────────────────────
    // Drivers can read buses (for My Fleet page)
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,logistics_in_charge,dispatcher,purchasing_manager,head_mechanic,service_adviser,driver,reservation_officer,office_staff,accounting_executive,corporate_secretary,logistics:view')->group(function () {
        Route::get('buses',               [BusController::class, 'index'])->name('buses.index');
        Route::get('buses/{bus}',          [BusController::class, 'show'])->name('buses.show');
        Route::get('buses/{bus}/calendar', [BusController::class, 'calendar'])->name('buses.calendar');
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

});
