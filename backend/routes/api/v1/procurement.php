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
    Route::apiResource('procurement-documents', ProcurementDocumentController::class);
    Route::apiResource('document-categories', App\Http\Controllers\Procurement\DocumentCategoryController::class)->except(['create', 'edit', 'show']);

    // ──────────────────────────────────────
    // PROCUREMENT — Suppliers & Documents
    // (dynamic permissions via procurement module)
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,purchasing_manager,dispatcher,service_adviser,procurement:view')->group(function () {
        Route::apiResource('suppliers', SupplierController::class);
        // Supplier cross-check / counter-check verification (boss-mandated)
        Route::post('/suppliers/{supplier}/verify', [SupplierController::class, 'verify'])->name('suppliers.verify');
        Route::post('/suppliers/{supplier}/blacklist', [SupplierController::class, 'blacklist'])->name('suppliers.blacklist');
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
    // INVENTORY (dynamic permissions)
    // ──────────────────────────────────────
    // C-01: read endpoints gated by inventory:view; write endpoints require create/edit
    // so a view-only role can no longer create or modify inventory items.
    Route::middleware('role:super_admin,executive_vice_president,purchasing_manager,inventory:view')->group(function () {
        Route::get('inventory',          [InventoryController::class, 'index'])->name('inventory.index');
        Route::get('inventory/{inventory}', [InventoryController::class, 'show'])->name('inventory.show');
    });
    Route::middleware('role:super_admin,executive_vice_president,purchasing_manager,inventory:create')->group(function () {
        Route::post('inventory',         [InventoryController::class, 'store'])->name('inventory.store');
    });
    Route::middleware('role:super_admin,executive_vice_president,purchasing_manager,inventory:edit')->group(function () {
        Route::put('inventory/{inventory}',   [InventoryController::class, 'update'])->name('inventory.update');
        Route::patch('inventory/{inventory}', [InventoryController::class, 'update']);
    });

    // ──────────────────────────────────────

});
