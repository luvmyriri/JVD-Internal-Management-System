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
use App\Http\Controllers\HealthController;



/*
|--------------------------------------------------------------------------
| API Routes — JVD Internal Management System
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api automatically by Laravel.
| Middleware groups follow the RBAC matrix from Architecture § 3.
| Dynamic permissions are managed via role_permissions table.
|
| Route naming convention: module.action (e.g., auth.login, users.store)
|
*/

// ──────────────────────────────────────────
// PUBLIC (unauthenticated) routes
Route::get('/health/readiness', [HealthController::class, 'readiness'])->middleware('throttle:30,1')->name('health.readiness');
// ──────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login',      [AuthController::class, 'login'])->name('auth.login');
    Route::post('/2fa/verify', [AuthController::class, 'verify2FA'])->name('auth.2fa.verify');
    Route::post('/2fa/setup',  [AuthController::class, 'confirmSetup'])->name('auth.2fa.setup');
    Route::post('/set-password', [AuthController::class, 'setPassword'])->name('auth.set-password');
});
// Public KYC route
Route::get('/accreditations/{accreditation}/verify-token', [App\Http\Controllers\Procurement\AccreditationController::class, 'verifyToken'])->name('accreditations.verify-token');
Route::post('/accreditations/{accreditation}/submit-kyc', [App\Http\Controllers\Procurement\AccreditationController::class, 'submitKyc'])->middleware('throttle:10,1')->name('accreditations.submit-kyc');
Route::post('/accreditations/{accreditation}/submit-kyc/upload/{type}', [App\Http\Controllers\Procurement\AccreditationController::class, 'uploadDocumentPublic'])->middleware('throttle:10,1')->name('accreditations.submit-kyc.upload');

// Public settings route
Route::get('/public/settings', [SystemSettingController::class, 'getPublicSettings'])->name('settings.public');

// Public Visa Document Request upload routes (legacy — kept live for already-sent links;
// new links are generated against /public/portal/{token} below)
Route::get('/public/visa-requests/{token}', [PassportCaseController::class, 'verifyPublicToken'])->name('passport-cases.public.verify');
Route::post('/public/visa-requests/{token}/upload', [PassportCaseController::class, 'uploadPublicDocument'])->middleware('throttle:10,1')->name('passport-cases.public.upload');

// Unified Customer Portal (document upload + contract e-signature)
Route::get('/public/portal/{token}', [App\Http\Controllers\CustomerPortalController::class, 'verify'])->name('portal.verify');
Route::post('/public/portal/{token}/upload', [App\Http\Controllers\CustomerPortalController::class, 'uploadDocument'])->middleware('throttle:10,1')->name('portal.upload');
Route::post('/public/portal/{token}/sign', [App\Http\Controllers\CustomerPortalController::class, 'signContract'])->middleware('throttle:10,1')->name('portal.sign');

// Public endpoints for presentation/showcase website connection
Route::get('/public/buses', function () {
    return response()->json([
        'success' => true,
        'data' => \App\Models\Bus::orderBy('plate_number')->get(['id', 'plate_number', 'model', 'status', 'custom_seats'])
    ]);
});
Route::get('/public/drivers', function () {
    return response()->json([
        'success' => true,
        'data' => \App\Models\User::where('role', 'driver')->orderBy('first_name')->get(['id'])->map(fn ($d) => [
            'id' => $d->id,
            'display_name' => 'Driver #' . $d->id,
        ])
    ]);
});
Route::get('/public/suppliers', function () {
    return response()->json([
        'success' => true,
        // H-01: omit supplier contact email from the unauthenticated payload (phishing/scraping risk).
        'data' => \App\Models\Supplier::orderBy('company_name')->get(['id', 'company_name', 'accreditation_status'])->map(function ($supplier) {
            return [
                'id' => $supplier->id,
                'name' => $supplier->company_name,
                'accreditation_status' => $supplier->accreditation_status,
            ];
        })
    ]);
});

// Operational trip-ticket and conflict data is available only through the
// authenticated routes in routes/api/v1/operations.php. Do not expose a
// duplicate public projection here: it leaks staff schedules and fleet data.
