<?php

use App\Http\Controllers\Sales\CatalogController;
use App\Http\Controllers\Sales\CharterController;
use App\Http\Controllers\Sales\EducationalTourController;
use App\Http\Controllers\Sales\EducationalTourPackageController;
use App\Http\Controllers\Sales\JoinerDepartureController;
use App\Http\Controllers\Sales\SalesOrderController;
use App\Http\Controllers\Sales\SalesQuotationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'enforce.password.change', 'verify.2fa'])->group(function () {
    Route::prefix('sales')->group(function () {
        Route::middleware('role:super_admin,executive_vice_president,accounting_executive,reservation_officer,office_staff,sales:view')->group(function () {
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
            Route::get('/educational-programs/{program}/details', [EducationalTourController::class, 'programDetails'])->name('sales.educational.programs.details');
            Route::get('/educational-tour-packages', [EducationalTourPackageController::class, 'index'])->name('sales.educational.packages.index');
            Route::get('/educational-tour-packages/{package}', [EducationalTourPackageController::class, 'show'])->name('sales.educational.packages.show');
            Route::get('/educational-tour-packages/{package}/manifest', [EducationalTourPackageController::class, 'manifest'])->name('sales.educational.packages.manifest');
            Route::get('/educational-tour-participant-bookings', [EducationalTourPackageController::class, 'participantBookings'])->name('sales.educational.participant-bookings.index');
            Route::get('/educational-tour-participant-bookings/{booking}', [EducationalTourPackageController::class, 'showParticipantBooking'])->name('sales.educational.participant-bookings.show');
            Route::get('/educational-tour-participant-bookings/{booking}/invoice', [EducationalTourPackageController::class, 'participantInvoice'])->name('sales.educational.participant-bookings.invoice');
            Route::get('/educational-tour-participant-bookings/{booking}/statement', [EducationalTourPackageController::class, 'participantStatement'])->name('sales.educational.participant-bookings.statement');
            Route::get('/educational-bookings', [EducationalTourController::class, 'bookings'])->name('sales.educational.bookings');
            Route::get('/educational-bookings/{booking}/manifest', [EducationalTourController::class, 'manifest'])->name('sales.educational.manifest');
            Route::get('/educational-resources', [EducationalTourController::class, 'resources'])->name('sales.educational.resources');
            Route::post('/educational-quote', [EducationalTourController::class, 'quote'])->name('sales.educational.quote');
            Route::get('/orders', [SalesOrderController::class, 'index'])->name('sales.orders.index');
            Route::get('/services/{service}/details', [SalesOrderController::class, 'serviceDetails'])->name('sales.services.details');
            Route::get('/transactions/invoices/{invoice}', [SalesOrderController::class, 'showByInvoice'])->name('sales.transactions.invoice');
            Route::get('/orders/{order}/documents/{document}', [SalesOrderController::class, 'document'])->name('sales.orders.documents');
            Route::get('/orders/{order}', [SalesOrderController::class, 'show'])->name('sales.orders.show');
        });

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

            Route::post('/educational-tour-packages', [EducationalTourPackageController::class, 'store'])->name('sales.educational.packages.store');
            Route::put('/educational-tour-packages/{package}', [EducationalTourPackageController::class, 'update'])->name('sales.educational.packages.update');
            Route::post('/educational-tour-packages/{package}/publish', [EducationalTourPackageController::class, 'publish'])->name('sales.educational.packages.publish');
            Route::post('/educational-tour-packages/{package}/participant-bookings', [EducationalTourPackageController::class, 'storeParticipantBooking'])->name('sales.educational.packages.participant-bookings.store');
            Route::post('/educational-tour-packages/{package}/participant-bookings/bulk', [EducationalTourPackageController::class, 'bulkStoreParticipantBookings'])->name('sales.educational.packages.participant-bookings.bulk');
            Route::post('/educational-tour-packages/{package}/bus-assignments', [EducationalTourPackageController::class, 'assignBus'])->name('sales.educational.packages.bus-assignments.store');
            Route::put('/educational-tour-packages/{package}/bus-assignments/{assignment}', [EducationalTourPackageController::class, 'updateBusAssignment'])->name('sales.educational.packages.bus-assignments.update');
            Route::post('/educational-tour-packages/{package}/allocate-buses', [EducationalTourPackageController::class, 'allocateBuses'])->name('sales.educational.packages.allocate-buses');
            Route::post('/educational-tour-packages/{package}/image', [EducationalTourPackageController::class, 'uploadImage'])->name('sales.educational.packages.uploadImage');
            Route::get('/educational-tour-packages/{package}/quotation', [EducationalTourPackageController::class, 'quotation'])->name('sales.educational.packages.quotation');
            Route::get('/educational-tour-packages/{package}/contract', [EducationalTourPackageController::class, 'contract'])->name('sales.educational.packages.contract');
            Route::get('/educational-tour-packages/export', [EducationalTourPackageController::class, 'exportExcel'])->name('sales.educational.packages.export');
            Route::post('/educational-tour-packages/import', [EducationalTourPackageController::class, 'importExcel'])->name('sales.educational.packages.import');
            Route::post('/educational-tour-packages/{package}/companions', [EducationalTourPackageController::class, 'addCompanion'])->name('sales.educational.packages.companions.store');
            Route::post('/educational-tour-participant-bookings/{booking}/payments', [EducationalTourPackageController::class, 'recordPayment'])->name('sales.educational.participant-bookings.payments.store');
            Route::post('/educational-tour-participant-bookings/{booking}/send-documents', [EducationalTourPackageController::class, 'sendParticipantDocuments'])->name('sales.educational.participant-bookings.documents.send');
            Route::post('/educational-tour-participant-bookings/{booking}/cancel', [EducationalTourPackageController::class, 'cancelParticipantBooking'])->name('sales.educational.participant-bookings.cancel');

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

        Route::middleware('role:super_admin,executive_vice_president,reservation_officer,office_staff,sales:delete')->group(function () {
            Route::delete('/charter-rate-plans/{ratePlan}', [CharterController::class, 'destroyRatePlan'])->name('sales.charters.rate-plans.destroy');
            Route::delete('/educational-programs/{program}', [EducationalTourController::class, 'destroyProgram'])->name('sales.educational.programs.destroy');
            Route::delete('/educational-tour-packages/{package}', [EducationalTourPackageController::class, 'destroy'])->name('sales.educational.packages.destroy');
            Route::delete('/educational-tour-packages/{package}/bus-assignments/{assignment}', [EducationalTourPackageController::class, 'removeBus'])->name('sales.educational.packages.bus-assignments.destroy');
        });

        Route::middleware('role:super_admin,executive_vice_president,accounting_executive,reservation_officer,office_staff,sales:create')->group(function () {
            Route::post('/invoices/{invoice}/cancellation', [SalesOrderController::class, 'requestInvoiceCancellation'])->name('sales.invoices.cancellation');
        });

        Route::middleware('role:super_admin,executive_vice_president,accounting_executive,sales:edit')->group(function () {
            Route::post('/educational-tour-participant-bookings/{booking}/move-seat', [EducationalTourPackageController::class, 'moveSeat'])->name('sales.educational.participant-bookings.move-seat');
            Route::post('/order-adjustments/{adjustment}/approve', [SalesOrderController::class, 'approveAdjustment'])->name('sales.adjustments.approve');
            Route::post('/order-adjustments/{adjustment}/reject', [SalesOrderController::class, 'rejectAdjustment'])->name('sales.adjustments.reject');
            Route::post('/credit-notes/{creditNote}/refunds', [SalesOrderController::class, 'requestRefund'])->name('sales.refunds.store');
            Route::post('/refunds/{refund}/approve', [SalesOrderController::class, 'approveRefund'])->name('sales.refunds.approve');
            Route::post('/refunds/{refund}/process', [SalesOrderController::class, 'processRefund'])->name('sales.refunds.process');
        });
    });
});
