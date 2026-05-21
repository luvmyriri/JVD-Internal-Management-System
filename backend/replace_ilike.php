<?php

$files = [
    'app/Http/Controllers/Travel/PassengerController.php',
    'app/Http/Controllers/Travel/CustomerController.php',
    'app/Http/Controllers/Procurement/SupplierController.php',
    'app/Http/Controllers/Procurement/AccreditationController.php',
    'app/Http/Controllers/Inventory/InventoryController.php',
    'app/Http/Controllers/Fleet/BusController.php',
    'app/Http/Controllers/Admin/UserController.php',
    'app/Http/Controllers/Admin/AuditLogController.php',
];

foreach ($files as $file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $content = str_replace("'ilike'", "\DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike'", $content);
        file_put_contents($file, $content);
    }
}
echo "Replaced ilike";
