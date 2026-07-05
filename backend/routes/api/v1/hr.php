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
    // HR (dynamic permissions)
    // ──────────────────────────────────────
    // HR Dynamic Permissions - Read (GET) Routes
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,corporate_secretary,hr:view')->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
        
        Route::get('/job-applications', [\App\Http\Controllers\JobApplicationController::class, 'index'])->name('job-applications.index');
        Route::get('/job-applications/{jobApplication}', [\App\Http\Controllers\JobApplicationController::class, 'show'])->name('job-applications.show');
        Route::get('/job-applications/{jobApplication}/documents', [\App\Http\Controllers\JobApplicationController::class, 'getDocuments'])->name('job-applications.documents.index');
        
        Route::get('/internships', [\App\Http\Controllers\InternshipController::class, 'index'])->name('internships.index');
        Route::get('/internships/{internship}', [\App\Http\Controllers\InternshipController::class, 'show'])->name('internships.show');

        Route::get('/payroll/cycles', [PayrollController::class, 'indexCycles']);
        Route::get('/payroll/cycles/{id}', [PayrollController::class, 'showCycle']);
        Route::get('/payroll/employees', [PayrollController::class, 'indexEmployeeSalaries']);
    });

    // HR Dynamic Permissions - Create (POST) Routes
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,corporate_secretary,hr:create')->group(function () {
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::post('/job-applications', [\App\Http\Controllers\JobApplicationController::class, 'store'])->name('job-applications.store');
        Route::post('/job-applications/{jobApplication}/documents', [\App\Http\Controllers\JobApplicationController::class, 'uploadDocument'])->name('job-applications.documents.store');
        Route::post('/job-applications/{jobApplication}/convert-to-employee', [\App\Http\Controllers\JobApplicationController::class, 'convertToEmployee'])->name('job-applications.convert-to-employee');
        Route::post('/internships', [\App\Http\Controllers\InternshipController::class, 'store'])->name('internships.store');
        Route::post('/payroll/cycles', [PayrollController::class, 'runPayroll']);
    });

    // HR Dynamic Permissions - Edit (PUT/PATCH) Routes
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,corporate_secretary,hr:edit')->group(function () {
        Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::patch('/users/{user}', [UserController::class, 'update']);
        Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
        Route::post('/users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
        
        Route::put('/job-applications/{jobApplication}', [\App\Http\Controllers\JobApplicationController::class, 'update'])->name('job-applications.update');
        Route::patch('/job-applications/{jobApplication}', [\App\Http\Controllers\JobApplicationController::class, 'update']);
        Route::patch('/job-applications/{jobApplication}/checklist', [\App\Http\Controllers\JobApplicationController::class, 'updateChecklist'])->name('job-applications.checklist');
        
        Route::put('/internships/{internship}', [\App\Http\Controllers\InternshipController::class, 'update'])->name('internships.update');
        Route::patch('/internships/{internship}', [\App\Http\Controllers\InternshipController::class, 'update']);
        
        Route::post('/payroll/cycles/{id}/release', [PayrollController::class, 'releasePayroll']);
        Route::put('/payroll/employees/{id}', [PayrollController::class, 'updateEmployeeSalary']);
        Route::put('/payroll/payslips/{id}', [PayrollController::class, 'updatePayslip']);
    });

    // HR Dynamic Permissions - Delete (DELETE) Routes
    Route::middleware('role:super_admin,executive_vice_president,operations_manager,corporate_secretary,hr:delete')->group(function () {
        Route::delete('/job-applications/{jobApplication}', [\App\Http\Controllers\JobApplicationController::class, 'destroy'])->name('job-applications.destroy');
        Route::delete('/job-applications/{jobApplication}/documents/{documentId}', [\App\Http\Controllers\JobApplicationController::class, 'deleteDocument'])->name('job-applications.documents.destroy');
        Route::delete('/internships/{internship}', [\App\Http\Controllers\InternshipController::class, 'destroy'])->name('internships.destroy');
        Route::delete('/payroll/cycles/{id}', [PayrollController::class, 'destroyCycle']);
    });

    // ──────────────────────────────────────

});
