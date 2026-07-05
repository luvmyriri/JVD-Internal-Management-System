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

Route::get('/public/trip-tickets', function () {
    $tickets = \App\Models\TripTicket::with(['bus', 'driver', 'workOrders.jobOrders'])
        ->orderBy('created_at', 'desc')
        ->take(10)
        ->get();

    return response()->json([
        'success' => true,
        'data' => $tickets->map(function ($ticket) {
            $wo = $ticket->workOrders->first();
            $jo = $wo ? $wo->jobOrders->first() : null;
            $safetyChecked = $wo && $wo->status === 'completed' && $jo && $jo->status === 'completed';
            return [
                'id' => $ticket->id,
                'control_no' => $ticket->control_no,
                'date_of_travel' => $ticket->date_of_travel,
                'pick_up' => $ticket->pick_up,
                'drop_off' => $ticket->drop_off,
                'status' => $ticket->status,
                'driver' => $ticket->driver ? ($ticket->driver->first_name . ' ' . $ticket->driver->last_name) : 'TBA',
                'bus' => $ticket->bus ? ($ticket->bus->model . ' (' . $ticket->bus->plate_number . ')') : 'TBA',
                'safety_checked' => $safetyChecked,
                'work_order' => $wo ? [
                    'id' => $wo->id,
                    'wo_number' => $wo->wo_number,
                    'status' => $wo->status,
                ] : null,
                'job_order' => $jo ? [
                    'id' => $jo->id,
                    'jo_number' => $jo->jo_number,
                    'status' => $jo->status,
                ] : null,
            ];
        })
    ]);
});

Route::get('/public/conflict-check', function (\Illuminate\Http\Request $request) {
    $driverId = $request->query('driver_id');
    $busId = $request->query('bus_id');
    $dateOfTravel = $request->query('travel_date');

    if (!$dateOfTravel) {
        return response()->json([
            'success' => false,
            'message' => 'travel_date is required.'
        ], 400);
    }

    $driverConflict = false;
    $busConflict = false;
    $conflictingTicket = null;

    if ($driverId) {
        $conflictingTicket = \App\Models\TripTicket::where('driver_id', $driverId)
            ->where('date_of_travel', $dateOfTravel)
            ->where('status', '!=', 'cancelled')
            ->first();
        if ($conflictingTicket) {
            $driverConflict = true;
        }
    }

    if ($busId && !$driverConflict) {
        $conflictingTicket = \App\Models\TripTicket::where('bus_id', $busId)
            ->where('date_of_travel', $dateOfTravel)
            ->where('status', '!=', 'cancelled')
            ->first();
        if ($conflictingTicket) {
            $busConflict = true;
        }
    }

    $conflict = $driverConflict || $busConflict;

    return response()->json([
        'success' => true,
        'conflict' => $conflict,
        'type' => $driverConflict ? 'driver' : ($busConflict ? 'bus' : 'none'),
        'conflicting_ticket' => $conflictingTicket ? [
            'id' => $conflictingTicket->id,
            'control_no' => $conflictingTicket->control_no,
            'drop_off' => $conflictingTicket->drop_off,
            'date_of_travel' => $conflictingTicket->date_of_travel,
        ] : null,
    ]);
});

