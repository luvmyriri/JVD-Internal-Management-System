<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Sales\CatalogController;
use App\Http\Controllers\Sales\SalesQuotationController;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('sales')->group(function () {
        Route::get('/catalog', [CatalogController::class, 'index'])->name('sales.catalog');

        // Customer-facing quotations (write access — sales roles).
        Route::middleware('role:super_admin,executive_vice_president,reservation_officer,office_staff,sales:create')->group(function () {
            Route::post('/quotations', [SalesQuotationController::class, 'store'])->name('sales.quotations.store');
        });
    });
});
