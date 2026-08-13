<?php

use App\Http\Controllers\Accounting\AccountController;
use App\Http\Controllers\Accounting\BillingController;
use App\Http\Controllers\Accounting\FinancialReadinessController;
use App\Http\Controllers\Accounting\JournalEntryController;
use App\Http\Controllers\Accounting\LiquidationController;
use App\Http\Controllers\Accounting\ReportController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\Sales\ContractController;
use Illuminate\Support\Facades\Route;

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
        Route::post('/invoices/{id}/refund', [CollectionController::class, 'processRefund'])->name('invoices.refund');
        Route::post('/collections/{id}/refund', [CollectionController::class, 'processRefund'])->name('collections.refund');
        Route::apiResource('collections', CollectionController::class);
    });

    // ──────────────────────────────────────
    // ACCOUNTING (dynamic permissions)
    // ──────────────────────────────────────

    // Webhook for PayMongo (no auth required)
    Route::post('/billing/webhook', [BillingController::class, 'handleWebhook'])->name('billing.webhook')->withoutMiddleware('auth:sanctum')->middleware('throttle:60,1');
    // Canonical PayMongo provider path; retain /billing/webhook for existing integrations.
    Route::post('/paymongo/webhook', [BillingController::class, 'handleWebhook'])->name('paymongo.webhook')->withoutMiddleware('auth:sanctum')->middleware('throttle:60,1');

    Route::middleware('role:super_admin,executive_vice_president,accounting_executive,reservation_officer,office_staff,accounting:view')->group(function () {
        // Billing / Reports / Sales
        Route::get('/billing/services', [BillingController::class, 'getServices'])->name('billing.services');
        Route::post('/billing/services', [BillingController::class, 'storeService'])->name('billing.services.store');
        Route::post('/billing/services/upload-image', [BillingController::class, 'uploadServiceImage'])->name('billing.services.upload-image');
        Route::put('/billing/services/{id}', [BillingController::class, 'updateService'])->name('billing.services.update');
        Route::delete('/billing/services/{id}', [BillingController::class, 'deleteService'])->name('billing.services.delete');
        Route::get('/billing/services/{id}/occupancy', [BillingController::class, 'getServiceOccupancy'])->name('billing.services.occupancy');
        Route::patch('/billing/{billing}/status', [BillingController::class, 'updateStatus'])->name('billing.status.update');
        Route::post('/billing/{id}/send-email', [BillingController::class, 'sendEmail'])->name('billing.send-email');

        Route::middleware('role:super_admin,executive_vice_president,accounting_executive')->group(function () {
            Route::get('/billing/reports/summary', [ReportController::class, 'getSummary'])->name('billing.reports.summary');
            Route::get('/billing/reports/detailed', [ReportController::class, 'getDetailed'])->name('billing.reports.detailed');
            Route::get('/accounting/reconciliation', [ReportController::class, 'reconciliation'])->name('accounting.reconciliation');
            Route::get('/accounting/readiness/runs', [FinancialReadinessController::class, 'runs'])->name('accounting.readiness.runs');
            Route::post('/accounting/readiness/runs', [FinancialReadinessController::class, 'run'])->name('accounting.readiness.run');
            Route::get('/accounting/opening-balances', [FinancialReadinessController::class, 'batches'])->name('accounting.opening-balances.index');
            Route::post('/accounting/opening-balances', [FinancialReadinessController::class, 'createBatch'])->name('accounting.opening-balances.store');
            Route::post('/accounting/opening-balances/{batch}/approve', [FinancialReadinessController::class, 'approveBatch'])->name('accounting.opening-balances.approve');
            Route::post('/accounting/opening-balances/{batch}/post', [FinancialReadinessController::class, 'postBatch'])->name('accounting.opening-balances.post');
        });
        Route::apiResource('billing', BillingController::class);

        // Optional Sales contracts. Legacy signature routes remain for already-issued signing links.
        Route::get('/contracts', [ContractController::class, 'index'])->name('contracts.index');
        Route::get('/contracts/{contract}', [ContractController::class, 'show'])->name('contracts.show');
        Route::post('/invoices/{invoice}/contract', [ContractController::class, 'generateForInvoice'])->name('contracts.generate-for-invoice');
        Route::post('/contracts/draft', [ContractController::class, 'draft'])->name('contracts.draft');
        Route::patch('/contracts/{contract}', [ContractController::class, 'updateDraft'])->name('contracts.update-draft');
        Route::post('/contracts/{contract}/payment-schedule', [ContractController::class, 'attachPaymentSchedule'])->name('contracts.payment-schedule');
        Route::post('/contracts/{contract}/send', [ContractController::class, 'sendForSignature'])->name('contracts.send');
        Route::post('/contracts/{contract}/sign', [ContractController::class, 'signAtCounter'])->name('contracts.sign-at-counter');
        Route::post('/contracts/{contract}/void', [ContractController::class, 'void'])->name('contracts.void');
        Route::get('/contracts/{contract}/pdf', [ContractController::class, 'pdf'])->name('contracts.pdf');
        Route::post('/contracts/{contract}/amendments', [ContractController::class, 'createAmendment'])->name('contracts.amendments.create');
        Route::post('/contract-amendments/{amendment}/send', [ContractController::class, 'sendAmendmentForSignature'])->name('contract-amendments.send');

        // Ledger & Liquidations
        Route::get('/accounts', [AccountController::class, 'index'])->name('accounts.index');
        Route::get('/accounting/journal-entries', [JournalEntryController::class, 'index'])->name('accounting.journal-entries.index');

        // Manual journal entries + CSV import (write access — tighter role gate).
        Route::middleware('role:super_admin,executive_vice_president,accounting_executive,accounting:create')->group(function () {
            Route::post('/accounting/journal-entries', [JournalEntryController::class, 'store'])->name('accounting.journal-entries.store');
            Route::post('/accounting/journal-entries/import', [JournalEntryController::class, 'import'])->name('accounting.journal-entries.import');
        });

        Route::get('/accounting/journal-entries/{id}', [JournalEntryController::class, 'show'])->name('accounting.journal-entries.show');
        Route::get('/accounting/employee-soa', [AccountController::class, 'employeeSoa'])->name('accounting.employee_soa');
        Route::get('/liquidations', [LiquidationController::class, 'index'])->name('liquidations.index');
        Route::get('/liquidations/{liquidation}', [LiquidationController::class, 'show'])->name('liquidations.show');
        Route::post('/liquidations', [LiquidationController::class, 'store'])->name('liquidations.store');
        Route::put('/liquidations/{liquidation}', [LiquidationController::class, 'update'])->name('liquidations.update');
        Route::delete('/liquidations/{liquidation}', [LiquidationController::class, 'destroy'])->name('liquidations.destroy');
        Route::post('/liquidations/{liquidation}/settle', [LiquidationController::class, 'settle'])->name('liquidations.settle');
    });

    // ──────────────────────────────────────

});
