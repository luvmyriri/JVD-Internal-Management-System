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
use App\Http\Controllers\Accounting\FinancialReadinessController;

Route::middleware(['auth:sanctum', 'enforce.password.change', 'verify.2fa'])->group(function () {
    // COLLECTIONS / FINANCE
    // ──────────────────────────────────────
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,accounting_executive,accounting:view')->group(function () {
        Route::post('/collections/{collection}/confirm', [CollectionController::class, 'confirm'])->name('collections.confirm');
        Route::post('/collections/{collection}/add-payment', [CollectionController::class, 'addPayment'])->name('collections.add-payment');
        Route::patch('/collections/{collection}/remarks', [CollectionController::class, 'updateRemarks'])->name('collections.update-remarks');
        Route::post('/collections/{collection}/send-soa', [CollectionController::class, 'sendSoaNotification'])->name('collections.send-soa');
        Route::get('/collections/{collection}/view-soa', [CollectionController::class, 'viewSoa'])->name('collections.view-soa');
        Route::get('/collections/{collection}/download-soa', [CollectionController::class, 'downloadSoa'])->name('collections.download-soa');
        Route::post('/collections/{collection}/cancel-refund', [CollectionController::class, 'cancelAndRefund'])->name('collections.cancel-refund');
        Route::apiResource('collections', CollectionController::class);
    });

    // ──────────────────────────────────────
    // ACCOUNTING (dynamic permissions)
    // ──────────────────────────────────────
    
    // Webhook for PayMongo (no auth required)
    Route::post('/billing/webhook', [App\Http\Controllers\Accounting\BillingController::class, 'handleWebhook'])->name('billing.webhook')->withoutMiddleware('auth:sanctum')->middleware('throttle:60,1');

    Route::middleware('role:super_admin,executive_vice_president,accounting_executive,reservation_officer,office_staff,accounting:view')->group(function () {
        // Billing / Reports / Sales
        Route::get('/billing/services', [App\Http\Controllers\Accounting\BillingController::class, 'getServices'])->name('billing.services');
        Route::post('/billing/services', [App\Http\Controllers\Accounting\BillingController::class, 'storeService'])->name('billing.services.store');
        Route::post('/billing/services/upload-image', [App\Http\Controllers\Accounting\BillingController::class, 'uploadServiceImage'])->name('billing.services.upload-image');
        Route::put('/billing/services/{id}', [App\Http\Controllers\Accounting\BillingController::class, 'updateService'])->name('billing.services.update');
        Route::delete('/billing/services/{id}', [App\Http\Controllers\Accounting\BillingController::class, 'deleteService'])->name('billing.services.delete');
        Route::get('/billing/services/{id}/occupancy', [App\Http\Controllers\Accounting\BillingController::class, 'getServiceOccupancy'])->name('billing.services.occupancy');
        Route::patch('/billing/{billing}/status', [App\Http\Controllers\Accounting\BillingController::class, 'updateStatus'])->name('billing.status.update');
        Route::middleware('role:super_admin,executive_vice_president,accounting_executive')->group(function () {
            Route::get('/billing/reports/summary', [App\Http\Controllers\Accounting\ReportController::class, 'getSummary'])->name('billing.reports.summary');
            Route::get('/billing/reports/detailed', [App\Http\Controllers\Accounting\ReportController::class, 'getDetailed'])->name('billing.reports.detailed');
            Route::get('/accounting/reconciliation', [App\Http\Controllers\Accounting\ReportController::class, 'reconciliation'])->name('accounting.reconciliation');
            Route::get('/accounting/readiness/runs', [FinancialReadinessController::class, 'runs'])->name('accounting.readiness.runs');
            Route::post('/accounting/readiness/runs', [FinancialReadinessController::class, 'run'])->name('accounting.readiness.run');
            Route::get('/accounting/opening-balances', [FinancialReadinessController::class, 'batches'])->name('accounting.opening-balances.index');
            Route::post('/accounting/opening-balances', [FinancialReadinessController::class, 'createBatch'])->name('accounting.opening-balances.store');
            Route::post('/accounting/opening-balances/{batch}/approve', [FinancialReadinessController::class, 'approveBatch'])->name('accounting.opening-balances.approve');
            Route::post('/accounting/opening-balances/{batch}/post', [FinancialReadinessController::class, 'postBatch'])->name('accounting.opening-balances.post');
        });
        Route::apiResource('billing', App\Http\Controllers\Accounting\BillingController::class);

        // Sales Contracts (Custom Transactions contract gate)
        Route::get('/contracts', [App\Http\Controllers\Sales\ContractController::class, 'index'])->name('contracts.index');
        Route::get('/contracts/{contract}', [App\Http\Controllers\Sales\ContractController::class, 'show'])->name('contracts.show');
        Route::post('/contracts/draft', [App\Http\Controllers\Sales\ContractController::class, 'draft'])->name('contracts.draft');
        Route::patch('/contracts/{contract}', [App\Http\Controllers\Sales\ContractController::class, 'updateDraft'])->name('contracts.update-draft');
        Route::post('/contracts/{contract}/payment-schedule', [App\Http\Controllers\Sales\ContractController::class, 'attachPaymentSchedule'])->name('contracts.payment-schedule');
        Route::post('/contracts/{contract}/send', [App\Http\Controllers\Sales\ContractController::class, 'sendForSignature'])->name('contracts.send');
        Route::post('/contracts/{contract}/sign', [App\Http\Controllers\Sales\ContractController::class, 'signAtCounter'])->name('contracts.sign-at-counter');
        Route::post('/contracts/{contract}/void', [App\Http\Controllers\Sales\ContractController::class, 'void'])->name('contracts.void');
        Route::get('/contracts/{contract}/pdf', [App\Http\Controllers\Sales\ContractController::class, 'pdf'])->name('contracts.pdf');
        Route::post('/contracts/{contract}/amendments', [App\Http\Controllers\Sales\ContractController::class, 'createAmendment'])->name('contracts.amendments.create');
        Route::post('/contract-amendments/{amendment}/send', [App\Http\Controllers\Sales\ContractController::class, 'sendAmendmentForSignature'])->name('contract-amendments.send');

        // Ledger & Liquidations
        Route::get('/accounts', [App\Http\Controllers\Accounting\AccountController::class, 'index'])->name('accounts.index');
        Route::get('/accounting/journal-entries', [App\Http\Controllers\Accounting\JournalEntryController::class, 'index'])->name('accounting.journal-entries.index');

        // Manual journal entries + CSV import (write access — tighter role gate).
        Route::middleware('role:super_admin,executive_vice_president,accounting_executive,accounting:create')->group(function () {
            Route::post('/accounting/journal-entries', [App\Http\Controllers\Accounting\JournalEntryController::class, 'store'])->name('accounting.journal-entries.store');
            Route::post('/accounting/journal-entries/import', [App\Http\Controllers\Accounting\JournalEntryController::class, 'import'])->name('accounting.journal-entries.import');
        });

        Route::get('/accounting/journal-entries/{id}', [App\Http\Controllers\Accounting\JournalEntryController::class, 'show'])->name('accounting.journal-entries.show');
        Route::get('/accounting/employee-soa', [App\Http\Controllers\Accounting\AccountController::class, 'employeeSoa'])->name('accounting.employee_soa');
        Route::get('/liquidations', [App\Http\Controllers\Accounting\LiquidationController::class, 'index'])->name('liquidations.index');
        Route::get('/liquidations/{liquidation}', [App\Http\Controllers\Accounting\LiquidationController::class, 'show'])->name('liquidations.show');
        Route::post('/liquidations', [App\Http\Controllers\Accounting\LiquidationController::class, 'store'])->name('liquidations.store');
        Route::put('/liquidations/{liquidation}', [App\Http\Controllers\Accounting\LiquidationController::class, 'update'])->name('liquidations.update');
        Route::delete('/liquidations/{liquidation}', [App\Http\Controllers\Accounting\LiquidationController::class, 'destroy'])->name('liquidations.destroy');
        Route::post('/liquidations/{liquidation}/settle', [App\Http\Controllers\Accounting\LiquidationController::class, 'settle'])->name('liquidations.settle');
    });

    // ──────────────────────────────────────

});
