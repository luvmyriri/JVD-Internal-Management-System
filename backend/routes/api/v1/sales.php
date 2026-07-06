<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Sales\CatalogController;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('sales')->group(function () {
        Route::get('/catalog', [CatalogController::class, 'index'])->name('sales.catalog');
    });
});
