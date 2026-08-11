<?php

use App\Http\Controllers\Sales\CatalogController;
use App\Http\Controllers\Sales\CharterController;
use App\Http\Controllers\Sales\EducationalTourController;
use App\Http\Controllers\Sales\JoinerDepartureController;
use App\Http\Controllers\Sales\SalesOrderController;
use App\Http\Controllers\Sales\SalesQuotationController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('sales')->group(function () {
        Route::get('/catalog', [CatalogController::class, 'index'])->name('sales.catalog');
        Route::get('/bus-availability', [CatalogController::class, 'busAvailability'])->name('sales.bus-availability');
        Route::get('/joiner-departures', [JoinerDepartureController::class, 'index'])->name('sales.joiner-departures.index');
        Route::get('/joiner-departures/{departure}', [JoinerDepartureController::class, 'show'])->name('sales.joiner-departures.show');
        Route::get('/joiner-departure-resources', [JoinerDepartureController::class, 'resources'])->name('sales.joiner-departures.resources');
        Route::get('/joiner-departures/{departure}/manifest', [JoinerDepartureController::class, 'manifest'])->name('sales.joiner-departures.manifest');
        Route::get('/charter-rate-plans', [CharterController::class, 'ratePlans'])->name('sales.charters.rate-plans');
        Route::get('/charter-bookings', [CharterController::class, 'bookings'])->name('sales.charters.bookings');
        Route::get('/charter-bookings/{booking}/confirmation', [CharterController::class, 'confirmation'])->name('sales.charters.confirmation');
        Route::get('/charter-bookings/{booking}/dispatch-sheet', [CharterController::class, 'dispatchSheet'])->name('sales.charters.dispatch');
        Route::get('/charter-resources', [CharterController::class, 'resources'])->name('sales.charters.resources');
        Route::post('/charter-quote', [CharterController::class, 'quote'])->name('sales.charters.quote');
        Route::get('/location-search', [CharterController::class, 'locationSearch'])->name('sales.location-search');
        Route::get('/official-location-search', [CharterController::class, 'officialLocationSearch'])->name('sales.official-location-search');
        Route::get('/reverse-location', [CharterController::class, 'reverseLocation'])->name('sales.reverse-location');
        Route::post('/charter-route-estimate', [CharterController::class, 'routeEstimate'])->name('sales.charters.route-estimate');
        Route::get('/toll-matrix', [CharterController::class, 'tollMatrix'])->name('sales.tolls.matrix');
        Route::post('/toll-matrix/calculate', [CharterController::class, 'calculateTolls'])->name('sales.tolls.calculate');
        Route::get('/educational-programs', [EducationalTourController::class, 'programs'])->name('sales.educational.programs');
        Route::get('/educational-bookings', [EducationalTourController::class, 'bookings'])->name('sales.educational.bookings');
        Route::get('/educational-bookings/{booking}/manifest', [EducationalTourController::class, 'manifest'])->name('sales.educational.manifest');
        Route::get('/educational-resources', [EducationalTourController::class, 'resources'])->name('sales.educational.resources');
        Route::post('/educational-quote', [EducationalTourController::class, 'quote'])->name('sales.educational.quote');
        Route::get('/orders', [SalesOrderController::class, 'index'])->name('sales.orders.index');
        Route::get('/orders/{order}', [SalesOrderController::class, 'show'])->name('sales.orders.show');

        // Customer-facing quotations (write access — sales roles).
        Route::middleware('role:super_admin,executive_vice_president,reservation_officer,office_staff,sales:create')->group(function () {
            Route::post('/quotations', [SalesQuotationController::class, 'store'])->name('sales.quotations.store');
            Route::post('/joiner-departures', [JoinerDepartureController::class, 'store'])->name('sales.joiner-departures.store');
            Route::put('/joiner-departures/{departure}', [JoinerDepartureController::class, 'update'])->name('sales.joiner-departures.update');
            Route::post('/joiner-departures/{departure}/holds', [JoinerDepartureController::class, 'hold'])->name('sales.joiner-departures.hold');

            Route::post('/joiner-reservations/{reservation}/confirm', [JoinerDepartureController::class, 'confirm'])->name('sales.joiner-reservations.confirm');
            Route::post('/charter-rate-plans', [CharterController::class, 'storeRatePlan'])->name('sales.charters.rate-plans.store');
            Route::put('/charter-rate-plans/{ratePlan}', [CharterController::class, 'updateRatePlan'])->name('sales.charters.rate-plans.update');

            Route::post('/charter-bookings', [CharterController::class, 'storeBooking'])->name('sales.charters.bookings.store');
            Route::put('/charter-bookings/{booking}', [CharterController::class, 'updateBooking'])->name('sales.charters.bookings.update');
            Route::post('/charter-bookings/{booking}/cancel', [CharterController::class, 'requestCancellation'])->name('sales.charters.bookings.cancel');
            Route::post('/educational-programs', [EducationalTourController::class, 'storeProgram'])->name('sales.educational.programs.store');
            Route::put('/educational-programs/{program}', [EducationalTourController::class, 'updateProgram'])->name('sales.educational.programs.update');

            Route::post('/educational-bookings', [EducationalTourController::class, 'storeBooking'])->name('sales.educational.bookings.store');
            Route::put('/educational-bookings/{booking}', [EducationalTourController::class, 'updateBooking'])->name('sales.educational.bookings.update');
            Route::post('/educational-bookings/{booking}/cancel', [EducationalTourController::class, 'requestCancellation'])->name('sales.educational.bookings.cancel');
            Route::post('/orders', [SalesOrderController::class, 'store'])->name('sales.orders.store');
            Route::post('/orders/{order}/items', [SalesOrderController::class, 'addItem'])->name('sales.orders.items.store');
            Route::delete('/orders/{order}/items/{item}', [SalesOrderController::class, 'removeItem'])->name('sales.orders.items.destroy');
            Route::post('/orders/{order}/quote', [SalesOrderController::class, 'quote'])->name('sales.orders.quote');
            Route::post('/orders/{order}/confirm', [SalesOrderController::class, 'confirm'])->name('sales.orders.confirm');
            Route::post('/orders/{order}/adjustments', [SalesOrderController::class, 'requestAdjustment'])->name('sales.orders.adjustments.store');
        });

        Route::middleware('role:super_admin,executive_vice_president,reservation_officer,office_staff|sales:delete')->group(function () {
            Route::delete('/charter-rate-plans/{ratePlan}', [CharterController::class, 'destroyRatePlan'])->name('sales.charters.rate-plans.destroy');
            Route::delete('/educational-programs/{program}', [EducationalTourController::class, 'destroyProgram'])->name('sales.educational.programs.destroy');
        });

        Route::middleware('role:super_admin,executive_vice_president,accounting_executive,reservation_officer,office_staff|sales:create')->group(function () {
            Route::post('/invoices/{invoice}/cancellation', [SalesOrderController::class, 'requestInvoiceCancellation'])->name('sales.invoices.cancellation');
        });

        Route::middleware('role:super_admin,executive_vice_president,accounting_executive|sales:edit')->group(function () {
            Route::post('/order-adjustments/{adjustment}/approve', [SalesOrderController::class, 'approveAdjustment'])->name('sales.adjustments.approve');
            Route::post('/order-adjustments/{adjustment}/reject', [SalesOrderController::class, 'rejectAdjustment'])->name('sales.adjustments.reject');
            Route::post('/credit-notes/{creditNote}/refunds', [SalesOrderController::class, 'requestRefund'])->name('sales.refunds.store');
            Route::post('/refunds/{refund}/approve', [SalesOrderController::class, 'approveRefund'])->name('sales.refunds.approve');
            Route::post('/refunds/{refund}/process', [SalesOrderController::class, 'processRefund'])->name('sales.refunds.process');
        });
    });
});
