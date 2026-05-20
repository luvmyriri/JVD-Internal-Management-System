<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$ranges = ['day', 'week', 'month', 'year', 'all'];
foreach ($ranges as $range) {
    try {
        $ctrl = new App\Http\Controllers\Accounting\ReportController();
        $req = new Illuminate\Http\Request();
        $req->merge(['range' => $range]);
        $res = $ctrl->getSummary($req);
        $data = json_decode($res->getContent(), true);
        echo "=== RANGE: $range ===\n";
        echo "KPIs: " . json_encode($data['data']['kpis']) . "\n";
        echo "Trend Count: " . count($data['data']['trend']) . "\n";
        foreach ($data['data']['trend'] as $t) {
            echo "  - {$t['date']}: {$t['total']}\n";
        }
        echo "Categories: " . json_encode($data['data']['categories']) . "\n\n";
    } catch (\Exception $e) {
        echo "ERROR FOR $range: " . $e->getMessage() . "\n";
    }
}
