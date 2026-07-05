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
    Route::prefix('auth')->group(function () {
        Route::get('/me',              [AuthController::class, 'me'])->name('auth.me');
        Route::post('/logout',         [AuthController::class, 'logout'])->name('auth.logout');
        Route::post('/change-password',[AuthController::class, 'changePassword'])->name('auth.change-password');
        
        // Profile Management
        Route::put('/profile',         [ProfileController::class, 'update'])->name('auth.profile.update');
        Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('auth.profile.avatar');
    });

    // Notifications Management
    Route::prefix('notifications')->group(function () {
        Route::get('/',                 [\App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
        Route::post('/mark-all-read',   [\App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
        Route::put('/{id}/read',        [\App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.read');
        Route::delete('/{id}',          [\App\Http\Controllers\NotificationController::class, 'destroy'])->name('notifications.destroy');
        Route::delete('/',              [\App\Http\Controllers\NotificationController::class, 'clearAll'])->name('notifications.clear-all');
        Route::post('/simulate',        [\App\Http\Controllers\NotificationController::class, 'simulate'])->name('notifications.simulate');
    });

    // Chat Users Directory (accessible to all authenticated roles)
    Route::get('/chat/users', [UserController::class, 'chatUsers'])->name('users.chat');

    // Chat Routing
    Route::prefix('chat')->group(function () {
        Route::get('/messages', [App\Http\Controllers\ChatController::class, 'index'])->name('chat.messages');
        Route::post('/messages', [App\Http\Controllers\ChatController::class, 'sendMessage'])->name('chat.messages.send');
        Route::post('/groups', [App\Http\Controllers\ChatController::class, 'createGroup'])->name('chat.groups.create');
        Route::post('/read', [App\Http\Controllers\ChatController::class, 'markAsRead'])->name('chat.read');
        Route::delete('/conversation', [App\Http\Controllers\ChatController::class, 'deleteConversation'])->name('chat.conversation.delete');
    });

    // Company Documents & Dynamic Categories (accessible to all authenticated roles)

});
