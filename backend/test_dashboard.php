<?php

define('LARAVEL_START', microtime(true));
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

try {
    // Send a dummy request to boot the application and database
    $request = Illuminate\Http\Request::create('/api/ping', 'GET');
    $kernel->handle($request);
    
    $user = \App\Models\User::first();
    if ($user) {
        $dashRequest = Illuminate\Http\Request::create('/api/dashboards/admin', 'GET');
        $dashRequest->setUserResolver(fn() => $user);
        
        $controller = app(\App\Http\Controllers\DashboardController::class);
        
        echo "TESTING ADMIN DASHBOARD:\n";
        $response = $controller->admin($dashRequest);
        echo "ADMIN: OK\n";
        
        echo "TESTING ACCOUNTING DASHBOARD:\n";
        $response = $controller->accounting($dashRequest);
        echo "ACCOUNTING: OK\n";

        echo "TESTING AGENT DASHBOARD:\n";
        $response = $controller->agent($dashRequest);
        echo "AGENT: OK\n";

        echo "TESTING DRIVER DASHBOARD:\n";
        $response = $controller->driver($dashRequest);
        echo "DRIVER: OK\n";
        
    } else {
        echo "No users found!\n";
    }
} catch (\Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
