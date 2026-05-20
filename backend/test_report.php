<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $ctrl = new App\Http\Controllers\Accounting\ReportController();
    $req = new Illuminate\Http\Request();
    $req->merge(['range' => 'month']);
    $res = $ctrl->getSummary($req);
    echo "SUMMARY RESPONSE:\n";
    print_r(json_decode($res->getContent(), true));
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
