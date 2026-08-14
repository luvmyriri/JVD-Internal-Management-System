<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('storage/{path}', function ($path) {
    $filePath = storage_path('app/public/' . $path);
    if (!file_exists($filePath)) {
        abort(404);
    }
    return response()->file($filePath);
})->where('path', '.*');

Route::get('uploads/{path}', function ($path) {
    $filePath = storage_path('app/public/' . $path);
    if (!file_exists($filePath)) {
        abort(404);
    }
    return response()->file($filePath);
})->where('path', '.*');

// Backward-compatible landing for approval links sent by older releases. The
// controller never mutates a record; it only redirects to the authenticated UI.
Route::get('/public/action-request', [App\Http\Controllers\PublicRequestActionController::class, 'handle'])
    ->middleware('throttle:20,1')
    ->name('public.action-request');
