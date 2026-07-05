<?php

$apiFilePath = __DIR__ . '/backend/routes/api.php';
$lines = file($apiFilePath);

$modules = [
    'public' => [],
    'auth' => [],
    'admin' => [],
    'procurement' => [],
    'fleet' => [],
    'operations' => [],
    'accounting' => [],
    'hr' => [],
    'travel' => [],
];

$currentModule = 'public';
$inAuthGroup = false;
$braceDepth = 0;

foreach ($lines as $line) {
    if (strpos($line, 'Route::middleware([\'auth:sanctum\'') !== false) {
        $inAuthGroup = true;
    }

    if (strpos($line, '// AUTHENTICATED routes') !== false) continue;
    if (strpos($line, 'Route::prefix(\'auth\')') !== false && $inAuthGroup) $currentModule = 'auth';
    if (strpos($line, 'prefix(\'notifications\')') !== false) $currentModule = 'auth';
    if (strpos($line, 'chat/users') !== false) $currentModule = 'auth';
    if (strpos($line, 'prefix(\'chat\')') !== false) $currentModule = 'auth';
    if (strpos($line, 'apiResource(\'procurement-documents') !== false) $currentModule = 'procurement';
    if (strpos($line, 'ADMINISTRATION — Audit Logs') !== false) $currentModule = 'admin';
    if (strpos($line, 'PROCUREMENT — Suppliers') !== false) $currentModule = 'procurement';
    if (strpos($line, 'OPERATIONS — Job Orders') !== false) $currentModule = 'operations';
    if (strpos($line, 'COLLECTIONS / FINANCE') !== false) $currentModule = 'accounting';
    if (strpos($line, 'PMS WORK ORDER APPROVAL') !== false) $currentModule = 'operations';
    if (strpos($line, 'OPERATIONS & TRAVEL') !== false) $currentModule = 'travel';
    if (strpos($line, 'FLEET') !== false) $currentModule = 'fleet';
    if (strpos($line, 'ACCREDITATIONS') !== false) $currentModule = 'operations';
    if (strpos($line, 'INVENTORY') !== false) $currentModule = 'procurement';
    if (strpos($line, 'ACCOUNTING') !== false) $currentModule = 'accounting';
    if (strpos($line, 'HR (dynamic permissions)') !== false) $currentModule = 'hr';
    if (strpos($line, 'SUPER ADMIN EXCLUSIVE') !== false) $currentModule = 'admin';
    if (strpos($line, 'DASHBOARD AGGREGATIONS') !== false) $currentModule = 'admin'; // or dashboards

    $modules[$currentModule][] = $line;
}

$v1Dir = __DIR__ . '/backend/routes/api/v1';
if (!is_dir($v1Dir)) {
    mkdir($v1Dir, 0777, true);
}

foreach ($modules as $moduleName => $moduleLines) {
    if (empty($moduleLines)) continue;
    
    $content = "<?php\n\nuse Illuminate\Support\Facades\\Route;\nuse App\Http\Controllers\Auth\AuthController;\nuse App\Http\Controllers\Admin\UserController;\nuse App\Http\Controllers\Admin\AuditLogController;\nuse App\Http\Controllers\Admin\SystemSettingController;\nuse App\Http\Controllers\Procurement\PurchaseOrderController;\nuse App\Http\Controllers\Procurement\SupplierController;\nuse App\Http\Controllers\Procurement\JobOrderController;\nuse App\Http\Controllers\Procurement\WorkOrderController;\nuse App\Http\Controllers\Travel\CustomerController;\nuse App\Http\Controllers\Travel\CustomerPassportController;\nuse App\Http\Controllers\Travel\CustomerVisaController;\nuse App\Http\Controllers\Travel\CustomerKycController;\nuse App\Http\Controllers\Travel\AgentTaskController;\nuse App\Http\Controllers\Travel\PassengerController;\nuse App\Http\Controllers\Travel\PassportCaseController;\nuse App\Http\Controllers\Travel\LegalDocumentController;\nuse App\Http\Controllers\Fleet\BusController;\nuse App\Http\Controllers\Procurement\AccreditationController;\nuse App\Http\Controllers\Admin\RolePermissionController;\nuse App\Http\Controllers\Inventory\InventoryController;\nuse App\Http\Controllers\Auth\ProfileController;\nuse App\Http\Controllers\Procurement\ProcurementDocumentController;\nuse App\Http\Controllers\CommissionController;\nuse App\Http\Controllers\TripTicketController;\nuse App\Http\Controllers\CashBudgetRequestController;\nuse App\Http\Controllers\CollectionController;\nuse App\Http\Controllers\DashboardController;\nuse App\Http\Controllers\PayrollController;\n\n";

    if ($moduleName !== 'public') {
        $content .= "Route::middleware(['auth:sanctum', 'enforce.password.change', 'verify.2fa'])->group(function () {\n";
    }

    // Strip out the first generic auth group wrapper if it got captured
    $filteredLines = [];
    foreach ($moduleLines as $l) {
        if (trim($l) === "Route::middleware(['auth:sanctum', 'enforce.password.change', 'verify.2fa'])->group(function () {") {
            continue;
        }
        $filteredLines[] = $l;
    }
    
    // Clean up trailing closure bracket for public if it leaked
    if ($moduleName === 'public') {
        $filteredLines = array_filter($filteredLines, function($l) {
            return trim($l) !== '});' && strpos($l, '<?php') === false && strpos($l, 'use ') !== 0;
        });
    }

    $content .= implode("", $filteredLines);

    if ($moduleName !== 'public') {
        $content .= "\n});\n";
    }

    file_put_contents($v1Dir . '/' . $moduleName . '.php', $content);
}

// Clear api.php but leave a comment
file_put_contents($apiFilePath, "<?php\n\n// Routes are now dynamically loaded in bootstrap/app.php from routes/api/v1\n");
echo "Done splitting!\n";
